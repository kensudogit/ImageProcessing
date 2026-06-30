"""オブジェクト検出サービスのテスト"""
import numpy as np
import pytest

from src.services.object_detection import detect_contours, detect_haar, draw_boxes


@pytest.fixture
def white_square():
    """黒背景に白い正方形"""
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    img[50:150, 50:150] = 255
    return img


class TestObjectDetection:
    def test_contour_detects_square(self, white_square):
        boxes = detect_contours(white_square, min_area=100)
        assert len(boxes) >= 1
        b = boxes[0]
        assert "label" in b and "x" in b and "y" in b and "w" in b and "h" in b

    def test_contour_min_area_filter(self, white_square):
        boxes_all = detect_contours(white_square, min_area=10)
        boxes_large = detect_contours(white_square, min_area=5000)
        assert len(boxes_large) <= len(boxes_all)

    def test_haar_face_returns_list(self):
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        boxes = detect_haar(img, cascade="face")
        assert isinstance(boxes, list)

    def test_draw_boxes_shape_unchanged(self, white_square):
        boxes = [{"label": "test", "confidence": 0.9, "x": 10, "y": 10, "w": 50, "h": 50}]
        out = draw_boxes(white_square, boxes)
        assert out.shape == white_square.shape

    def test_draw_boxes_empty(self, white_square):
        out = draw_boxes(white_square, [])
        assert out.shape == white_square.shape


class TestRunDetection:
    def test_run_contour_method(self, white_square):
        from src.services.object_detection import run_detection
        boxes, annotated = run_detection(white_square, "contour", min_area=100)
        assert isinstance(boxes, list)
        assert annotated.shape == white_square.shape

    def test_run_unknown_method(self, white_square):
        from src.services.object_detection import run_detection
        with pytest.raises(ValueError):
            run_detection(white_square, "unknown_method")
