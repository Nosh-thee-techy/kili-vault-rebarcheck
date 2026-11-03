DAGORETTI_CONSTITUENCY_UTM_BOUNDARY:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/DAGORETTI_UTM_BOUNDARY/FeatureServer
KILIMANI_LANDUSE_UTM:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_LANDUSE_UTM/FeatureServer
KILIMANI_PARCELS_LANDUSE_JOIN:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_PARCELS_LANDUSE_JOIN/FeatureServer
KILIMANI_RIVERS_15M_BUFFER:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_RIVERS_15M_BUFFER/FeatureServer
KILIMANI_UTM_BUILDINGS:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_UTM_BUILDINGS/FeatureServer
KILIMANI_WARD_BOUNDARY: https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_WARD_BOUNDARY/FeatureServer
RIVERS_UTM: https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/RIVERS_UTM/FeatureServer
ROADS_UTM: https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/ROADS_UTM/FeatureServer
KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN/FeatureServer
CULTURAL_PLACES_KILIMANI:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/CULTURAL_PLACES_KILIMANI/FeatureServer
EDUCATION_FACILITIES_KILIMANI:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/EDUCATION_FACILITIES_KILIMANI/FeatureServer
HEALTH_FACILITIES_KILIMANI:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/HEALTH_FACILITIES_KILIMANI/FeatureServer
KILIMANI_POINTS_OF_INTEREST:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_POINTS_OF_INTEREST/FeatureServer

All layers use: WGS 1984 Web Mercator (auxiliary sphere)
3857 Coordinate System. However you can also check the coordinate system on overview tab when you try access it on web.

## Planner field mapping (verified 2026-09-19)

The Planner map uses ArcGIS metadata rather than invented fields. The services reported WKID `102100` (Web Mercator Auxiliary Sphere; equivalent Web Mercator family) and layer 0 for the listed FeatureServers.

| Layer                                    | Geometry | Useful planning fields                                                                                                     | Search fields                                                     | Relationship/use                                                          |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `KILIMANI_PARCELS_LANDUSE_JOIN`          | Polygon  | `parcel_num`, `lr_number`, `stated_are`, `LANDUSE`, `BUILDINGS`, `BUILD_PER`, `GENERAL_DE`, `NAME`                         | `parcel_num`, `lr_number`, `fr_number`, `old_parcel`, `dp_number` | Parcel identity, land-use context, building count/coverage where recorded |
| `KILIMANI_LANDUSE_UTM`                   | Polygon  | `LANDUSE`, `GENERAL_DE`, `NAME`, `ACRE`, `BUILD_PER`, `AREA_HA`, `NOTES`                                                   | `LANDUSE`, `GENERAL_DE`, `NAME`                                   | Categorized existing land-use pattern                                     |
| `KILIMANI_UTM_BUILDINGS`                 | Polygon  | `osm_id`, `fclass`, `name`, `type`, `Shape__Area`                                                                          | `osm_id`, `name`, `type`                                          | Existing building footprints                                              |
| `KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN` | Polygon  | `osm_id`, `fclass`, `name`, `type`, `parcel_num`, `lr_number`, `LANDUSE`, `BUILDINGS`, `BUILD_PER`, `GENERAL_DE`, `NAME_1` | `osm_id`, `name`, `type`, `parcel_num`, `lr_number`               | Building-to-parcel-to-land-use relationship                               |
| `ROADS_UTM`                              | Polyline | `name`, `ref`, `fclass`, `maxspeed`, `oneway`                                                                              | `name`, `ref`, `fclass`                                           | Road hierarchy and proximity context                                      |
| `RIVERS_UTM`                             | Polyline | `name`, `width`, `fclass`                                                                                                  | `name`                                                            | River proximity and named watercourse context                             |
| `KILIMANI_RIVERS_15M_BUFFER`             | Polygon  | `Id`                                                                                                                       | None                                                              | Spatial sensitivity relationship; not an automatic legal determination    |
| `KILIMANI_WARD_BOUNDARY`                 | Polygon  | `ward`, `county`, `subcounty`                                                                                              | `ward`                                                            | Kilimani administrative context                                           |
| `DAGORETTI_UTM_BOUNDARY`                 | Polygon  | `ward`, `county`, `subcounty`                                                                                              | `ward`                                                            | Broader constituency context                                              |
| `CULTURAL_PLACES_KILIMANI`                 | Point    | Service-defined place, type, and category fields                                                                           | Service-defined place, type, and category fields                  | Cultural and heritage orientation                                      |
| `EDUCATION_FACILITIES_KILIMANI`            | Point    | Service-defined place, type, and category fields                                                                           | Service-defined place, type, and category fields                  | Education facility context                                              |
| `HEALTH_FACILITIES_KILIMANI`               | Point    | Service-defined place, type, and category fields                                                                           | Service-defined place, type, and category fields                  | Health facility context                                                 |
| `KILIMANI_POINTS_OF_INTEREST`              | Point    | Service-defined place, type, and category fields                                                                           | Service-defined place, type, and category fields                  | Local orientation points                                                |

The Planner selection panel shows prioritized planning fields first and exposes the complete returned attribute set under **View all attributes**. Missing values are displayed as `Not available in current dataset`.

## Kiliplan workspace layer choice

The Kiliplan workspace displays `KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN` as **Buildings + Parcels** so building footprints and their joined parcel/land-use attributes are available together. The standalone `KILIMANI_UTM_BUILDINGS` layer remains in the shared layer registry for the simulator and other map workflows; it is not shown in the Kiliplan workspace layer list.

The current map registry includes the 15 m river buffer for spatial screening. Flood-zone, protected-wetland, and historic-preservation layers are not configured in this workspace. The planner tools report those checks as unavailable rather than treating missing datasets as clear.

Point layers are selectable through the shared map hit-test workflow. Selecting a road, power line, facility, or point of interest highlights the real ArcGIS feature and exposes its returned attributes; unavailable service fields remain unavailable rather than being inferred.

The parcel renderer uses planning land-use categories with distinct zone colours. The configured 11 kV power-line layer is screened with a 10 m wayleave buffer in parcel checks; wider 30–60 m clearances must be confirmed against the installation voltage and the responsible Kenya Power, KENGEN, or KETRACO record.
