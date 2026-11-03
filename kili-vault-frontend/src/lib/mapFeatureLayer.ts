import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
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
        : config.geometryType === "point"
          ? 0.95
        : config.geometryType === "polygon"
          ? 0.6
          : 0.92,
    popupEnabled: false,
    outFields,
  });

  const landUseColors: Record<string, string> = {
      Residential: "#D7C29E",
      "Residential Low Density": "#D7C29E",
      "Medium Density": "#C9A66B",
      "High Density": "#A97B45",
      Industrial: "#C500FF",
      "Heavy Industrial": "#8B3A8B",
      "Light Industries": "#B45AC5",
      Educational: "#FFAA00",
      Recreation: "#A3FF73",
      Recreational: "#A3FF73",
      "Open space": "#A3FF73",
      "Open Space": "#A3FF73",
      "Public Purpose": "#FFFF00",
      "Public purpose": "#FFFF00",
      Institutional: "#FFFF00",
      institutional: "#FFFF00",
      Commercial: "#FF0000",
      "Business Cum Residential": "#D94F4F",
      "Public utilities": "#0070FF",
      "Public Utilities": "#0070FF",
      Transportation: "#CCCCCC",
      "Bus Park": "#A8A8A8",
      Conservation: "#FFFFBE",
      Agricultural: "#FFFFE6",
      Agriculture: "#FFFFE6",
      Other: "#8A8A8A",
  };

  if (["landuse", "parcels-landuse"].includes(config.id)) {
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
        color: config.id === "parcels-landuse" ? "#FFFFFF14" : "#8A8A8A99",
        outline: new SimpleLineSymbol({
          color: config.id === "parcels-landuse" ? "#303030" : "#666666",
          width: config.id === "parcels-landuse" ? 0.9 : 0.8,
        }),
      }),
    });
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
  } else if (config.geometryType === "point") {
    const pointLayerStyles: Record<
      string,
      { field: string; values: Record<string, { color: string; style: "circle" | "diamond" | "square" | "triangle" | "cross" }> }
    > = {
      "cultural-places": {
        field: "amenity",
        values: {
          theatre: { color: "#7C3AED", style: "diamond" },
          arts_centre: { color: "#8B5CF6", style: "diamond" },
          museum: { color: "#6D28D9", style: "diamond" },
          place_of_worship: { color: "#A855F7", style: "cross" },
        },
      },
      "education-facilities": {
        field: "amenity",
        values: {
          school: { color: "#D97706", style: "triangle" },
          kindergarten: { color: "#F59E0B", style: "triangle" },
          college: { color: "#B45309", style: "triangle" },
        },
      },
      "health-facilities": {
        field: "healthcare",
        values: {
          hospital: { color: "#B91C1C", style: "cross" },
          clinic: { color: "#DC2626", style: "cross" },
          pharmacy: { color: "#EF4444", style: "cross" },
        },
      },
      "points-of-interest": {
        field: "fclass",
        values: {
          restaurant: { color: "#0F766E", style: "circle" },
          cafe: { color: "#14B8A6", style: "circle" },
          kindergarten: { color: "#F59E0B", style: "triangle" },
          place_of_worship: { color: "#7C3AED", style: "cross" },
          attraction: { color: "#2563EB", style: "diamond" },
        },
      },
    };
    const pointStyle = pointLayerStyles[config.id];
    const infos = pointStyle
      ? Object.entries(pointStyle.values).map(([value, style]) => ({
          value,
          label: value.replace(/_/g, " "),
          symbol: new SimpleMarkerSymbol({
            color: style.color,
            style: style.style,
            size: 10,
            outline: new SimpleLineSymbol({ color: "#FFFFFF", width: 1 }),
          }),
        }))
      : [];
    layer.renderer = {
      type: "unique-value",
      field: pointStyle?.field ?? "name",
      uniqueValueInfos: infos,
      defaultSymbol: new SimpleMarkerSymbol({
        color: "#2563EB",
        size: 9,
        outline: new SimpleLineSymbol({ color: "#FFFFFF", width: 1 }),
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
