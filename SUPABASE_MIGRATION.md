# Supabase key migration notes

## What changed

Supabase recommends migrating browser apps from the legacy JWT-based `anon` key to the new `sb_publishable_...` key.

- `anon` is not the same as anonymous sign-in.
- Browser apps can still use a public key, but the recommended public key is now `sb_publishable_...`.
- Server-only operations must stay on backend code with `sb_secret_...` or `service_role`, never in the browser.

Reference:
- https://supabase.com/docs/guides/api/api-keys

## Impact on this project

This app initializes Supabase directly in the browser and depends on public-key access for:

- Auth: sign up, sign in, sign out, update password
- Data access: `books` and `settings` table reads/writes
- Session restore: `auth.getSession()`

That means the immediate migration path is:

1. Keep the browser architecture.
2. Replace the legacy `anon` key in `app-config.js`.
3. Use a new `sb_publishable_...` key from Supabase.
4. Verify Row Level Security policies still protect `books` and `settings`.

## Practical checklist

1. In Supabase Dashboard, open Project Settings -> API Keys.
2. Create or copy a Publishable key.
3. Replace `supabaseKey` in `app-config.js`.
4. Test login, signup, book CRUD, appearance save, and password change.
5. After confirming production traffic no longer uses the legacy key, deactivate the old `anon` key if desired.
6. Apply the matching RLS SQL from `supabase-rls.sql` or `supabase-rls-Settings.sql`.

## RLS checks for this app

This frontend reads and writes user-scoped data directly from the browser, so migration is safe only if RLS is correct.

Expected access model:

- `books`: authenticated users can read and write only rows where `user_id = auth.uid()`
- `settings`: authenticated users can read and write only rows where `user_id = auth.uid()`

Example policies to compare against your project:

```sql
alter table public.books enable row level security;
alter table public.settings enable row level security;

create policy "books_select_own"
on public.books
for select
to authenticated
using (user_id = auth.uid());

create policy "books_insert_own"
on public.books
for insert
to authenticated
with check (user_id = auth.uid());

create policy "books_update_own"
on public.books
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "books_delete_own"
on public.books
for delete
to authenticated
using (user_id = auth.uid());

create policy "settings_select_own"
on public.settings
for select
to authenticated
using (user_id = auth.uid());

create policy "settings_upsert_own"
on public.settings
for insert
to authenticated
with check (user_id = auth.uid());

create policy "settings_update_own"
on public.settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

If your table name is actually `Settings`, adapt the SQL accordingly.

Ready-to-run files in this repo:

- `supabase-rls.sql`: for `public.settings`
- `supabase-rls-Settings.sql`: for `public."Settings"`

Before running either file, confirm:

- `books.user_id` exists and stores the authenticated user id
- `settings.user_id` or `"Settings".user_id` exists and stores the authenticated user id
- Existing data already has correct `user_id` values, otherwise current users may stop seeing old rows after RLS is enabled

## Smoke test after key swap

1. Open the app with the new key.
2. Confirm the warning banner about the old key is gone.
3. Sign up or sign in.
4. Create a book and refresh the page.
5. Edit and delete the same book.
6. Save appearance settings and reload.
7. Change password and log in again with the new password.

## Important caution

Switching from `anon` to `publishable` does not make the key secret. It is still a browser-safe public key, so security must continue to rely on:

- Row Level Security enabled on every exposed table
- Correct policies for `anon` and `authenticated`
- No server-only secrets shipped to the frontend
