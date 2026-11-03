# Development Impact Simulator

The developer workspace at `/developer/simulator` is a temporary, client-side planning simulator. It compares an observed parcel condition with proposed and mitigated scenario inputs. It does not edit ArcGIS data, create an approval decision, or replace professional planning, environmental, engineering, or statutory review.

The simulator is linked from the developer portal home and the developer sidebar as **Impact simulator**. Closed cases expose their derived Property Development Record directly on the existing case details page.

## Spatial sources

The simulator reads these ArcGIS FeatureServer layers from the existing frontend layer registry:

- `KILIMANI_WARD_BOUNDARY`: primary simulator boundary and initial map extent.
- `KILIMANI_PARCELS_LANDUSE_JOIN`: selectable parcels and parcel land-use attributes.
- `KILIMANI_LANDUSE_UTM`: surrounding land-use context.
- `KILIMANI_UTM_BUILDINGS`: mapped building footprints used for the observed condition.
- `ROADS_UTM`: nearest mapped road context.
- `RIVERS_UTM`: nearest mapped river context.
- `KILIMANI_RIVERS_15M_BUFFER`: spatial sensitivity check for parcel and scenario footprints.

The broader `DAGORETTI_UTM_BOUNDARY` and `KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN` layers remain available in the shared registry for future contextual or relationship queries. Layer metadata supplies the spatial reference to ArcGIS; the simulator does not manually transform coordinates.

## Scenario calculations

- Observed building footprint: sum of the intersections between mapped building geometries and the selected parcel geometry.
- Built-up share: `footprint area / parcel area * 100`.
- Open surface: `max(parcel area - footprint area, 0)`.
- Estimated floor area: `scenario footprint area * floors`.
- Estimated occupancy: `units * occupants per unit`, only when both inputs are positive.
- Road and river proximity: minimum geometry distance from the selected parcel to queried mapped features, when those features are returned.
- River buffer interaction: geometric intersection between a scenario footprint and returned 15 m buffer geometry.

Scenario footprints are simple temporary rectangles sized from the entered area and centered within the selected parcel. They are visual planning representations, not building designs. Proposed and mitigated state are separate, and the mitigation action copies Scenario B inputs into Scenario C before the user edits them.

## Interpretation and limitations

All calculated values are **indicative scenario estimates**. `Review required` means spatial sensitivity was detected; it does not mean a legal violation or automatic rejection. The current dataset cannot assess sewer capacity, water capacity, flood risk, structural safety, traffic capacity, or statutory compliance. The UI explicitly reports that infrastructure capacity assessment is unavailable.

Official FeatureServer layers are authoritative for the mapped context. User-created proposed and mitigated geometries and all derived metrics are scenario-generated and temporary. No scenario persistence or backend contract is introduced for this MVP.

## Future observed-change connection

The scenario model keeps parcel identity, geometry, inputs, and derived metrics separate. A future satellite detection record can therefore be associated with the parcel after construction and compared with the proposed or mitigated geometry as an observed-versus-expected workflow, followed by human verification.
