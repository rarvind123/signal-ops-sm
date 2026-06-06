# signal-ops-sm — Environment & DB Setup
## Cursor Brief

The app is deployed and running. Use this doc for local dev setup.

**Production:** https://signal-ops-sm.vercel.app  
**GitHub:** https://github.com/rarvind123/signal-ops-sm

---

## ✅ Already done

| Step | Status |
|------|--------|
| Supabase project | `auehnfnetrbosnixjrpq` |
| DB migration (8 tables) | ✅ Run |
| Storage bucket `sm-assets` | ✅ Public |
| Vercel deploy + env vars | ✅ All 6 keys set |
| Logo | ✅ `public/inventious-logo.png` |

---

## STEP 1 — CREATE .env.local (local dev only)

`.env.local` is gitignored. Create or refresh it:

```bash
cd signal-ops-sm

# Pull from Vercel (may need manual fill if values come back empty):
vercel env pull .env.local --environment=production --yes

# Or copy keys from Supabase dashboard → Settings → API + promo-os OpenRouter/Replicate keys
```

Required keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://auehnfnetrbosnixjrpq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
OPENROUTER_API_KEY=sk-or-...
REPLICATE_API_TOKEN=r8_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Restart `npm run dev` after any `.env.local` change.

---

## STEP 2 — SUPABASE (reference)

Migration SQL lives in `supabase/migration.sql`. Re-run only on a fresh project.

Storage bucket: `sm-assets` (public).

---

## STEP 3 — LOGO

Header uses `/inventious-logo.png` in `public/`. Replace that file to update branding.

---

## STEP 4 — START AND VERIFY

```bash
npm run dev
```

Test flow:
1. `http://localhost:3000` loads
2. Create brand profile → `sm_clients` in Supabase
3. Submit brief → SignalOps strategy screen
4. Generate creatives → image in `sm-assets/generated/`

If SignalOps fails with auth errors → check `OPENROUTER_API_KEY`.

---

## STEP 5 — DEPLOY

GitHub is connected to Vercel — push to `master` auto-deploys.

```bash
git push origin master
```

Vercel env vars are already configured for production.
