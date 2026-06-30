"""深層学習サービス — sklearn フォールバック + TensorFlow / PyTorch CNN オプション"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import cv2
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from src.config import settings

logger = logging.getLogger(__name__)

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

IMG_SIZE = (64, 64)


def check_frameworks() -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    try:
        import tensorflow as tf
        out["tensorflow"] = tf.__version__
    except ImportError:
        out["tensorflow"] = None
    try:
        import torch
        out["pytorch"] = torch.__version__
    except ImportError:
        out["pytorch"] = None
    out["sklearn"] = "always"
    return out


def resolve_backend() -> str:
    fw = check_frameworks()
    if fw["tensorflow"]:
        return "tensorflow"
    if fw["pytorch"]:
        return "pytorch"
    return "sklearn"


def _extract_features(img: np.ndarray) -> np.ndarray:
    """HOG 特徴量 + フラット化 (sklearn 用)"""
    resized = cv2.resize(img, IMG_SIZE)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    hog = cv2.HOGDescriptor((64, 64), (16, 16), (8, 8), (8, 8), 9)
    return hog.compute(gray).flatten()


def train_sklearn(images: list[np.ndarray], labels: list[str]) -> dict[str, Any]:
    label_set = sorted(set(labels))
    label_map = {l: i for i, l in enumerate(label_set)}
    X = np.array([_extract_features(img) for img in images])
    y = np.array([label_map[l] for l in labels])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_s, y_train)
    acc = float(model.score(X_test_s, y_test))
    return {"model": model, "scaler": scaler, "labels": label_set, "test_accuracy": round(acc, 4), "backend": "sklearn"}


def train_tensorflow(images: list[np.ndarray], labels: list[str]) -> dict[str, Any]:
    import tensorflow as tf

    label_set = sorted(set(labels))
    label_map = {l: i for i, l in enumerate(label_set)}
    n_classes = len(label_set)

    X = np.array([cv2.resize(img, IMG_SIZE).astype(np.float32) / 255.0 for img in images])
    y = tf.keras.utils.to_categorical([label_map[l] for l in labels], n_classes)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation="relu", input_shape=(64, 64, 3)),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(64, (3, 3), activation="relu"),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(n_classes, activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
    model.fit(X_train, y_train, epochs=15, batch_size=16, verbose=0,
              validation_data=(X_test, y_test) if len(X_test) > 0 else None)
    _, acc = model.evaluate(X_test, y_test, verbose=0) if len(X_test) > 0 else (0, 0)
    return {"model": model, "labels": label_set, "test_accuracy": round(float(acc), 4), "backend": "tensorflow"}


def train_pytorch(images: list[np.ndarray], labels: list[str]) -> dict[str, Any]:
    import torch
    import torch.nn as nn

    label_set = sorted(set(labels))
    label_map = {l: i for i, l in enumerate(label_set)}
    n_classes = len(label_set)

    X = np.array([cv2.resize(img, IMG_SIZE).astype(np.float32) / 255.0 for img in images])
    X = X.transpose(0, 3, 1, 2)  # NHWC → NCHW
    y = np.array([label_map[l] for l in labels])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    class SimpleCNN(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv = nn.Sequential(
                nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            )
            self.fc = nn.Sequential(
                nn.Flatten(), nn.Linear(64 * 16 * 16, 128), nn.ReLU(),
                nn.Dropout(0.3), nn.Linear(128, n_classes),
            )

        def forward(self, x):
            return self.fc(self.conv(x))

    model = SimpleCNN()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()
    x_t = torch.tensor(X_train, dtype=torch.float32)
    y_t = torch.tensor(y_train, dtype=torch.long)
    model.train()
    for _ in range(15):
        optimizer.zero_grad()
        loss = criterion(model(x_t), y_t)
        loss.backward()
        optimizer.step()
    model.eval()
    with torch.no_grad():
        preds = model(torch.tensor(X_test, dtype=torch.float32)).argmax(1).numpy()
    acc = float((preds == y_test).mean()) if len(y_test) > 0 else 0.0
    return {"model": model, "labels": label_set, "test_accuracy": round(acc, 4), "backend": "pytorch"}


def train_model(images: list[np.ndarray], labels: list[str], backend: str = "auto") -> dict[str, Any]:
    if backend == "auto":
        backend = resolve_backend()
    trainers = {
        "tensorflow": train_tensorflow,
        "pytorch": train_pytorch,
        "sklearn": train_sklearn,
    }
    fn = trainers.get(backend, train_sklearn)
    try:
        return fn(images, labels)
    except Exception as e:
        logger.warning("%s training failed (%s), falling back to sklearn", backend, e)
        return train_sklearn(images, labels)


def save_model_bundle(bundle: dict[str, Any], model_dir: Path, name: str) -> Path:
    model_dir.mkdir(parents=True, exist_ok=True)
    backend = bundle["backend"]
    if backend == "tensorflow":
        path = model_dir / f"{name}.keras"
        bundle["model"].save(str(path))
        meta_path = model_dir / f"{name}_meta.joblib"
        joblib.dump({k: v for k, v in bundle.items() if k != "model"}, meta_path)
    elif backend == "pytorch":
        import torch
        path = model_dir / f"{name}.pt"
        torch.save(bundle["model"].state_dict(), path)
        meta_path = model_dir / f"{name}_meta.joblib"
        joblib.dump({k: v for k, v in bundle.items() if k != "model"}, meta_path)
    else:
        path = model_dir / f"{name}.joblib"
        joblib.dump(bundle, path)
    return path


def predict(img: np.ndarray, model_path: str, backend: str, labels: list[str]) -> dict[str, Any]:
    if backend == "tensorflow":
        import tensorflow as tf
        model = tf.keras.models.load_model(model_path)
        x = cv2.resize(img, IMG_SIZE).astype(np.float32) / 255.0
        proba = model.predict(x[np.newaxis], verbose=0)[0]
        idx = int(np.argmax(proba))
        return {"label": labels[idx], "confidence": round(float(proba[idx]), 4), "backend": backend}
    elif backend == "pytorch":
        import torch
        import importlib
        # load model via saved state dict - rebuild arch on the fly
        n_classes = len(labels)
        import torch.nn as nn

        class SimpleCNN(nn.Module):
            def __init__(self):
                super().__init__()
                self.conv = nn.Sequential(
                    nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                    nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                )
                self.fc = nn.Sequential(
                    nn.Flatten(), nn.Linear(64 * 16 * 16, 128), nn.ReLU(),
                    nn.Dropout(0.3), nn.Linear(128, n_classes),
                )

            def forward(self, x):
                return self.fc(self.conv(x))

        model = SimpleCNN()
        model.load_state_dict(torch.load(model_path, weights_only=True))
        model.eval()
        x = cv2.resize(img, IMG_SIZE).astype(np.float32) / 255.0
        x_t = torch.tensor(x.transpose(2, 0, 1)[np.newaxis], dtype=torch.float32)
        with torch.no_grad():
            out = torch.softmax(model(x_t), dim=1)[0].numpy()
        idx = int(np.argmax(out))
        return {"label": labels[idx], "confidence": round(float(out[idx]), 4), "backend": backend}
    else:
        bundle = joblib.load(model_path)
        features = _extract_features(img).reshape(1, -1)
        if "scaler" in bundle:
            features = bundle["scaler"].transform(features)
        proba = bundle["model"].predict_proba(features)[0]
        idx = int(np.argmax(proba))
        lbl_list = bundle.get("labels", labels)
        return {"label": lbl_list[idx], "confidence": round(float(proba[idx]), 4), "backend": backend}
