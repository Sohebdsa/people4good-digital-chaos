import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

// StrictMode is intentionally not used: the WebGL game engine is a long-lived singleton.
createRoot(document.getElementById('root')!).render(<App />);
