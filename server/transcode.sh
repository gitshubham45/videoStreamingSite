#!/bin/bash

input_file=$1       # Input video file
resolution=$2       # Target resolution (e.g., 720p)
output_dir=$3       # Output directory for HLS segments and playlist

case $resolution in
    "1080p")
        width=1920
        height=1080
        video_bitrate=5000k
        crf=20
        audio_bitrate=192k
        ;;
    "720p")
        width=1280
        height=720
        video_bitrate=2500k
        crf=22
        audio_bitrate=128k
        ;;
    "480p")
        width=854
        height=480
        video_bitrate=1000k
        crf=24
        audio_bitrate=96k
        ;;
    "360p")
        width=640
        height=360
        video_bitrate=800k
        crf=26
        audio_bitrate=64k
        ;;
    "240p")
        width=426
        height=240
        video_bitrate=500k
        crf=28
        audio_bitrate=48k
        ;;
    "144p")
        width=256
        height=144
        video_bitrate=300k
        crf=30
        audio_bitrate=48k
        ;;
    *)
        echo "Invalid resolution: $resolution"
        exit 1
        ;;
esac

mkdir -p "$output_dir"

ffmpeg -y -i "$input_file" \
    -vf "scale=$width:$height" \
    -c:v libx264 -preset slow -crf $crf -b:v $video_bitrate \
    -c:a aac -b:a $audio_bitrate \
    -hls_time 6 \
    -hls_playlist_type vod \
    -hls_segment_filename "$output_dir/segment%03d.ts" \
    "$output_dir/index.m3u8"
