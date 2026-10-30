import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const serien = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/serien' }),
  schema: z.object({
    titel: z.string(),
    kurztext: z.string().default(''),
    titelbild: z.string(),
    reihenfolge: z.number().default(100),
    saal_link: z.string().optional(),
  }),
});

const fotos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/fotos' }),
  schema: z.object({
    titel: z.string(),
    serie: reference('serien'),
    bild: z.string(),
    ort: z.string().optional(),
    koordinaten: z.string().optional(),
    monat: z.string().optional(),
    brennweite: z.string().optional(),
    blende: z.string().optional(),
    belichtung: z.string().optional(),
    iso: z.string().optional(),
    saal_link: z.string().optional(),
    startseite: z.boolean().default(false),
    reihenfolge: z.number().default(100),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    bild: z.string().optional(),
    kurztext: z.string().default(''),
    entwurf: z.boolean().default(false),
    kopfbild: z.boolean().default(true),
    abschnitte: z.array(z.object({
      text: z.string().default(''),
      bilder: z.array(z.object({
        bild: z.string(),
        alt: z.string().default(''),
        format: z.enum(['quer', 'hoch', 'quadrat', 'breit', 'original']).default('quer'),
        breite: z.enum(['voll', 'halb']).default('voll'),
      })).default([]),
      bildbreite: z.number().min(15).max(75).default(50),
      bildseite: z.enum(['rechts', 'links']).default('rechts'),
    })).default([]),
  }),
});

const shop = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/shop' }),
  schema: z.object({
    titel: z.string(),
    beschreibung: z.string().default(''),
    bild: z.string(),
    angaben: z.array(z.object({ bezeichnung: z.string(), wert: z.string() })).default([]),
    knopf_text: z.string().default('Bei Saal Digital ansehen'),
    saal_link: z.string().default('https://www.saal-digital.ch/'),
    reihenfolge: z.number().default(100),
  }),
});

const seiten = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/seiten' }),
  schema: z.object({ titel: z.string() }),
});

export const collections = { serien, fotos, blog, shop, seiten };
