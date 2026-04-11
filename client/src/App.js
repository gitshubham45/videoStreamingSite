import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import WatchPage from './pages/WatchPage';
import PlayerPage from './pages/PlayerPage';
import LivePage from './pages/LivePage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/watch/:video_id" element={<PlayerPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/live" element={<LivePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
