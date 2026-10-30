import { getCollection } from 'astro:content';

export async function alleSerien() {
  const serien = await getCollection('serien');
  return serien.sort((a, b) => a.data.reihenfolge - b.data.reihenfolge || a.data.titel.localeCompare(b.data.titel, 'de-CH'));
}

/** Alle Fotos, sortiert nach Serie und danach das neueste zuerst (Fotos ohne Datum am Schluss). */
export async function alleFotos() {
  const serien = await alleSerien();
  const rang = new Map(serien.map((s, i) => [s.id, i]));
  const fotos = await getCollection('fotos');
  return fotos.sort((a, b) =>
    (rang.get(a.data.serie.id) ?? 99) - (rang.get(b.data.serie.id) ?? 99) ||
    (b.data.hochgeladen?.getTime() ?? 0) - (a.data.hochgeladen?.getTime() ?? 0) ||
    a.data.titel.localeCompare(b.data.titel, 'de-CH'));
}

export async function alleBeitraege() {
  const posts = await getCollection('blog', ({ data }) => !data.entwurf);
  return posts.sort((a, b) => b.data.datum.getTime() - a.data.datum.getTime());
}

export const datumCH = (d: Date) =>
  d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

export const SAAL_STANDARD = 'https://www.saal-digital.ch/';
