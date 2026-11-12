// Aufnahmedaten: Im Admin wird nur die Zahl eingetippt, die Einheit setzt die Seite.
// Ältere Einträge mit Einheit («f/6.3», «1/1000», «800mm») bleiben unverändert, nichts wird doppelt.
// Gleiche Logik in public/admin/vorschau.js (Funktion «einheiten») halten.
const rein = (v: unknown) => (v == null ? '' : String(v).trim());

export const blende = (v: unknown) => {
  const s = rein(v);
  if (!s) return '';
  return 'f/' + s.replace(/^ƒ\s*\/?\s*|^f\s*\/?\s*/i, '');
};

export const belichtung = (v: unknown) => {
  const s = rein(v).replace(/\s*s(ek(\.|unden?)?)?$/i, '');
  if (!s) return '';
  return s.includes('/') ? s.replace(/\s*\/\s*/, '/') : '1/' + s;
};

export const brennweite = (v: unknown) => {
  const s = rein(v).replace(/\s*mm$/i, '');
  if (!s) return '';
  return s + 'mm';
};
