
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.scss';

// Opcional: Polyfills para compatibilidad con Internet Computer
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Configuración inicial para el entorno de desarrollo
if (import.meta.env.DEV) {
  console.log('Running in development mode');
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);