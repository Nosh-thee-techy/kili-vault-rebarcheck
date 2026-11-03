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
  },
  {
    id: 'parcels-landuse',
    title: 'Parcels & Land Use',
    url: `${ARCGIS_HOST}/KILIMANI_PARCELS_LANDUSE_JOIN/FeatureServer`,
    layerId: 0,
    defaultVisible: true,
    group: 'planning',
    geometryType: 'polygon',
    description: 'Parcel boundaries joined with land-use classification.',
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
