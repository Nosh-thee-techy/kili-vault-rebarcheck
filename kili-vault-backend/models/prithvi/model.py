"""
Model B: Prithvi-EO Foundation Model Integration
Prithvi-EO (NASA / IBM Foundation Model for Earth Observation) Adapter for
Multi-Temporal Sentinel-2 Development Change Detection.

Prithvi is an optical EO foundation model trained on Sentinel-2 HLS.
It operates as a pretrained representation backbone that is adapted with a
task-specific multi-temporal change classification head.
"""

import os
import json
import math
import logging
import importlib.util
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path

logger = logging.getLogger("kili-vault.models.prithvi")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PRITHVI_MODEL_SOURCE = "https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL"
PRITHVI_MODEL_VARIANT = "Prithvi-EO-2.0-300M-TL"
PRITHVI_CHECKPOINT_NAME = "Prithvi_EO_V2_300M_TL.pt"

# Required Prithvi band order (6 optical bands): Blue, Green, Red, Narrow NIR, SWIR1, SWIR2
PRITHVI_BANDS = ["B2", "B3", "B4", "B8A", "B11", "B12"]

# Task-specific classes
CHANGE_CLASSES = [
    "BUILDING_DEVELOPMENT",
    "INFRASTRUCTURE_CHANGE",
    "LAND_CLEARING",
    "VEGETATION_CHANGE",
    "SURFACE_CHANGE",
    "UNKNOWN",
]


class PrithviChangeClassificationHead:
    """
    Task-specific classification head for multi-temporal change detection.
    Maps latent representation differences from Prithvi backbone:
    Delta_Representation = [feat_t2 - feat_t1, feat_t2, feat_t1] -> 6 classes
    """

    def __init__(self, embed_dim: int = 768, num_classes: int = len(CHANGE_CLASSES)):
        self.embed_dim = embed_dim
        self.num_classes = num_classes
        self.classes = CHANGE_CLASSES
        self.trained_weights: Optional[List[List[float]]] = None
        self.trained_bias: Optional[List[float]] = None

    def load_checkpoint(self, checkpoint_data: Dict[str, Any]):
        """Loads trained weights and bias from training output."""
        self.trained_weights = checkpoint_data.get("weights")
        self.trained_bias = checkpoint_data.get("bias")
        logger.info(
            "Loaded trained Prithvi change head weights into inference model.")

    def forward_logits(self, feat_t1: List[float], feat_t2: List[float]) -> Dict[str, float]:
        """
        Calculates class probabilities from multi-temporal latent features.
        Returns a probability distribution over the 6 classes.
        """
        diff = [b - a for a, b in zip(feat_t1, feat_t2)]

        # If trained weights are loaded, calculate linear projection
        if self.trained_weights is not None and self.trained_bias is not None:
            # Combined representation: [feat_t1, feat_t2, diff]
            rep = feat_t1 + feat_t2 + diff
            feat_dim = len(self.trained_weights)
            # Truncate or pad to match trained feature dimension
            if len(rep) < feat_dim:
                rep = rep + [0.0] * (feat_dim - len(rep))
            else:
                rep = rep[:feat_dim]

            logits = [
                sum(rep[f] * self.trained_weights[f][c]
                    for f in range(feat_dim)) + self.trained_bias[c]
                for c in range(min(self.num_classes, len(self.trained_bias)))
            ]
            max_l = max(logits)
            exp_l = [math.exp(x - max_l) for x in logits]
            sum_exp = sum(exp_l)
            probs_list = [x / sum_exp for x in exp_l]
            return {cls: round(probs_list[i], 4) for i, cls in enumerate(self.classes[:len(probs_list)])}

        # Baseline heuristic projection when awaiting training weights
        diff_norm = sum((b - a) ** 2 for a, b in zip(feat_t1, feat_t2)) ** 0.5
        probs = {c: 0.05 for c in self.classes}
        if diff_norm > 0.5:
            probs["BUILDING_DEVELOPMENT"] = 0.60
            probs["INFRASTRUCTURE_CHANGE"] = 0.15
            probs["LAND_CLEARING"] = 0.10
            probs["VEGETATION_CHANGE"] = 0.05
            probs["SURFACE_CHANGE"] = 0.05
            probs["UNKNOWN"] = 0.05
        else:
            probs["UNKNOWN"] = 0.50
            probs["VEGETATION_CHANGE"] = 0.20
            probs["SURFACE_CHANGE"] = 0.15
            probs["LAND_CLEARING"] = 0.10
            probs["INFRASTRUCTURE_CHANGE"] = 0.03
            probs["BUILDING_DEVELOPMENT"] = 0.02
        return probs


class PrithviModelAdapter:
    """
    Adapter for the official IBM/NASA Prithvi-EO 2.0 300M-TL foundation model.
    Clearly separates model loading, representation extraction, and downstream classification.
    """

    def __init__(
        self,
        weights_path: Optional[str] = None,
        config_path: Optional[str] = None,
        checkpoint_path: Optional[str] = None,
    ):
        self.weights_path = weights_path or os.getenv(
            "PRITHVI_WEIGHTS_PATH", "models/prithvi/Prithvi_EO_V2_300M_TL.pt")
        self.weights_path = str(self._resolve_project_path(self.weights_path))
        if checkpoint_path is not None:
            self.checkpoint_path = str(
                self._resolve_project_path(checkpoint_path))
        elif weights_path is not None:
            self.checkpoint_path = None
        else:
            self.checkpoint_path = os.getenv(
                "PRITHVI_CHECKPOINT_PATH", "models/checkpoints/prithvi_change_head.json")
            self.checkpoint_path = str(
                self._resolve_project_path(self.checkpoint_path))

        self.config_path = config_path or os.getenv(
            "PRITHVI_CONFIG_PATH", "models/prithvi/config.yaml")
        self.config_path = str(self._resolve_project_path(self.config_path))
        self.is_loaded = False
        self.head = PrithviChangeClassificationHead()
        self.load_error: Optional[str] = None
        self.backbone_backend = None
        self.backbone = None

        self._check_and_load_model()

    @staticmethod
    def _resolve_project_path(path_value: str) -> Path:
        path = Path(path_value)
        return path if path.is_absolute() else PROJECT_ROOT / path

    @staticmethod
    def _load_official_architecture():
        module_path = PROJECT_ROOT / "models" / "prithvi" / "official_prithvi_mae.py"
        config_path = module_path.with_name("config.json")
        if not module_path.exists() or not config_path.exists():
            raise FileNotFoundError(
                "official_prithvi_mae.py and config.json are required; "
                "run scripts/download_prithvi_weights.py"
            )
        spec = importlib.util.spec_from_file_location(
            "official_prithvi_mae", module_path)
        if spec is None or spec.loader is None:
            raise ImportError(
                f"Could not load official architecture from {module_path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with config_path.open(encoding="utf-8") as config_file:
            config = json.load(config_file)
        model_config = dict(config["pretrained_cfg"])
        model_config.update(num_frames=1)
        return module.PrithviMAE(**model_config), model_config

    def _check_and_load_model(self):
        """
        Loads pretrained backbone or trained change head checkpoint.
        If weights are missing, sets is_loaded=False with actionable instruction.
        """
        # A task head is not a foundation model. Require the pretrained backbone too.
        if self.checkpoint_path and os.path.exists(self.checkpoint_path):
            try:
                with open(self.checkpoint_path, "r") as f:
                    ckpt = json.load(f)
                self.head.load_checkpoint(ckpt)
                if not os.path.exists(self.weights_path):
                    self.load_error = (
                        f"Prithvi change head found at '{self.checkpoint_path}', but the pretrained "
                        f"backbone is missing at '{self.weights_path}'."
                    )
            except Exception as e:
                logger.warning(
                    "Could not parse checkpoint at %s: %s", self.checkpoint_path, e)

        # 2. Check for the official PyTorch state dictionary.
        if os.path.exists(self.weights_path):
            try:
                import torch

                self.backbone, model_config = self._load_official_architecture()
                state_dict = torch.load(
                    self.weights_path, map_location="cpu", weights_only=True)
                if not isinstance(state_dict, dict):
                    raise TypeError(
                        "checkpoint does not contain a state dictionary")
                state_dict = {
                    key: value for key, value in state_dict.items()
                    if "pos_embed" not in key
                }
                incompatible = self.backbone.load_state_dict(
                    state_dict, strict=False)
                expected_missing = {"encoder.pos_embed",
                                    "decoder.decoder_pos_embed"}
                missing_keys = set(incompatible.missing_keys)
                unexpected_keys = set(incompatible.unexpected_keys)
                if (missing_keys - expected_missing) or unexpected_keys:
                    raise RuntimeError(
                        "checkpoint architecture mismatch: "
                        f"missing_keys={sorted(missing_keys)}, "
                        f"unexpected_keys={sorted(unexpected_keys)}"
                    )
                self.backbone.eval()
                self.backbone_backend = "official_pytorch"
                self.model_config = model_config
                expected_head_feature_dim = int(model_config["embed_dim"]) * 3
                head_feature_dim = len(self.head.trained_weights or [])
                if self.head.trained_weights is None or self.head.trained_bias is None:
                    self.load_error = (
                        "Prithvi backbone loaded, but the trained change-head checkpoint is missing "
                        "weights or bias."
                    )
                elif head_feature_dim != expected_head_feature_dim:
                    self.load_error = (
                        "Prithvi backbone loaded, but the change-head checkpoint is incompatible: "
                        f"head feature_dim={head_feature_dim}, expected {expected_head_feature_dim} "
                        f"for backbone embed_dim={model_config['embed_dim']}. "
                        "Retrain the task head using features from the official Prithvi backbone."
                    )
                else:
                    self.is_loaded = True
                    self.load_error = None
                    logger.info(
                        "Official Prithvi backbone and compatible change head loaded.")
            except Exception as exc:
                self.load_error = (
                    f"Prithvi checkpoint at '{self.weights_path}' is not compatible with "
                    f"{PRITHVI_MODEL_VARIANT}: {exc}"
                )
            return

        # 3. Neither present: document requirement cleanly
        self.load_error = (
            f"Prithvi pretrained weights not found at path '{self.weights_path}'. "
            f"Download {PRITHVI_CHECKPOINT_NAME} from {PRITHVI_MODEL_SOURCE} "
            f"and place it at {self.weights_path}."
        )
        logger.info(
            "Prithvi-EO status: Awaiting pretrained weights (%s)", self.load_error)
        self.is_loaded = False
        return

    def get_status(self) -> Dict[str, Any]:
        """Reports the operational status of Prithvi-EO adapter."""
        return {
            "model_name": PRITHVI_MODEL_VARIANT,
            "model_source": PRITHVI_MODEL_SOURCE,
            "task": "MULTI-TEMPORAL SENTINEL-2 DEVELOPMENT CHANGE DETECTION",
            "is_loaded": self.is_loaded,
            "weights_path": self.weights_path,
            "config_path": self.config_path,
            "error_or_requirement": self.load_error,
            "required_bands": PRITHVI_BANDS,
            "target_classes": CHANGE_CLASSES,
            "backbone_backend": self.backbone_backend,
        }

    def extract_features(self, t1_normalized: List[float], t2_normalized: List[float]) -> List[float]:
        """Run the official backbone once for each date and return both features."""
        if self.backbone is None:
            raise RuntimeError(
                self.load_error or "Prithvi backbone is unavailable")

        import torch

        feature_vectors = []
        image_size = 64
        for normalized_bands in (t1_normalized, t2_normalized):
            values = torch.tensor(normalized_bands, dtype=torch.float32)
            values = values.view(1, len(PRITHVI_BANDS), 1, 1, 1)
            values = values.expand(1, len(PRITHVI_BANDS),
                                   1, image_size, image_size)
            with torch.no_grad():
                output = self.backbone.forward_features(values)
            if isinstance(output, (tuple, list)):
                output = output[-1]
            if isinstance(output, dict):
                output = output.get(
                    "last_hidden_state") or output.get("features")
            if output is None or not hasattr(output, "reshape"):
                raise RuntimeError(
                    "Prithvi backend returned no tensor feature output")
            if output.ndim < 3:
                raise RuntimeError(
                    "Prithvi backend returned an unexpected feature shape")
            feature_vectors.extend(
                output[:, 0, :].detach().cpu().reshape(-1).tolist())
        return feature_vectors
