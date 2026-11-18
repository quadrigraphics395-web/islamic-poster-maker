# Online template setup

1. Create or select a Supabase project. In Authentication, create the first user from the dashboard; do not enable any client-side admin registration flow.
2. Run `migrations/202611070001_online_templates.sql` in the Supabase SQL Editor.
3. Copy the new user's UUID from Authentication → Users and run the bootstrap `insert into public.template_admins ...` statement at the end of the migration with that UUID.
4. Deploy the signed asset resolver: `supabase functions deploy template-asset-url --no-verify-jwt`. The function uses the project's `SUPABASE_SERVICE_ROLE_KEY` only in its server environment; never put that key in the Vite environment.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the local `.env` and the hosting provider's build environment. Restart/rebuild Vite after changing them.
6. Sign in through **Admin Login** in the gallery using the user created in step 1. There is no public admin registration.

The storage bucket is private. Visitors can receive a 90-second signed URL only when an asset is referenced by a published template; an unpublished or deleted template's assets are not eligible. Personal projects and the existing IndexedDB template library stay on the device.
