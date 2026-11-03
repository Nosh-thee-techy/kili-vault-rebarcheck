export const ARCGIS_HOST =
  'https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services';

export type MapLayerGroup =
  | 'boundaries'
  | 'planning'
  | 'infrastructure'
  | 'environment';

export interface MapLayerConfig {
  id: string;
  title: string;
  url: string;
  layerId: number;
  defaultVisible: boolean;
  group: MapLayerGroup;
  geometryType: 'polygon' | 'polyline';
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
  'buildings',
  'roads',
  'sewer-areas',
  'power-lines',
  'rivers',
  'river-buffer',
] as const;

export type SiteInfraLayerId = (typeof SITE_INFRA_LAYER_IDS)[number];

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'kilimani-ward',
    title: 'Kilimani Ward',
    url: `${ARCGIS_HOST}/KILIMANI_WARD_BOUNDARY/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'boundaries',
    geometryType: 'polygon',
    description: 'Official Kilimani ward boundary — default map extent.',
    displayFields: ['ward', 'county', 'subcounty'],
    planningFields: ['ward', 'county', 'subcounty'],
  },
  {
    id: 'dagoretti-constituency',
    title: 'Dagoretti Constituency',
    url: `${ARCGIS_HOST}/DAGORETTI_UTM_BOUNDARY/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: 'boundaries',
    geometryType: 'polygon',
    description: 'Wider constituency context for regional orientation.',
    displayFields: ['ward', 'county', 'subcounty'],
  },
  {
    id: 'parcels-landuse',
    title: 'Parcels & Property Context',
    url: `${ARCGIS_HOST}/KILIMANI_PARCELS_LANDUSE_JOIN/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'planning',
    geometryType: 'polygon',
    description: 'Parcel boundaries joined with land-use classification.',
    displayFields: ['parcel_num', 'lr_number', 'stated_are', 'LANDUSE', 'BUILDINGS', 'BUILD_PER', 'GENERAL_DE', 'NAME'],
    searchFields: ['parcel_num', 'lr_number', 'fr_number', 'old_parcel', 'dp_number'],
    planningFields: ['parcel_num', 'lr_number', 'stated_are', 'LANDUSE', 'BUILDINGS', 'BUILD_PER', 'GENERAL_DE', 'NAME'],
  },
  {
    id: 'landuse',
    title: 'Land Use Zones',
    url: `${ARCGIS_HOST}/KILIMANI_LANDUSE_UTM/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: 'planning',
    geometryType: 'polygon',
    description: 'Zoning and land-use designations across Kilimani.',
    displayFields: ['LANDUSE', 'GENERAL_DE', 'NAME', 'ACRE', 'BUILD_PER', 'AREA_HA', 'NOTES'],
    searchFields: ['LANDUSE', 'GENERAL_DE', 'NAME'],
    planningFields: ['LANDUSE', 'GENERAL_DE', 'NAME', 'ACRE', 'BUILD_PER', 'AREA_HA', 'NOTES'],
  },
  {
    id: 'buildings',
    title: 'Building Footprints',
    url: `${ARCGIS_HOST}/KILIMANI_UTM_BUILDINGS/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'planning',
    geometryType: 'polygon',
    description: 'Existing building footprints from survey data.',
    displayFields: ['osm_id', 'fclass', 'name', 'type', 'Shape__Area'],
    searchFields: ['osm_id', 'name', 'type'],
    planningFields: ['osm_id', 'fclass', 'name', 'type', 'Shape__Area'],
  },
  {
    id: 'buildings-parcel-join',
    title: 'Buildings × Parcels',
    url: `${ARCGIS_HOST}/KILIMANI_BUILDINGS_PARCEL_LANDUSE_JOIN/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: 'planning',
    geometryType: 'polygon',
    description: 'Buildings linked to parcel and land-use attributes.',
    displayFields: ['osm_id', 'fclass', 'name', 'type', 'parcel_num', 'lr_number', 'stated_are', 'LANDUSE', 'BUILDINGS', 'BUILD_PER', 'GENERAL_DE', 'NAME_1'],
    searchFields: ['osm_id', 'name', 'type', 'parcel_num', 'lr_number'],
    planningFields: ['osm_id', 'fclass', 'name', 'type', 'parcel_num', 'lr_number', 'stated_are', 'LANDUSE', 'BUILDINGS', 'BUILD_PER', 'GENERAL_DE', 'NAME_1'],
  },
  {
    id: 'roads',
    title: 'Road Network',
    url: `${ARCGIS_HOST}/ROADS_UTM/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'infrastructure',
    geometryType: 'polyline',
    lineColor: '#4A4A4F',
    lineWidth: 2,
    description: 'Road centre-lines — use with proximity ring to judge frontage and setbacks.',
    displayFields: ['name', 'ref', 'fclass', 'maxspeed', 'oneway'],
    searchFields: ['name', 'ref', 'fclass'],
  },
  {
    id: 'sewer-areas',
    title: 'Sewered Areas',
    url: `${ARCGIS_HOST}/Sewered_Areas/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'infrastructure',
    geometryType: 'polygon',
    fillColor: 'rgba(76, 129, 205, 0.28)',
    outlineColor: '#4C81CD',
    description: 'NCWSC sewered catchments — plots inside may tie to existing trunk lines.',
  },
  {
    id: 'power-lines',
    title: '11 kV Power Lines',
    url: `${ARCGIS_HOST}/11kv_powerlines/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'infrastructure',
    geometryType: 'polyline',
    lineColor: '#A553B7',
    lineWidth: 2.5,
    description: 'KPLC 11 kV feeders — clearance and wayleave checks near high-voltage routes.',
  },
  {
    id: 'rivers',
    title: 'Rivers',
    url: `${ARCGIS_HOST}/RIVERS_UTM/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: 'environment',
    geometryType: 'polyline',
    description: 'River courses for riparian context.',
    displayFields: ['name', 'width', 'fclass'],
    searchFields: ['name'],
  },
  {
    id: 'river-buffer',
    title: 'River 15m Buffer',
    url: `${ARCGIS_HOST}/KILIMANI_RIVERS_15M_BUFFER/FeatureServer`,
    layerId: 0,
    defaultVisible: false,
    group: 'environment',
    geometryType: 'polygon',
    description: '15-metre riparian buffer zones for setback checks.',
    displayFields: ['Id'],
  },
];

export const KILIMANI_WARD_EXTENT = {
  type: 'extent' as const,
  xmin: 4091306.58,
  ymin: -144788.61,
  xmax: 4098827.64,
  ymax: -140838.24,
  spatialReference: { wkid: 3857 },
};

export const LAYER_GROUP_LABELS: Record<MapLayerGroup, string> = {
  boundaries: 'Boundaries',
  planning: 'Planning & Buildings',
  infrastructure: 'Infrastructure',
  environment: 'Environment',
};
