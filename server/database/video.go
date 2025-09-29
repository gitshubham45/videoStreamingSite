package database

import "time"

type Video struct {
	ID               string    `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	StoredFilename   string    `json:"stored_filename"`
	URL              string    `json:"url"`
	UploadedAt       time.Time `json:"uploaded_at"`
	FileSize         int64     `json:"file_size"`
	MimeType         string    `json:"mime_type"`
}

func InsertVideo(video Video) error {
	query := `
		INSERT INTO videos (id , original_filename , stored_filename, url , file_size, mime_type)
		VALUES($1,$2,$3,$4,$5,$6)
		RETURNING id,uploaded_at
	`

	err := DB.QueryRow(
		query,
		video.ID,
		video.OriginalFilename,
		video.StoredFilename,
		video.URL,
		video.FileSize,
		video.MimeType,
	).Scan(&video.ID, &video.UploadedAt)

	return err
}
