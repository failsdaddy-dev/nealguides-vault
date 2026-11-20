# NealGuides Vault: Project Specification

Status: APPROVED (Step 0 answers received 2026-11-20). Phase 1 done, Phase 2 done (database live), Phase 3 part 1 done. See **Build log and current state** below before doing anything; it is the up-to-date context.

Reference project (read-only): `C:\Agents\rohtre-vault`.

## Build log and current state (keep this updated)

Last updated: 2026-11-20. This section is the working memory of the build.
It holds no secrets (keys live only in git-ignored files).

### Where things are
- **Code:** `C:\Agents\nealguides-vault`. **GitHub:** `failsdaddy-dev/nealguides-vault`.
  - `dev` = all work (push only when the owner says "push").
  - `main` = one empty commit; stays empty until the owner says the system is final.
- **RohTre Vault** (`C:\Agents\rohtre-vault`) is read-only reference. Never edit it, its Supabase, Vercel or domain.
- **Supabase project:** `NealGuides-Vault`, ref `srrehtvvduncbhygxmsu` (owner's new account). The Supabase CLI on this machine is logged in to that account (via `npx supabase login --no-browser` in a real terminal) and linked.
- **Cloudinary:** new account, cloud name `xl5hcj3t` (Free plan). Key and secret are only in `supabase/functions/.env` (git-ignored) and as Supabase function secrets.
- **Env files (git-ignored):** `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and the publishable key (the app is out of sample mode). `supabase/functions/.env` has the Cloudinary values and `ALLOWED_ORIGINS=http://localhost:3000`.
- **Admin account:** one user created by the owner in the Supabase dashboard and promoted to `role = 'admin'` with SQL (owner approved). The owner was advised to change its password to one meeting the 12+ chars, upper, lower, digit rule.

### Owner's rules (still in force)
- Work in phases; after each phase report (what was built, files, assumptions, manual test checklist) and ask before the next phase.
- Do NOT run lint, build or tests; the owner runs the site. (Reading pages in Chrome is fine.)
- No deploy, push, merge, DNS or domain change unless the owner says so. Commit on `dev` only.
- No secrets in output, code, logs or commits. Never print key values.
- **Every migration: write the file, show the SQL summary, WAIT for approval, then dry run, then push.**
- Never invent facts, content, prices, statistics or testimonials. No emoji. Official logos only from nealguides.com.
- **The site must NOT look like RohTre Vault.** Keep RohTre's features and functionality only; UI, UX and icons are our own gaming (HUD) design, matching the landing page.
- If something is unclear, ask; do not guess.

### Product decisions made during the build (on top of section 0)
- Product name: **Neal Guides** (renamed from "Neal Guide").
- Fonts: **Chakra Petch** (headings) + **Exo 2** (body), for a gaming look.
- **HUD theme everywhere** (see section 12): sharp corners, grid backdrop, angled green buttons with a light sweep, panels with green corner brackets, `ng-tag` labels, glow accents. Shared parts: `src/components/hud.tsx` and the "HUD parts", "HUD menu" and "HUD cards" blocks in `globals.css`.
- **Landing intro:** game-style boot screen before the landing page (HUD corners, scanline, glitching logo, loading bar with counter, shutter reveal), once per browser tab, skippable, off for reduced motion (`src/components/landing-intro.tsx`).
- **Login:** a centred game-style console (`auth-shell.tsx`), also used by no-access and not-found.
- **Icons:** our own set (`src/components/icons.tsx`): angular, mitred, diamonds and chamfers. RohTre's icons removed.
- **Sidebar:** sections from the database; a section with subsections opens like a dropdown ("All <section>" + each subsection, `?sub=<slug>`); the current section opens itself. Editable entirely from Admin -> Sections.
- Next.js upgraded to **16.4.6** (security release).

### Database (live)
Migrations in `supabase/migrations/`, all pushed and approved:
1. `20261120100000_core_schema.sql`: tables (profiles, sections, **subsections**, filter_groups, filters, cards, card_filters, card_links, user_filter_access, audit_log); section kinds gameplay/effect/music/background; media types youtube (clip)/audio/**image**; preview limits as CHECKs (clip 10 s / 2 MB, MP3 30 s / 1 MB, image 1 MB JPG/PNG/WebP, all under `nealguides-vault/`); links: any https host, no user:password@, max 2,000 chars, **host badge** computed (google-drive, mega, dropbox, wetransfer, other); `all_access` default true.
2. `20261120100100_access_rules.sql`: RLS on every table, anon has nothing, link URLs never granted to browser roles, admin = active admin profile (no 2FA).
3. `20261120100200_triggers_and_rpc.sql`: profile on sign-up, login audit, host badge and link flags, search text, admin content audit (create/delete/publish), `browse_cards` (with `p_sub`), `filter_counts` (with `p_sub`), admin RPCs (links, tags, merge, reorder incl. subsections, open counts), `release_asset_link`.
4. `20261120100300_seed_sections.sql`: FC Gameplay Clips (+ Shorts), Effects, Music, Backgrounds.
5. `20261120110000_lock_rls_auto_enable.sql`: revokes public execute on Supabase's own `rls_auto_enable()` (advisor warning).
- **RLS test** `supabase/tests/rls_test.sql`: **78 passed, 0 failed** on the live database (it rolls itself back). Run with `npx supabase db query --linked -f supabase/tests/rls_test.sql`.
- Supabase security advisor: **no issues**.
- `src/lib/database.types.ts` is generated from the live schema (`npx supabase gen types typescript --linked --schema public`).

### Edge Functions (deployed)
`get-asset-link`, `admin-create-user`, `admin-manage-user`, `cloudinary-sign-upload`, `cloudinary-delete-preview` (adapted from RohTre): CORS fail-closed via `ALLOWED_ORIGINS` plus a server-side origin check; passwords 12+ with upper, lower, digit; image previews; `nealguides-vault/` folders. Secrets set: Cloudinary cloud name, key, secret, `ALLOWED_ORIGINS`. **Before launch:** add the production domain to `ALLOWED_ORIGINS`.

### Admin panel
Same powers as RohTre's (checked file by file) plus: subsections per section, card subsection picker, image previews (shrunk to WebP in the browser when over 1 MB), link checks with live host badge, 20 links per card, new audit labels, all access on by default for new editors. The admin can create any section with any name; its type (gameplay/effect/music/background) sets the buttons and default preview.

### Test content (live, remove before launch)
- 13 published **TEST** cards: FC Gameplay Clips 4 (+2 in Shorts, vertical), Effects 2, Music 2, Backgrounds 2 images + 1 loop. Media are original ffmpeg animations marked "TEST", uploaded to Cloudinary `nealguides-vault/`.
- Each card has 3 example links (Google Drive, Mega, example.com) that are not real files.
- Tag groups "Test style" and "Test format" (tags test-neon, test-retro, test-16x9, test-9x16).
- **Cleanup:** delete the cards in Admin -> Cards (removes their Cloudinary files too), then delete the two test tag groups in Admin -> Tags.

### Phase status
- **Phase 1** (foundation): done.
- **Phase 2** (data and admin): done; database live, functions deployed, RLS 78/78.
- **Phase 3** (vault experience): **part 1 done** (icons, sidebar with subsection dropdowns, section header and subsection tabs, HUD cards incl. Shorts and image cards, host badges, card page with files list, filter chips, skeletons, empty states).
  - **Part 2 to do:** top search bar, clip pop-up (video modal), bottom music player bar, account menu, admin screens in full HUD style; then the Phase 3 manual test.
- **Phase 4** (polish and handover): not started (accessibility, phone/tablet checks, security review notes, README, Vercel deploy, domain).

### Known notes
- The in-memory login rate limit counts per server instance; Supabase Auth limits apply on top.
- npm reports dev-only advisories (vitest, typescript-eslint, zod); production dependencies are clean.
- Two npm install scripts were skipped (esbuild, unrs-resolver); `next dev` does not need them.
- The `!` prompt is not a real terminal: interactive CLI logins must be run by the owner in a normal terminal.

## 0. Decisions (owner's answers, 2026-11-20)

Where this table conflicts with later sections, this table wins.

| # | Question | Decision |
|---|---|---|
| 1 | RohTre path | `C:\Agents\rohtre-vault`; build in `C:\Agents\nealguides-vault` |
| 2 | Setup | Claude does the setup (env, CLI link); migrations still wait for approval |
| 3 | Name | **Neal Guides** (page title, header; renamed from "Neal Guide" at the user's request) |
| 4 | Domain | Decide at deployment (Phase 4) |
| 5 | Sidebar | FC Gameplay Clips with a **Shorts** subsection |
| 6-8 | More sections | Effects, **Music**, **Backgrounds**: all approved |
| 9 | "12 sections" | A mistake; only the approved sections |
| 10 | More sections later | Admin adds them from the panel |
| 11 | Sign-up | Invite only, admin creates accounts |
| 12 | 2FA | **No 2FA** (same as RohTre) |
| 13 | Idle timeout | **None** (sign-out on all tabs still applies) |
| 14 | Editor visibility | Every editor sees all published cards (new users default to all access; per-tag restriction stays in the data model like RohTre) |
| 15 | Download log | Yes: audit log of who opened which link |
| 16 | Cloudinary | **New Cloudinary account** (not RohTre's); folder `nealguides-vault/` |
| 17 | Uploads | Signed uploads, folder forced on the server, no preset |
| 18 | Cloudinary key | New key provided; stored only in git-ignored `supabase/functions/.env` |
| 19 | Card features | **Keep all RohTre card features** (full YouTube video, Loom tutorial, project files + downloads, music "Open on platform") plus the generic any-host download link |
| 20 | Multiple links | Yes, each labelled |
| 21 | Image previews | Yes, in addition to clips |
| 22 | Unclear recording lines | Ignored; any https link is accepted |
| 23 | Uploads feed | On the Later list |

---

## 1. Purpose

Neal Guides makes FC gameplay content and works with video editors. Editors
need short gameplay clips, effects and similar assets for his videos and
Shorts. He does not want to hand them his whole Google Drive.

NealGuides Vault is a private, sign-in-only library of assets that Neal
chooses. Each asset is a card with a short preview and a download link that
points to wherever the file already lives (Google Drive, Mega, Dropbox,
WeTransfer, a direct file, anything https). The Vault never stores, converts
or proxies the real files.

Security matters a lot to the client: sign-in, sign-out, access control and
not leaking the list of assets or links are core requirements, not polish.

## 2. Requirements extracted

Source: the Loom transcript (Hindi-English, transcribed imperfectly) and the
written brief in the chat message. The two attachment files
`624abe6d-attachment.txt` and `40514029-attachment.txt` were NOT found on this
machine; see question list.

### From the voice notes

| # | Requirement | Confidence |
|---|---|---|
| V1 | Same functionality as the existing Vault (RohTre Vault), customised for Neal Guides | Clear |
| V2 | Editors preview a clip, download it, use it in a video | Clear |
| V3 | Do not give the client "the whole vault"; a separate instance just for Neal | Clear |
| V4 | Own subdomain, transcribed as "neal rights dot social media dot com" | **UNCLEAR** (see question c) |
| V5 | Sidebar (not top nav) with a "Vault" area | Clear |
| V6 | Vault contains "Gameplay clips" and "Effects" | Clear |
| V7 | Top of sidebar header: transcribed as "Neez Elite" / "Neal GITS" / "nail rise"; most likely "Neal Guides" | **UNCLEAR** (assumed "Neal Guides") |
| V8 | Inside FC Gameplay, a "Shorts" section | Clear-ish (is it a subsection of FC Gameplay, or its own section?) |
| V9 | "Music can be used"; reference to a "seller" project's menu bars | **UNCLEAR** (Music as a section? what is the "seller" project?) |
| V10 | No memes | Clear |
| V11 | Clips are the same kind as the existing Vault's clips | Clear |
| V12 | Client is very security-conscious: sign in / sign out are very important | Clear |
| V13 | Client's assets sit in a large Google Drive; use it if possible, Google Drive is not required; something transcribed as "laal mirch" may be an alternative host (Mega?) | **UNCLEAR**; resolved by accepting any https link |
| V14 | Future: dashboard showing new uploads from the client's YouTube channel (like an RSS feed), each marked "Shorted" / "Done" / "Tweeted" so the team tracks which videos have been cut into Shorts | Clear (Later) |
| V15 | Future: the tweet automation built earlier, inside this Vault | Clear (Later) |
| V16 | Second sidebar item, transcribed as "upload ... subscribe ... quality gameplay" | **UNCLEAR** (likely the future YouTube uploads feed, V14) |
| V17 | "Backgrounds" mentioned once ("isi ke background") | **UNCLEAR**; may be mis-transcription |

### From the written brief

- Clone RohTre Vault's structure and functionality; new UI (dark only, navy and green, own fonts, no 3D effects, new landing and login pages).
- Roles: admin and editor. Editors read published cards only; only admins write.
- Admin: CRUD and reorder sections, subsections, cards; Cloudinary previews; users and roles.
- Cards: title, description, tags, preview media, generic Download link (any https), ordering, visibility; host badge; opens in a new tab with `rel="noopener noreferrer"`.
- Vault pages: grid, sidebar navigation, search and filters, preview animations, skeletons, empty states.
- Cloudinary: same account as RohTre, separate folder prefix, server-side secret only.
- Security: server-side authorisation, RLS, secure cookies, session timeout, sign-out on all tabs, input validation, no secrets in client bundles, login rate limiting, security headers, nothing listed to logged-out users.
- "12 sections" is mentioned; possibly a mistake (**UNCLEAR**).
- Later (not now): YouTube uploads feed with Shorted/Done marker, tweet automation.

## 3. What RohTre Vault is (findings)

Stack: Next.js 16 (App Router, `proxy.ts`, Cache Components), React 19,
TypeScript, Tailwind 4, Supabase (Postgres + RLS, Auth, Edge Functions on
Deno), Cloudinary for previews, ffmpeg.wasm for in-browser clip trimming,
Vitest.

**Routes**
- `/` public landing (no library content), signed-in users redirected to the first section.
- `/login` email + password (browser `signInWithPassword`), `?next=` same-site only.
- `/no-access` for disabled or expired accounts.
- `/auth/signout` POST-only route handler.
- `(hub)/[section]` card grid; `(hub)/[section]/[slug]` card page.
- `(hub)/admin`, `/admin/sections`, `/admin/cards`, `/admin/cards/new`, `/admin/cards/[id]`, `/admin/filters`, `/admin/users`, `/admin/audit`.

**Auth flow**
- `proxy.ts` refreshes the session cookie (`getClaims`, verified JWT) and redirects guests to `/login`; sets `Cache-Control: private, no-store`.
- `lib/auth.ts`: `requireViewer()` (signed in + active + not expired), `requireAdmin()` (404 for non-admins). Role is read from `profiles`, never from user metadata.
- No public sign-up; admin creates accounts through the `admin-create-user` Edge Function. Disabling a user also bans the login.

**Database** (`supabase/migrations`)
- `profiles` (role admin/editor, is_active, all_access, expires_at), `sections` (slug, name, kind enum, sort_order, is_visible), `filter_groups` + `filters` (tags, with "quick" chips), `cards` (status draft/published, sort_order, full-text `search_tsv`, trigram title search, preview_clip / audio_preview JSON), `card_filters`, `card_links` (label + url; **url column never granted to browser roles**), `user_filter_access` (restricted editors see only cards with their tags), `audit_log`.
- RLS on every table, `anon` has no grants at all. Helpers in a non-exposed `private` schema (`is_admin`, `can_view_card`, `can_view_filter`, security definer, empty search_path).
- RPCs: `browse_cards` (grid, search, filters, cursor pagination; OR within a tag group, AND across groups), `filter_counts`, `admin_card_links`, `admin_save_card_links`, `admin_set_card_filters`, `admin_merge_filters`, `admin_reorder`, `admin_link_open_counts`, `release_asset_link` (service role only).
- Database CHECK constraints refuse previews outside the Cloudinary folder or over size/length limits.

**Edge Functions**: `get-asset-link` (access check + audit, then returns one URL), `admin-create-user`, `admin-manage-user` (disable/enable/delete/set_access/update/reset_password), `cloudinary-sign-upload` (server picks folder and random public_id, signs), `cloudinary-delete-preview` (refuses files still in use). CORS limited to `ALLOWED_ORIGINS`.

**Cloudinary**: signed direct-from-browser uploads (no upload preset), folders `rohtre-vault/previews` (clips up to 10 s / 2 MB) and `rohtre-vault/music` (MP3 up to 30 s / 1 MB). Secrets are Supabase function secrets `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, never in `.env.local`.

**Previews**: `preview-coordinator.ts` autoplays up to 8 on-screen clips (nearest the viewport centre first, staggered), or hover-only; pauses when the tab is hidden, a modal is open, or `prefers-reduced-motion` is set. Cards use a silent `<video>` from a Cloudinary 480 px transform.

**Headers**: X-Frame-Options DENY, CSP (production), nosniff, Referrer-Policy, Permissions-Policy, noindex everywhere, robots disallow all.

### RohTre design choices I would NOT copy (security)

1. **No 2FA.** RohTre removed admin 2FA (migration `20261012100000_remove_2fa.sql`, which also deletes all MFA factors). For a security-focused client I recommend optional TOTP 2FA, required for admins (RohTre's earlier `admin_mfa_switch` design). TO CONFIRM.
2. **Sample mode with no login.** Without `.env.local`, RohTre opens the library with no sign-in and a fake admin user. NealGuides will fail closed: missing configuration shows an error page, sample mode only in `next dev`.
3. **Login rate limiting relies only on Supabase defaults**, and sign-in happens directly from the browser. NealGuides: sign-in goes through a server route with per-IP and per-email throttling, plus tightened Supabase Auth rate limits.
4. **No idle timeout and no cross-tab sign-out.** NealGuides adds both.
5. **CORS fallback.** When `ALLOWED_ORIGINS` is unset RohTre defaults to localhost; NealGuides refuses all browser origins until it is set.
6. **CSP `'unsafe-inline'` for scripts.** Kept at first (Next.js needs it without nonces), with nonce-based CSP listed under Later. RohTre also needs it for its theme switch; NealGuides has no theme switch.

Things worth keeping exactly: hidden link URLs released only after an access check and logged; RLS on every table with no `anon` grants; admin-only Edge Functions for user management; database-level preview limits; `?next=` same-site check; POST-only sign-out.

## 4. Roles and permissions

| Action | Guest | Editor | Admin |
|---|---|---|---|
| See landing and login pages | yes | yes | yes |
| See any section, card, tag, count or link | no | published cards they may see | everything incl. drafts |
| Open a download link | no | yes, for visible cards (logged) | yes (logged) |
| Create / edit / reorder / delete sections, subsections, cards, tags | no | no | yes |
| Upload / delete Cloudinary previews | no | no | yes |
| Create / disable / delete users, set roles and access, reset passwords | no | no | yes |
| Read audit log | no | no | yes |

Editor visibility: "All access" or restricted to certain tags, exactly as
RohTre (TO CONFIRM that Neal wants per-editor restriction at all; it costs
nothing to keep).

Accounts: invite-only, admin creates them (recommended, question d).

## 5. Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Short landing: what the Vault is, Sign in button. No asset data. Signed-in users go to the first section. |
| `/login` | public | Sign in (email + password; 2FA step if enabled). |
| `/api/auth/login` | public, POST | Server-side sign-in with rate limiting, sets secure cookies. |
| `/auth/signout` | POST | Sign out, clears cookies, broadcasts to other tabs. |
| `/no-access` | public | Disabled or expired account. |
| `/[section]` | signed in | Card grid; `?sub=`, `?q=`, `?f=`, `?sort=` in the URL. |
| `/[section]/[slug]` | signed in | Card page (large preview, description, tags, download buttons). |
| `/admin` | admin | Overview (counts, recent downloads). |
| `/admin/sections` | admin | Sections and subsections: create, rename, hide, reorder, delete. |
| `/admin/cards`, `/admin/cards/new`, `/admin/cards/[id]` | admin | Card list (filter, reorder, publish), card editor. |
| `/admin/tags` | admin | Tag groups and tags (RohTre "filters"), merge, quick chips. |
| `/admin/users` | admin | Users, roles, access, disable, reset password. |
| `/admin/audit` | admin | Sign-ins, downloads, admin actions. |
| `/robots.txt` | public | Disallow all. |

Admin pages call `requireAdmin()` on the server; non-admins get 404. Every
write is checked again by RLS or the Edge Function.

## 6. Sidebar (built: see Build log; sections and subsections from the database)

```
[NG logo]  Neal Guides          <- top header bar
-----------------------------
VAULT
  FC Gameplay Clips
     All
     Shorts                     <- subsection
  Effects
  Music                         <- only if approved
  Backgrounds                   <- only if approved
-----------------------------
Admin                           <- admins only
```

Sections and subsections are data, so the admin can add more later without
code changes. I will seed only the approved list.

## 7. Data model (new Supabase project)

Same design as RohTre, adapted:

- `profiles`: id, email, display_name, role (`admin`|`editor`), is_active, all_access (**default true**, decision 14), expires_at, timestamps. (`must_change_password` dropped.)
- `sections`: id, slug, name, kind (`gameplay`|`effect`|`music`|`background`, decides the icon and default preview type), sort_order, is_visible.
- `subsections` (**new**): id, section_id, slug (unique per section), name, sort_order, is_visible.
- `cards`: id, section_id, subsection_id (nullable, must belong to the same section), slug, title, description, status (`draft`|`published`), sort_order, media_type (`youtube`|`audio`|`image`), preview_clip, audio_preview, preview_image (**new**) (jsonb), `link_hosts text[]` (badge keys, readable), has_project_files, has_downloads, filter_text, search_tsv, published_at, created_by, timestamps. Kept from RohTre per decision 19: youtube_id, preview_start/end, loom_url, source_url.
- `card_links`: id, card_id, kind (`project`|`download`, as RohTre), label (for example "1080p", "4K", "Premiere Pro"), url (https only, no user:password@, max 2,000 chars, **never granted to browser roles**), host (computed: `google-drive`, `mega`, `dropbox`, `wetransfer`, `other`) and host_name (readable), sort_order. Up to 20 per card.
- `filter_groups`, `filters`, `card_filters`: tags, unchanged.
- `user_filter_access`: unchanged.
- `audit_log`: unchanged (login, open_link, open_link_denied, admin_*).
- RPCs as RohTre (`browse_cards` gains `p_sub`), plus `admin_reorder` support for subsections.
- CHECK constraints: preview `public_id` must start with `nealguides-vault/`, size and length limits, link URL `^https://`, length limits on all text.

Migrations are written as files in `supabase/migrations/` and **not run**
until you approve the SQL summary.

## 8. Download link handling

- Admin pastes any `https://` URL. Validated in the form, in the database (CHECK) and by the save RPC: must parse as a URL, scheme https, has a host, no credentials in the URL, max 2,000 characters.
- Host badge computed on save from the hostname: `drive.google.com` / `docs.google.com` -> Google Drive; `mega.nz` / `mega.io` -> Mega; `dropbox.com` / `dl.dropboxusercontent.com` -> Dropbox; `wetransfer.com` / `we.tl` -> WeTransfer; anything else -> Other (shows the bare host name).
- The URL is not in the page or the card list. On click the browser calls `get-asset-link` (checks access, writes the audit row) and opens the returned URL in a new tab with `noopener,noreferrer`. The file goes straight from Drive/Mega/etc. to the editor; our server never downloads or proxies it.
- Note: links themselves must be shared correctly on Google Drive ("Anyone with the link" or shared with the editor's Google account). The Vault cannot change Drive permissions.

## 9. Cloudinary

- Same account as RohTre, separate folder prefix `nealguides-vault/` (`nealguides-vault/previews` for clips, `nealguides-vault/images` for still images, `nealguides-vault/music` if Music is approved).
- Recommended: **signed uploads**, as RohTre does. The Edge Function forces the folder, a random public_id and allowed formats in the signature, so the browser cannot write anywhere else. This is stricter than an upload preset (an unsigned preset can be used by anyone who finds its name). A named signed preset `nealguides-vault` restricted to the folder can be added on top if you want it visible in the Cloudinary console (question e).
- Limits (same as RohTre unless you say otherwise): clip up to 10 s and 2 MB (MP4/WebM/MOV); image up to 1 MB (JPG/PNG/WebP); MP3 up to 30 s and 1 MB.
- Previews are public files with unguessable names (previews only, never the real asset).
- Deleting or replacing a preview deletes the old file (refused if a card still uses it, and refused outside `nealguides-vault/`).
- Variable names reused from RohTre: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, set as **Supabase Edge Function secrets**, not in `.env.local`, not in Vercel.
- Recommended: generate a dedicated API key pair for NealGuides in Cloudinary (Settings -> API Keys), so it can be revoked without touching RohTre.

## 10. Environment variables

`.env.local` (git-ignored; you fill it) and `.env.example` (empty values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Supabase Edge Function secrets (set by you with `npx supabase secrets set`):

```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
ALLOWED_ORIGINS
```

The Supabase secret key is never used by the Next.js app; Edge Functions get
it from the Supabase runtime.

## 11. Security rules

- Server-side checks everywhere: `proxy.ts` gate, `requireViewer` / `requireAdmin` in every page and route handler, RLS on every table, admin checks inside every Edge Function and security-definer RPC.
- `anon` has no table grants and no RPC grants. Logged-out visitors see no section names, counts, cards or links.
- Link URLs never reach the browser except the one being opened, after an access check, and that open is logged.
- Cookies: `@supabase/ssr` cookies with `Secure`, `HttpOnly` where possible, `SameSite=Lax`.
- Session timeout: idle sign-out after 30 minutes of inactivity (TO CONFIRM the duration) plus Supabase JWT expiry 1 hour with refresh-token rotation.
- Sign-out on all tabs: `BroadcastChannel` + Supabase `onAuthStateChange`; signing out in one tab sends every tab to `/login`. Admin "disable user" bans the login and RLS blocks it at once.
- Login rate limiting: server route throttles by IP and by email (for example 5 failures in 15 minutes -> wait), plus Supabase Auth rate limits. Generic error message (no "user exists" hints).
- Input validation: on the client, in route handlers / Edge Functions, and in database CHECK constraints. React escapes output; no `dangerouslySetInnerHTML` for user content.
- Headers: CSP, X-Frame-Options DENY, frame-ancestors none, nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy, HSTS (production), noindex.
- No secrets in client bundles: only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key are public by design.
- Optional TOTP 2FA, required for admins (TO CONFIRM).

## 12. UI direction

- Dark theme only, no toggle.
- Colours sampled from nealguides.com (live CSS, 2026-11-20):
  - Navy `#121122` (hero background, cards, menu): page background.
  - Navy secondary `#464566`: borders and muted surfaces.
  - Green `#25c05f` (buttons, headline accent): primary accent. Darker green `#319248` for pressed / hover states.
  - Derived tokens: elevated surface (navy lightened), text `#ffffff`, muted text, danger.
  - Contrast: green on navy about 7.8:1 (passes AA and AAA for text). White on green is only about 2.4:1, so buttons use navy text on green (about 7.8:1), unlike the public site.
- Fonts: **Chakra Petch** (headings; angular esports-style caps) + **Exo 2** (body and UI). Chosen for a gaming look at the user's request. Both SIL Open Font License, self-hosted through `next/font`. Not RohTre's Space Grotesk.
- **HUD theme (gaming look, applies to every page):** sharp corners (Tailwind radius scale overridden), faint grid backdrop, angled-corner green buttons with a light sweep, `.ng-panel` surfaces with green corner brackets, `.ng-tag` labels, `.ng-btn-ghost`, reticle around the emblem, ticker band. Shared pieces: `src/components/hud.tsx` and the "HUD parts" block in `globals.css`. New pages must use these.
- Logo: the official NealGuides emblem + wordmark from nealguides.com in `/public/brand` (black on transparent; shown white on the dark theme with a CSS filter, file unchanged). Favicons from the same site.
- Motion: fade, slide, small scale on focus, hover preview playback. No 3D buttons, no 3D card tilt. Everything respects `prefers-reduced-motion`.
- Layout: top header bar with logo + "Neal Guides", left sidebar (full / icon rail / drawer on mobile), content area. Own visual design; **must not look like RohTre Vault** (owner's rule).
- Icons: our own HUD set in `src/components/icons.tsx` (angular, mitred, diamonds). Do not reuse RohTre's icons.
- Landing intro: game-style boot animation before the landing page (see Build log).
- Landing: short, logged-out only. What the Vault is (a private asset library for Neal Guides' editors), a Sign in button. No copied nealguides.com text, no invented numbers or claims.

## 13. Phased build plan

### Phase 1: Foundation
Next.js + TypeScript + Tailwind setup in this folder, `git init` on branch `build/v1`, `.env.example`, theme tokens, fonts, brand assets, header + sidebar shell, Supabase clients, proxy gate, server sign-in route with rate limit, sign-out (all tabs), idle timeout, roles via `profiles`, login page, landing page, `/no-access`, security headers.

Manual test:
- [ ] `npm run dev` starts; `/` shows the landing page with the logo and a Sign in button, no asset data.
- [ ] Visiting `/fc-gameplay-clips` while signed out redirects to `/login?next=...`.
- [ ] Wrong password shows one generic error; 6 quick failures trigger a wait message.
- [ ] (After Phase 2 migrations) correct login lands on the first section; sidebar shows; Admin link only for admins.
- [ ] Sign out in one tab signs out the other open tab.
- [ ] Idle for the timeout period -> signed out.
- [ ] Narrow window: sidebar becomes a drawer.
- [ ] Response headers include CSP (production run), X-Frame-Options, noindex.

### Phase 2: Data and admin
Migration files (WAIT for approval before anyone runs them), RLS test SQL, Edge Functions, admin overview, sections + subsections, tags, cards editor (download links with host badge, previews via Cloudinary, in-browser clip trimming), card reorder, users and roles, audit log.

Manual test:
- [ ] Migration dry run lists the expected files only; after push, RLS test reports 0 failed.
- [ ] Create, rename, hide, reorder, delete a section and a subsection.
- [ ] Create a card with a Google Drive link: badge says Google Drive. Mega link: Mega. `http://` link: refused.
- [ ] Upload a preview clip over 2 MB or 10 s: refused. Valid one: plays. Replace it: old file gone from `nealguides-vault/previews` in Cloudinary.
- [ ] Create an editor; sign in as them; no Admin link; `/admin` returns 404.
- [ ] Disable the editor while they are signed in: next action sends them to `/no-access`.

### Phase 3: Vault experience
Sidebar with approved sections and subsections, card grids with cursor pagination, preview autoplay / hover, download buttons with badges and access-checked opening, search, tag filters and chips, sort, card page, skeletons, empty states.

Manual test:
- [ ] Each section and subsection shows only its published cards; drafts hidden from editors.
- [ ] Previews play on screen (or on hover) and stop with reduced motion on.
- [ ] Download opens the right link in a new tab; the audit log shows it.
- [ ] Network tab shows no link URLs in page data or card lists.
- [ ] Search finds a card by title and by tag; filters combine as in RohTre; empty search shows the empty state.
- [ ] Slow network (DevTools throttling) shows skeletons.

### Phase 4: Polish and handover
Accessibility pass (keyboard, focus rings, labels, contrast), phone / tablet / desktop checks, security review notes (`docs/security-review.md`), README with setup and Vercel deployment, final Later list.

Manual test:
- [ ] Whole flow with keyboard only.
- [ ] Phone (375 px), tablet (768 px), desktop (1440 px) layouts.
- [ ] README steps work from a clean clone.

## 14. Later (not now)

**YouTube uploads feed with Shorted / Done markers**
- New migration only, no change to existing tables: `yt_channels` (channel_id), `yt_videos` (video_id, title, published_at, thumbnail_url), `yt_video_marks` (video_id, mark `shorted`|`tweeted`|`done`, marked_by, marked_at). Same RLS pattern (editors read and mark, admins manage).
- A scheduled Edge Function (Supabase cron) reads the channel's public RSS feed (`https://www.youtube.com/feeds/videos.xml?channel_id=...`) and inserts new videos.
- New sidebar group "Uploads" with a list page; the section/route structure already allows a new top-level route.

**Tweet automation**
- Plugs in as another Edge Function + a `tweeted` mark on `yt_video_marks`; its own admin page under `/admin/automation`. Needs its own credentials as function secrets.

**Other later items**
- Nonce-based CSP (remove `'unsafe-inline'`).
- Google Drive picker (paste-free link selection) if the client wants it.
- Download counts per editor in the admin overview (data already in `audit_log`).
- Full YouTube video / Loom tutorial per card (RohTre feature, dropped for now).
