// vCard zum Speichern im Adressbuch. Wird beim Build aus den Einstellungen erzeugt (Admin: Seitentexte).
import { readFileSync } from 'node:fs';
import k from '../../data/qrkarte.json';

export function GET() {
  const telefon = (k.telefon || '').replace(/[^\d+]/g, '');
  const foto = readFileSync('public/logo/vcard-foto.jpg').toString('base64');
  const zeilen = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${k.name.split(' ').slice(1).join(' ')};${k.name.split(' ')[0]};;;`, `FN:${k.name}`,
    `ORG:${k.marke}`, `TITLE:${k.rolle}`,
    `EMAIL;TYPE=INTERNET:${k.email}`,
    ...(telefon ? [`TEL;TYPE=CELL:${telefon}`] : []),
    ...(k.webseite ? [`URL:${k.webseite}`] : []),
    ...(k.instagram ? [`item1.URL:${k.instagram}`, 'item1.X-ABLabel:Instagram'] : []),
    ...(k.land ? [`ADR;TYPE=WORK:;;;;;;${k.land}`] : []),
    `PHOTO;ENCODING=b;TYPE=JPEG:${foto}`,
    'END:VCARD',
  ].flatMap((z) => { const t: string[] = []; while (z.length > 75) { t.push(z.slice(0, 75)); z = ' ' + z.slice(75); } t.push(z); return t; });
  return new Response(zeilen.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': 'attachment; filename="Marc-Wenger.vcf"' },
  });
}
