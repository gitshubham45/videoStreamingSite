import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const VideoCard = ({ video, onClick, onDelete }) => (
    <div className="group relative">
        <div className="cursor-pointer" onClick={onClick}>
            <div className="bg-gray-800 rounded-xl aspect-video flex items-center justify-center mb-3 overflow-hidden group-hover:ring-2 group-hover:ring-violet-500 transition">
                <span className="text-gray-500 text-4xl group-hover:text-violet-400 transition">▶</span>
            </div>
            <div className="flex gap-3 pr-8">
                <div className="w-8 h-8 rounded-full bg-violet-700 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                    V
                </div>
                <div>
                    <p className="text-white text-sm font-medium leading-snug line-clamp-2">
                        {video.original_filename}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {(video.file_size / (1024 * 1024)).toFixed(2)} MB &middot;{" "}
                        {new Date(video.uploaded_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
        <button
            onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-900 border border-gray-700 text-gray-400 hover:bg-red-600 hover:border-red-600 hover:text-white transition flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs"
            title="Delete video"
        >
            ✕
        </button>
    </div>
);

const WatchPage = () => {
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get("http://localhost:8000/api/videos")
            .then((res) => setVideos(res.data.videos))
            .catch(() => setError("Failed to load videos"))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = (id) => {
        if (!window.confirm("Delete this video? This cannot be undone.")) return;
        axios
            .delete(`http://localhost:8000/api/videos/${id}`)
            .then(() => setVideos((prev) => prev.filter((v) => v.id !== id)))
            .catch(() => alert("Failed to delete video"));
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <nav className="px-8 py-5 flex items-center justify-between border-b border-gray-800">
                <button
                    onClick={() => navigate("/")}
                    className="text-gray-400 hover:text-white transition text-sm flex items-center gap-2"
                >
                    ← Home
                </button>
                <span className="text-xl font-bold tracking-tight">
                    stream<span className="text-violet-500">vault</span>
                </span>
                <button
                    onClick={() => navigate("/upload")}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                    + Upload
                </button>
            </nav>

            <div className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
                <h2 className="text-2xl font-bold mb-6">All Videos</h2>

                {loading && (
                    <div className="flex items-center gap-3 text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Loading…
                    </div>
                )}

                {error && <p className="text-red-400">{error}</p>}

                {!loading && !error && videos.length === 0 && (
                    <div className="text-center py-24 text-gray-500">
                        <p className="text-5xl mb-4">🎬</p>
                        <p className="text-lg font-medium">No videos yet</p>
                        <p className="text-sm mt-1">
                            <button
                                onClick={() => navigate("/upload")}
                                className="text-violet-400 hover:underline"
                            >
                                Upload one
                            </button>{" "}
                            to get started.
                        </p>
                    </div>
                )}

                {!loading && !error && videos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {videos.map((v) => (
                            <VideoCard
                                key={v.id}
                                video={v}
                                onClick={() => navigate(`/watch/${v.id}`)}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WatchPage;
