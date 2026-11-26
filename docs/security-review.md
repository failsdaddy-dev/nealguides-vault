# Neal Guides Vault: security review notes

Last reviewed: 2026-11-23 (Phase 4). These notes describe how the app is
protected today, what was checked, and what is still open. They hold no
secrets.

## 1. Who can do what

| Who | Can | Cannot |
| --- | --- | --- |
| Not signed in | See the landing page and the login page | Read any table, call any function, open any library page |
| Editor (active, not expired) | Browse published cards they are allowed to see (all cards when "all access" is on, otherwise cards with one of their tags), open download links | See drafts, write anything, see link URLs in page data |
| Disabled or expired user | Nothing, even with a still-valid login token | |
| Admin (active, not expired) | Everything in the admin panel: side menu groups, sections, subsections, cards, tags, users, audit log | |

Accounts are invite only: public sign-up is off, and only an admin can create
a login (through the `admin-create-user` Edge Function).

## 2. Layers of protection

Every rule is enforced on the server. The UI only hides what a user cannot use.

1. **Proxy (`src/proxy.ts`)**: runs before every page. It refreshes the
   Supabase session (`getClaims` verifies the token) and sends signed-out
   visitors to `/login`. Without Supabase settings a production build answers
   503 (fails closed).
2. **Admin gate (`src/components/admin/gate.tsx`)**: every admin page calls
   `requireAdmin()` on the server before rendering.
3. **Row-level security (Postgres)**: the database checks every read and write
   again (`supabase/migrations/20261120100100_access_rules.sql` and the
   sidebar-groups migration). Role comes from the `profiles` table only, never
   from user-editable metadata.
4. **Edge Functions**: each one verifies the caller's token in code
   (`getCaller` → `getClaims`), checks the caller is an active admin where
   needed (`isAdmin`), and only accepts requests from `ALLOWED_ORIGINS`
   (CORS fails closed).

## 3. Download links

- Link URLs (`card_links.url`) are never readable by browser roles.
- The only way to get one is the `get-asset-link` function: it checks the
  caller may see the card (same rules as RLS), writes an audit row, then
  returns the URL. Refusals are audited too.
- Page data and card lists carry only the link label and host badge, never the
  URL.

## 4. Preview files (Cloudinary)

- The Cloudinary API secret lives only in Supabase Edge Function secrets. It is
  never in the web app, the browser or the repository.
- Uploads are signed by `cloudinary-sign-upload`: the server picks the folder,
  a random file name and the allowed formats, so the browser cannot write
  anywhere else.
- `cloudinary-delete-preview` refuses anything outside the app's preview
  folders and any file a card still uses.
- Preview files are public files with unguessable names. The full files stay on
  their own hosts behind the download links.

## 5. Sign-in

- Sign-in runs on the server (`/api/auth/login`), same origin only.
- One generic error for every failure; it never says whether an email exists.
- Throttling: 5 failed attempts per email and 20 per IP address in 15 minutes,
  on top of Supabase Auth's own limits.
- Passwords: at least 12 characters, with upper case, lower case and a digit
  (Supabase Auth setting and the admin forms).

## 6. Browser headers (`next.config.ts`)

All pages: `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`X-Content-Type-Options: nosniff`, a `Permissions-Policy` that turns off
camera, microphone, location, payment and USB, and
`Cross-Origin-Opener-Policy: same-origin`.

Production only: a Content Security Policy (only this app, Supabase,
Cloudinary and the Loom embed) and `Strict-Transport-Security` for two years.

## 7. Audit log

Admin content changes (create, delete, publish, unpublish) are written by a
database trigger. Download link opens and refusals are written by
`get-asset-link`. User changes are written by the admin user functions. Admins
read it in Admin → Audit log.

## 8. What was checked

- RLS test (`supabase/tests/rls_test.sql`): 87 of 87 checks pass against the
  live project after the sidebar-groups migration.
- Supabase security advisors were run with the Supabase CLI; the only open item
  is the dashboard setting in section 9.
- `.env`, `.env.local` and `supabase/functions/.env` are git-ignored;
  `.env.example` has empty values only.
- No secret key is in any `NEXT_PUBLIC_*` variable.

## 9. Open items (owner decisions)

| Item | Risk | What to do |
| --- | --- | --- |
| Leaked password protection is off | A user could pick a password known from a breach | Supabase Dashboard → Authentication → turn on leaked password protection |
| Admin password | The first admin password was set before the 12-character rule | Change it in the account to one that meets the rule |
| CSP allows `'unsafe-inline'` scripts | Weaker protection if an injection bug ever appeared | Nonce-based CSP is on the Later list |
| Login throttle counts per server instance | On Vercel, several instances each keep their own count | Supabase Auth limits still apply; a shared store can be added later if needed |
| TEST content | Removed 2026-11-26 (cards, links, preview files, test tags) | Done |
| Production domain | Edge Functions refuse requests from origins not in `ALLOWED_ORIGINS` | Add the live domain to `ALLOWED_ORIGINS` and to Supabase Auth URLs at deploy |
| npm dev-only advisories | Only affect development tools, not the deployed app | Update when fixed upstream |
