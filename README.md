# yeswhen

Find a date that works for everyone. No sign-up, no times, no fuss.

- Organiser types a title and **drags across dates** on a calendar.
- They get a private **organiser link** (unguessable, account-free) and a
  **share link** for participants.
- Participants tap the dates they can make and add their name.
- Everyone sees a clean grid with a subtle heat tint on the most popular dates.
- Events are link-only and `noindex`ed — nothing is listable or searchable.

Built with Vite + React on GitHub Pages, with Supabase (free tier) as the
database. No servers, $0 to run.

## One-time setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of
   [`supabase/migrations/20260707000000_init.sql`](supabase/migrations/20260707000000_init.sql), run it.
3. From **Project Settings → API**, copy the **Project URL** and the
   **anon public** key.

### 2. Local dev

Create `.env.local` in the repo root:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Then:

```
npm install
npm run dev
```

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source**: choose **GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → Variables**: add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is public by
   design — security is enforced in the database, not by hiding the key).
4. Push to `main`. The `deploy.yml` workflow builds and publishes the site.

The `keepalive.yml` workflow pings the database twice a week so the free
Supabase project never pauses from inactivity. Heads-up: GitHub disables cron
workflows in repos untouched for 60 days — re-enable from the Actions tab if
that happens, or point a free external pinger (e.g. cron-job.org) at
`POST {SUPABASE_URL}/rest/v1/rpc/yw_ping` with the anon key as the `apikey` header.

### 4. Custom domain (optional)

Add it under **Settings → Pages → Custom domain**. The build automatically
uses the right base path either way.

## Security model

The tables have Row Level Security enabled with **no policies**, so the anon
key can't read or write anything directly. Every operation goes through a
`SECURITY DEFINER` Postgres function that requires a ~130-bit random token
(organiser, share, or per-response edit token). There is no way to list
events, so links are the only way in.
