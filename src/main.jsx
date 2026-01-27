import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const loadEruda = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const erudaEnabled =
    urlParams.get('eruda') === 'true' ||
    localStorage.getItem('active-eruda') === 'true';

  if (erudaEnabled) {
    import('eruda').then((eruda) => eruda.default.init());
  }
};

loadEruda();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
