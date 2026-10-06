# Bey X Workshop

A pixel-art Beyblade X app built on a single scraped parts database:

- **Combo Lab**: build BX / UX / CX combos, score them, spin them, battle them, find the best attack combos from a collection.
- **Collections**: who owns which parts (owner tags; only the admin edits).
- **Bey Finder**: a friendly, jargon-free picker for friends, including "beat a friend's collection".

Stack: Next.js 15 (App Router) · Tailwind v4 · Supabase (Postgres + Storage + magic-link auth) · Vercel · Pixelact UI · anime.js · sharp.

## One-time setup

You already have GitHub (`Gakumat`), Supabase and Vercel accounts from Wardrobe, so this is quicker than last time.

### 1. GitHub
1. Create a **private** repository called `beyblade-x-workshop` (New → Repository). Leave it empty: no README and no .gitignore.
2. Tell Claude it's there. Claude adds the remote and pushes.

### 2. Supabase (a second free project)
1. In https://supabase.com, click **New project**. Call it `beyblade-x`, in the **Sydney** region.
2. Choose a strong **database password** and keep it.
3. When the project is ready, go to **Project Settings → API** (or **Data API** / **API Keys**) and copy:
   - the **Project URL**
   - the **anon / publishable** key
   - the **service_role / secret** key (the scraper uses this; never put it in Vercel)
   - the **project ref**: the `xxxx` in `https://xxxx.supabase.co`
4. Your existing **Access Token** from Wardrobe works (Account → Access Tokens), or generate a new one.

### 3. Paste the secrets locally
Copy `.env.example` to `.env.local` and fill in every value except `GITHUB_DISPATCH_TOKEN` (that comes in step 5). `.env.local` is git-ignored.

Then Claude runs:
```bash
npm run db:link
npm run db:push
npm run db:config
npm run scrape
```
That creates the tables, sets the login redirect URLs and fills the database (~5 minutes the first time).

### 4. Vercel
1. In https://vercel.com, click **Add New → Project** and import `beyblade-x-workshop`.
2. Before deploying, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ALLOWED_EMAIL`
   - `GITHUB_REPO` = `Gakumat/beyblade-x-workshop`
3. Click **Deploy** and send Claude the `*.vercel.app` URL (it goes into `supabase/config.toml` for the login link).

### 5. The admin "Run scrape" button (optional)
1. **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**. Add three:
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_EMAIL`.
2. **GitHub → Settings (your avatar) → Developer settings → Fine-grained tokens → Generate new token**:
   - Repository access: **Only select repositories** → `beyblade-x-workshop`
   - Permissions: **Actions: Read and write**
3. Add that token in Vercel as `GITHUB_DISPATCH_TOKEN` and redeploy.

Without step 5 everything still works; you just run `npm run scrape` on your PC instead.

## Everyday use
- **Edit collections and save combos**: sign in at `/admin` with your email (magic link). Everyone else can browse without logging in.
- **Refresh the parts data**: `/admin` → **Run scrape**, or `npm run scrape` locally. Re-runs only update parts/products; collections and combos are never touched.
- **Tweak the pixel-art look**: edit `scraper/pixel.config.ts`, then `npm run pixelate -- --preview` (writes `.cache/preview.html`), then `npm run pixelate -- --upload`.
- **Tune scoring**: everything is in `src/lib/scoring/config.ts`. The `/scoring` page explains it and updates itself.
- **Fix a wrong stat**: add it to `data/overrides.json` (with a source URL) and re-run the scrape.

## Development
```bash
npm run dev        # http://localhost:3000
npm test           # vitest: scoring, matchups, scraper parsing
npm run typecheck
```
Without Supabase env vars, the app runs on the last local scrape (`.cache/out/db.json`) and keeps collections in `.cache/local-db.json`, which is handy for working offline.

## Data sources
Parts, products, official stats, weights, descriptions and images come from [beyblade.wiki](https://beyblade.wiki). Its robots.txt allows crawling. The scraper sends one request per second, caches responses, and every page links back. The Beyblade Fandom wiki was considered as a second source, but it blocks automated requests, and beyblade.wiki already covers everything needed.
