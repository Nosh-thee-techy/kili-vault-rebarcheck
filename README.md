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

## Guided demo

Use **Guided demo** from the planner shell to walk through:

1. Planner command center
2. Parcel intelligence and spatial context
3. Observed spatial change and the factual evidence brief
4. Development scenario comparison
5. Case record, human review, and mitigation
6. Developer evidence upload
7. Agency verification
8. Closure and Property Development Record reuse

The 3D massing view is intentionally deferred. The current demo prioritizes the traceable 2D parcel and evidence workflow.

## Repository layout

- `kili-vault-frontend/` - React, TypeScript, Vite, and ArcGIS planner interface
- `kili-vault-backend/` - Node API, case workflow, evidence handling, and Python pipeline integration
- `docs/` - project-level development notes
- `featurelayers.md` - ArcGIS feature-layer inventory
- `kilimani_zoning_guidelines-v2.md` - zoning reference used by planning tools

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

The map evidence brief is currently generated in the browser as a downloadable text artifact so the guided workflow is usable without a new API contract. Persisted briefs, photo EXIF extraction, geometry-distance validation, and automatic inclusion in the Property Development Record remain the next backend-backed increment.
