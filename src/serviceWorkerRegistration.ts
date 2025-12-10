const SW_PATH = '/sw.js';

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(SW_PATH).catch((error) => {
        console.error('Service worker registration failed', error);
      });
    });
  }
};
