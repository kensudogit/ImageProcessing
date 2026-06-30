"""深層学習サービスのテスト"""
import numpy as np
import pytest

from src.services.deep_learning import (
    check_frameworks,
    resolve_backend,
    train_sklearn,
)


def _make_images_labels(n: int = 20) -> tuple[list, list]:
    images = [np.random.randint(0, 255, (80, 80, 3), dtype=np.uint8) for _ in range(n)]
    labels = ["cat"] * (n // 2) + ["dog"] * (n // 2)
    return images, labels


class TestDeepLearning:
    def test_check_frameworks_returns_dict(self):
        fw = check_frameworks()
        assert "tensorflow" in fw
        assert "pytorch" in fw
        assert "sklearn" in fw

    def test_resolve_backend_returns_valid(self):
        backend = resolve_backend()
        assert backend in ("tensorflow", "pytorch", "sklearn")

    def test_train_sklearn_success(self):
        images, labels = _make_images_labels(20)
        result = train_sklearn(images, labels)
        assert result["backend"] == "sklearn"
        assert "model" in result
        assert "labels" in result
        assert result["test_accuracy"] >= 0.0

    def test_train_model_auto_fallback(self):
        from src.services.deep_learning import train_model
        images, labels = _make_images_labels(20)
        result = train_model(images, labels, backend="auto")
        assert "backend" in result
        assert "model" in result

    def test_train_tensorflow(self):
        fw = check_frameworks()
        if not fw["tensorflow"]:
            pytest.skip("TensorFlow not installed")
        from src.services.deep_learning import train_tensorflow
        images, labels = _make_images_labels(20)
        result = train_tensorflow(images, labels)
        assert result["backend"] == "tensorflow"

    def test_train_pytorch(self):
        fw = check_frameworks()
        if not fw["pytorch"]:
            pytest.skip("PyTorch not installed")
        from src.services.deep_learning import train_pytorch
        images, labels = _make_images_labels(20)
        result = train_pytorch(images, labels)
        assert result["backend"] == "pytorch"
