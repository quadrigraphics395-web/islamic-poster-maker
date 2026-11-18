import { createHash, randomBytes } from "node:crypto";

const key = randomBytes(32).toString("hex");
const hash = createHash("sha256").update(key, "utf8").digest("hex");
console.log(`Admin login key (enter in the Admin access key field):\n${key}\n`);
console.log(`Configure this digest with: npx wrangler secret put ADMIN_KEY_HASH\n${hash}\n`);
console.log("Generate SESSION_SECRET separately with: node -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\"");
