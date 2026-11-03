import { Layers } from "lucide-react";
import { useState } from "react";
import {
  LAYER_GROUP_LABELS,
  MAP_LAYERS,
  type MapLayerConfig,
} from "@/config/mapLayers";
import { cn } from "@/lib/cn";
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
  const [expanded, setExpanded] = useState(true);
  const grouped = groupLayers(MAP_LAYERS);

  return (
    <div
      className={cn(
        "rounded-2xl border border-sand bg-off-white/95 shadow-lift backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-sand/40"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 font-semibold text-charcoal">
          <Layers className="h-4 w-4 text-forest" />
          Map layers
        </span>
        <span className="text-xs font-medium text-charcoal-muted">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="max-h-[min(50vh,420px)] space-y-4 overflow-y-auto border-t border-sand px-4 py-3">
          <div className="rounded-xl border border-sand bg-mist/20 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-sage">
              Map legend
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-charcoal-muted">
              <span className="flex items-center gap-2">
                <i className="h-3 w-3 rounded-sm border border-[#8E8174] bg-white/30" />{" "}
                Parcels
              </span>
              <span className="flex items-center gap-2">
                <i className="h-3 w-3 rounded-sm border border-[#34343A] bg-[#4A4A4F]/40" />{" "}
                Buildings
              </span>
              <span className="flex items-center gap-2">
                <i className="h-0.5 w-4 bg-[#8B6A4E]" /> Roads
              </span>
              <span className="flex items-center gap-2">
                <i className="h-0.5 w-4 bg-[#4689A4]" /> Rivers
              </span>
              <span className="flex items-center gap-2">
                <i className="h-3 w-3 rounded-sm border border-dashed border-[#4689A4] bg-[#4689A4]/15" />{" "}
                Sensitivity
              </span>
              <span className="flex items-center gap-2">
                <i className="h-3 w-3 rounded-sm border border-[#C4785A] bg-[#C4785A]/30" />{" "}
                Cases / change
              </span>
            </div>
          </div>
          {onToggleDetections && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-mist/20 p-3 transition-colors hover:bg-mist/35">
              <input
                type="checkbox"
                checked={showDetections}
                onChange={(e) => onToggleDetections(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-sand accent-forest"
              />
              <span>
                <span className="block text-sm font-semibold text-charcoal">
                  Kili-Shadows detections
                  {detectionCount != null && (
                    <span className="ml-1.5 font-mono text-xs text-sage">
                      ({detectionCount})
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-charcoal-muted">
                  Live satellite candidates — dashed outlines
                </span>
              </span>
            </label>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-clay/20 bg-clay/5 p-3 transition-colors hover:bg-clay/8">
            <input
              type="checkbox"
              checked={showCases}
              onChange={(e) => onToggleCases(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-sand accent-forest"
            />
            <span>
              <span className="block text-sm font-semibold text-charcoal">
                Development cases
              </span>
              <span className="mt-0.5 block text-xs text-charcoal-muted">
                Workflow cases (solid fill) — review &amp; close
              </span>
            </span>
          </label>

          {(Object.keys(grouped) as MapLayerGroup[]).map((group) => {
            const layers = grouped[group];
            if (layers.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-sage">
                  {LAYER_GROUP_LABELS[group]}
                </p>
                <ul className="space-y-1">
                  {layers.map((layer) => (
                    <li key={layer.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sand/50">
                        <input
                          type="checkbox"
                          checked={visibility[layer.id] ?? layer.defaultVisible}
                          onChange={(e) => onToggle(layer.id, e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-sand accent-forest"
                        />
                        <span>
                          <span className="block text-sm font-medium text-charcoal">
                            {layer.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-charcoal-muted">
                            {layer.description}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
