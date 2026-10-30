const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s: string) =>
  escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:)[^)\s]*)\)/g, '<a href="$2">$1</a>');

/** Einfaches Markdown für Textfelder im Admin: Absätze, ## Titel, Listen, **fett**, *kursiv* und Links. */
export function einfachesMarkdown(text = '') {
  return text.trim().split(/\n\s*\n/).filter(Boolean).map(block => {
    const zeilen = block.split('\n').map(z => z.trim());
    const titel = block.match(/^(#{2,3})\s+(.+)$/);
    if (titel) return `<h${titel[1].length}>${inline(titel[2])}</h${titel[1].length}>`;
    if (zeilen.every(z => /^[-*]\s+/.test(z)))
      return `<ul>${zeilen.map(z => `<li>${inline(z.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${inline(zeilen.join(' '))}</p>`;
  }).join('\n');
}
