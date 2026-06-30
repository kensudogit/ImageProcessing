"""前処理サービスのテスト"""
import numpy as np
import pytest
import cv2

from src.services.preprocessing import (
    apply_grayscale, apply_binarize, apply_edge, apply_resize,
    apply_flip, apply_color_convert, apply_filter, run_pipeline,
)


@pytest.fixture
def sample_bgr():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[30:70, 30:70] = (0, 128, 255)
    return img


class TestPreprocessing:
    def test_grayscale_returns_bgr_shape(self, sample_bgr):
        out = apply_grayscale(sample_bgr)
        assert out.shape == sample_bgr.shape

    def test_binarize_otsu(self, sample_bgr):
        out = apply_binarize(sample_bgr, method="otsu")
        assert out.shape == sample_bgr.shape

    def test_binarize_threshold(self, sample_bgr):
        out = apply_binarize(sample_bgr, method="threshold", threshold=100)
        assert out.shape == sample_bgr.shape

    def test_edge_canny(self, sample_bgr):
        out = apply_edge(sample_bgr, method="canny", low=50, high=150)
        assert out.shape == sample_bgr.shape

    def test_edge_sobel(self, sample_bgr):
        out = apply_edge(sample_bgr, method="sobel")
        assert out.shape == sample_bgr.shape

    def test_edge_laplacian(self, sample_bgr):
        out = apply_edge(sample_bgr, method="laplacian")
        assert out.shape == sample_bgr.shape

    def test_resize(self, sample_bgr):
        out = apply_resize(sample_bgr, width=200, height=150)
        assert out.shape == (150, 200, 3)

    def test_flip_horizontal(self, sample_bgr):
        out = apply_flip(sample_bgr, mode="horizontal")
        assert out.shape == sample_bgr.shape

    def test_flip_vertical(self, sample_bgr):
        out = apply_flip(sample_bgr, mode="vertical")
        assert out.shape == sample_bgr.shape

    def test_flip_both(self, sample_bgr):
        out = apply_flip(sample_bgr, mode="both")
        assert out.shape == sample_bgr.shape

    def test_color_convert_hsv(self, sample_bgr):
        out = apply_color_convert(sample_bgr, code="hsv")
        assert out.shape == sample_bgr.shape

    def test_color_convert_lab(self, sample_bgr):
        out = apply_color_convert(sample_bgr, code="lab")
        assert out.shape == sample_bgr.shape

    def test_color_convert_invalid(self, sample_bgr):
        with pytest.raises(ValueError):
            apply_color_convert(sample_bgr, code="invalid_code")

    def test_filter_gaussian(self, sample_bgr):
        out = apply_filter(sample_bgr, type="gaussian", ksize=5)
        assert out.shape == sample_bgr.shape

    def test_filter_median(self, sample_bgr):
        out = apply_filter(sample_bgr, type="median", ksize=5)
        assert out.shape == sample_bgr.shape

    def test_filter_sharpen(self, sample_bgr):
        out = apply_filter(sample_bgr, type="sharpen")
        assert out.shape == sample_bgr.shape

    def test_pipeline_multiple_ops(self, sample_bgr):
        ops = [
            {"operation": "grayscale"},
            {"operation": "resize", "width": 64, "height": 64},
        ]
        steps = run_pipeline(sample_bgr, ops)
        assert len(steps) == 2
        assert steps[1]["img"].shape == (64, 64, 3)

    def test_pipeline_unknown_op(self, sample_bgr):
        with pytest.raises(ValueError):
            run_pipeline(sample_bgr, [{"operation": "not_a_thing"}])
