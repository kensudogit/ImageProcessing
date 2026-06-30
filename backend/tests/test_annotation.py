"""描画処理サービスのテスト"""
import numpy as np
import pytest

from src.services.annotation import draw_shapes


@pytest.fixture
def blank():
    return np.zeros((200, 300, 3), dtype=np.uint8)


class TestAnnotation:
    def test_rectangle_preserves_size(self, blank):
        out = draw_shapes(blank, [{"type": "rectangle", "x": 10, "y": 10, "w": 80, "h": 50, "color": "#ff0000", "thickness": 2}])
        assert out.shape == blank.shape

    def test_circle_preserves_size(self, blank):
        out = draw_shapes(blank, [{"type": "circle", "cx": 100, "cy": 100, "radius": 40, "color": "#00ff00"}])
        assert out.shape == blank.shape

    def test_line_draws_something(self, blank):
        out = draw_shapes(blank, [{"type": "line", "x1": 0, "y1": 0, "x2": 200, "y2": 100, "color": "#0000ff"}])
        assert out.shape == blank.shape
        assert (out != blank).any()

    def test_text_preserves_size(self, blank):
        out = draw_shapes(blank, [{"type": "text", "x": 10, "y": 30, "text": "Test", "font_scale": 1.0, "color": "#ffffff"}])
        assert out.shape == blank.shape

    def test_polygon_filled(self, blank):
        out = draw_shapes(blank, [{"type": "polygon", "points": [[50, 150], [150, 50], [250, 150]], "color": "#ff00ff", "fill": True}])
        assert out.shape == blank.shape
        assert (out != blank).any()

    def test_multiple_shapes(self, blank):
        shapes = [
            {"type": "rectangle", "x": 5, "y": 5, "w": 50, "h": 30, "color": "#ff0000"},
            {"type": "circle", "cx": 150, "cy": 100, "radius": 30, "color": "#00ff00"},
        ]
        out = draw_shapes(blank, shapes)
        assert out.shape == blank.shape

    def test_empty_shapes_unchanged(self, blank):
        out = draw_shapes(blank, [])
        assert (out == blank).all()
