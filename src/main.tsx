import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles.css';
import './overlay-transparency.css';
import { App } from './app/App';
import { DesktopRuntimeRequired } from './components/DesktopRuntimeRequired';

const root = ReactDOM.createRoot(document.getElementById('root')!);
const hasDesktopBridge = typeof window.songApp === 'object' && window.songApp !== null;

root.render(
  <React.StrictMode>
    {hasDesktopBridge ? <App /> : <DesktopRuntimeRequired />}
  </React.StrictMode>
);
