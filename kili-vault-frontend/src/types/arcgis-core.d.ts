declare module "@arcgis/core/Map" {
  class Map {
    [key: string]: any;
    constructor(options?: any);
  }
  export default Map;
}

declare module "@arcgis/core/views/MapView" {
  class MapView {
    [key: string]: any;
    constructor(options?: any);
  }
  export default MapView;
}

declare module "@arcgis/core/layers/FeatureLayer" {
  class FeatureLayer {
    [key: string]: any;
    constructor(options?: any);
  }
  export default FeatureLayer;
}

declare module "@arcgis/core/layers/GeoJSONLayer" {
  class GeoJSONLayer {
    [key: string]: any;
    constructor(options?: any);
  }
  export default GeoJSONLayer;
}

declare module "@arcgis/core/symbols/SimpleFillSymbol" {
  class SimpleFillSymbol {
    [key: string]: any;
    constructor(options?: any);
  }
  export default SimpleFillSymbol;
}

declare module "@arcgis/core/symbols/SimpleLineSymbol" {
  class SimpleLineSymbol {
    [key: string]: any;
    constructor(options?: any);
  }
  export default SimpleLineSymbol;
}

declare module "@arcgis/core/renderers/UniqueValueRenderer" {
  class UniqueValueRenderer {
    [key: string]: any;
    constructor(options?: any);
  }
  export default UniqueValueRenderer;
}

declare module "@arcgis/core/Graphic" {
  class Graphic {
    [key: string]: any;
    constructor(options?: any);
  }
  export default Graphic;
}

declare module "@arcgis/core/layers/GraphicsLayer" {
  class GraphicsLayer {
    [key: string]: any;
    constructor(options?: any);
  }
  export default GraphicsLayer;
}

declare module "@arcgis/core/geometry/Polygon" {
  class Polygon {
    [key: string]: any;
    constructor(options?: any);
  }
  export default Polygon;
}

declare module "@arcgis/core/geometry/Geometry" {
  class Geometry {
    [key: string]: any;
  }
  export default Geometry;
}

declare module "@arcgis/core/geometry/geometryEngine" {
  const geometryEngine: any;
  export = geometryEngine;
}

declare module "@arcgis/core/views/SceneView" {
  class SceneView {
    [key: string]: any;
    constructor(options?: any);
  }
  export default SceneView;
}

declare module "@arcgis/core/geometry/Point" {
  class Point {
    [key: string]: any;
    constructor(options?: any);
  }
  export default Point;
}

declare module "@arcgis/core/symbols/SimpleMarkerSymbol" {
  class SimpleMarkerSymbol {
    [key: string]: any;
    constructor(options?: any);
  }
  export default SimpleMarkerSymbol;
}

declare module "@arcgis/core/geometry/support/webMercatorUtils" {
  const webMercatorUtils: any;
  export = webMercatorUtils;
}

declare namespace __esri {
  type Handle = any;
  type Graphic = any;
  type GraphicHit = any;
  type ViewClickEvent = any;
  type ViewHit = any;
  type FeatureSet = any;
  type SymbolUnion = any;
  type Polygon = any;
  type Geometry = any;
  type SimpleFillSymbol = any;
}
