// Anmeldung im Admin-Bereich (Decap CMS) mit GitHub, Schritt 2: GitHub schickt einen Code zurück,
// den wir gegen einen Zugangsschlüssel tauschen und an das Admin-Fenster weitergeben.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const erwartet = (request.headers.get('Cookie') || '').match(/decap_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== erwartet) {
    return antwort('error', { error: 'Anmeldung abgelaufen oder ungültig. Bitte nochmals versuchen.' });
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'mw-wildlifeart-admin' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const daten = await res.json().catch(() => ({}));

  if (!daten.access_token) {
    return antwort('error', { error: daten.error_description || 'GitHub hat die Anmeldung abgelehnt.' });
  }
  return antwort('success', { token: daten.access_token, provider: 'github' });
}

// Kleines Fenster, das Decap den Schlüssel per postMessage übergibt (nur an die eigene Seite).
function antwort(status, inhalt) {
  const nachricht = JSON.stringify(`authorization:github:${status}:${JSON.stringify(inhalt)}`).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>Anmeldung</title></head><body>
<p>${status === 'success' ? 'Angemeldet, dieses Fenster schliesst sich gleich.' : 'Anmeldung fehlgeschlagen.'}</p>
<script>
  (function () {
    function empfangen(e) {
      if (e.origin !== window.location.origin) return;
      window.opener.postMessage(${nachricht}, e.origin);
      window.removeEventListener('message', empfangen);
    }
    window.addEventListener('message', empfangen, false);
    window.opener && window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`;
  return new Response(html, {
    status: status === 'success' ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': 'decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}
