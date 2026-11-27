// Seitenverzeichnis für Google (www.mw-wildlifeart.ch/sitemap.xml), wird bei jedem Build neu erstellt.
// Enthält alle öffentlichen Seiten und pro Galerie die Fotos (für die Google-Bildersuche).
// Nicht drin: Admin, Vorschau, «Bald hier», QR-Karte, Danke, 404.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { alleSerien, alleFotos, alleBeitraege, bildText } from '../lib/inhalt';

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const url = (pfad: string) => new URL(pfad, site).href;
  const serien = await alleSerien();
  const fotos = await alleFotos();
  const beitraege = await alleBeitraege();
  const seiten = await getCollection('seiten');

  const eintraege: { loc: string; lastmod?: Date; bilder?: { loc: string; titel: string }[] }[] = [
    { loc: url('/') },
    { loc: url('/galerien/') },
    { loc: url('/galerien/alle/') },
    ...serien.map(s => ({
      loc: url(`/galerien/${s.id}/`),
      bilder: fotos.filter(f => f.data.serie.id === s.id).map(f => ({ loc: url(f.data.bild), titel: bildText(f.data) })),
    })),
    { loc: url('/blog/') },
    ...beitraege.map(p => ({ loc: url(`/blog/${p.id}/`), lastmod: p.data.datum })),
    ...seiten.map(s => ({ loc: url(`/${s.id}/`) })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${eintraege.map(e => `  <url>
    <loc>${xml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}${(e.bilder ?? []).map(b => `
    <image:image><image:loc>${xml(b.loc)}</image:loc><image:title>${xml(b.titel)}</image:title></image:image>`).join('')}
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
