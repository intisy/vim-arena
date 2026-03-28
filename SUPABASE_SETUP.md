# Supabase Setup Guide for vim-arena

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login works)
2. Click **New Project**
3. Choose your organization, name it `vim-arena`, pick a region close to your users
4. Set a strong database password (save it somewhere — you won't need it in the app, but you'll need it for direct DB access)
5. Wait for the project to finish provisioning (~2 minutes)

## 2. Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `packages/server/supabase/migrations/001_initial.sql` and paste it into the editor
4. Click **Run** — this creates all tables, indexes, RLS policies, and the auto-profile trigger
5. Create another new query
6. Copy the entire contents of `packages/server/supabase/migrations/002_serverless_rpc.sql` and paste it
7. Click **Run** — this creates the 4 RPC functions for matchmaking and race finalization
8. Create another new query
9. Copy the entire contents of `packages/server/supabase/migrations/003_pvp_history_replays.sql` and paste it
10. Click **Run** — this adds replay storage, match history RPCs, auto-forfeit logic, and stale match cleanup

### Verify

After running all migrations, go to **Table Editor** in the sidebar. You should see these tables:
- `profiles`
- `solo_elo_history`
- `lesson_progress`
- `challenge_stats`
- `challenge_results`
- `user_stats`
- `pvp_matches`
- `matchmaking_queue`

Go to **Database → Functions** and verify these functions exist:
- `join_matchmaking_queue`
- `leave_matchmaking_queue`
- `get_matchmaking_status`
- `submit_race_result`
- `submit_replay_data`
- `get_pvp_history`
- `get_match_replay`

## 3. Configure OAuth Providers

### GitHub OAuth

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `vim-arena`
   - **Homepage URL**: Your deployed URL (e.g., `https://yourusername.github.io/vim-arena`) or `http://localhost:5173` for dev
   - **Authorization callback URL**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - Find your project ref in Supabase dashboard → **Settings → General**
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it
7. In Supabase dashboard → **Authentication → Providers → GitHub**
8. Enable it, paste the Client ID and Client Secret, click **Save**

### Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth Client ID**
5. If prompted, configure the **OAuth consent screen** first:
   - User type: External
   - App name: `vim-arena`
   - Add your email as support/developer contact
   - No scopes needed beyond default (email, profile)
6. Back in **Credentials → Create OAuth Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**
8. In Supabase dashboard → **Authentication → Providers → Google**
9. Enable it, paste the Client ID and Client Secret, click **Save**

## 4. Get Your API Keys

### Project URL

1. In Supabase dashboard → **Settings → General**
2. Copy your **Project URL** (looks like `https://abcdefgh.supabase.co`)

### API Key (pick one option)

**Option A — New API Keys (recommended)**

1. Go to **Settings → API Keys**
2. If no keys exist, click **Create new API Keys**
3. Copy the **Publishable** key (starts with `sb_publishable_...`)

**Option B — Legacy API Keys**

1. Go to **Settings → API Keys → Legacy API Keys** tab
2. Copy the **anon public** key (a long JWT string starting with `eyJ...`)

> Both key types work identically with `supabase-js`. The publishable key is the newer format.

## 5. Configure the Client

### For Local Development

Create `packages/client/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-anon-key
```

Then run:

```bash
pnpm dev
```

### For GitHub Pages Deployment

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click the **Variables** tab (NOT Secrets — these are non-sensitive)
3. Add two **repository variables**:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
4. Push to `master` — GitHub Actions will build and deploy automatically

### For Vercel / Netlify

Add the same two environment variables in your hosting provider's dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Build command: `pnpm --filter @vim-arena/client build`
Output directory: `packages/client/dist`

## 6. Configure Allowed Redirect URLs

In Supabase dashboard → **Authentication → URL Configuration**:

1. **Site URL**: Set to your production URL (e.g., `https://yourusername.github.io/vim-arena`)
2. **Redirect URLs**: Add all URLs where auth should work:
   - `http://localhost:5173` (local dev)
   - `http://localhost:5173/**` (local dev with paths)
   - `https://yourusername.github.io/vim-arena` (production)
   - `https://yourusername.github.io/vim-arena/**` (production with paths)

## Architecture Overview

```
┌──────────────────┐     ┌──────────────────────────┐
│  Static Client   │────▶│      Supabase (free)      │
│  (GitHub Pages)  │     │                            │
│                  │     │  Auth (GitHub/Google OAuth) │
│  Reads/writes    │◀───▶│  Postgres (tables + RPC)   │
│  via supabase-js │     │  Realtime (PvP broadcast)  │
│                  │     │                            │
│  $0/month        │     │  $0/month (free tier)      │
└──────────────────┘     └──────────────────────────┘
```

No server needed. All game logic runs either:
- **Client-side**: Editor, challenge generation, progress tracking
- **In Postgres**: Matchmaking (RPC), race finalization (RPC), Elo calculation (RPC)
- **Supabase Realtime**: PvP progress broadcast (player-to-player)

## Supabase Free Tier Limits

| Resource | Free Tier |
|---|---|
| Database | 500 MB |
| Auth users | Unlimited |
| Realtime connections | 200 concurrent |
| Realtime messages | 2 million/month |
| Edge Functions | 500K invocations/month |
| Bandwidth | 5 GB |
| File storage | 1 GB |
