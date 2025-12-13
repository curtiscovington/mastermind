const SW_PATH = '/sw.js';

export const registerServiceWorker = () => {
  // Avoid registering during development to prevent cached dev assets and HMR socket noise.
  if (!import.meta.env.PROD) return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(SW_PATH).catch((error) => {
        console.error('Service worker registration failed', error);
      });
    });
  }
};
