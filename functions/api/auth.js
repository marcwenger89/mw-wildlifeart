// Anmeldung im Admin-Bereich (Decap CMS) mit GitHub, Schritt 1: weiter zu GitHub.
// Läuft als Cloudflare Pages Function unter /api/auth. Braucht die Variablen
// GITHUB_CLIENT_ID und GITHUB_CLIENT_SECRET (GitHub OAuth App) im Cloudflare-Projekt.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();

  const ziel = new URL('https://github.com/login/oauth/authorize');
  ziel.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  ziel.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  ziel.searchParams.set('scope', url.searchParams.get('scope') || 'repo,user');
  ziel.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: ziel.href,
      'Set-Cookie': `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
