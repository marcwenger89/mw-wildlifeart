// vCard zum Speichern im Adressbuch. Wird beim Build aus den Einstellungen erzeugt (Admin: Seitentexte).
import { readFileSync } from 'node:fs';
import einstellungen from '../../data/einstellungen.json';

export function GET() {
  const k = einstellungen.karte;
  const telefon = (k.telefon || '').replace(/[^\d+]/g, '');
  const foto = readFileSync('public/logo/vcard-foto.jpg').toString('base64');
  const zeilen = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'N:Wenger;Marc;;;', 'FN:Marc Wenger',
    `ORG:${einstellungen.seitenname}`, `TITLE:${k.rolle}`,
    `EMAIL;TYPE=INTERNET:${k.email}`,
    ...(telefon ? [`TEL;TYPE=CELL:${telefon}`] : []),
    'URL:https://www.mw-wildlifeart.ch',
    ...(einstellungen.instagram ? [`item1.URL:${einstellungen.instagram}`, 'item1.X-ABLabel:Instagram'] : []),
    'ADR;TYPE=WORK:;;;;;;Schweiz',
    `PHOTO;ENCODING=b;TYPE=JPEG:${foto}`,
    'END:VCARD',
  ].flatMap((z) => { const t: string[] = []; while (z.length > 75) { t.push(z.slice(0, 75)); z = ' ' + z.slice(75); } t.push(z); return t; });
  return new Response(zeilen.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': 'attachment; filename="Marc-Wenger.vcf"' },
  });
}
