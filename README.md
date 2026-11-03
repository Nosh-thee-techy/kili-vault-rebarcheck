# Kili-Vault

Kili-Vault is a map-first planning and development review workspace for Kilimani Ward. It connects observed satellite change, parcel context, development cases, field evidence, human verification, and downstream planning records without making autonomous legality or compliance decisions.

## Parcel Evidence Chain

The planner map is the command point for the evidence chain:

```text
GIS parcel
  -> observed detection
  -> geotagged or documentary evidence
  -> human verification
  -> development case
  -> Property Development Record
  -> LPLDP Spatial Evidence Brief
```

Selecting a parcel exposes its land use, area, mapped buildings, footprint, road proximity, river proximity, river-buffer relationship, and related cases. Selecting a dashed Kili-Shadows detection exposes its detection ID, change type, confidence, verification language, case route, and a one-click factual evidence brief.

The evidence brief is deliberately descriptive rather than determinative. It records spatial context and limitations, and it does not label a change illegal, compliant, or approved. Evidence remains subject to human review and the existing case workflow.

## MVP capabilities

Kili-Vault's MVP delivers a map-first planning review workflow for Kilimani Ward:

- **Planner command center** - ward overview, Kili-Shadows detection statistics, priority case spotlight, review queue, workflow summary, community observations, and full-map navigation.
- **Full planner map** - parcels, land use, buildings, roads, infrastructure, rivers, river buffers, environmental sensitivity, development cases, observed spatial change, search, and layer controls.
- **Parcel intelligence** - parcel or LR reference, land use, parcel area, mapped buildings, building footprint, road and river proximity, river-buffer relationship, related cases, and planning actions.
- **Observed spatial change** - detection ID, change type, confidence, candidate-change language, human-review warning, case route, and factual LPLDP evidence brief download.
- **AI-assisted triage** - paginated candidate detections with confidence, observed area, NDBI change, persistence, detection date, and review-before-promotion guidance. It appears below the full planner map.
- **Development case workflow** - AI flagged, under review, mitigation required, evidence submitted, agency pending, verified or rejected, and closed states with audit history.
- **Evidence workflow** - developer uploads, evidence metadata, pending review, mitigation responses, agency verification, and evidence timeline integration.
- **Development simulator** - parcel selection, existing conditions, proposed and mitigated scenarios, development intensity comparison, and zoning-guide prompts.
- **Role experiences** - planner, developer, agency, and community workflows, including community spatial observations.
- **Backend services** - detection and GeoJSON APIs, case management, status transitions, mitigation, evidence, verification, observations, detection promotion, pre-development checks, processing runs, and model or pipeline status.

The core MVP story is:

```text
Satellite detection
  -> map context
  -> planner review
  -> evidence
  -> human verification
  -> case closure
  -> Property Development Record
```

### Deferred from the MVP

- 3D massing
- Persisted spatial evidence briefs
- Automatic brief inclusion in the Property Development Record

Photo EXIF GPS (web uploads) and evidence-to-geometry distance validation are implemented for RebarCheck field evidence. WhatsApp still cannot use EXIF GPS because the Cloud API strips it — use a location pin.

## Guided demo

Use **Guided demo** from the planner shell to walk through:

1. Planner command center
2. Parcel intelligence and spatial context
3. Observed spatial change and the factual evidence brief
4. Development scenario comparison
5. Case record, human review, and mitigation
6. Developer evidence upload
7. Field evidence from WhatsApp / RebarCheck
8. Agency verification
9. Closure and Property Development Record reuse

The 3D massing view is intentionally deferred. The current demo prioritizes the traceable 2D parcel and evidence workflow.

## Repository layout

- `kili-vault-frontend/` - React, TypeScript, Vite, and ArcGIS planner interface
- `kili-vault-backend/` - Node API, case workflow, evidence handling, and Python pipeline integration
- `docs/` - product guide and system architecture
- `featurelayers.md` - ArcGIS feature-layer inventory
- `kilimani_zoning_guidelines-v2.md` - zoning reference used by planning tools

## Documentation

- [What we built](docs/WHAT_WE_BUILT.md) — the four portals, the case workflow, the map, and what is still unfinished
- [System architecture](docs/SYSTEM_ARCHITECTURE.md) — layers, data stores, detection pipeline, and request paths

## Local development

### Frontend

```powershell
Set-Location kili-vault-frontend
npm install
npm run dev
```

The frontend also provides:

```powershell
npm run lint
npm run build
```

### Backend

```powershell
Set-Location kili-vault-backend
npm install
npm run dev
```

See `kili-vault-backend/README.md` and `kili-vault-backend/docs/SETUP.md` for database, API, and Earth Engine setup.

## Trust and review model

- A detection is a **candidate change**, not a finding of illegality.
- Spatial relationships such as river-buffer overlap require planning review.
- Uploaded evidence remains pending until an authorized human verifies it.
- Case transitions, evidence uploads, and verification decisions are preserved in the audit timeline.
- Briefs and records should include source references, provenance, and data limitations.

## Current implementation note

The map evidence brief is currently generated in the browser as a downloadable text artifact so the guided workflow is usable without a new API contract. Persisted briefs and automatic inclusion in the Property Development Record remain the next backend-backed increment.

## RebarCheck

RebarCheck inspects a steel rebar cage from a top-down photo *before concrete is poured*. A foreman sends a photo (with an A4 sheet or other reference of known size) plus a location pin. The analyzer segments bars, converts pixels to millimetres, measures spacing against the engineer spec, and writes the result as **AI-analysed evidence pending human verification** on an existing development case. It is never a certification.

Evidence chain:

```text
GIS parcel
  -> development case
  -> field evidence (WhatsApp or /rebarcheck)
  -> RebarCheck analysis
  -> human verification
  -> Property Development Record
```

Trust model: results are **within tolerance**, **outside tolerance**, or **inconclusive**. Copy never says approved, compliant, safe, or certified. Every response includes: *Visual spacing check from a photo. Not an engineer's sign-off. Pending human verification.* Status stays `submitted` with `metadata.rebarCheck.aiAnalysed = true` so an agency still uses the existing `/verify` flow.

### Run locally (Windows PowerShell)

```powershell
Set-Location kili-vault-backend
python -m pip install numpy opencv-python-headless pytest
# optional: copy .env.example to .env and set META_ / WHATSAPP_ keys
npm run rebarcheck:demo
npm run rebarcheck:seed
python -m pytest rebarcheck/tests -q
npm test
```

Web fallback (identical flow, no WhatsApp): open `/rebarcheck` after `npm run dev` in both frontend and backend. Map layer: planner map → Layers → **Rebar inspections** (green circle = within tolerance, red square = outside, grey diamond = inconclusive).

Env vars (see `kili-vault-backend/.env.example`): `META_API_KEY`, `META_API_BASE_URL`, `REBARCHECK_SEGMENTER` (`meta` | `classical` | `mock`), `REBARCHECK_PYTHON`, `REBARCHECK_DEFAULT_CASE_ID`, `PUBLIC_BASE_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_GRAPH_VERSION`. Missing Meta keys fall back to the classical segmenter and a template explanation.

### Tests

- Python: `python -m pytest rebarcheck/tests -q`
- Tape CSV: `python -m rebarcheck.validate --csv rebarcheck/samples/tape.csv`
- Node: `npm test` (analyzer stubbed via `REBARCHECK_NODE_STUB` in the RebarCheck suite)

### Known limitations

- Top-down photos only. A tilted A4 sheet reduces confidence and warns.
- A reference object (default A4, 297 mm) or an explicit `mmPerPixel` is required. Scale is never guessed.
- WhatsApp strips EXIF GPS; the bot asks for a location pin. The web page reads EXIF when present and offers device geolocation.
- Not an engineer's sign-off. Pending human verification.
