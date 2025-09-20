import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import WatchPage from './pages/WatchPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
