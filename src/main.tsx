import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA compliance
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

// Global PWA Event Handlers to bridge with React
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 76 and later from showing the mini-infobar
  e.preventDefault();
  // Stash the event so it can be triggered later
  window.deferredPrompt = e;
  // Notify React components they can display the install prompt
  window.dispatchEvent(new Event('pwa-installable'));
});

window.addEventListener('appinstalled', () => {
  // Clear the deferred prompt
  window.deferredPrompt = null;
  // Notify React components
  window.dispatchEvent(new Event('pwa-installed'));
  console.log('Scrabble Arena PWA was installed successfully!');
});

