# Kili-Vault — Connect Supabase & Google Earth Engine

This guide gets you from **local demo** → **production stack** (Supabase Postgres + live GEE pipeline).

---

## What we built for you (already in the repo)

| Piece | Status |
|-------|--------|
| PostGIS schemas | `database/schema.sql` + `database/schema_cases.sql` |
| Auto storage switch | Cases use **Postgres when available**, else JSON file |
| DB setup script | `npm run db:setup` |
| Stack diagnostic | `npm run stack:check` |
| GEE verify script | `npm run gee:verify` |
| Detection ingest | `node scripts/ingest_detections.js` (after GEE run) |

---

## Step 1 — What we need from you: **Supabase**

### A. Create / open your Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a project (or use existing)
3. **Enable PostGIS**: Database → Extensions → search `postgis` → Enable

### B. Get the database connection string

Project Settings → Database → **Connection string** → URI mode:

```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Use the **Transaction pooler** (port 6543) for the Node backend.

### C. Send us / paste into `.env`:

```env
# Copy kili-vault-backend/.env.example → .env first
DATABASE_URL=postgresql://postgres.[ref]:[password]@....pooler.supabase.com:6543/postgres

# Optional — same DB, alternate name supported by backend
SUPABASE_DB_URL=

# For future Supabase Auth (not wired in frontend yet)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role (keep secret!)
```

### D. Run setup (after `.env` exists)

```bash
cd kili-vault-backend
npm run db:setup
npm run stack:check
```

Restart backend. `/health/ready` should show `cases_storage.mode: "postgres"`.

---

## Step 2 — What we need from you: **Google Earth Engine**

### A. GCP + Earth Engine access

1. [Google Cloud Console](https://console.cloud.google.com/) — create/select project
2. [Earth Engine](https://console.cloud.google.com/earth-engine) — enable for project
3. Register project at [Earth Engine signup](https://signup.earthengine.google.com/) if needed

### B. Service account (recommended for servers / CI)

1. IAM → Service Accounts → Create
2. Grant **Earth Engine Resource Viewer** (or Earth Engine User)
3. Keys → Add key → JSON → save as `kili-vault-backend/secrets/gee-service-account.json`
   - **Never commit this file** (already in `.gitignore` pattern)

### C. Paste into `.env`:

```env
GEE_PROJECT_ID=your-gcp-project-id
GEE_SERVICE_ACCOUNT_EMAIL=gee-runner@your-project.iam.gserviceaccount.com
GEE_SERVICE_ACCOUNT_KEY_PATH=secrets/gee-service-account.json

# Kilimani AOI — local GeoJSON already in repo
AOI_GEOJSON_PATH=config/kilimani_ward.geojson
AOI_NAME=Kilimani Ward, Nairobi
```

### D. Install Python deps & verify

```bash
cd kili-vault-backend
pip install -r requirements.txt
npm run gee:verify
```

### E. Run the detection pipeline

```bash
# Live Sentinel-2 differencing (calls GEE)
python -m gee.main --output output/detections.geojson --summary output/processing_summary.json

# Push detections into Supabase/PostGIS
node scripts/ingest_detections.js
```

Or trigger via API (background): `POST /api/v1/models/pipeline/auto`

---

## Step 3 — Full stack verification

```bash
cd kili-vault-backend
npm run stack:check
curl http://localhost:3000/health/ready
curl http://localhost:3000/api/v1/detections/stats
curl http://localhost:3000/api/v1/cases/stats -H "X-User-Role: planner" -H "X-User-Id: demo" -H "X-User-Name: Demo"
```

Frontend (no change needed in dev — Vite proxies `/api`):

```bash
cd kili-vault-frontend
npm run dev
```

---

## Checklist — send these to your dev / paste in `.env`

| # | Item | Where to get it |
|---|------|-----------------|
| 1 | `DATABASE_URL` | Supabase → Settings → Database → URI |
| 2 | `SUPABASE_URL` | Supabase project URL |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (optional for now) |
| 4 | `GEE_PROJECT_ID` | GCP project ID |
| 5 | `GEE_SERVICE_ACCOUNT_EMAIL` | GCP IAM service account |
| 6 | GEE JSON key file | GCP → Service account → Keys |
| 7 | PostGIS enabled | Supabase → Database → Extensions |

---

## Architecture after connect

```
Sentinel-2 (GEE Python pipeline)
        ↓ detections.geojson
   ingest_detections.js
        ↓
Supabase PostgreSQL + PostGIS  ←── cases, audit, evidence metadata
        ↑
Express API (:3000)  ←── Vite proxy ←── React frontend
```

Evidence **files** stay on disk (`data/evidence/`) until you move to Supabase Storage — we can add that next.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `database: unconfigured` | Create `.env` with `DATABASE_URL` |
| `development_cases missing` | Run `npm run db:setup` |
| Detections 500 | Run schemas + ingest, or GEE pipeline first |
| GEE auth failed | Check key path, EE enabled on GCP project |
| `postgis` extension error | Enable PostGIS in Supabase dashboard first |

---

## Security reminders

- Never commit `.env` or GEE JSON keys
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — backend only
- Rotate keys if exposed

When you have Supabase + GEE credentials ready, share them securely (or paste into local `.env` yourself) and run `npm run stack:check` — we'll iterate from there.
