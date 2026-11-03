# Prithvi-EO 2.0 300M-TL

This project targets the official IBM/NASA Prithvi-EO 2.0 300M-TL model.

- Source: https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL
- Checkpoint: `Prithvi_EO_V2_300M_TL.pt`
- Local path: `models/prithvi/Prithvi_EO_V2_300M_TL.pt`
- Format: official PyTorch state dictionary, not TorchScript
- Architecture: official `PrithviMAE` 3D ViT/MAE
- Input: six HLS bands, four temporal frames, 224x224 patches
- CPU: supported for validation and controlled inference; expect high memory and runtime costs

The production adapter loads the official PyTorch state dictionary through the
downloaded `PrithviMAE` architecture. It does not accept TorchScript, random
initialization, or a different Prithvi variant. The checkpoint alone is not a
change detector: the task-specific change head must also be trained against
features emitted by this backbone before production change predictions are
enabled.

## Setup

Install the Python dependencies in the project virtual environment, then run:

```powershell
.venv\Scripts\python.exe scripts/download_prithvi_weights.py
.venv\Scripts\python.exe scripts/train_prithvi_head.py
.venv\Scripts\python.exe scripts/check_prithvi.py
```

The readiness command does not access Earth Engine. It verifies the checkpoint,
constructs the official architecture, loads the state dictionary, moves the
model to CPU, and runs a minimal forward-features pass.

The current task-specific head was trained on a 23-value handcrafted feature
vector in older project outputs. Run `train_prithvi_head.py` to train the
current six-class head on 3,072-value `[T1, T2, T2-T1]` CLS features emitted by
the official backbone. The production adapter reports `READY` only after that
compatible head checkpoint exists.
