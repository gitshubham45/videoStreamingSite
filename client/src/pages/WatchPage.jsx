import { useNavigate } from "react-router-dom";

const WatchPage = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold text-gray-800">
                Watch Content
            </h2>
            <p className="text-gray-600 text-center">
                This is where a list of videos or other content will be displayed.
            </p>
            <button
                className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-gray-500 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
                onClick={() => navigate("/")}
            >
                Go Back
            </button>
        </div>
    )
};

export default WatchPage;
