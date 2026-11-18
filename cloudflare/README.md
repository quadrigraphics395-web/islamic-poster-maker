# Shared template API: local development and deployment

The React/Vite frontend remains hosted by Vercel. The Cloudflare Worker provides the shared template API; D1 stores editable template data and KV stores image bytes. The frontend talks to it using `VITE_TEMPLATE_API_URL`. Existing IndexedDB projects, local templates, fonts, and other app features remain in the frontend. This setup does not use or modify Supabase.

The Worker uses only Workers, the existing D1 database, and the existing KV namespace. It does not add R2, Firebase, paid add-ons, custom domains, or billing. Keep the Cloudflare account on Workers Free; Free quota exhaustion causes requests to fail rather than opting into paid usage. Current published-template limit is 100; image limit is 24 MiB each and 900 MiB total reserved storage. Cloudflare currently lists D1 Free at 5 GB total account storage, 5 million rows read/day, and 100,000 rows written/day; Workers Free at 100,000 requests/day and 10 ms CPU/request; KV Free at 100,000 reads/day, 1,000 writes/day, and 1 GB storage. Limits are account-wide and can change; check the linked official limits before rollout.

## Local development

Wrangler is a project development dependency. From `cloudflare/worker`:

1. Apply the migration only to Wrangler's local D1 emulator: `npx wrangler d1 migrations apply qadri-poster-templates --local`.
2. Generate a development admin key with `node ../../scripts/generate-template-admin-key.mjs`. Put the local `ADMIN_EMAIL`, `ADMIN_KEY_HASH`, and a separate random `SESSION_SECRET` in `.dev.vars` in this directory. `.dev.vars` is ignored by Git.
3. Run `npx wrangler dev --local`. In another terminal, run Vite with `npm run dev` and set `VITE_TEMPLATE_API_URL=http://localhost:8787` in the root `.env.local` (also ignored by Git). Local CORS includes `http://localhost:5173`.
4. With the local Worker running, set `TEMPLATE_TEST_ADMIN_KEY` to the temporary local key and run `npm run test:cloudflare:local`.

`npm run test:cloudflare` runs the Worker helper/auth/CORS/migration tests. App tests, build and lint are run from the project root. The local D1/KV emulator and API integration were previously exercised; no remote operation is part of local development.

## Production deployment guide

**Stop before the Cloudflare changes below.** The commands in this section change live resources. Run them only after you have reviewed this guide and explicitly approved the live rollout. They have not been run as part of deployment preparation.

### 1. Confirm the existing Cloudflare resources

Sign in to the Cloudflare account that owns the resources. In **Storage & databases → D1**, confirm the existing database name and ID:

- `qadri-poster-templates`
- `71aeb207-cd34-471f-a436-2704bd610cd6`

In **Workers & Pages → KV**, confirm the namespace ID:

- Binding `ASSETS`, ID `1df3cee128974e24846ecf44a963414f`

The `DB` binding uses the D1 ID above. The `ASSETS` binding uses the KV ID above. Do not create replacements if either is missing; stop and investigate. This configuration reuses these existing resources. Verify the account is on Workers Free and do not add a card, enable billing, or select a paid service.

### 2. Choose the admin identity and prepare secrets locally

Choose the one admin email. Production keeps it as a Worker secret alongside the key hash and session secret; local development continues to use its non-sensitive `ADMIN_EMAIL` variable. The Worker compares email addresses after trimming whitespace and ignoring case.

From the project root, prepare the files with the local helper:

```powershell
node scripts/prepare-template-production-secrets.mjs --email "your-admin-email@example.com"
```

The helper generates a random 256-bit login key and a separate random 256-bit session secret. It hashes the 64-character login key string using SHA-256 over its UTF-8 bytes, matching the Worker login code exactly. It creates `.env.production` with `ADMIN_EMAIL`, `ADMIN_KEY_HASH`, and `SESSION_SECRET`; it saves the login key separately in `.admin-login-key.local`. The helper prints no values and restricts both files to the current Windows user. Move the login key into your password manager, then remove `.admin-login-key.local` when you have confirmed the password manager entry. Never paste values into chat, source code, Vercel, command arguments, or logs.

Both generated files are covered by `.gitignore`; the helper checks that they are ignored and untracked before creating them. Do not force-add them to Git. Wrangler reads `.env.production` as its secrets file during the later deployment. Delete `.env.production` from your machine after deployment. Production config declares all three names as required, so a deploy without them should fail validation.

### 3. Apply the D1 migration remotely (only after approval)

Review the migration file first and ensure you selected the existing database above. From `cloudflare/worker`, the command is:

```powershell
npx wrangler d1 migrations apply qadri-poster-templates --remote --env production
```

This changes the existing remote D1 database. Do not run it during local review. Check Wrangler's confirmation and output carefully; it should identify the expected database. Do not use `--local` for the production migration.

### 4. Deploy the production Worker

After the migration succeeds and the production email and secret file are ready, from `cloudflare/worker` run:

```powershell
npx wrangler deploy --env production --secrets-file .env.production
```

This deploys the Worker and its production bindings. The production Worker name is `qadri-poster-template-api-production`. It uses `workers.dev` (no custom route or domain). Production CORS temporarily allows both the new `https://qadri-poster-maker.vercel.app` domain and the previous `https://islamic-poster-maker.vercel.app` domain, so the prior frontend can still be used for rollback. Both are exact origins; do not add `*` to `FRONTEND_ORIGINS`. Local development has its own separate list (`http://localhost:5173` and the previous Vercel domain). If either Vercel origin differs, update the exact origin before deployment. Preview deployments are not allowed by the production CORS list.

### 5. Find the deployed Worker URL

Wrangler prints the URL after deployment. It has this shape:

```text
https://qadri-poster-template-api-production.<your-workers-subdomain>.workers.dev
```

You can also find the `workers.dev` URL on the Worker overview page in **Workers & Pages**. Use the base URL only, without an `/api` suffix.

### 6. Set the Vercel frontend variable

In the Vercel project that hosts the existing frontend, open **Settings → Environment Variables**. Add `VITE_TEMPLATE_API_URL` with the Worker base URL from step 5. Apply it to Production. Apply it to Preview only if you intentionally want preview frontends to use this production API; note that browser calls from those origins will be rejected by CORS unless the exact origin is separately reviewed and added. Do not put any admin key, hash, session secret, or Cloudflare token in Vercel. `.env.example` shows the placeholder format.

### 7. Rebuild/redeploy Vercel

Save the variable and trigger a new Vercel deployment using the project's existing deployment workflow. Vite embeds `VITE_TEMPLATE_API_URL` at build time, so changing the setting alone does not update an already-built frontend. This step is separate from deploying the Worker.

### 8. Verify the live flow

After both services are intentionally released:

1. Open the production Vercel app and sign in to Admin with the configured email and privately retained generated key.
2. Create a draft, upload an image, edit it, publish it, then verify it appears in the public template gallery.
3. Open the public template from another browser/device and verify its editable project and image load.
4. Verify an unauthenticated browser cannot publish, edit, delete, or retrieve draft-only assets. Confirm the 100 published-template limit and image limits remain enforced.
5. Check Worker logs for errors, but never log or share credentials, request authorization headers, or secret values.

### 9. Roll back safely

For a Worker code/configuration issue, from `cloudflare/worker` use Wrangler's interactive rollback to the prior production version:

```powershell
npx wrangler rollback --env production
```

Review the selected version and confirm only if it is the intended one. Rollback immediately changes the live Worker; it does not undo D1 schema changes or Vercel deployments. If the frontend is the issue, redeploy the prior Vercel build or remove/restore `VITE_TEMPLATE_API_URL` and rebuild through the normal Vercel process. Do not drop D1 tables or delete KV objects as a rollback step. The initial schema migration is additive; leave it in place unless a separately reviewed database recovery plan is approved.

## Security and operating notes

- There is one configured admin identity and no public registration. Login compares the SHA-256 digest of a random 256-bit key and issues an 8-hour HMAC-signed session held only in frontend memory. `ADMIN_KEY_HASH` and `SESSION_SECRET` are Worker secrets, never Vite variables.
- Without a valid admin session, template create/edit/delete, image upload, cleanup and draft-asset access return unauthorized/hidden responses. CORS is an origin restriction, not a substitute for this server-side authorization.
- Production and local settings are separate Wrangler environments. The default environment has `workers_dev: false`, local plus the previous Vercel origin for local development, and local Wrangler bindings. The `production` environment has `workers_dev: true`, the exact new and rollback Vercel origins, and the verified existing resource IDs. Named Wrangler environments produce a suffixed Worker name.
- Fonts are not uploaded. Font settings remain in project JSON; personal font files remain local and require import on another device. Bundled fonts remain part of the Vercel frontend.
- D1 and KV Free quotas are shared at account level. The application does not switch to R2 or paid storage when limits are reached. See Cloudflare's current [D1 pricing and limits](https://developers.cloudflare.com/d1/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), and [KV limits](https://developers.cloudflare.com/kv/platform/limits/).
- Cloudflare documents that `wrangler secret put` immediately deploys a new Worker version. The deployment flow above instead supplies required secrets to the explicit deploy using `--secrets-file`. See [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/), [secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [D1 migrations](https://developers.cloudflare.com/d1/wrangler-commands/), and [Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
