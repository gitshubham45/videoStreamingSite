package models

type TranscodeResult struct {
	Resolution string
	OutputPath string
	Err        string
	Success    bool
}
