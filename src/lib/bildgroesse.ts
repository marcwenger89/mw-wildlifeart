import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Seitenverhältnis (Breite / Höhe) eines Bildes aus public/, direkt aus dem Dateikopf gelesen (JPEG, PNG, WebP). */
export function seitenverhaeltnis(pfad: string): number | undefined {
  try {
    const b = readFileSync(join(process.cwd(), 'public', decodeURI(pfad)));
    if (b[0] === 0x89 && b[1] === 0x50) return b.readUInt32BE(16) / b.readUInt32BE(20); // PNG
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const art = b.toString('ascii', 12, 16);
      if (art === 'VP8X') return (1 + b.readUIntLE(24, 3)) / (1 + b.readUIntLE(27, 3));
      if (art === 'VP8 ') return (b.readUInt16LE(26) & 0x3fff) / (b.readUInt16LE(28) & 0x3fff);
      if (art === 'VP8L') { const v = b.readUInt32LE(21); return ((v & 0x3fff) + 1) / (((v >> 14) & 0x3fff) + 1); }
    }
    if (b[0] === 0xff && b[1] === 0xd8) { // JPEG: SOF-Marker suchen
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          const h = b.readUInt16BE(i + 5), w = b.readUInt16BE(i + 7);
          // EXIF-Drehung ignorieren wir hier; Lightroom-Exporte sind bereits richtig gedreht
          return w / h;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch { /* Datei fehlt: Standardwert */ }
  return undefined;
}
