import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";

const UploadPage = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(""); // "", "uploading", "success", "error"
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (file) => {
        if (!file) return;
        setSelectedFile(file);
        setUploadStatus("");
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileChange(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploadStatus("uploading");

        const formData = new FormData();
        formData.append("video", selectedFile);

        try {
            const response = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            console.log("Upload successful:", response.data);
            setUploadStatus("success");
            setSelectedFile(null);
            setTimeout(() => navigate("/"), 1500);
        } catch (error) {
            console.error("Upload failed:", error.response?.data || error.message);
            setUploadStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Navbar */}
            <nav className="px-8 py-5 flex items-center border-b border-gray-800">
                <button
                    onClick={() => navigate("/")}
                    className="text-gray-400 hover:text-white transition text-sm flex items-center gap-2"
                >
                    <span>←</span> Back
                </button>
                <span className="mx-auto text-xl font-bold tracking-tight">
                    stream<span className="text-violet-500">vault</span>
                </span>
            </nav>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-lg">
                    <h2 className="text-3xl font-bold mb-2 text-white">Upload a Video</h2>
                    <p className="text-gray-400 mb-8 text-sm">
                        Supported formats: MP4, MOV, AVI, MKV, WebM
                    </p>

                    {/* Drop zone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition mb-6
                            ${dragOver
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-gray-700 hover:border-gray-500 bg-gray-900"
                            }`}
                    >
                        <div className="text-4xl mb-3">🎬</div>
                        {selectedFile ? (
                            <>
                                <p className="text-white font-semibold text-sm">{selectedFile.name}</p>
                                <p className="text-gray-500 text-xs mt-1">
                                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-300 font-medium">Drop your video here</p>
                                <p className="text-gray-500 text-sm mt-1">or click to browse</p>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e.target.files[0])}
                            disabled={uploadStatus === "uploading"}
                        />
                    </div>

                    {/* Status */}
                    {uploadStatus === "uploading" && (
                        <div className="mb-4 flex items-center gap-3 text-violet-400 text-sm">
                            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                            Uploading and queuing for transcoding…
                        </div>
                    )}
                    {uploadStatus === "success" && (
                        <p className="mb-4 text-green-400 text-sm font-medium">
                            ✓ Upload successful! Transcoding has started.
                        </p>
                    )}
                    {uploadStatus === "error" && (
                        <p className="mb-4 text-red-400 text-sm font-medium">
                            ✗ Upload failed. Please try again.
                        </p>
                    )}

                    {/* Actions */}
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploadStatus === "uploading"}
                        className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
                    >
                        {uploadStatus === "uploading" ? "Uploading…" : "Upload Video"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
