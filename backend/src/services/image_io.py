"""画像ファイル保存・読み込みサービス"""
from __future__ import annotations

import uuid
from pathlib import Path

import cv2
import numpy as np

from src.config import settings
from src.utils.opencv_codec import bytes_to_ndarray, ndarray_to_png_bytes


def _new_path(ext: str = ".png") -> Path:
    name = f"{uuid.uuid4().hex}{ext}"
    return settings.upload_path / name


def save_ndarray(img: np.ndarray, source: str = "upload") -> dict:
    """ndarray を PNG としてアップロードディレクトリに保存し、メタデータを返す"""
    h, w = img.shape[:2]
    path = _new_path(".png")
    cv2.imwrite(str(path), img)
    return {
        "filename": path.name,
        "source": source,
        "width": w,
        "height": h,
        "mime": "image/png",
        "storage_path": str(path),
    }


def save_bytes(data: bytes, original_name: str = "upload.png", source: str = "upload") -> dict:
    """生バイト列から画像を保存する"""
    img = bytes_to_ndarray(data)
    meta = save_ndarray(img, source)
    meta["filename"] = original_name
    return meta


def load_ndarray(storage_path: str) -> np.ndarray:
    img = cv2.imread(storage_path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Image not found: {storage_path}")
    return img


def load_bytes(storage_path: str) -> bytes:
    img = load_ndarray(storage_path)
    return ndarray_to_png_bytes(img)
