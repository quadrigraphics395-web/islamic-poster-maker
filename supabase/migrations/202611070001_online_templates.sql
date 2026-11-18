-- Online shared templates. Run in the Supabase SQL editor after creating the project.
create table if not exists public.template_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '',
  category text not null check (char_length(category) between 1 and 60),
  featured boolean not null default false,
  published boolean not null default false,
  project jsonb not null,
  preview_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists templates_published_category_idx on public.templates (category, featured desc, updated_at desc) where published;
create index if not exists templates_updated_at_idx on public.templates (updated_at desc);

create or replace function public.set_template_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at before update on public.templates
  for each row execute function public.set_template_updated_at();

alter table public.template_admins enable row level security;
alter table public.templates enable row level security;
revoke all on public.template_admins from anon, authenticated;
revoke all on public.templates from anon, authenticated;
grant select on public.templates to anon, authenticated;
grant insert, update, delete on public.templates to authenticated;

create or replace function public.is_template_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from public.template_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_template_admin() from public;
grant execute on function public.is_template_admin() to anon, authenticated;

create policy "published templates are readable by everyone"
  on public.templates for select to anon, authenticated using (published or (select public.is_template_admin()));
create policy "only admins create templates"
  on public.templates for insert to authenticated with check ((select public.is_template_admin()));
create policy "only admins update templates"
  on public.templates for update to authenticated using ((select public.is_template_admin())) with check ((select public.is_template_admin()));
create policy "only admins delete templates"
  on public.templates for delete to authenticated using ((select public.is_template_admin()));

-- Create a private bucket. Admin-only writes; published template assets are served through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('template-assets', 'template-assets', false, 52428800, array['image/png','image/jpeg','image/webp','image/svg+xml','font/ttf','font/otf','font/woff2'])
on conflict (id) do nothing;
create policy "admins manage template assets" on storage.objects
  for all to authenticated using (bucket_id = 'template-assets' and (select public.is_template_admin()))
  with check (bucket_id = 'template-assets' and (select public.is_template_admin()));
-- Visitors receive short-lived URLs only from the template-asset-url Edge Function.
-- Keep storage.objects private; no visitor SELECT policy is granted.

-- Bootstrap is intentionally an authorized SQL operation. Create the user through
-- Supabase Dashboard > Authentication > Users, then replace the UUID and run this:
-- insert into public.template_admins (user_id) values ('AUTH_USER_UUID');
