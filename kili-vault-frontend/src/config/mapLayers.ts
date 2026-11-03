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
}

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
    description: 'Road centre-lines for proximity and impact assessment.',
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
