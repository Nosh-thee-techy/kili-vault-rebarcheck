export const ARCGIS_HOST =
  "https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services";

export type MapLayerGroup =
  | "boundaries"
  | "planning"
  | "infrastructure"
  | "environment";

export interface MapLayerConfig {
  id: string;
  title: string;
  url: string;
  layerId: number;
  defaultVisible: boolean;
  group: MapLayerGroup;
  geometryType: "point" | "polygon" | "polyline";
  description: string;
  lineColor?: string;
  /** CSS color or rgba(), e.g. `rgba(76, 129, 205, 0.28)` */
  fillColor?: string;
  outlineColor?: string;
  lineWidth?: number;
  displayFields?: string[];
  searchFields?: string[];
  planningFields?: string[];
}

/** Layers shown on 3D site / pre-dev maps for infrastructure context */
export const SITE_INFRA_LAYER_IDS = [
  "buildings",
  "roads",
  "sewer-areas",
  "power-lines",
  "rivers",
  "river-buffer",
] as const;

export type SiteInfraLayerId = (typeof SITE_INFRA_LAYER_IDS)[number];

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: "kilimani-ward",
    title: "Kilimani Ward",
    url: `${ARCGIS_HOST}/KILIMANI_WARD_BOUNDARY/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "boundaries",
    geometryType: "polygon",
    description: "Official Kilimani ward boundary — default map extent.",
    displayFields: ["ward", "county", "subcounty"],
    planningFields: ["ward", "county", "subcounty"],
  },
  {
    id: "dagoretti-constituency",
    title: "Dagoretti Constituency",
    url: `${ARCGIS_HOST}/DAGORETTI_UTM_BOUNDARY/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "boundaries",
    geometryType: "polygon",
    description: "Wider constituency context for regional orientation.",
    displayFields: ["ward", "county", "subcounty"],
  },
  {
    id: "parcels-landuse",
    title: "Parcels & Property Context",
    url: `${ARCGIS_HOST}/KILIMANI_PARCELS_LANDUSE_JOIN/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "planning",
    geometryType: "polygon",
    description: "Parcel boundaries joined with land-use classification.",
    displayFields: [
      "parcel_num",
      "lr_number",
      "stated_are",
      "LANDUSE",
      "BUILDINGS",
      "BUILD_PER",
      "GENERAL_DE",
      "NAME",
    ],
    searchFields: [
      "parcel_num",
      "lr_number",
      "fr_number",
      "old_parcel",
      "dp_number",
    ],
    planningFields: [
      "parcel_num",
      "lr_number",
      "stated_are",
      "LANDUSE",
      "BUILDINGS",
      "BUILD_PER",
      "GENERAL_DE",
      "NAME",
    ],
  },
  {
    id: "landuse",
    title: "Land Use Zones",
    url: `${ARCGIS_HOST}/KILIMANI_LANDUSE_UTM/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "planning",
    geometryType: "polygon",
    description: "Zoning and land-use designations across Kilimani.",
    displayFields: [
      "LANDUSE",
      "GENERAL_DE",
      "NAME",
      "ACRE",
      "BUILD_PER",
      "AREA_HA",
      "NOTES",
    ],
    searchFields: ["LANDUSE", "GENERAL_DE", "NAME"],
    planningFields: [
      "LANDUSE",
      "GENERAL_DE",
      "NAME",
      "ACRE",
      "BUILD_PER",
      "AREA_HA",
      "NOTES",
    ],
  },
  {
    id: "buildings",
    title: "Building Footprints",
    url: `${ARCGIS_HOST}/KILIMANI_UTM_BUILDINGS/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "planning",
    geometryType: "polygon",
    description: "Existing building footprints from survey data.",
    displayFields: ["osm_id", "fclass", "name", "type", "Shape__Area"],
    searchFields: ["osm_id", "name", "type"],
    planningFields: ["osm_id", "fclass", "name", "type", "Shape__Area"],
  },
  {
    id: "roads",
    title: "Road Network",
    url: `${ARCGIS_HOST}/ROADS_UTM/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "infrastructure",
    geometryType: "polyline",
    lineColor: "#4A4A4F",
    lineWidth: 2,
    description:
      "Road centre-lines — use with proximity ring to judge frontage and setbacks.",
    displayFields: ["name", "ref", "fclass", "maxspeed", "oneway"],
    searchFields: ["name", "ref", "fclass"],
  },
  {
    id: "sewer-areas",
    title: "Sewered Areas",
    url: `${ARCGIS_HOST}/Sewered_Areas/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "infrastructure",
    geometryType: "polygon",
    fillColor: "rgba(76, 129, 205, 0.28)",
    outlineColor: "#4C81CD",
    description:
      "NCWSC sewered catchments — plots inside may tie to existing trunk lines.",
  },
  {
    id: "power-lines",
    title: "11 kV Power Lines",
    url: `${ARCGIS_HOST}/KV11_POWER_GRID/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "infrastructure",
    geometryType: "polyline",
    lineColor: "#A553B7",
    lineWidth: 2.5,
    description:
      "11 kV power grid — use for a preliminary wayleave screen; confirm the applicable utility clearance.",
    displayFields: ["RCC1", "County2", "Branch3", "Feeder_o21", "voltage48", "Length_m_"],
    searchFields: ["RCC1", "County2", "Branch3", "Feeder_o21"],
  },
  {
    id: "power-lines-66kv",
    title: "66 kV Power Lines",
    url: `${ARCGIS_HOST}/KV66_POWER_GRID/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: "infrastructure",
    geometryType: "polyline",
    lineColor: "#D97706",
    lineWidth: 3,
    description:
      "66 kV power grid — use for a preliminary wayleave screen; confirm the applicable utility clearance.",
    displayFields: [
      "RCC1",
      "County2",
      "Branch3",
      "Primary_6",
      "Origin_o16",
      "Feeder_o17",
      "Voltage47",
      "Length_km",
    ],
    searchFields: ["RCC1", "County2", "Branch3", "Feeder_o17"],
  },
  {
    id: "cultural-places",
    title: "Cultural Places",
    url: `${ARCGIS_HOST}/CULTURAL_PLACES_KILIMANI/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "planning",
    geometryType: "point",
    description: "Mapped cultural places and community heritage locations.",
    displayFields: ["name", "name_en", "tourism", "amenity", "historic", "heritage", "operator"],
    searchFields: ["name", "name_en", "tourism", "amenity", "historic", "heritage"],
  },
  {
    id: "education-facilities",
    title: "Education Facilities",
    url: `${ARCGIS_HOST}/EDUCATION_FACILITIES_KILIMANI/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "planning",
    geometryType: "point",
    description: "Mapped schools and education facilities.",
    displayFields: ["name", "name_en", "amenity", "building", "operator_t", "capacity_p", "addr_full"],
    searchFields: ["name", "name_en", "amenity", "building"],
  },
  {
    id: "health-facilities",
    title: "Health Facilities",
    url: `${ARCGIS_HOST}/HEALTH_FACILITIES_KILIMANI/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "planning",
    geometryType: "point",
    description: "Mapped health facilities and care locations.",
    displayFields: ["name", "name_en", "amenity", "healthcare", "healthca_1", "operator_t", "capacity_p", "addr_full"],
    searchFields: ["name", "name_en", "amenity", "healthcare", "healthca_1"],
  },
  {
    id: "points-of-interest",
    title: "Kilimani Points of Interest",
    url: `${ARCGIS_HOST}/KILIMANI_POINTS_OF_INTEREST/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "planning",
    geometryType: "point",
    description: "Mapped points of interest for local orientation.",
    displayFields: ["name", "fclass"],
    searchFields: ["name", "fclass"],
  },
  {
    id: "rivers",
    title: "Rivers",
    url: `${ARCGIS_HOST}/RIVERS_UTM/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "environment",
    geometryType: "polyline",
    description: "River courses for riparian context.",
    displayFields: ["name", "width", "fclass"],
    searchFields: ["name"],
  },
  {
    id: "river-buffer",
    title: "River 15m Buffer",
    url: `${ARCGIS_HOST}/KILIMANI_RIVERS_15M_BUFFER/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: "environment",
    geometryType: "polygon",
    description: "15-metre riparian buffer zones for setback checks.",
    displayFields: ["Id"],
  },
];

/** Planner workspace uses the building-to-parcel join for parcel context. */
const PLANNER_BUILDING_PARCEL_LAYER: MapLayerConfig = {
  id: "buildings-parcels",
  title: "Buildings + Parcels",
  url: `${ARCGIS_HOST}/KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN/FeatureServer`,
  layerId: 0,
  defaultVisible: true,
  group: "planning",
  geometryType: "polygon",
  description: "Building footprints with joined parcel and land-use context.",
  displayFields: [
    "osm_id",
    "fclass",
    "name",
    "type",
    "parcel_num",
    "lr_number",
    "LANDUSE",
    "BUILDINGS",
    "BUILD_PER",
    "GENERAL_DE",
    "NAME_1",
  ],
  searchFields: ["osm_id", "name", "type", "parcel_num", "lr_number"],
  planningFields: [
    "parcel_num",
    "lr_number",
    "LANDUSE",
    "BUILDINGS",
    "BUILD_PER",
    "GENERAL_DE",
    "NAME_1",
  ],
};

export const PLANNER_MAP_LAYERS: MapLayerConfig[] = MAP_LAYERS.filter(
  (layer) => layer.id !== "buildings",
).flatMap((layer) =>
  layer.id === "parcels-landuse"
    ? [layer, PLANNER_BUILDING_PARCEL_LAYER]
    : [layer],
);
export const KILIMANI_WARD_EXTENT = {
  type: "extent" as const,
  xmin: 4091306.58,
  ymin: -144788.61,
  xmax: 4098827.64,
  ymax: -140838.24,
  spatialReference: { wkid: 3857 },
};

export const LAYER_GROUP_LABELS: Record<MapLayerGroup, string> = {
  boundaries: "Boundaries",
  planning: "Planning & Buildings",
  infrastructure: "Infrastructure",
  environment: "Environment",
};
