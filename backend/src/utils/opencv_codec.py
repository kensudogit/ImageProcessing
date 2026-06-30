"""OpenCV ndarray ↔ base64 / bytes / PIL 変換ユーティリティ"""
from __future__ import annotations

import base64

import cv2
import numpy as np
from PIL import Image as PILImage


def ndarray_to_png_bytes(img: np.ndarray) -> bytes:
    """ndarray → PNG バイト列"""
    success, buf = cv2.imencode(".png", img)
    if not success:
        raise ValueError("PNG encoding failed")
    return buf.tobytes()


def ndarray_to_jpeg_bytes(img: np.ndarray, quality: int = 90) -> bytes:
    success, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not success:
        raise ValueError("JPEG encoding failed")
    return buf.tobytes()


def bytes_to_ndarray(data: bytes) -> np.ndarray:
    """画像バイト列 → BGR ndarray"""
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes")
    return img


def base64_to_ndarray(b64: str) -> np.ndarray:
    """data:image/...;base64,<data> または raw base64 文字列 → ndarray"""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    data = base64.b64decode(b64)
    return bytes_to_ndarray(data)


def ndarray_to_base64(img: np.ndarray, fmt: str = "png") -> str:
    """ndarray → data URI base64 文字列"""
    if fmt == "jpeg":
        raw = ndarray_to_jpeg_bytes(img)
        mime = "image/jpeg"
    else:
        raw = ndarray_to_png_bytes(img)
        mime = "image/png"
    b64 = base64.b64encode(raw).decode()
    return f"data:{mime};base64,{b64}"


def pil_to_ndarray(pil_img: PILImage.Image) -> np.ndarray:
    arr = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def ndarray_to_pil(img: np.ndarray) -> PILImage.Image:
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return PILImage.fromarray(rgb)
