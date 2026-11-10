import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/sen';
import './styles.css';
import App from './App';
import { registerPushWorker } from './lib/push';

registerPushWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
