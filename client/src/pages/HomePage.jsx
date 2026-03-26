import { useNavigate } from "react-router-dom";

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Navbar */}
            <nav className="px-8 py-5 flex items-center justify-between border-b border-gray-800">
                <span className="text-xl font-bold tracking-tight text-white">
                    stream<span className="text-violet-500">vault</span>
                </span>
                <button
                    onClick={() => navigate("/upload")}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                >
                    + Upload
                </button>
            </nav>

            {/* Hero */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <div className="max-w-2xl">
                    <h1 className="text-5xl font-extrabold leading-tight mb-4 text-white">
                        Upload. Transcode.{" "}
                        <span className="text-violet-400">Stream.</span>
                    </h1>
                    <p className="text-gray-400 text-lg mb-10">
                        Drop your video and we'll automatically transcode it to
                        multiple resolutions — ready to stream instantly.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate("/upload")}
                            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-3 rounded-xl transition text-base"
                        >
                            Upload a Video
                        </button>
                        <button
                            onClick={() => navigate("/watch")}
                            className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-3 rounded-xl transition text-base"
                        >
                            Browse Videos
                        </button>
                    </div>
                </div>
            </div>

            {/* Feature row */}
            <div className="grid grid-cols-3 gap-px bg-gray-800 border-t border-gray-800">
                {[
                    { label: "Auto Transcode", desc: "6 resolutions from 144p to 1080p" },
                    { label: "Fast Upload", desc: "Multipart upload with progress" },
                    { label: "Instant Playback", desc: "Stream as soon as transcoding completes" },
                ].map((f) => (
                    <div key={f.label} className="bg-gray-950 px-8 py-6 text-center">
                        <p className="text-white font-semibold mb-1">{f.label}</p>
                        <p className="text-gray-500 text-sm">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomePage;
