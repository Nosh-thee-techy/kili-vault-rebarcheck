"""
SAM 3.1 segmenter adapter.

Does not call the Meta Model API itself. Node's `metaModelClient.js` is the
only place that talks to Meta; this module consumes a sidecar JSON of masks
that the Node orchestrator writes next to the photo (or passes in-process).

Unverified request/response fields are marked TODO(verify against Meta Model API docs).
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import numpy as np


class MetaSegmenter:
    """Load SAM masks produced by the Node Meta adapter, or fail closed."""

    def segment(
        self,
        image: np.ndarray,
        masks_path: Optional[str] = None,
        masks: Optional[Dict[str, Any]] = None,
        **_kwargs,
    ) -> Dict[str, Any]:
        """
        Decode bar and reference masks from adapter output.

        Expected sidecar shape (NOT confirmed against Meta docs):
        {
          "bars": [{"mask": [[0,1,...], ...], "score": 0.9}, ...],
          "reference": {"mask": [[...]], "score": 0.9} | null
        }
        TODO(verify against Meta Model API docs): actual SAM 3.1 payload may
        use RLE, polygons, or a different score field. Keep decoding here so
        only this file changes when the real schema is known.
        """
        payload = masks
        if payload is None and masks_path:
            with open(masks_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        if not payload:
            return {"bars": [], "reference": None, "error": "no_sam_masks"}
        height, width = image.shape[:2] if image is not None else (0, 0)
        bars = [_decode_mask_entry(entry, height, width) for entry in payload.get("bars") or []]
        bars = [b for b in bars if b is not None]
        reference = _decode_mask_entry(payload.get("reference"), height, width)
        return {"bars": bars, "reference": reference}


def _decode_mask_entry(
    entry: Optional[Dict[str, Any]],
    height: int,
    width: int,
) -> Optional[Dict[str, Any]]:
    """Turn one adapter mask object into a boolean numpy array."""
    if not entry:
        return None
    raw = entry.get("mask")
    if raw is None:
        return None
    # TODO(verify against Meta Model API docs): RLE decoding belongs here if
    # SAM 3.1 returns COCO-style counts instead of a dense 2D array.
    array = np.array(raw, dtype=bool)
    if height and width and array.shape != (height, width):
        # Sidecar might be a smaller crop; skip rather than guess a resize.
        if array.ndim != 2:
            return None
    score = float(entry.get("score", 0.5))
    return {"mask": array, "score": score}
