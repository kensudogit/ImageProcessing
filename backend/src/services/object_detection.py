"""オブジェクト検出サービス（古典 + DL 両対応）"""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np

from src.config import settings

logger = logging.getLogger(__name__)

# MobileNet-SSD クラスラベル
COCO_CLASSES = [
    "background", "aeroplane", "bicycle", "bird", "boat", "bottle",
    "bus", "car", "cat", "chair", "cow", "diningtable", "dog", "horse",
    "motorbike", "person", "pottedplant", "sheep", "sofa", "train", "tvmonitor",
]

DetectionBox = dict  # {label, confidence, x, y, w, h}


def detect_contours(img: np.ndarray, min_area: int = 500, **_) -> list[DetectionBox]:
    """輪郭検出（グレースケール + 2値化 → findContours）"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < int(min_area):
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        boxes.append({"label": "object", "confidence": 1.0, "x": x, "y": y, "w": w, "h": h})
    return boxes


def detect_haar(img: np.ndarray, cascade: str = "face", **_) -> list[DetectionBox]:
    """Haar Cascade 検出（顔・目など）"""
    cascade_map = {
        "face": cv2.data.haarcascades + "haarcascade_frontalface_default.xml",
        "eye": cv2.data.haarcascades + "haarcascade_eye.xml",
        "fullbody": cv2.data.haarcascades + "haarcascade_fullbody.xml",
        "upperbody": cv2.data.haarcascades + "haarcascade_upperbody.xml",
        "smile": cv2.data.haarcascades + "haarcascade_smile.xml",
    }
    cascade_path = cascade_map.get(cascade, cascade_map["face"])
    clf = cv2.CascadeClassifier(cascade_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    detections = clf.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    boxes = []
    label = cascade if cascade in cascade_map else "face"
    for (x, y, w, h) in (detections if len(detections) > 0 else []):
        boxes.append({"label": label, "confidence": 1.0, "x": int(x), "y": int(y), "w": int(w), "h": int(h)})
    return boxes


def _get_dnn_net():
    """MobileNet-SSD モデルをロードする（初回 DL またはキャッシュ）"""
    model_dir = Path(settings.models_dir) / "detection"
    model_dir.mkdir(parents=True, exist_ok=True)
    proto = model_dir / "MobileNetSSD_deploy.prototxt"
    caffemodel = model_dir / "MobileNetSSD_deploy.caffemodel"

    if not proto.exists() or not caffemodel.exists():
        import urllib.request

        base = "https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/"
        logger.info("Downloading MobileNet-SSD weights...")
        urllib.request.urlretrieve(base + "MobileNetSSD_deploy.prototxt", proto)
        urllib.request.urlretrieve(
            "https://drive.google.com/uc?export=download&id=0B3gersZ2cHIxRm5PMWRoTkdHdHc", caffemodel
        )
    return cv2.dnn.readNetFromCaffe(str(proto), str(caffemodel))


def detect_dnn(img: np.ndarray, confidence_threshold: float = 0.5, **_) -> list[DetectionBox]:
    """OpenCV DNN + MobileNet-SSD 検出"""
    try:
        net = _get_dnn_net()
    except Exception as e:
        logger.warning("DNN model unavailable, falling back to contours: %s", e)
        return detect_contours(img)

    h, w = img.shape[:2]
    blob = cv2.dnn.blobFromImage(img, 0.007843, (300, 300), 127.5)
    net.setInput(blob)
    detections = net.forward()

    boxes = []
    for i in range(detections.shape[2]):
        conf = float(detections[0, 0, i, 2])
        if conf < float(confidence_threshold):
            continue
        class_id = int(detections[0, 0, i, 1])
        label = COCO_CLASSES[class_id] if class_id < len(COCO_CLASSES) else "unknown"
        x1 = int(detections[0, 0, i, 3] * w)
        y1 = int(detections[0, 0, i, 4] * h)
        x2 = int(detections[0, 0, i, 5] * w)
        y2 = int(detections[0, 0, i, 6] * h)
        boxes.append({
            "label": label,
            "confidence": round(conf, 3),
            "x": max(0, x1), "y": max(0, y1),
            "w": max(0, x2 - x1), "h": max(0, y2 - y1),
        })
    return boxes


def detect_yolo(img: np.ndarray, confidence_threshold: float = 0.5, **_) -> list[DetectionBox]:
    """YOLOv8n 検出（ultralytics 必要）"""
    try:
        from ultralytics import YOLO

        model_path = Path(settings.models_dir) / "detection" / "yolov8n.pt"
        model = YOLO(str(model_path) if model_path.exists() else "yolov8n.pt")
        results = model(img, conf=float(confidence_threshold), verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                boxes.append({
                    "label": model.names[int(box.cls)],
                    "confidence": round(float(box.conf), 3),
                    "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                })
        return boxes
    except ImportError:
        logger.warning("ultralytics not installed, falling back to DNN detection")
        return detect_dnn(img, confidence_threshold)


def draw_boxes(img: np.ndarray, boxes: list[DetectionBox]) -> np.ndarray:
    """検出ボックスを画像に描画する"""
    out = img.copy()
    for box in boxes:
        x, y, w, h = box["x"], box["y"], box["w"], box["h"]
        label = f"{box['label']} {box['confidence']:.2f}"
        cv2.rectangle(out, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(out, label, (x, max(y - 8, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    return out


_DETECTORS = {
    "contour": detect_contours,
    "haar": detect_haar,
    "dnn": detect_dnn,
    "yolo": detect_yolo,
}


def run_detection(img: np.ndarray, method: str, **params) -> tuple[list[DetectionBox], np.ndarray]:
    """指定 method で検出し (boxes, annotated_image) を返す"""
    fn = _DETECTORS.get(method)
    if fn is None:
        raise ValueError(f"Unknown method: {method}. Choose from {list(_DETECTORS)}")
    boxes = fn(img, **params)
    annotated = draw_boxes(img, boxes)
    return boxes, annotated
