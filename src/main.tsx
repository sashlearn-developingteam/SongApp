import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles.css';
import './overlay-transparency.css';
import { App } from './app/App';
import { DesktopRuntimeRequired } from './components/DesktopRuntimeRequired';

const rootElement = document.getElementById('root')!;
const windowType = new URLSearchParams(window.location.search).get('window') ?? 'main';
document.documentElement.dataset.window = windowType;

if (windowType === 'overlay') {
  document.documentElement.style.setProperty('background', 'transparent', 'important');
  document.body.style.setProperty('background', 'transparent', 'important');
  rootElement.style.setProperty('background', 'transparent', 'important');
}

const root = ReactDOM.createRoot(rootElement);
const hasDesktopBridge = typeof window.songApp === 'object' && window.songApp !== null;

root.render(
  <React.StrictMode>
    {hasDesktopBridge ? <App /> : <DesktopRuntimeRequired />}
  </React.StrictMode>
);
