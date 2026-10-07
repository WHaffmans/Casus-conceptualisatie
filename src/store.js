const STORAGE_KEY = 'casus-schema';
const VERSION = 1;

export const GEZIN_FIELDS = [
  { key: 'kind', label: 'Kind' },
  { key: 'vader', label: 'Vader' },
  { key: 'moeder', label: 'Moeder' },
  { key: 'gezinsregels', label: 'Gezinsregels' },
];

export const COPING_FIELDS = [
  { key: 'overgave', label: 'Overgave' },
  { key: 'vermijding', label: 'Vermijding' },
  { key: 'overcompensatie', label: 'Overcompensatie' },
];

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export function newSchema() {
  return { id: newId(), naam: '', overgave: '', vermijding: '', overcompensatie: '', probleem: '' };
}

export function defaultState() {
  return {
    version: VERSION,
    naam: '',
    geboortedatum: '',
    kind: '',
    vader: '',
    moeder: '',
    gezinsregels: '',
    schemas: [newSchema(), newSchema(), newSchema()],
    updatedAt: null,
  };
}

// Brengt (mogelijk onvolledige of oudere) data naar de huidige vorm.
function normalize(data) {
  const base = defaultState();
  if (!data || typeof data !== 'object') return base;
  const state = { ...base };
  for (const key of ['naam', 'geboortedatum', ...GEZIN_FIELDS.map((f) => f.key)]) {
    if (typeof data[key] === 'string') state[key] = data[key];
  }
  if (Array.isArray(data.schemas)) {
    state.schemas = data.schemas.map((s) => {
      const schema = newSchema();
      for (const key of ['naam', 'probleem', ...COPING_FIELDS.map((f) => f.key)]) {
        if (typeof s?.[key] === 'string') schema[key] = s[key];
      }
      if (typeof s?.id === 'string') schema.id = s.id;
      return schema;
    });
  }
  state.updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : null;
  return state;
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

export function save(state) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clear() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Niet ondersteund; gegevens blijven gewoon in localStorage.
  }
}

export function toBackup(state) {
  return JSON.stringify({ app: 'casus-schema', ...state }, null, 2);
}

export function fromBackup(text) {
  const data = JSON.parse(text);
  if (!data || data.app !== 'casus-schema') {
    throw new Error('Dit bestand is geen backup van deze app.');
  }
  return normalize(data);
}
