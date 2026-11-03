import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import type { MapLayerConfig } from "@/config/mapLayers";

export function createMapFeatureLayer(
  config: MapLayerConfig,
  visible?: boolean,
  outFields: string[] = ["*"],
): FeatureLayer {
  const layer = new FeatureLayer({
    id: config.id,
    url: `${config.url}/${config.layerId}`,
    title: config.title,
    visible: visible ?? config.defaultVisible,
    opacity:
      config.id === "parcels-landuse"
        ? 1
        : config.geometryType === "polygon"
          ? 0.6
          : 0.92,
    popupEnabled: false,
    outFields,
  });

  if (config.id === "landuse") {
    const landUseColors: Record<string, string> = {
      Residential: "#D7C29E",
      Industrial: "#C500FF",
      Educational: "#FFAA00",
      Recreation: "#A3FF73",
      Recreational: "#A3FF73",
      "Public purpose": "#FFFF00",
      Commercial: "#FF0000",
      "Public utilities": "#0070FF",
      Transportation: "#CCCCCC",
      Conservation: "#FFFFBE",
      Agricultural: "#FFFFE6",
      Other: "#8A8A8A",
    };
    layer.renderer = new UniqueValueRenderer({
      field: "LANDUSE",
      uniqueValueInfos: Object.entries(landUseColors).map(([value, color]) => ({
        value,
        label: value,
        symbol: new SimpleFillSymbol({
          color: `${color}88`,
          outline: new SimpleLineSymbol({ color: `${color}CC`, width: 0.8 }),
        }),
      })),
      defaultSymbol: new SimpleFillSymbol({
        color: "#8A8A8A99",
        outline: new SimpleLineSymbol({ color: "#666666", width: 0.8 }),
      }),
    });
  } else if (config.id === "parcels-landuse") {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleFillSymbol({
        color: [0, 0, 0, 0],
        outline: new SimpleLineSymbol({ color: "#303030", width: 1.1 }),
      }),
    };
  } else if (["buildings", "buildings-parcels"].includes(config.id)) {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleFillSymbol({
        color: "rgba(74, 74, 79, 0.36)",
        outline: new SimpleLineSymbol({ color: "#34343A", width: 0.9 }),
      }),
    };
  } else if (config.id === "kilimani-ward") {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleFillSymbol({
        color: "rgba(42, 77, 56, 0.02)",
        outline: new SimpleLineSymbol({ color: "#2A4D38", width: 2.4 }),
      }),
    };
  } else if (config.id === "dagoretti-constituency") {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleFillSymbol({
        color: "rgba(42, 77, 56, 0.01)",
        outline: new SimpleLineSymbol({
          color: "#698070",
          width: 1.2,
          style: "dash",
        }),
      }),
    };
  } else if (config.id === "roads") {
    const roadColors: Record<string, string> = {
      motorway: "#6C4B4B",
      trunk: "#7B5C4A",
      primary: "#8B6A4E",
      secondary: "#8B8069",
      tertiary: "#948B7A",
    };
    layer.renderer = new UniqueValueRenderer({
      field: "fclass",
      uniqueValueInfos: Object.entries(roadColors).map(([value, color]) => ({
        value,
        label: value,
        symbol: new SimpleLineSymbol({
          color,
          width: value === "primary" || value === "trunk" ? 2.5 : 1.6,
        }),
      })),
      defaultSymbol: new SimpleLineSymbol({ color: "#8C8982", width: 1 }),
    });
  } else if (config.id === "rivers") {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleLineSymbol({ color: "#4689A4", width: 2.2 }),
    };
  } else if (config.id === "river-buffer") {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleFillSymbol({
        color: "rgba(70, 137, 164, 0.12)",
        outline: new SimpleLineSymbol({
          color: "#4689A4",
          width: 1,
          style: "dash",
        }),
      }),
    };
  }

  if (config.lineColor && !["roads", "rivers"].includes(config.id)) {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleLineSymbol({
        color: config.lineColor,
        width: config.lineWidth ?? 2,
      }),
    };
  }

  if (config.fillColor) {
    layer.renderer = {
      type: "simple",
      symbol: new SimpleFillSymbol({
        color: config.fillColor,
        outline: new SimpleLineSymbol({
          color: config.outlineColor ?? config.lineColor ?? "#4A4A4F",
          width: config.lineWidth ?? 1,
        }),
      }),
    };
  }

  return layer;
}
