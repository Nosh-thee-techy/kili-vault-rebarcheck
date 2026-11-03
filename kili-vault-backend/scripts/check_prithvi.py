#!/usr/bin/env python3
"""Validate the official Prithvi checkpoint without Earth Engine access."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CHECKPOINT = ROOT_DIR / "models" / \
    "prithvi" / "Prithvi_EO_V2_300M_TL.pt"
OFFICIAL_CONFIG_URL = "https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL"


def fail(reason: str) -> int:
    print("PRITHVI MODEL STATUS: NOT READY")
    print(f"Reason: {reason}")
    return 1


def main() -> int:
    checkpoint = Path(__import__("os").environ.get(
        "PRITHVI_WEIGHTS_PATH", str(DEFAULT_CHECKPOINT)))
    if not checkpoint.is_absolute():
        checkpoint = ROOT_DIR / checkpoint

    print("PRITHVI WEIGHT TEST")
    print("-------------------")
    print(f"Model source: {OFFICIAL_CONFIG_URL}")
    print(f"Checkpoint: {checkpoint}")

    if not checkpoint.exists() or checkpoint.stat().st_size == 0:
        return fail("official checkpoint is missing or empty; run python scripts/download_prithvi_weights.py")
    print("Checkpoint exists: PASS")
    print(f"Checkpoint size: {checkpoint.stat().st_size / 1024**3:.2f} GB")

    config_path = ROOT_DIR / "models" / "prithvi" / "config.json"
    if not config_path.exists():
        return fail("official config.json is missing; download the model bundle first")
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return fail(f"official config is unreadable: {exc}")
    print("Checkpoint readable: PASS")

    try:
        import torch
        import timm  # noqa: F401
        import einops  # noqa: F401
        module_path = ROOT_DIR / "models" / "prithvi" / "official_prithvi_mae.py"
        spec = importlib.util.spec_from_file_location(
            "official_prithvi_mae", module_path)
        if spec is None or spec.loader is None:
            return fail("official Prithvi architecture module could not be loaded")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        model_config = dict(config["pretrained_cfg"])
        model_config.update(num_frames=1)
        model = module.PrithviMAE(**model_config)
        print("Architecture initialized: PASS")

        state_dict = torch.load(
            checkpoint, map_location="cpu", weights_only=True)
        if not isinstance(state_dict, dict):
            return fail("checkpoint did not contain a PyTorch state dictionary")
        state_dict = {key: value for key,
                      value in state_dict.items() if "pos_embed" not in key}
        incompatible = model.load_state_dict(state_dict, strict=False)
        expected_missing = {"encoder.pos_embed", "decoder.decoder_pos_embed"}
        missing_keys = set(incompatible.missing_keys)
        unexpected_keys = set(incompatible.unexpected_keys)
        if (missing_keys - expected_missing) or unexpected_keys:
            return fail(
                "checkpoint architecture mismatch: "
                f"missing_keys={sorted(missing_keys)}, "
                f"unexpected_keys={sorted(unexpected_keys)}"
            )
        print("State dict compatible: PASS")
        model.to(torch.device("cpu")).eval()
        print("Weights loaded: PASS")

        head_path = ROOT_DIR / "models" / "checkpoints" / "prithvi_change_head.json"
        if not head_path.exists():
            return fail("Prithvi backbone is ready, but the task-head checkpoint is missing")
        try:
            head = json.loads(head_path.read_text(encoding="utf-8"))
            expected_feature_dim = int(model_config["embed_dim"]) * 3
            if head.get("feature_dim") != expected_feature_dim:
                return fail(
                    "task-head incompatibility: "
                    f"feature_dim={head.get('feature_dim')}, expected={expected_feature_dim}"
                )
            if head.get("classes") != [
                "BUILDING_DEVELOPMENT", "INFRASTRUCTURE_CHANGE", "LAND_CLEARING",
                "VEGETATION_CHANGE", "SURFACE_CHANGE", "UNKNOWN",
            ]:
                return fail("task-head incompatibility: class vocabulary does not match Prithvi inference")
            if len(head.get("weights", [])) != expected_feature_dim:
                return fail("task-head incompatibility: weight matrix row count is incorrect")
        except Exception as exc:
            return fail(f"task-head checkpoint is unreadable: {exc}")
        print("Task head compatible: PASS")

        channels = int(model_config["in_chans"])
        image_size = int(model_config["img_size"])
        sample = torch.zeros(
            (1, channels, 1, image_size, image_size), dtype=torch.float32)
        with torch.no_grad():
            output = model.forward_features(sample)
        if not output or not hasattr(output[-1], "shape"):
            return fail("forward pass returned no feature tensor")
        print(f"Forward pass: PASS ({tuple(output[-1].shape)})")
    except ModuleNotFoundError as exc:
        return fail(f"missing official runtime dependency: {exc}; install terratorch/timm/einops as documented")
    except Exception as exc:
        return fail(f"model validation failed: {type(exc).__name__}: {exc}")

    print("STATUS: PRITHVI READY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
