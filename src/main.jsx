import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Router from './Router.jsx';
import { AuthProvider } from './lib/session.jsx';
import { initAnalytics } from './lib/pixels.js';
import './index.css';

initAnalytics();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
