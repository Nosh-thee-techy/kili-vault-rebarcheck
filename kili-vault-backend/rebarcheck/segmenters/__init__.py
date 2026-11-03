"""
RebarCheck segmenters: turn a photo into bar and reference masks.

The geometry layer never talks to a model. It only consumes the dict returned
by `segment(image)`. Select the implementation with REBARCHECK_SEGMENTER
(`meta` | `classical` | `mock`).
"""

from __future__ import annotations

from typing import Any, Dict

from .classical import ClassicalSegmenter
from .meta import MetaSegmenter
from .mock import MockSegmenter

SEGMENTERS = {
    "mock": MockSegmenter,
    "classical": ClassicalSegmenter,
    "meta": MetaSegmenter,
}


def get_segmenter(name: str):
    """
    Return a segmenter instance by name.

    Unknown names fall back to classical so a typo never crashes the pipeline.
    """
    key = (name or "classical").strip().lower()
    cls = SEGMENTERS.get(key, ClassicalSegmenter)
    return cls()


def segment_image(name: str, image, **kwargs) -> Dict[str, Any]:
    """Run `segment(image)` on the named implementation."""
    return get_segmenter(name).segment(image, **kwargs)
