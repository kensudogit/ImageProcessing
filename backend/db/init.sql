-- ImageProcessing database schema

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'upload',
    width INTEGER,
    height INTEGER,
    mime VARCHAR(64) NOT NULL DEFAULT 'image/png',
    storage_path VARCHAR(512) NOT NULL,
    parent_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
    id SERIAL PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    operation VARCHAR(64) NOT NULL,
    params JSONB,
    result_image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detection_results (
    id SERIAL PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    method VARCHAR(32) NOT NULL,
    objects JSONB,
    result_image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annotations (
    id SERIAL PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    shapes JSONB,
    result_image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    backend VARCHAR(32) NOT NULL,
    labels JSONB,
    metrics JSONB,
    model_path VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    label VARCHAR(128),
    confidence FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
