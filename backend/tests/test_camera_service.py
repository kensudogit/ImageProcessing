"""カメラサービスのテスト（VideoCapture モック）"""
from unittest.mock import MagicMock, patch
import numpy as np
import pytest

from src.services.camera_service import CameraService


class TestCameraService:
    def test_list_devices_empty(self):
        svc = CameraService()
        with patch("cv2.VideoCapture") as MockCap:
            instance = MockCap.return_value
            instance.isOpened.return_value = False
            devices = svc.list_devices(max_check=3)
        assert isinstance(devices, list)
        assert all(isinstance(d, int) for d in devices)

    def test_open_success(self):
        svc = CameraService()
        with patch("cv2.VideoCapture") as MockCap:
            instance = MockCap.return_value
            instance.isOpened.return_value = True
            instance.get.side_effect = lambda prop: {
                3: 640.0, 4: 480.0, 5: 30.0,
            }.get(prop, 0.0)
            info = svc.open(device_index=0)
        assert info["device_index"] == 0
        assert "width" in info and "height" in info

    def test_open_failure(self):
        svc = CameraService()
        with patch("cv2.VideoCapture") as MockCap:
            instance = MockCap.return_value
            instance.isOpened.return_value = False
            with pytest.raises(RuntimeError):
                svc.open(device_index=99)

    def test_capture_without_open_raises(self):
        svc = CameraService()
        with pytest.raises(RuntimeError):
            svc.capture()

    def test_capture_frame(self):
        svc = CameraService()
        fake_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        with patch("cv2.VideoCapture") as MockCap:
            instance = MockCap.return_value
            instance.isOpened.return_value = True
            instance.get.return_value = 0.0
            instance.read.return_value = (True, fake_frame)
            svc.open(device_index=0)
            frame = svc.capture()
        assert frame.shape == fake_frame.shape

    def test_close_resets(self):
        svc = CameraService()
        with patch("cv2.VideoCapture") as MockCap:
            instance = MockCap.return_value
            instance.isOpened.return_value = True
            instance.get.return_value = 0.0
            svc.open()
        svc.close()
        assert not svc.is_open

    def test_is_open_false_initially(self):
        svc = CameraService()
        assert not svc.is_open
