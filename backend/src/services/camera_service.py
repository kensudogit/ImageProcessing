"""USB カメラサービス（OpenCV VideoCapture ラッパー）"""
from __future__ import annotations

import logging
from typing import Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class CameraService:
    """シングルトン的に使う USB カメラ管理クラス"""

    def __init__(self) -> None:
        self._cap: cv2.VideoCapture | None = None
        self._device_index: int = 0

    def list_devices(self, max_check: int = 5) -> list[int]:
        """試行してキャプチャ可能なデバイス index を列挙する"""
        available = []
        for i in range(max_check):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            if cap.isOpened():
                available.append(i)
                cap.release()
        return available

    def open(self, device_index: int = 0, width: int = 640, height: int = 480, fps: int = 30) -> dict:
        """カメラを開く"""
        self.close()
        self._device_index = device_index
        cap = cv2.VideoCapture(device_index, cv2.CAP_DSHOW)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open camera device: {device_index}")
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        cap.set(cv2.CAP_PROP_FPS, fps)
        self._cap = cap
        return {
            "device_index": device_index,
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": int(cap.get(cv2.CAP_PROP_FPS)),
        }

    def capture(self) -> np.ndarray:
        """現在フレームを取得する"""
        if self._cap is None or not self._cap.isOpened():
            raise RuntimeError("Camera is not open. Call open() first.")
        ret, frame = self._cap.read()
        if not ret or frame is None:
            raise RuntimeError("Failed to capture frame")
        return frame

    def update_settings(self, settings: dict[str, Any]) -> dict:
        """カメラプロパティを更新する（brightness, exposure など）"""
        if self._cap is None:
            raise RuntimeError("Camera is not open")
        prop_map = {
            "brightness": cv2.CAP_PROP_BRIGHTNESS,
            "contrast": cv2.CAP_PROP_CONTRAST,
            "saturation": cv2.CAP_PROP_SATURATION,
            "exposure": cv2.CAP_PROP_EXPOSURE,
            "gain": cv2.CAP_PROP_GAIN,
            "width": cv2.CAP_PROP_FRAME_WIDTH,
            "height": cv2.CAP_PROP_FRAME_HEIGHT,
            "fps": cv2.CAP_PROP_FPS,
        }
        applied = {}
        for key, val in settings.items():
            prop = prop_map.get(key)
            if prop is not None:
                self._cap.set(prop, float(val))
                applied[key] = float(self._cap.get(prop))
        return applied

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    @property
    def is_open(self) -> bool:
        return self._cap is not None and self._cap.isOpened()


camera_service = CameraService()
