# Neal Guides Vault

Private asset library for Neal Guides' video editors: gameplay clips, effects,
music and backgrounds, with download links, previews, tags and an admin panel
that manages everything (side menu groups, sections, subsections, cards, tags,
users, audit log).

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Data and login:** Supabase (Postgres with row-level security, Auth, Edge Functions)
- **Preview files:** Cloudinary (signed uploads from the admin panel)
- **Hosting:** Vercel

Security model and open items: [`docs/security-review.md`](docs/security-review.md).
Full spec and build log: [`PROJECT_SPEC.md`](PROJECT_SPEC.md).

## Branches

- `dev`: all work in progress.
- `main`: production. Stays empty until the owner says the system is final.

## Run it on your computer

Needs Node.js 20.9 or newer.

```bash
git clone https://github.com/failsdaddy-dev/nealguides-vault.git
cd nealguides-vault
git checkout dev
npm install
cp .env.example .env.local
```

Fill in `.env.local` (Supabase Dashboard → Project Settings → API Keys):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key (safe in the browser) |

Never put the Supabase secret key or any Cloudinary key in the web app.

```bash
npm run dev
```

Open http://localhost:3000. Without `.env.local` the dev server shows sample
data so the design can be checked; a production build refuses to start serving
pages without it.

## Supabase

The project is linked with the Supabase CLI (`npx supabase login`, then
`npx supabase link`). Interactive logins must be run in a normal terminal.

- **Database changes** live in `supabase/migrations/`. Check what would run
  with `npm run db:push:dry`, then apply with `npx supabase db push`. Each new
  migration is reviewed and approved by the owner first.
- **Types:** after a schema change, `npm run db:types` regenerates
  `src/lib/database.types.ts`.
- **Access test:** `supabase/tests/rls_test.sql` checks the row-level security
  rules (101 checks).
- **Edge Functions** (`supabase/functions/`): `get-asset-link`,
  `admin-create-user`, `admin-manage-user`, `cloudinary-sign-upload`,
  `cloudinary-delete-preview`. Deploy with
  `npx supabase functions deploy <name>`.
- **Function secrets:** keep them in `supabase/functions/.env` (git-ignored)
  and push with `npx supabase secrets set --env-file supabase/functions/.env`:
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `ALLOWED_ORIGINS`: comma-separated sites allowed to call the functions,
    e.g. `http://localhost:3000,https://your-domain`

## Deploy to Vercel

Only when the owner says so.

1. In Vercel, import the GitHub repository `failsdaddy-dev/nealguides-vault`.
   Framework: Next.js (detected). Build command and output: defaults.
2. Set the production branch to `main`.
3. Environment variables (Production, and Preview if previews are used):
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   The owner's computer has a ready-to-paste `.env.vercel` (git-ignored, real
   values): open it, copy everything, and paste it into Vercel → Project →
   Settings → Environment Variables (the editor accepts pasted `.env` text).
   These are the only two the web app needs; the Cloudinary keys stay in
   Supabase function secrets and must not be added to Vercel.
4. Deploy, then add the custom domain in Vercel → Project → Domains and set the
   DNS records Vercel shows.
5. Add the live domain:
   - to the `ALLOWED_ORIGINS` function secret (then push the secrets again);
   - in Supabase → Authentication → URL Configuration: Site URL and redirect URLs.
6. Before launch: remove the TEST content (see `PROJECT_SPEC.md`, "Test
   content") and work through the open items in `docs/security-review.md`.

## Project layout

```
src/app/            pages and routes (landing, login, library, admin)
src/components/     UI (HUD design parts in hud.tsx and app/globals.css)
src/components/admin/  admin panel screens
src/lib/            data access, URL state, Supabase clients, helpers
src/proxy.ts        session refresh and sign-in redirect for every page
supabase/           migrations, Edge Functions, RLS test, CLI config
docs/               security review notes
```

## Design

The whole app uses one gaming HUD look: angled buttons, corner-bracket
frames, green caps labels, grid backdrop. Reuse the parts in
`src/components/hud.tsx` and the "HUD parts", "HUD menu", "HUD cards" and
"HUD controls" blocks in `src/app/globals.css` for anything new.
