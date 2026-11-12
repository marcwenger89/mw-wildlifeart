// Markdown für die Textfelder aus dem Admin (Blog, Abschnitte, Impressum, Datenschutz).
// Bewusst klein gehalten, damit die Vorschau im Admin (public/admin/vorschau.js) genau gleich rechnen kann.
// Wenn du hier etwas änderst, bitte dort gleich ändern.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s: string) => {
  const geschuetzt: string[] = [];
  const t = s.replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, (_, z) => `\u0000${geschuetzt.push(z) - 1}\u0000`);
  return escape(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g, '<img src="$2" alt="$1">')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\s][^_]*?)_(?![\w])/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:)[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\u0000(\d+)\u0000/g, (_, n) => escape(geschuetzt[+n]));
};

/** Zeilen eines Absatzes: zwei Leerzeichen oder \ am Ende = Zeilenumbruch, sonst fliesst der Text weiter. */
const zeilenText = (zeilen: string[]) =>
  zeilen.map((z, i) => {
    const umbruch = i < zeilen.length - 1 && /( {2,}|\\)$/.test(z);
    return inline(z.replace(/( {2,}|\\)$/, '').trim()) + (i < zeilen.length - 1 ? (umbruch ? '<br>' : ' ') : '');
  }).join('');

/** Leerzeile: jedes zusätzliche Enter im Admin gibt eine leere Zeile Abstand. */
export const LEERZEILE = '<p class="leerzeile" aria-hidden="true">&nbsp;</p>';

/** Markdown aus dem Admin: Absätze, Titel, Listen, Zitate, Bilder, **fett**, *kursiv*, Links und Leerzeilen. */
export function einfachesMarkdown(text: string | null | undefined = '') {
  // Der Admin speichert jedes leere Enter als zwei zusätzliche Zeilenumbrüche: daraus werden Leerzeilen.
  const teile = String(text ?? '').replace(/\r/g, '').replace(/^\s*\n/, '').trimEnd().split(/(\n[ \t]*(?:\n[ \t]*)+)/);
  const html: string[] = [];
  teile.forEach((teil, n) => {
    if (n % 2 === 1) {
      const umbrueche = (teil.match(/\n/g) || []).length;
      for (let k = 0; k < Math.floor((umbrueche - 2) / 2); k++) html.push(LEERZEILE);
      return;
    }
    const block = teil.replace(/^\n+|\n+$/g, '');
    if (!block.trim()) return;
    if (/^\s*(\.|&nbsp;|\\)\s*$/.test(block)) { html.push(LEERZEILE); return; }
    const zeilen = block.split('\n').map(z => z.replace(/^\s+/, ''));
    const titel = block.trim().match(/^(#{1,6})\s+(.+)$/);
    if (titel) {
      const stufe = Math.min(4, Math.max(2, titel[1].length));
      html.push(`<h${stufe}>${inline(titel[2].replace(/\s+#+\s*$/, ''))}</h${stufe}>`);
      return;
    }
    if (zeilen.every(z => /^[-*+]\s+/.test(z))) {
      html.push(`<ul>${zeilen.map(z => `<li>${inline(z.replace(/^[-*+]\s+/, ''))}</li>`).join('')}</ul>`);
      return;
    }
    if (zeilen.every(z => /^\d+[.)]\s+/.test(z))) {
      html.push(`<ol>${zeilen.map(z => `<li>${inline(z.replace(/^\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`);
      return;
    }
    if (zeilen.every(z => /^>/.test(z))) {
      html.push(`<blockquote><p>${zeilenText(zeilen.map(z => z.replace(/^>\s?/, '')))}</p></blockquote>`);
      return;
    }
    html.push(`<p>${zeilenText(zeilen)}</p>`);
  });
  return html.join('\n');
}
