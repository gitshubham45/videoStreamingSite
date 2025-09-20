import { useNavigate } from "react-router-dom";


const HomePage = () => {
    const navigate = useNavigate();

    const handleUploadClick = () => {
        navigate("/upload")
    }

    const handleWatchClick = () => {
        navigate("/watch")
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-6 max-w-sm w-full">
                <h1 className="text-3xl font-extrabold text-gray-800">
                    Welcome to the App
                </h1>
                <p className="text-lg text-gray-600 text-center">
                    Choose an option to continue.
                </p>
                <div className="w-full space-y-4">
                    <button
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        onClick={handleUploadClick}
                    >
                        Upload
                    </button>
                    <button
                        className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-green-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                        onClick={handleWatchClick}
                    >
                        Watch
                    </button>
                </div>
            </div>
        </div>
    )
}

export default HomePage;