#!/usr/bin/env python3
"""Train the change head on features emitted by the official Prithvi backbone."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch
from torch import nn

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from models.prithvi.preprocessing import prepare_multitemporal_chip
from models.prithvi.model import CHANGE_CLASSES, PrithviModelAdapter


LABELS = {name: index for index, name in enumerate(CHANGE_CLASSES)}


def load_examples(directory: Path):
    examples = []
    for path in sorted(directory.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            chip = json.load(handle)
        label = chip.get("label", "UNKNOWN")
        if label == "NO_CHANGE":
            label = "UNKNOWN"
        if label not in LABELS:
            raise ValueError(f"Unsupported label {label!r} in {path}")
        examples.append((chip, LABELS[label]))
    if not examples:
        raise RuntimeError(f"No labelled chips found in {directory}")
    return examples


def features_for(adapter, examples):
    samples = []
    labels = []
    for chip, label in examples:
        prepared = prepare_multitemporal_chip(
            chip["bands_t1"], chip["bands_t2"])
        samples.append((prepared["t1_normalized"], prepared["t2_normalized"]))
        labels.append(label)
    features = []
    image_size = 64
    with torch.no_grad():
        for start in range(0, len(samples), 8):
            batch = samples[start:start + 8]
            values = torch.tensor(
                [bands for sample in batch for bands in sample],
                dtype=torch.float32,
            ).view(len(batch) * 2, 6, 1, 1, 1)
            values = values.expand(-1, 6, 1, image_size, image_size)
            outputs = adapter.backbone.forward_features(values)[-1][:, 0, :]
            for index in range(len(batch)):
                t1 = outputs[index * 2]
                t2 = outputs[index * 2 + 1]
                features.append(torch.cat((t1, t2, t2 - t1)))
    return torch.stack(features), torch.tensor(labels, dtype=torch.long)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train-dir", type=Path,
                        default=ROOT_DIR / "data" / "train")
    parser.add_argument("--validation-dir", type=Path,
                        default=ROOT_DIR / "data" / "validation")
    parser.add_argument("--output", type=Path, default=ROOT_DIR /
                        "models" / "checkpoints" / "prithvi_change_head.json")
    parser.add_argument("--epochs", type=int, default=40)
    args = parser.parse_args()

    torch.manual_seed(42)
    adapter = PrithviModelAdapter(checkpoint_path=str(
        ROOT_DIR / "models" / "checkpoints" / "missing.json"))
    if adapter.backbone is None:
        print(f"Backbone unavailable: {adapter.load_error}", file=sys.stderr)
        return 1

    print("PRITHVI TASK HEAD TRAINING")
    print(f"Backbone: {adapter.get_status()['model_name']}")
    print(f"Training chips: {args.train_dir}")
    train_x, train_y = features_for(adapter, load_examples(args.train_dir))
    validation_x, validation_y = features_for(
        adapter, load_examples(args.validation_dir))

    classifier = nn.Linear(train_x.shape[1], len(CHANGE_CLASSES))
    optimizer = torch.optim.Adam(classifier.parameters(), lr=0.01)
    loss_fn = nn.CrossEntropyLoss()
    for _ in range(args.epochs):
        optimizer.zero_grad()
        loss = loss_fn(classifier(train_x), train_y)
        loss.backward()
        optimizer.step()

    with torch.no_grad():
        predictions = classifier(validation_x).argmax(dim=1)
        accuracy = (predictions == validation_y).float().mean().item()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    state = classifier.state_dict()
    weights = state["weight"].t().tolist()
    bias = state["bias"].tolist()
    payload = {
        "model_architecture": "Prithvi-EO 2.0 300M-TL CLS change head",
        "model_source": adapter.get_status()["model_source"],
        "feature_dim": train_x.shape[1],
        "backbone_embed_dim": 1024,
        "classes": CHANGE_CLASSES,
        "weights": weights,
        "bias": bias,
        "epochs_trained": args.epochs,
        "validation_accuracy": round(accuracy, 4),
    }
    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    print(f"Feature dimension: {train_x.shape[1]}")
    print(f"Validation accuracy: {accuracy:.4f}")
    print(f"Head checkpoint: {args.output}")
    print("Prithvi task head: READY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
