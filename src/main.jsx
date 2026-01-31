import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const loadEruda = () => {
  const urlParams = new URLSearchParams(window.location.search);

  let erudaFromStorage = null;
  try {
    erudaFromStorage = window.localStorage.getItem('active-eruda');
  } catch (e) {
    // localStorage may be unavailable (e.g., in private mode or disabled); ignore and fall back to URL param only
  }

  const erudaEnabled = urlParams.get('eruda') === 'true' || erudaFromStorage === 'true';

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
