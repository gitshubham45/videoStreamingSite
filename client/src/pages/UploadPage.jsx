import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const UploadPage = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(""); // "", "uploading", "success", "error"

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        // Reset status when new file is selected
        setUploadStatus("");
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            console.log("No file selected.");
            return;
        }

        setUploadStatus("uploading");

        const formData = new FormData();
        formData.append("video", selectedFile); // Make sure your Go backend expects field name "video"

        try {
            const response = await axios.post("http://localhost:8000/api/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("Upload successful:", response.data);
            setUploadStatus("success");
            setSelectedFile(null); // Clear file after success

            // Optional: Auto-redirect after success
            setTimeout(() => {
                navigate("/");
            }, 1500); // Redirect after 1.5s to let user see success message

        } catch (error) {
            console.error("Upload failed:", error.response?.data || error.message);
            setUploadStatus("error");
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold text-gray-800">
                Upload a Video
            </h2>
            <p className="text-gray-600 text-center">
                Select a video file to upload.
            </p>
            <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploadStatus === "uploading"} // Disable during upload
            />
            {selectedFile && (
                <p className="text-sm text-gray-500 mt-2">
                    Selected file: <span className="font-semibold text-gray-800">{selectedFile.name}</span>
                </p>
            )}

            {/* Upload Status Messages */}
            {uploadStatus === "uploading" && (
                <p className="text-blue-500 font-medium">Uploading...</p>
            )}
            {uploadStatus === "success" && (
                <p className="text-green-600 font-semibold">Upload successful!</p>
            )}
            {uploadStatus === "error" && (
                <p className="text-red-500 font-semibold">Upload failed. Please try again.</p>
            )}

            <button
                onClick={handleUpload}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!selectedFile || uploadStatus === "uploading"}
            >
                {uploadStatus === "uploading" ? "Uploading..." : "Upload"}
            </button>
            <button
                className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-gray-500 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
                onClick={() => navigate("/")} // Fixed: was onViewChange
            >
                Go Back
            </button>
        </div>
    );
};

export default UploadPage;