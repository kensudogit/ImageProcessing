# Combined image: Next.js (frontend) + FastAPI (backend) on single Railway service
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
ENV NEXT_PUBLIC_API_URL=
ENV NODE_ENV=production
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# System deps: OpenCV requires libGL + libglib2; Node 20 for Next.js start
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl ca-certificates \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxrender1 libxext6 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-railway.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend
COPY --from=frontend-builder /app/frontend /app/frontend

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

CMD ["/app/start.sh"]
