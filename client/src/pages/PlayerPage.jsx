import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Hls from "hls.js";

const RESOLUTION_ORDER = ["1080p", "720p", "480p", "360p", "240p", "144p"];

const PlayerPage = () => {
    const { video_id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    const [video, setVideo] = useState(null);
    const [resolutions, setResolutions] = useState({});
    const [selectedRes, setSelectedRes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get(`http://localhost:8000/api/watch/${video_id}`)
            .then((res) => {
                setVideo(res.data.video);
                setResolutions(res.data.resolutions);
                const available = RESOLUTION_ORDER.find((r) => res.data.resolutions[r]);
                if (available) setSelectedRes(available);
            })
            .catch(() => setError("Failed to load video"))
            .finally(() => setLoading(false));
    }, [video_id]);

    useEffect(() => {
        if (!selectedRes || !resolutions[selectedRes] || !videoRef.current) return;

        const src = resolutions[selectedRes];

        // Destroy previous hls instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoRef.current.play();
            });
        } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
            // Native HLS support (Safari)
            videoRef.current.src = src;
            videoRef.current.play();
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [selectedRes, resolutions]);

    const handleResolutionChange = (res) => {
        const currentTime = videoRef.current?.currentTime || 0;
        setSelectedRes(res);
        // Restore position after new stream loads
        const onManifest = () => {
            videoRef.current.currentTime = currentTime;
        };
        if (hlsRef.current) {
            hlsRef.current.once(Hls.Events.MANIFEST_PARSED, onManifest);
        }
    };

    const availableResolutions = RESOLUTION_ORDER.filter((r) => resolutions[r]);

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <nav className="px-8 py-5 flex items-center border-b border-gray-800">
                <button
                    onClick={() => navigate("/watch")}
                    className="text-gray-400 hover:text-white transition text-sm flex items-center gap-2"
                >
                    ← Back
                </button>
                <span className="mx-auto text-xl font-bold tracking-tight">
                    stream<span className="text-violet-500">vault</span>
                </span>
            </nav>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                {loading && (
                    <div className="flex items-center gap-3 text-gray-400 justify-center py-24">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Loading…
                    </div>
                )}

                {error && (
                    <p className="text-red-400 text-center py-24">{error}</p>
                )}

                {!loading && !error && (
                    <>
                        {/* Player */}
                        <div className="rounded-2xl overflow-hidden bg-black mb-6 shadow-2xl">
                            {availableResolutions.length > 0 ? (
                                <video
                                    ref={videoRef}
                                    controls
                                    className="w-full aspect-video"
                                />
                            ) : (
                                <div className="aspect-video flex flex-col items-center justify-center text-gray-500 gap-3">
                                    <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-sm">Transcoding in progress — check back shortly</p>
                                </div>
                            )}
                        </div>

                        {/* Title + meta */}
                        <h1 className="text-xl font-semibold mb-1">
                            {video?.original_filename}
                        </h1>
                        <p className="text-gray-500 text-sm mb-6">
                            {video && (video.file_size / (1024 * 1024)).toFixed(2)} MB &middot;{" "}
                            {video && new Date(video.uploaded_at).toLocaleString()}
                        </p>

                        {/* Quality picker */}
                        {availableResolutions.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                                    Quality
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {availableResolutions.map((res) => (
                                        <button
                                            key={res}
                                            onClick={() => handleResolutionChange(res)}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                                                selectedRes === res
                                                    ? "bg-violet-600 text-white"
                                                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                                            }`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayerPage;
