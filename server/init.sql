-- init.sql
\c video-streaming-db

CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size BIGINT,
    mime_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_videos_uploaded_at ON videos (uploaded_at DESC);

-- Optional: Seed data
INSERT INTO videos (original_filename, stored_filename, url, file_size, mime_type)
VALUES
    ('sample.mp4', 'abc123.mp4', 'http://localhost:8080/videos/abc123.mp4', 1024000, 'video/mp4')
ON CONFLICT DO NOTHING;