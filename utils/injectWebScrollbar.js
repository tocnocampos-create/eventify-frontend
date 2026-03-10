import { Platform } from 'react-native';

export default function injectWebScrollbar() {
  if (Platform.OS !== 'web') return;

  const style = document.createElement('style');
  style.textContent = `
    /* Thin scrollbar for Webkit (Chrome, Safari, Edge) */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(191, 160, 255, 0.25);
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(191, 160, 255, 0.45);
    }

    ::-webkit-scrollbar-corner {
      background: transparent;
    }

    /* Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: rgba(191, 160, 255, 0.25) transparent;
    }
  `;
  document.head.appendChild(style);
}
