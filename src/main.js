import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { load, save, clear, defaultState, requestPersistence, toBackup, fromBackup } from './store.js';
import { renderForm } from './form.js';
import { shareOrDownload, download } from './share.js';
import { buildPdf, pdfFileName } from './pdf.js';

registerSW({ immediate: true });

const app = document.getElementById('app');
const status = document.getElementById('save-status');
const menuButton = document.getElementById('btn-menu');
const menuList = document.getElementById('menu-list');
const restoreInput = document.getElementById('restore-input');

let state = load();
let saveTimer;
let statusTimer;

function showStatus(text, ms = 1500) {
  status.textContent = text;
  status.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove('visible'), ms);
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  try {
    save(state);
    showStatus('Opgeslagen');
  } catch {
    showStatus('Opslaan mislukt', 4000);
  }
}

function onChange() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

function render() {
  renderForm(app, state, { onChange });
}

// Niets kwijtraken als de app wordt gesloten of naar de achtergrond gaat.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveTimer) saveNow();
});
window.addEventListener('pagehide', () => {
  if (saveTimer) saveNow();
});

document.getElementById('btn-share').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  if (saveTimer) saveNow();
  button.disabled = true;
  try {
    // Synchroon opbouwen: navigator.share() moet dicht bij de klik worden aangeroepen (iOS).
    const blob = buildPdf(state).output('blob');
    const result = await shareOrDownload(blob, pdfFileName(state), "Casusconceptualisatie schema's");
    if (result === 'downloaded') showStatus('PDF gedownload', 2500);
  } catch (err) {
    console.error(err);
    alert('Het maken van de PDF is mislukt.');
  } finally {
    button.disabled = false;
  }
});

// Menu
function setMenu(open) {
  menuList.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
}
menuButton.addEventListener('click', (e) => {
  e.stopPropagation();
  setMenu(menuList.hidden);
});
document.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

menuList.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  setMenu(false);
  if (action === 'backup') {
    if (saveTimer) saveNow();
    const date = new Date().toISOString().slice(0, 10);
    download(new Blob([toBackup(state)], { type: 'application/json' }), `casus-schema-backup-${date}.json`);
  } else if (action === 'restore') {
    restoreInput.click();
  } else if (action === 'clear') {
    if (!confirm('Weet je zeker dat je alle ingevulde gegevens wilt wissen? Maak eventueel eerst een backup.')) return;
    clearTimeout(saveTimer);
    saveTimer = undefined;
    clear();
    state = defaultState();
    render();
    window.scrollTo({ top: 0 });
    showStatus('Gewist');
  }
});

restoreInput.addEventListener('change', async () => {
  const file = restoreInput.files?.[0];
  restoreInput.value = '';
  if (!file) return;
  try {
    const restored = fromBackup(await file.text());
    if (!confirm('De huidige gegevens worden vervangen door de backup. Doorgaan?')) return;
    state = restored;
    saveNow();
    render();
    showStatus('Backup teruggezet');
  } catch (err) {
    alert(err instanceof SyntaxError ? 'Dit bestand kan niet worden gelezen.' : err.message);
  }
});

render();
requestPersistence();
