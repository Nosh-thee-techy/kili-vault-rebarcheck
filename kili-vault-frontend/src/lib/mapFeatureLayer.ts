import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
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
    popupEnabled: true,
  });

  if (config.lineColor) {
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
