"""画像入出力サービスのテスト"""
import base64
import tempfile
from pathlib import Path

import cv2
import numpy as np
import pytest

from src.utils.opencv_codec import (
    ndarray_to_png_bytes,
    bytes_to_ndarray,
    ndarray_to_base64,
    base64_to_ndarray,
)


@pytest.fixture
def sample_img():
    img = np.zeros((50, 80, 3), dtype=np.uint8)
    img[10:40, 20:60] = (200, 100, 50)
    return img


class TestOpencvCodec:
    def test_roundtrip_png(self, sample_img):
        raw = ndarray_to_png_bytes(sample_img)
        assert isinstance(raw, bytes)
        recovered = bytes_to_ndarray(raw)
        assert recovered.shape == sample_img.shape
        assert np.allclose(recovered, sample_img)

    def test_roundtrip_base64(self, sample_img):
        b64 = ndarray_to_base64(sample_img, fmt="png")
        assert b64.startswith("data:image/png;base64,")
        recovered = base64_to_ndarray(b64)
        assert recovered.shape == sample_img.shape

    def test_base64_raw_string(self, sample_img):
        raw = ndarray_to_png_bytes(sample_img)
        b64_raw = base64.b64encode(raw).decode()
        recovered = base64_to_ndarray(b64_raw)
        assert recovered.shape == sample_img.shape


class TestImageIo:
    def test_save_and_load(self, tmp_path, monkeypatch, sample_img):
        from src.config import settings
        monkeypatch.setattr(settings, "upload_dir", str(tmp_path))

        from src.services import image_io
        monkeypatch.setattr(image_io.settings, "upload_dir", str(tmp_path))

        meta = image_io.save_ndarray(sample_img, source="upload")
        assert Path(meta["storage_path"]).exists()
        assert meta["width"] == 80
        assert meta["height"] == 50

        loaded = image_io.load_ndarray(meta["storage_path"])
        assert loaded.shape == sample_img.shape

    def test_save_bytes(self, tmp_path, monkeypatch, sample_img):
        from src.config import settings
        from src.services import image_io
        monkeypatch.setattr(image_io.settings, "upload_dir", str(tmp_path))

        raw = ndarray_to_png_bytes(sample_img)
        meta = image_io.save_bytes(raw, "test.png")
        assert Path(meta["storage_path"]).exists()
