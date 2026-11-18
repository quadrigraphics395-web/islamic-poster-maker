import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") throw new Error("This helper applies Windows file ACL protection and must run on Windows.");

const emailArgument = process.argv.indexOf("--email");
const adminEmail = emailArgument >= 0 ? process.argv[emailArgument + 1]?.trim().toLowerCase() : "";
if (!adminEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
  throw new Error('Run with --email "admin@example.com". The email is not a secret; generated values are never printed.');
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerDirectory = resolve(repoRoot, "cloudflare/worker");
const envPath = resolve(workerDirectory, ".env.production");
const loginKeyPath = resolve(workerDirectory, ".admin-login-key.local");
const ignoredPaths = ["cloudflare/worker/.env.production", "cloudflare/worker/.admin-login-key.local"];
const createdPaths = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, ...options });
  if (result.error) throw result.error;
  return result;
}

for (const relativePath of ignoredPaths) {
  const ignored = run("git", ["-C", repoRoot, "check-ignore", "--quiet", "--", relativePath]);
  if (ignored.status !== 0) throw new Error(`Git ignore protection is missing for ${relativePath}; nothing was generated.`);
  const tracked = run("git", ["-C", repoRoot, "ls-files", "--error-unmatch", "--", relativePath]);
  if (tracked.status === 0) throw new Error(`Refusing to put secrets in tracked file ${relativePath}; nothing was generated.`);
}

for (const path of [envPath, loginKeyPath]) {
  try {
    readFileSync(path);
    throw new Error("A production secret file already exists. No files were overwritten.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const loginKey = randomBytes(32).toString("hex");
const adminKeyHash = createHash("sha256").update(loginKey, "utf8").digest("hex");
const sessionSecret = randomBytes(32).toString("hex");
if (!/^[a-f0-9]{64}$/.test(loginKey) || !/^[a-f0-9]{64}$/.test(adminKeyHash) || !/^[a-f0-9]{64}$/.test(sessionSecret)) {
  throw new Error("Generated value format validation failed; nothing was written.");
}

function restrictToCurrentWindowsUser(path) {
  const identity = run("whoami.exe", ["/user", "/fo", "csv", "/nh"]);
  const sid = identity.stdout.match(/S-\d-\d+(?:-\d+)+/i)?.[0];
  if (identity.status !== 0 || !sid) throw new Error("Could not identify the current Windows user for file ACL protection.");
  const result = run("icacls.exe", [path, "/inheritance:r", "/grant:r", `*${sid}:(F)`]);
  if (result.status !== 0) throw new Error("Could not restrict a secret file to the current Windows user.");
}

try {
  const contents = `ADMIN_EMAIL=${adminEmail}\r\nADMIN_KEY_HASH=${adminKeyHash}\r\nSESSION_SECRET=${sessionSecret}\r\n`;
  writeFileSync(envPath, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
  createdPaths.push(envPath);
  writeFileSync(loginKeyPath, `${loginKey}\r\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  createdPaths.push(loginKeyPath);

  restrictToCurrentWindowsUser(envPath);
  restrictToCurrentWindowsUser(loginKeyPath);

  const names = readFileSync(envPath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => line.split("=", 1)[0]);
  const required = ["ADMIN_EMAIL", "ADMIN_KEY_HASH", "SESSION_SECRET"];
  if (names.join("|") !== required.join("|")) throw new Error("Generated file variable-name verification failed.");

  console.log("Production secret files prepared; values suppressed.");
  console.log("Verified variables: ADMIN_EMAIL, ADMIN_KEY_HASH, SESSION_SECRET.");
  console.log("The login key is in a separate ignored file protected by a current-user-only Windows ACL.");
} catch (error) {
  for (const path of createdPaths.reverse()) {
    try { unlinkSync(path); } catch { /* Keep the original preparation error. */ }
  }
  throw error;
}
