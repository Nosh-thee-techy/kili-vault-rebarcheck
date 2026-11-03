import {
  LAYER_GROUP_LABELS,
  MAP_LAYERS,
  type MapLayerConfig,
} from "@/config/mapLayers";
import type { MapLayerGroup } from "@/config/mapLayers";

interface MapLayerPanelProps {
  visibility: Record<string, boolean>;
  onToggle: (layerId: string, visible: boolean) => void;
  showCases: boolean;
  onToggleCases: (visible: boolean) => void;
  showDetections?: boolean;
  onToggleDetections?: (visible: boolean) => void;
  detectionCount?: number;
  className?: string;
}

function groupLayers(
  layers: MapLayerConfig[],
): Record<MapLayerGroup, MapLayerConfig[]> {
  return layers.reduce(
    (acc, layer) => {
      acc[layer.group].push(layer);
      return acc;
    },
    {
      boundaries: [],
      planning: [],
      infrastructure: [],
      environment: [],
    } as Record<MapLayerGroup, MapLayerConfig[]>,
  );
}

export function MapLayerPanel({
  visibility,
  onToggle,
  showCases,
  onToggleCases,
  showDetections = true,
  onToggleDetections,
  detectionCount,
  className,
}: MapLayerPanelProps) {
  const grouped = groupLayers(MAP_LAYERS);

  return (
    <calcite-panel heading="Map layers" className={className} closable={false}>
      <div className="max-h-[min(60vh,34rem)] overflow-y-auto">
        {onToggleDetections && (
          <calcite-label layout="inline">
            <calcite-checkbox
              checked={showDetections}
              onChange={(event) =>
                onToggleDetections((event.target as HTMLInputElement).checked)
              }
            />
            Kili-Shadows detections
            {detectionCount != null ? ` (${detectionCount})` : ""}
          </calcite-label>
        )}
        <calcite-label layout="inline">
          <calcite-checkbox
            checked={showCases}
            onChange={(event) =>
              onToggleCases((event.target as HTMLInputElement).checked)
            }
          />
          Development cases
        </calcite-label>

        {(Object.keys(grouped) as MapLayerGroup[]).map((group) => {
          const layers = grouped[group];
          if (layers.length === 0) return null;
          return (
            <section key={group} className="border-t border-sand px-3 py-2">
              <p className="mb-1 text-xs font-semibold text-charcoal-muted">
                {LAYER_GROUP_LABELS[group]}
              </p>
              {layers.map((layer) => (
                <calcite-label key={layer.id} layout="inline">
                  <calcite-checkbox
                    checked={visibility[layer.id] ?? layer.defaultVisible}
                    onChange={(event) =>
                      onToggle(
                        layer.id,
                        (event.target as HTMLInputElement).checked,
                      )
                    }
                  />
                  {layer.title}
                </calcite-label>
              ))}
            </section>
          );
        })}
      </div>
    </calcite-panel>
  );
}
