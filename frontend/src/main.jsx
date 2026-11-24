import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/sen';
import '@fontsource/aleo/800-italic.css';
import './i18n';
import './styles.css';
import App from './App';
import { startAppUpdates } from './lib/app-update';

// Après chaque déploiement, la nouvelle version s'installe et s'affiche d'elle-même.
startAppUpdates();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
