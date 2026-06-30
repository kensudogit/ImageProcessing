const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...options });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const b = await res.json();
      if (b?.detail) detail = typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail);
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// ---- Images ----
export interface ImageMeta {
  id: number;
  filename: string;
  source: string;
  width: number | null;
  height: number | null;
  mime: string;
  created_at: string;
  url: string;
}

export async function uploadImage(file: File, source = "upload"): Promise<ImageMeta> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("source", source);
  return req("/api/images/upload", { method: "POST", body: fd });
}

export async function uploadBase64(data: string, filename = "capture.png", source = "webcam"): Promise<ImageMeta> {
  return req("/api/images/from-base64", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, filename, source }),
  });
}

export async function listImages(skip = 0, limit = 20): Promise<{ total: number; images: ImageMeta[] }> {
  return req(`/api/images?skip=${skip}&limit=${limit}`);
}

export async function getImage(id: number): Promise<ImageMeta> {
  return req(`/api/images/${id}`);
}

export async function deleteImage(id: number): Promise<{ deleted: number }> {
  return req(`/api/images/${id}`, { method: "DELETE" });
}

export function imageFileUrl(id: number): string {
  return `${BASE}/api/images/${id}/file`;
}

// ---- Preprocess ----
export interface PrepStep {
  operation: string;
  result_image_id: number;
  preview: string;
  url: string;
}

export async function preprocess(
  imageId: number,
  operations: Array<{ operation: string; [k: string]: unknown }>
): Promise<{ image_id: number; steps: PrepStep[]; final_image_id: number }> {
  return req(`/api/preprocess/${imageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations }),
  });
}

// ---- Detection ----
export interface DetectionBox {
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectionResult {
  image_id: number;
  method: string;
  objects: DetectionBox[];
  count: number;
  result_image_id: number;
  result_url: string;
  preview: string;
}

export async function detect(
  imageId: number,
  method: string,
  params: Record<string, unknown> = {}
): Promise<DetectionResult> {
  return req(`/api/detection/${imageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, ...params }),
  });
}

// ---- Annotation ----
export async function annotate(
  imageId: number,
  shapes: Array<{ type: string; [k: string]: unknown }>
): Promise<{ image_id: number; shape_count: number; result_image_id: number; result_url: string; preview: string }> {
  return req(`/api/annotation/${imageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shapes }),
  });
}

// ---- Camera ----
export async function listCameraDevices(): Promise<{ devices: number[] }> {
  return req("/api/camera/devices");
}

export async function openCamera(device_index = 0, width = 640, height = 480, fps = 30) {
  return req("/api/camera/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_index, width, height, fps }),
  });
}

export async function captureFrame(): Promise<{ image_id: number; url: string; preview: string; width: number; height: number }> {
  return req("/api/camera/capture", { method: "POST" });
}

export async function closeCamera() {
  return req("/api/camera/close", { method: "POST" });
}

export async function cameraStatus(): Promise<{ is_open: boolean }> {
  return req("/api/camera/status");
}

// ---- ML ----
export async function getMlFrameworks(): Promise<{ frameworks: Record<string, string | null>; active_backend: string }> {
  return req("/api/ml/frameworks");
}

export async function listMlModels(): Promise<{ models: Array<{ id: number; name: string; backend: string; labels: string[]; metrics: Record<string, number>; created_at: string }> }> {
  return req("/api/ml/models");
}

export async function trainModel(name: string, backend: string, files: File[], labels: string[]) {
  const fd = new FormData();
  fd.append("name", name);
  fd.append("backend", backend);
  fd.append("labels", JSON.stringify(labels));
  files.forEach((f) => fd.append("files", f));
  return req("/api/ml/train", { method: "POST", body: fd });
}

export async function predictImage(imageId: number, modelId: number) {
  return req(`/api/ml/predict/${imageId}?model_id=${modelId}`, { method: "POST" });
}
