DAGORETTI_CONSTITUENCY_UTM_BOUNDARY:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/DAGORETTI_UTM_BOUNDARY/FeatureServer
KILIMANI_LANDUSE_UTM:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_LANDUSE_UTM/FeatureServer
KILIMANI_PARCELS_LANDUSE_JOIN:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_PARCELS_LANDUSE_JOIN/FeatureServer
KILIMANI_RIVERS_15M_BUFFER:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_RIVERS_15M_BUFFER/FeatureServer
KILIMANI_UTM_BUILDINGS:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_UTM_BUILDINGS/FeatureServer
KILIMANI_WARD_BOUNDARY: https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_WARD_BOUNDARY/FeatureServer
RIVERS_UTM: https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/RIVERS_UTM/FeatureServer
ROADS_UTM: https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/ROADS_UTM/FeatureServer
KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN:https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN/FeatureServer

All layers use: WGS 1984 Web Mercator (auxiliary sphere)
3857 Coordinate System. However you can also check the coordinate system on overview tab when you try access it on web.

## Planner field mapping (verified 2026-09-19)

The Planner map uses ArcGIS metadata rather than invented fields. The services reported WKID `102100` (Web Mercator Auxiliary Sphere; equivalent Web Mercator family) and layer 0 for the listed FeatureServers.

| Layer | Geometry | Useful planning fields | Search fields | Relationship/use |
| --- | --- | --- | --- | --- |
| `KILIMANI_PARCELS_LANDUSE_JOIN` | Polygon | `parcel_num`, `lr_number`, `stated_are`, `LANDUSE`, `BUILDINGS`, `BUILD_PER`, `GENERAL_DE`, `NAME` | `parcel_num`, `lr_number`, `fr_number`, `old_parcel`, `dp_number` | Parcel identity, land-use context, building count/coverage where recorded |
| `KILIMANI_LANDUSE_UTM` | Polygon | `LANDUSE`, `GENERAL_DE`, `NAME`, `ACRE`, `BUILD_PER`, `AREA_HA`, `NOTES` | `LANDUSE`, `GENERAL_DE`, `NAME` | Categorized existing land-use pattern |
| `KILIMANI_UTM_BUILDINGS` | Polygon | `osm_id`, `fclass`, `name`, `type`, `Shape__Area` | `osm_id`, `name`, `type` | Existing building footprints |
| `KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN` | Polygon | `osm_id`, `fclass`, `name`, `type`, `parcel_num`, `lr_number`, `LANDUSE`, `BUILDINGS`, `BUILD_PER`, `GENERAL_DE`, `NAME_1` | `osm_id`, `name`, `type`, `parcel_num`, `lr_number` | Building-to-parcel-to-land-use relationship |
| `ROADS_UTM` | Polyline | `name`, `ref`, `fclass`, `maxspeed`, `oneway` | `name`, `ref`, `fclass` | Road hierarchy and proximity context |
| `RIVERS_UTM` | Polyline | `name`, `width`, `fclass` | `name` | River proximity and named watercourse context |
| `KILIMANI_RIVERS_15M_BUFFER` | Polygon | `Id` | None | Spatial sensitivity relationship; not an automatic legal determination |
| `KILIMANI_WARD_BOUNDARY` | Polygon | `ward`, `county`, `subcounty` | `ward` | Kilimani administrative context |
| `DAGORETTI_UTM_BOUNDARY` | Polygon | `ward`, `county`, `subcounty` | `ward` | Broader constituency context |

The Planner selection panel shows prioritized planning fields first and exposes the complete returned attribute set under **View all attributes**. Missing values are displayed as `Not available in current dataset`.
