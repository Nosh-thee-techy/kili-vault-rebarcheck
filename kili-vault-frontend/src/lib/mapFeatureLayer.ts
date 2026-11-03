import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import type { MapLayerConfig } from '@/config/mapLayers';

export function createMapFeatureLayer(
  config: MapLayerConfig,
  visible?: boolean,
): FeatureLayer {
  const layer = new FeatureLayer({
    id: config.id,
    url: `${config.url}/${config.layerId}`,
    title: config.title,
    visible: visible ?? config.defaultVisible,
    opacity: config.geometryType === 'polygon' ? 0.6 : 0.92,
    popupEnabled: false,
    outFields: ['*'],
  });

  if (config.id === 'landuse') {
    const landUseColors: Record<string, string> = {
      Residential: '#D9C7A7',
      Commercial: '#C4785A',
      'Mixed CI': '#B89B73',
      'Mixed RC': '#A8795D',
      Institutional: '#8FA88A',
      Educational: '#6F8FA8',
      'Open Space': '#AFC8A4',
      Recreational: '#7FAF9A',
      Water: '#84B6C9',
      Forest: '#547A5B',
      Agricultural: '#B5B77A',
      Industrial: '#92949B',
      Transportation: '#A7A09A',
      'Social Facility': '#B18A9A',
      Res_Slum: '#C59B83',
    };
    layer.renderer = new UniqueValueRenderer({
      field: 'LANDUSE',
      uniqueValueInfos: Object.entries(landUseColors).map(([value, color]) => ({
        value,
        label: value,
        symbol: new SimpleFillSymbol({
          color: `${color}88`,
          outline: new SimpleLineSymbol({ color: `${color}CC`, width: 0.8 }),
        }),
      })),
      defaultSymbol: new SimpleFillSymbol({
        color: 'rgba(120, 120, 120, 0.12)',
        outline: new SimpleLineSymbol({ color: '#77777788', width: 0.6 }),
      }),
    });
  } else if (config.id === 'parcels-landuse') {
    layer.renderer = {
      type: 'simple',
      symbol: new SimpleFillSymbol({
        color: 'rgba(255, 255, 255, 0.02)',
        outline: new SimpleLineSymbol({ color: '#8E8174', width: 0.8 }),
      }),
    };
  } else if (config.id === 'buildings' || config.id === 'buildings-parcel-join') {
    layer.renderer = {
      type: 'simple',
      symbol: new SimpleFillSymbol({
        color: 'rgba(74, 74, 79, 0.36)',
        outline: new SimpleLineSymbol({ color: '#34343A', width: 0.9 }),
      }),
    };
  } else if (config.id === 'kilimani-ward') {
    layer.renderer = {
      type: 'simple',
      symbol: new SimpleFillSymbol({
        color: 'rgba(42, 77, 56, 0.02)',
        outline: new SimpleLineSymbol({ color: '#2A4D38', width: 2.4 }),
      }),
    };
  } else if (config.id === 'dagoretti-constituency') {
    layer.renderer = {
      type: 'simple',
      symbol: new SimpleFillSymbol({
        color: 'rgba(42, 77, 56, 0.01)',
        outline: new SimpleLineSymbol({ color: '#698070', width: 1.2, style: 'dash' }),
      }),
    };
  } else if (config.id === 'roads') {
    const roadColors: Record<string, string> = {
      motorway: '#6C4B4B', trunk: '#7B5C4A', primary: '#8B6A4E', secondary: '#8B8069', tertiary: '#948B7A',
    };
    layer.renderer = new UniqueValueRenderer({
      field: 'fclass',
      uniqueValueInfos: Object.entries(roadColors).map(([value, color]) => ({
        value,
        label: value,
        symbol: new SimpleLineSymbol({ color, width: value === 'primary' || value === 'trunk' ? 2.5 : 1.6 }),
      })),
      defaultSymbol: new SimpleLineSymbol({ color: '#8C8982', width: 1 }),
    });
  } else if (config.id === 'rivers') {
    layer.renderer = { type: 'simple', symbol: new SimpleLineSymbol({ color: '#4689A4', width: 2.2 }) };
  } else if (config.id === 'river-buffer') {
    layer.renderer = { type: 'simple', symbol: new SimpleFillSymbol({ color: 'rgba(70, 137, 164, 0.12)', outline: new SimpleLineSymbol({ color: '#4689A4', width: 1, style: 'dash' }) }) };
  }

  if (config.lineColor && !['roads', 'rivers'].includes(config.id)) {
    layer.renderer = {
      type: 'simple',
      symbol: new SimpleLineSymbol({
        color: config.lineColor,
        width: config.lineWidth ?? 2,
      }),
    };
  }

  if (config.fillColor) {
    layer.renderer = {
      type: 'simple',
      symbol: new SimpleFillSymbol({
        color: config.fillColor,
        outline: new SimpleLineSymbol({
          color: config.outlineColor ?? config.lineColor ?? '#4A4A4F',
          width: config.lineWidth ?? 1,
        }),
      }),
    };
  }

  return layer;
}
