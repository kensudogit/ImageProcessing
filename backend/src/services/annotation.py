"""画像への描画処理サービス"""
from __future__ import annotations

import cv2
import numpy as np


def _parse_color(color: str | list | tuple) -> tuple[int, int, int]:
    """'#rrggbb' / [R,G,B] / (R,G,B) → BGR tuple"""
    if isinstance(color, (list, tuple)):
        r, g, b = int(color[0]), int(color[1]), int(color[2])
        return (b, g, r)
    if isinstance(color, str) and color.startswith("#"):
        h = color.lstrip("#")
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return (b, g, r)
    return (0, 255, 0)  # fallback: green


def draw_shapes(img: np.ndarray, shapes: list[dict]) -> np.ndarray:
    """shapes リストを順に描画する"""
    out = img.copy()
    for shape in shapes:
        t = shape.get("type", "")
        color = _parse_color(shape.get("color", "#00ff00"))
        thickness = int(shape.get("thickness", 2))

        if t == "rectangle":
            x, y, w, h = int(shape["x"]), int(shape["y"]), int(shape["w"]), int(shape["h"])
            cv2.rectangle(out, (x, y), (x + w, y + h), color, thickness)

        elif t == "circle":
            cx, cy = int(shape["cx"]), int(shape["cy"])
            r = int(shape.get("radius", 20))
            cv2.circle(out, (cx, cy), r, color, thickness)

        elif t == "line":
            x1, y1 = int(shape["x1"]), int(shape["y1"])
            x2, y2 = int(shape["x2"]), int(shape["y2"])
            cv2.line(out, (x1, y1), (x2, y2), color, thickness)

        elif t == "text":
            x, y = int(shape["x"]), int(shape["y"])
            text = str(shape.get("text", ""))
            font_scale = float(shape.get("font_scale", 1.0))
            cv2.putText(out, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness)

        elif t == "polygon":
            pts_raw = shape.get("points", [])
            pts = np.array([[int(p[0]), int(p[1])] for p in pts_raw], dtype=np.int32)
            if shape.get("fill", False):
                cv2.fillPoly(out, [pts], color)
            else:
                cv2.polylines(out, [pts], isClosed=True, color=color, thickness=thickness)

    return out
