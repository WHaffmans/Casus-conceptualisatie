import { GEZIN_FIELDS, COPING_FIELDS, newSchema } from './store.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

function textField({ id, label, value, kind, placeholder, onInput }) {
  const textarea = el('textarea', { id, rows: 3, placeholder, oninput: (e) => {
    autoGrow(e.target);
    onInput(e.target.value);
  } });
  textarea.value = value;
  return el('div', { class: `field field-${kind}` },
    el('label', { for: id }, label),
    textarea,
  );
}

function schemaTitle(schema, index) {
  const firstLine = schema.naam.trim().split('\n')[0];
  return firstLine ? `Schema ${index + 1}: ${firstLine}` : `Schema ${index + 1}`;
}

export function renderForm(root, state, { onChange }) {
  root.replaceChildren();

  // Persoonsgegevens
  const naam = el('input', { id: 'naam', type: 'text', autocomplete: 'name', oninput: (e) => {
    state.naam = e.target.value;
    onChange();
  } });
  naam.value = state.naam;
  const geb = el('input', { id: 'geboortedatum', type: 'date', oninput: (e) => {
    state.geboortedatum = e.target.value;
    onChange();
  } });
  geb.value = state.geboortedatum;

  root.append(el('section', { class: 'section section-person' },
    el('div', { class: 'field field-inline' }, el('label', { for: 'naam' }, 'Naam'), naam),
    el('div', { class: 'field field-inline' }, el('label', { for: 'geboortedatum' }, 'Geboortedatum'), geb),
  ));

  // Gezin
  root.append(el('section', { class: 'section' },
    el('h2', {}, 'Gezin'),
    el('div', { class: 'grid grid-gezin' },
      ...GEZIN_FIELDS.map(({ key, label }) => textField({
        id: `f-${key}`,
        label,
        value: state[key],
        kind: 'gezin',
        placeholder: key === 'gezinsregels' ? 'Welke (ongeschreven) regels golden er thuis?' : 'Eigenschappen en geschiedenis',
        onInput: (v) => { state[key] = v; onChange(); },
      })),
    ),
  ));

  // Schema's
  const list = el('div', { class: 'schema-list' });
  state.schemas.forEach((schema, index) => list.append(renderSchema(schema, index)));

  root.append(el('section', { class: 'section' },
    el('h2', {}, "Schema's"),
    list,
    el('button', { type: 'button', class: 'btn btn-add', onclick: () => {
      state.schemas.push(newSchema());
      onChange();
      renderForm(root, state, { onChange });
      const cards = root.querySelectorAll('.schema-card');
      const last = cards[cards.length - 1];
      last.open = true;
      last.scrollIntoView({ behavior: 'smooth', block: 'start' });
      last.querySelector('textarea')?.focus({ preventScroll: true });
    } }, '+ Schema toevoegen'),
  ));

  function renderSchema(schema, index) {
    const summaryText = el('span', { class: 'schema-title' }, schemaTitle(schema, index));
    const field = (key, label, kind, placeholder) => textField({
      id: `s-${schema.id}-${key}`,
      label,
      value: schema[key],
      kind,
      placeholder,
      onInput: (v) => {
        schema[key] = v;
        if (key === 'naam') summaryText.textContent = schemaTitle(schema, index);
        onChange();
      },
    });

    const card = el('details', { class: 'schema-card', open: true },
      el('summary', {}, summaryText),
      el('div', { class: 'schema-body' },
        field('naam', 'Schema', 'schema', 'Bijv. verlating, minderwaardigheid…'),
        el('div', { class: 'grid grid-coping' },
          ...COPING_FIELDS.map(({ key, label }) => field(key, label, 'coping', '')),
        ),
        field('probleem', 'Probleem', 'probleem', ''),
        el('button', { type: 'button', class: 'btn btn-remove', onclick: () => {
          if (!confirm(`${schemaTitle(schema, index)} verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
          state.schemas.splice(index, 1);
          onChange();
          renderForm(root, state, { onChange });
        } }, 'Schema verwijderen'),
      ),
    );
    card.addEventListener('toggle', () => {
      if (card.open) card.querySelectorAll('textarea').forEach(autoGrow);
    });
    return card;
  }

  // Hoogte van tekstvakken pas zetten als ze in de DOM staan.
  requestAnimationFrame(() => root.querySelectorAll('textarea').forEach(autoGrow));
}
