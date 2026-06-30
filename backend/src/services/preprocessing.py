"""画像前処理サービス — グレースケール・2値化・エッジ・リサイズ・反転・色変換・フィルター"""
from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def _ensure_bgr(img: np.ndarray) -> np.ndarray:
    """グレースケール画像を BGR に変換して統一する"""
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    return img


def apply_grayscale(img: np.ndarray, **_) -> np.ndarray:
    """グレースケール変換"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


def apply_binarize(img: np.ndarray, method: str = "otsu", threshold: int = 127, **_) -> np.ndarray:
    """2値化 (otsu / threshold)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if method == "otsu":
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        _, binary = cv2.threshold(gray, int(threshold), 255, cv2.THRESH_BINARY)
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def apply_edge(img: np.ndarray, method: str = "canny", low: int = 50, high: int = 150, **_) -> np.ndarray:
    """エッジ抽出 (canny / sobel / laplacian)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if method == "canny":
        edge = cv2.Canny(gray, int(low), int(high))
    elif method == "sobel":
        sx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        edge = cv2.convertScaleAbs(np.sqrt(sx**2 + sy**2))
    else:  # laplacian
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        edge = cv2.convertScaleAbs(lap)
    return cv2.cvtColor(edge, cv2.COLOR_GRAY2BGR)


def apply_resize(img: np.ndarray, width: int = 640, height: int = 480, interpolation: str = "linear", **_) -> np.ndarray:
    """リサイズ"""
    interp_map = {
        "linear": cv2.INTER_LINEAR,
        "nearest": cv2.INTER_NEAREST,
        "cubic": cv2.INTER_CUBIC,
        "area": cv2.INTER_AREA,
        "lanczos": cv2.INTER_LANCZOS4,
    }
    interp = interp_map.get(interpolation, cv2.INTER_LINEAR)
    return cv2.resize(img, (int(width), int(height)), interpolation=interp)


def apply_flip(img: np.ndarray, mode: str = "horizontal", **_) -> np.ndarray:
    """反転 (horizontal / vertical / both)"""
    mode_map = {"horizontal": 1, "vertical": 0, "both": -1}
    code = mode_map.get(mode, 1)
    return cv2.flip(img, code)


_COLOR_CODE_MAP: dict[str, int] = {
    "hsv": cv2.COLOR_BGR2HSV,
    "lab": cv2.COLOR_BGR2Lab,
    "rgb": cv2.COLOR_BGR2RGB,
    "gray": cv2.COLOR_BGR2GRAY,
    "yuv": cv2.COLOR_BGR2YUV,
    "xyz": cv2.COLOR_BGR2XYZ,
    "hls": cv2.COLOR_BGR2HLS,
}


def apply_color_convert(img: np.ndarray, code: str = "hsv", **_) -> np.ndarray:
    """色空間変換 (hsv / lab / rgb / gray / yuv / xyz / hls)"""
    cv_code = _COLOR_CODE_MAP.get(code.lower())
    if cv_code is None:
        raise ValueError(f"Unknown color code: {code}. Choose from {list(_COLOR_CODE_MAP)}")
    converted = cv2.cvtColor(img, cv_code)
    return _ensure_bgr(converted)


def apply_filter(img: np.ndarray, type: str = "gaussian", ksize: int = 5, **_) -> np.ndarray:
    """フィルター処理 (blur / gaussian / median / bilateral / sharpen)"""
    k = int(ksize) | 1  # odd
    if type == "blur":
        return cv2.blur(img, (k, k))
    if type == "gaussian":
        return cv2.GaussianBlur(img, (k, k), 0)
    if type == "median":
        return cv2.medianBlur(img, k)
    if type == "bilateral":
        return cv2.bilateralFilter(img, k, 75, 75)
    if type == "sharpen":
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
        return cv2.filter2D(img, -1, kernel)
    raise ValueError(f"Unknown filter type: {type}")


_OPERATIONS: dict[str, Any] = {
    "grayscale": apply_grayscale,
    "binarize": apply_binarize,
    "edge": apply_edge,
    "resize": apply_resize,
    "flip": apply_flip,
    "color_convert": apply_color_convert,
    "filter": apply_filter,
}


def run_pipeline(img: np.ndarray, operations: list[dict]) -> list[dict]:
    """operations リストを順に適用し、各ステップの結果を返す"""
    results = []
    current = img.copy()
    for op in operations:
        name = op.get("operation", "")
        fn = _OPERATIONS.get(name)
        if fn is None:
            raise ValueError(f"Unknown operation: {name}. Choose from {list(_OPERATIONS)}")
        params = {k: v for k, v in op.items() if k != "operation"}
        current = fn(current, **params)
        results.append({"operation": name, "img": current})
    return results
