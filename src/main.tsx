import { render } from 'preact';
import { App } from './App';
// @ts-ignore
import './style.css';

console.log('%c--- [FC-SBC] SCRIPT INJECTED & RUNNING ---', 'background: #000; color: #fff; font-size: 20px;');

const init = () => {
  if (document.getElementById('fc-sbc-builder-root')) return;

  // Mount to body to avoid clipping by Web App containers
  const root = document.body;
  if (!root) return;

  console.log(`[FC-SBC] Mounting UI into ${root.tagName}...`);
  const container = document.createElement('div');
  container.id = 'fc-sbc-builder-root';
  // Standard fixed positioning for the entire tool container
  container.style.cssText = 'position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; pointer-events:none;';
  root.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  mountPoint.style.pointerEvents = 'auto';
  shadowRoot.appendChild(mountPoint);

  const style = document.createElement('style');
  // @ts-ignore
  import('./style.css?inline').then((css) => {
    style.textContent = css.default;
    shadowRoot.appendChild(style);
  });

  render(<App />, mountPoint);
};

// Check for body and initialize
const checkUI = setInterval(() => {
  if (document.body) {
    clearInterval(checkUI);
    init();
  }
}, 1000);

// Persistence safety
setInterval(() => {
  if (!document.getElementById('fc-sbc-builder-root')) init();
}, 5000);
