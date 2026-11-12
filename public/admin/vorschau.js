// Echte Vorschau für Blogbeiträge im Admin: zeigt den Beitrag mit dem Design der Webseite,
// wahlweise als PC (verkleinert, damit alles reinpasst) oder als Handy.
(function () {
  if (!window.CMS) return;
  var h = window.h;

  // ---- Einfaches Markdown (gleich wie src/lib/text.ts auf der Webseite) ----
  function escape(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function inline(s) {
    return escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:)[^)\s]*)\)/g, '<a href="$2">$1</a>');
  }
  function markdown(text) {
    return String(text || '').trim().split(/\n\s*\n/).filter(Boolean).map(function (block) {
      var zeilen = block.split('\n').map(function (z) { return z.trim(); });
      var titel = block.match(/^(#{1,3})\s+(.+)$/);
      if (titel) { var n = Math.max(2, titel[1].length); return '<h' + n + '>' + inline(titel[2]) + '</h' + n + '>'; }
      if (zeilen.every(function (z) { return /^[-*]\s+/.test(z); }))
        return '<ul>' + zeilen.map(function (z) { return '<li>' + inline(z.replace(/^[-*]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      if (zeilen.every(function (z) { return /^\d+\.\s+/.test(z); }))
        return '<ol>' + zeilen.map(function (z) { return '<li>' + inline(z.replace(/^\d+\.\s+/, '')) + '</li>'; }).join('') + '</ol>';
      if (zeilen.every(function (z) { return /^>\s?/.test(z); }))
        return '<blockquote><p>' + inline(zeilen.map(function (z) { return z.replace(/^>\s?/, ''); }).join(' ')) + '</p></blockquote>';
      var bild = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (bild) return '<p><img src="' + escape(bild[2]) + '" alt="' + escape(bild[1]) + '"></p>';
      return '<p>' + inline(zeilen.join(' ')) + '</p>';
    }).join('\n');
  }

  function datumCH(wert) {
    if (!wert) return '';
    var d = new Date(wert);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---- Stil der echten Webseite holen (CSS-Dateien der Blog-Seite) ----
  var stil = null;
  var stilWarten = fetch('/blog/', { cache: 'no-cache' })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var teile = [];
      doc.querySelectorAll('link[rel="stylesheet"], style').forEach(function (el) {
        if (el.tagName === 'LINK') teile.push('<link rel="stylesheet" href="' + new URL(el.getAttribute('href'), location.origin).href + '">');
        else teile.push('<style>' + el.textContent + '</style>');
      });
      stil = teile.join('');
    })
    .catch(function () { stil = ''; });

  var ZUSATZ = '<style>' +
    'html,body{overflow-x:hidden}' +
    '.reveal-pending{opacity:1!important;transform:none!important}' +
    '.vorschau-leer{color:#8b938a;font-style:italic}' +
    '</style>';

  function beitragHtml(entry, getAsset) {
    var d = entry.get('data');
    var titel = d.get('titel') || 'Ohne Titel';
    var bild = d.get('bild');
    var kopfbild = d.get('kopfbild') !== false;
    var html = '<main><article class="text-page"><div class="wrap">' +
      '<nav class="crumbs"><a>Startseite</a><span>/</span><a>Blog</a></nav>';
    if (bild && kopfbild) html += '<img class="post-hero" src="' + escape(String(getAsset(bild))) + '" alt="">';
    html += '<div class="prose"><p class="eyebrow">' + datumCH(d.get('datum')) + '</p><h1>' + escape(titel) + '</h1>' +
      markdown(d.get('body')) + '</div>';

    var abschnitte = d.get('abschnitte');
    if (abschnitte && abschnitte.size) {
      abschnitte.forEach(function (a) {
        if (!a || !a.get) return;
        var bilder = (a.get('bilder') || []).filter ? (a.get('bilder') || []).filter(function (b) { return b && b.get && b.get('bild'); }) : [];
        var anzahl = bilder.size || 0;
        var seite = a.get('bildseite') || 'rechts';
        var breite = a.get('bildbreite') || 50;
        var hoehe = a.get('bildhoehe') || 'format';
        var klassen = ['abschnitt'];
        if (anzahl) {
          klassen.push('mit-bild', seite);
          if (seite !== 'unten' && breite < 40) klassen.push('schmal');
          if (seite !== 'unten' && hoehe === 'text') klassen.push('texthoehe');
        }
        html += '<section class="' + klassen.join(' ') + '"' + (anzahl ? ' style="--bildbreite: ' + breite + '%"' : '') + '>' +
          '<div class="prose">' + markdown(a.get('text')) + '</div>';
        if (anzahl) {
          html += '<div class="abschnitt-bilder">';
          bilder.forEach(function (b) {
            html += '<img class="' + (b.get('format') || 'quer') + ' ' + (b.get('breite') || 'voll') + '" src="' +
              escape(String(getAsset(b.get('bild')))) + '" alt="">';
          });
          html += '</div>';
        }
        html += '</section>';
      });
    }
    html += '</div></article></main>';
    return html;
  }

  var BREITE = { pc: 1380, handy: 390 };
  var gewaehlt = 'pc';
  try { gewaehlt = localStorage.getItem('mw-admin-vorschau') || 'pc'; } catch (e) {}

  var BlogVorschau = createClass({
    getInitialState: function () { return { ansicht: gewaehlt, bereit: stil !== null, platz: 0 }; },
    componentDidMount: function () {
      var self = this;
      stilWarten.then(function () { self.setState({ bereit: true }); });
      this.messen = function () { if (self.rahmen) self.setState({ platz: self.rahmen.clientWidth }); };
      this.messen();
      (this.props.window || window).addEventListener('resize', this.messen);
    },
    componentWillUnmount: function () { (this.props.window || window).removeEventListener('resize', this.messen); },
    componentDidUpdate: function () { this.schreiben(); },
    schreiben: function () {
      var f = this.iframe;
      if (!f || !this.state.bereit) return;
      var doc = f.contentDocument;
      if (!doc) return;
      if (!doc.getElementById('mw-inhalt')) {
        doc.open();
        doc.write('<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<base href="' + location.origin + '/">' + stil + ZUSATZ + '</head><body><div id="mw-inhalt"></div></body></html>');
        doc.close();
      }
      var html = beitragHtml(this.props.entry, this.props.getAsset);
      var ziel = doc.getElementById('mw-inhalt');
      if (ziel.innerHTML !== html) ziel.innerHTML = html;
      var self = this;
      clearTimeout(this.hoeheTimer);
      var messe = function () {
        var inhalt = doc.getElementById('mw-inhalt'); if (!inhalt) return;
        var hoch = Math.ceil(inhalt.getBoundingClientRect().bottom + 48);
        if (self.iframe && self.iframe.style.height !== hoch + 'px') { self.iframe.style.height = hoch + 'px'; self.setState({ hoehe: hoch }); }
      };
      messe();
      this.hoeheTimer = setTimeout(messe, 400);
      doc.querySelectorAll('img').forEach(function (img) { if (!img.complete) img.onload = messe; });
    },
    wechseln: function (ansicht) {
      gewaehlt = ansicht;
      try { localStorage.setItem('mw-admin-vorschau', ansicht); } catch (e) {}
      this.setState({ ansicht: ansicht });
    },
    render: function () {
      var self = this;
      var breite = BREITE[this.state.ansicht];
      var platz = this.state.platz || breite;
      var faktor = Math.min(1, platz / breite);
      var hoehe = this.state.hoehe || 800;
      function knopf(wert, text) {
        var aktiv = self.state.ansicht === wert;
        return h('button', {
          type: 'button',
          onClick: function () { self.wechseln(wert); },
          style: {
            padding: '6px 14px', border: '1px solid #3d4a3f', borderRadius: '999px', cursor: 'pointer',
            font: '600 13px/1 system-ui, sans-serif',
            background: aktiv ? '#d6a24a' : 'transparent', color: aktiv ? '#101412' : '#e6e9e3'
          }
        }, text);
      }
      return h('div', { style: { background: '#0c0f0d', minHeight: '100vh', margin: '-20px', padding: '12px 12px 40px' } },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', paddingRight: '64px', font: '13px system-ui, sans-serif', color: '#8b938a' } },
          knopf('pc', 'PC'), knopf('handy', 'Handy'),
          h('span', { style: { marginLeft: '8px' } }, this.state.ansicht === 'pc' ? 'So sieht es am Computer aus (verkleinert).' : 'So sieht es auf dem Handy aus.')
        ),
        h('div', { ref: function (el) { self.rahmen = el; }, style: { width: '100%' } },
          h('div', { style: { width: breite * faktor + 'px', height: hoehe * faktor + 'px', margin: '0 auto', overflow: 'hidden', boxShadow: '0 0 0 1px #2a332c' } },
            this.state.bereit
              ? h('iframe', {
                  key: this.state.ansicht,
                  ref: function (el) { self.iframe = el; if (el) setTimeout(function () { self.schreiben(); }, 0); },
                  style: { width: breite + 'px', height: hoehe + 'px', border: 0, display: 'block', transform: 'scale(' + faktor + ')', transformOrigin: '0 0' }
                })
              : h('p', { style: { color: '#8b938a', padding: '20px' } }, 'Vorschau wird geladen …')
          )
        )
      );
    }
  });

  CMS.registerPreviewTemplate('blog', BlogVorschau);
})();
