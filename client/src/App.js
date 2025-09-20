import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/HomePage';

// The main App component that renders the homepage with two buttons.
const App = () => {
  const [currentView, setCurrentView] = useState('home');

  const renderView = () => {
    switch (currentView) {
      case 'upload':
        return <UploadPage onViewChange={setCurrentView} />;
      case 'watch':
        return <WatchPage onViewChange={setCurrentView} />;
      case 'home':
      default:
        return <HomePage onViewChange={setCurrentView} />;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<Home />} />
        {/* <Route path="contact" element={<ContactPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
};

export default App;
