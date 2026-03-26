package database

import (
	"database/sql"
	"time"
)

type Video struct {
	ID               string    `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	StoredFilename   string    `json:"stored_filename"`
	URL              string    `json:"url"`
	UploadedAt       time.Time `json:"uploaded_at"`
	FileSize         int64     `json:"file_size"`
	MimeType         string    `json:"mime_type"`
	Status           string    `json:"status"`
}

func InsertVideo(video Video) error {
	query := `
		INSERT INTO videos (id, original_filename, stored_filename, url, file_size, mime_type, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, uploaded_at
	`
	return DB.QueryRow(
		query,
		video.ID,
		video.OriginalFilename,
		video.StoredFilename,
		video.URL,
		video.FileSize,
		video.MimeType,
		video.Status,
	).Scan(&video.ID, &video.UploadedAt)
}

func UpdateVideoStatus(id, status string) error {
	_, err := DB.Exec(`UPDATE videos SET status = $1 WHERE id = $2`, status, id)
	return err
}

func GetAllVideos() ([]Video, error) {
	rows, err := DB.Query(`
		SELECT id, original_filename, stored_filename, url, file_size, mime_type, uploaded_at, status
		FROM videos ORDER BY uploaded_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []Video
	for rows.Next() {
		var v Video
		if err := rows.Scan(&v.ID, &v.OriginalFilename, &v.StoredFilename, &v.URL, &v.FileSize, &v.MimeType, &v.UploadedAt, &v.Status); err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}
	return videos, rows.Err()
}

func GetVideoByID(id string) (Video, error) {
	var v Video
	err := DB.QueryRow(`
		SELECT id, original_filename, stored_filename, url, file_size, mime_type, uploaded_at, status
		FROM videos WHERE id = $1
	`, id).Scan(&v.ID, &v.OriginalFilename, &v.StoredFilename, &v.URL, &v.FileSize, &v.MimeType, &v.UploadedAt, &v.Status)
	if err == sql.ErrNoRows {
		return v, sql.ErrNoRows
	}
	return v, err
}
