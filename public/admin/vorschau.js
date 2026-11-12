// Echte Vorschau im Admin: Rechts erscheint die richtige Seite der Webseite (mit Kopfzeile, Schriften
// und Farben), und was du links änderst, wird sofort hineingesetzt. Umschalten zwischen PC und Handy.
// Grundlage ist jeweils die veröffentlichte Seite; Skripte der Seite laufen in der Vorschau nicht.
(function () {
  if (!window.CMS) return;
  var h = window.h;

  // ---------- Hilfen ----------
  function escape(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function inline(s) {
    var geschuetzt = [];
    var t = String(s).replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, function (_, z) { return '\u0000' + (geschuetzt.push(z) - 1) + '\u0000'; });
    return escape(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g, '<img src="$2" alt="$1">')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
      .replace(/(^|[^\w_])_([^_\s][^_]*?)_(?![\w])/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:)[^)\s]*)\)/g, '<a href="$2">$1</a>')
      .replace(/\u0000(\d+)\u0000/g, function (_, n) { return escape(geschuetzt[+n]); });
  }
  function zeilenText(zeilen) {
    return zeilen.map(function (z, i) {
      var letzte = i === zeilen.length - 1;
      var umbruch = !letzte && /( {2,}|\\)$/.test(z);
      return inline(z.replace(/( {2,}|\\)$/, '').trim()) + (letzte ? '' : (umbruch ? '<br>' : ' '));
    }).join('');
  }
  var LEERZEILE = '<p class="leerzeile" aria-hidden="true">&nbsp;</p>';

  // Markdown genau wie auf der Webseite (src/lib/text.ts): mehrfaches Enter = Leerzeilen
  function markdown(text) {
    var teile = String(text == null ? '' : text).replace(/\r/g, '').replace(/^\s*\n/, '').replace(/\s+$/, '').split(/(\n[ \t]*(?:\n[ \t]*)+)/);
    var html = [];
    teile.forEach(function (teil, n) {
      if (n % 2 === 1) {
        var umbrueche = (teil.match(/\n/g) || []).length;
        for (var k = 0; k < Math.floor((umbrueche - 2) / 2); k++) html.push(LEERZEILE);
        return;
      }
      var block = teil.replace(/^\n+|\n+$/g, '');
      if (!block.trim()) return;
      if (/^\s*(\.|&nbsp;|\\)\s*$/.test(block)) { html.push(LEERZEILE); return; }
      var zeilen = block.split('\n').map(function (z) { return z.replace(/^\s+/, ''); });
      var titel = block.trim().match(/^(#{1,6})\s+(.+)$/);
      if (titel) {
        var stufe = Math.min(4, Math.max(2, titel[1].length));
        html.push('<h' + stufe + '>' + inline(titel[2].replace(/\s+#+\s*$/, '')) + '</h' + stufe + '>');
        return;
      }
      if (zeilen.every(function (z) { return /^[-*+]\s+/.test(z); })) {
        html.push('<ul>' + zeilen.map(function (z) { return '<li>' + inline(z.replace(/^[-*+]\s+/, '')) + '</li>'; }).join('') + '</ul>');
        return;
      }
      if (zeilen.every(function (z) { return /^\d+[.)]\s+/.test(z); })) {
        html.push('<ol>' + zeilen.map(function (z) { return '<li>' + inline(z.replace(/^\d+[.)]\s+/, '')) + '</li>'; }).join('') + '</ol>');
        return;
      }
      if (zeilen.every(function (z) { return /^>/.test(z); })) {
        html.push('<blockquote><p>' + zeilenText(zeilen.map(function (z) { return z.replace(/^>\s?/, ''); })) + '</p></blockquote>');
        return;
      }
      html.push('<p>' + zeilenText(zeilen) + '</p>');
    });
    return html.join('\n');
  }

  function absaetze(text) {
    return String(text || '').split(/\n\s*\n/).filter(function (t) { return t.trim(); })
      .map(function (t) { return '<p>' + escape(t.trim()) + '</p>'; }).join('');
  }

  function datumCH(wert) {
    if (!wert) return '';
    var d = new Date(wert);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function wert(map, pfad) {
    var v = map && map.getIn ? map.getIn(pfad) : undefined;
    return v == null ? '' : v;
  }
  function liste(v) { return v && v.toArray ? v.toArray() : (Array.isArray(v) ? v : []); }
  function bildUrl(getAsset, pfad) { return pfad ? String(getAsset(pfad)) : ''; }
  function setzeText(doc, sel, text) { var el = doc.querySelector(sel); if (el) el.textContent = text; return el; }

  // ---------- Seiten der Webseite laden (einmal pro Adresse) ----------
  var cache = {};
  function seiteLaden(url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          doc.querySelectorAll('script, #intro, .intro, [rel="manifest"]').forEach(function (el) { el.remove(); });
          doc.querySelectorAll('link[href], img[src], source[srcset]').forEach(function (el) {
            ['href', 'src', 'srcset'].forEach(function (a) {
              var v = el.getAttribute(a);
              if (v && v.charAt(0) === '/' && v.charAt(1) !== '/') el.setAttribute(a, location.origin + v);
            });
          });
          var zusatz = doc.createElement('style');
          zusatz.textContent =
            'html{scroll-behavior:auto!important}html,body{overflow-x:hidden}' +
            '.reveal-pending{opacity:1!important;transform:none!important}' +
            'a{pointer-events:none}button{pointer-events:none}.lb-i{pointer-events:auto;cursor:pointer}' +
            '.nach-oben,#nach-oben{display:none!important}';
          doc.head.appendChild(zusatz);
          return '<!doctype html>' + doc.documentElement.outerHTML;
        })
        .catch(function () { delete cache[url]; return null; });
    }
    return cache[url];
  }

  var BREITE = { pc: 1380, handy: 390 };
  var HOEHE = { pc: 860, handy: 844 };
  var geraet = 'pc';
  try { geraet = localStorage.getItem('mw-admin-vorschau') || 'pc'; } catch (e) {}

  // ---------- Vorlage: lädt eine echte Seite und setzt die Werte aus dem Admin ein ----------
  function vorlage(cfg) {
    return createClass({
      getInitialState: function () {
        return { geraet: geraet, ansicht: cfg.ansichten ? cfg.ansichten[0].wert : null, platz: 0, hoehe: 800, fehler: false };
      },
      componentDidMount: function () {
        var self = this;
        this.messen = function () { if (self.rahmen) self.setState({ platz: self.rahmen.clientWidth }); };
        this.messen();
        (this.props.window || window).addEventListener('resize', this.messen);
        this.laden();
      },
      componentWillUnmount: function () {
        this.weg = true;
        clearTimeout(this.timer);
        (this.props.window || window).removeEventListener('resize', this.messen);
      },
      componentDidUpdate: function () { this.laden(); },
      adresse: function () {
        return cfg.seite(this.props.entry.get('data') || new Map(), this.state.ansicht, this.props.entry);
      },
      laden: function () {
        var self = this;
        var iframe = this.iframe;
        if (!iframe) return;
        var url = this.adresse();
        var schluessel = url + '|' + this.state.geraet;
        if (iframe.dataset.geladen === schluessel) { this.einsetzen(); return; }
        if (iframe.dataset.laedt === schluessel) return;
        iframe.dataset.laedt = schluessel;
        var ersatz = cfg.ersatz || '/impressum/';
        seiteLaden(url).then(function (html) { return html || seiteLaden(ersatz); }).then(function (html) {
          if (self.weg || self.iframe !== iframe || iframe.dataset.laedt !== schluessel) return;
          if (!html) { self.setState({ fehler: true }); return; }
          var doc = iframe.contentDocument;
          doc.open(); doc.write(html); doc.close();
          iframe.dataset.geladen = schluessel;
          iframe.dataset.laedt = '';
          self.einsetzen();
        });
      },
      einsetzen: function () {
        var iframe = this.iframe;
        var doc = iframe && iframe.contentDocument;
        if (!doc || !doc.body) return;
        try {
          cfg.einsetzen(doc, this.props.entry.get('data'), this.props.getAsset, this.state.ansicht, this);
        } catch (e) { if (window.console) console.warn('Vorschau:', e); }
        var self = this;
        var messe = function () {
          if (self.weg || !doc.body) return;
          var hoch = HOEHE[self.state.geraet];
          if (!(typeof cfg.fensterhoch === 'function' ? cfg.fensterhoch(self.state.ansicht) : cfg.fensterhoch)) {
            hoch = 0;
            [].forEach.call(doc.body.children, function (el) {
              var st = doc.defaultView.getComputedStyle(el);
              if (st.position === 'fixed' || st.display === 'none') return;
              hoch = Math.max(hoch, el.getBoundingClientRect().bottom + doc.defaultView.scrollY);
            });
            hoch = Math.max(300, Math.ceil(hoch));
          }
          if (hoch !== self.state.hoehe) self.setState({ hoehe: hoch });
        };
        messe();
        clearTimeout(this.timer);
        this.timer = setTimeout(messe, 500);
        doc.querySelectorAll('img').forEach(function (img) { if (!img.complete) img.addEventListener('load', messe, { once: true }); });
      },
      wechsleGeraet: function (g) {
        geraet = g;
        try { localStorage.setItem('mw-admin-vorschau', g); } catch (e) {}
        this.setState({ geraet: g });
      },
      render: function () {
        var self = this;
        var breite = BREITE[this.state.geraet];
        var platz = this.state.platz || breite;
        var faktor = Math.min(1, platz / breite);
        var hoehe = this.state.hoehe;
        function knopf(aktiv, text, klick) {
          return h('button', {
            type: 'button', onClick: klick,
            style: {
              padding: '6px 14px', border: '1px solid #3d4a3f', borderRadius: '999px', cursor: 'pointer',
              font: '600 13px/1 system-ui, sans-serif',
              background: aktiv ? '#d6a24a' : 'transparent', color: aktiv ? '#101412' : '#e6e9e3'
            }
          }, text);
        }
        var leiste = [
          knopf(this.state.geraet === 'pc', 'PC', function () { self.wechsleGeraet('pc'); }),
          knopf(this.state.geraet === 'handy', 'Handy', function () { self.wechsleGeraet('handy'); })
        ];
        if (cfg.ansichten) {
          leiste.push(h('span', { style: { width: '1px', height: '20px', background: '#3d4a3f', margin: '0 4px' } }));
          cfg.ansichten.forEach(function (a) {
            leiste.push(knopf(self.state.ansicht === a.wert, a.label, function () { self.setState({ ansicht: a.wert }); }));
          });
        }
        leiste.push(h('span', { style: { marginLeft: '6px' } },
          this.state.geraet === 'pc' ? 'So sieht es am Computer aus (verkleinert).' : 'So sieht es auf dem Handy aus.'));

        return h('div', { style: { background: '#0c0f0d', minHeight: '100vh', margin: '-20px', padding: '12px 12px 40px' } },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', paddingRight: '64px', font: '13px system-ui, sans-serif', color: '#8b938a' } }, leiste),
          h('div', { ref: function (el) { self.rahmen = el; }, style: { width: '100%' } },
            this.state.fehler
              ? h('p', { style: { color: '#8b938a', padding: '20px', font: '14px system-ui, sans-serif' } }, 'Die Vorschau konnte die Webseite nicht laden.')
              : h('div', { style: { width: breite * faktor + 'px', height: hoehe * faktor + 'px', margin: '0 auto', overflow: 'hidden', boxShadow: '0 0 0 1px #2a332c' } },
                  h('iframe', {
                    key: this.state.geraet,
                    title: 'Vorschau',
                    ref: function (el) { if (el !== self.iframe) { self.iframe = el; if (el) setTimeout(function () { self.laden(); }, 0); } },
                    style: { width: breite + 'px', height: hoehe + 'px', border: 0, display: 'block', transform: 'scale(' + faktor + ')', transformOrigin: '0 0' }
                  })
                )
          )
        );
      }
    });
  }

  // ---------- Blog ----------
  function beitragHtml(d, getAsset) {
    var titel = wert(d, ['titel']) || 'Ohne Titel';
    var bild = wert(d, ['bild']);
    var html = '<article class="text-page"><div class="wrap">' +
      '<nav class="crumbs"><a>Startseite</a><span>/</span><a>Blog</a></nav>';
    if (bild && d.get('kopfbild') !== false) html += '<img class="post-hero" src="' + escape(bildUrl(getAsset, bild)) + '" alt="">';
    html += '<div class="prose"><p class="eyebrow">' + datumCH(wert(d, ['datum'])) + '</p><h1>' + escape(titel) + '</h1>' +
      markdown(wert(d, ['body'])) + '</div>';
    liste(d.get('abschnitte')).forEach(function (a) {
      if (!a || !a.get) return;
      var bilder = liste(a.get('bilder')).filter(function (b) { return b && b.get && b.get('bild'); });
      var seite = a.get('bildseite') || 'rechts';
      var breite = a.get('bildbreite') || 50;
      var klassen = ['abschnitt'];
      var schrift = a.get('schrift'); var farbe = a.get('farbe');
      if (schrift && schrift !== 'standard') klassen.push('schrift-' + schrift);
      if (farbe && farbe !== 'standard') klassen.push('farbe-' + farbe);
      if (bilder.length) {
        klassen.push('mit-bild', seite);
        if (seite !== 'unten' && breite < 40) klassen.push('schmal');
        if (seite !== 'unten' && a.get('bildhoehe') === 'text') klassen.push('texthoehe');
      }
      html += '<section class="' + klassen.join(' ') + '"' + (bilder.length ? ' style="--bildbreite: ' + breite + '%"' : '') + '>' +
        '<div class="prose">' + markdown(a.get('text')) + '</div>';
      if (bilder.length) {
        html += '<div class="abschnitt-bilder">';
        bilder.forEach(function (b) {
          html += '<img class="' + (b.get('format') || 'quer') + ' ' + (b.get('breite') || 'voll') + '" src="' +
            escape(bildUrl(getAsset, b.get('bild'))) + '" alt="">';
        });
        html += '</div>';
      }
      html += '</section>';
    });
    return html + '</div></article>';
  }

  CMS.registerPreviewTemplate('blog', vorlage({
    seite: function () { return '/impressum/'; },
    einsetzen: function (doc, d, getAsset) {
      var main = doc.querySelector('main') || doc.body;
      var html = beitragHtml(d, getAsset);
      if (main.dataset.vorschau !== html) { main.innerHTML = html; main.dataset.vorschau = html; }
    }
  }));

  // ---------- Impressum und Datenschutz ----------
  ['impressum', 'datenschutz'].forEach(function (name) {
    CMS.registerPreviewTemplate(name, vorlage({
      seite: function () { return '/' + name + '/'; },
      einsetzen: function (doc, d) {
        var main = doc.querySelector('main') || doc.body;
        var html = '<article class="text-page"><div class="wrap prose"><h1>' + escape(wert(d, ['titel'])) + '</h1>' + markdown(wert(d, ['body'])) + '</div></article>';
        if (main.dataset.vorschau !== html) { main.innerHTML = html; main.dataset.vorschau = html; }
      }
    }));
  });

  // ---------- Fotos: Vollbild (wie beim Klick in der Galerie) und Startseite ----------
  CMS.registerPreviewTemplate('fotos', vorlage({
    ansichten: [{ wert: 'vollbild', label: 'Vollbild' }, { wert: 'startseite', label: 'Startseite' }],
    seite: function (d, ansicht) {
      if (ansicht === 'startseite') return '/';
      var serie = wert(d, ['serie']);
      return serie ? '/galerien/' + serie + '/' : '/galerien/alle/';
    },
    ersatz: '/galerien/alle/',
    fensterhoch: function (ansicht) { return ansicht === 'vollbild'; },
    einsetzen: function (doc, d, getAsset, ansicht) {
      var titel = wert(d, ['titel']);
      var bild = bildUrl(getAsset, wert(d, ['bild']));
      if (ansicht === 'startseite') {
        var img = doc.querySelector('.hero-frame img');
        if (!img) return;
        doc.querySelectorAll('.hero-frame img').forEach(function (i) { if (i !== img) i.classList.remove('on'); });
        img.classList.add('on');
        var pc = bildUrl(getAsset, wert(d, ['startbild'])) || bild;
        if (img.getAttribute('src') !== pc) img.setAttribute('src', pc);
        img.style.objectPosition = wert(d, ['ausschnitt']) || 'center';
        var bild_handy = bildUrl(getAsset, wert(d, ['startbild_handy']));
        var pic = img.parentElement;
        var quelle = pic && pic.querySelector('source');
        if (bild_handy) {
          if (!quelle && pic) { quelle = doc.createElement('source'); quelle.media = '(max-width: 640px)'; pic.insertBefore(quelle, img); }
          if (quelle) quelle.srcset = bild_handy;
        } else if (quelle) quelle.remove();
        // «Begegnungen»: angehaktes Foto (oder eigener Zuschnitt) an erster Stelle zeigen
        var werkImg = doc.querySelector('#werke .werk img');
        var werkbild = bildUrl(getAsset, wert(d, ['werkbild']));
        if (werkImg && (wert(d, ['werk']) || werkbild)) {
          var w = werkbild || bild;
          if (werkImg.getAttribute('src') !== w) werkImg.setAttribute('src', w);
          werkImg.loading = 'eager';
        }
        return;
      }
      var lb = doc.getElementById('lightbox');
      if (!lb) return;
      lb.hidden = false;
      lb.classList.add('open', 'sofort');
      doc.body.style.overflow = 'hidden';
      var lbImg = doc.getElementById('lb-img');
      if (lbImg && lbImg.getAttribute('src') !== bild) lbImg.setAttribute('src', bild);
      setzeText(doc, '#lb-titel', titel);
      var iso = wert(d, ['iso']);
      setzeText(doc, '#lb-daten', [wert(d, ['ort']), wert(d, ['monat']), wert(d, ['brennweite']), wert(d, ['blende']),
        wert(d, ['belichtung']), iso && 'ISO ' + iso, wert(d, ['koordinaten'])].filter(Boolean).join(' · '));
      var geschichte = String(wert(d, ['body'])).trim();
      var iKnopf = doc.getElementById('lb-i');
      var story = doc.getElementById('lb-story');
      if (iKnopf) {
        iKnopf.hidden = !geschichte;
        if (!iKnopf.dataset.vorschau) {
          iKnopf.dataset.vorschau = '1';
          iKnopf.addEventListener('click', function () { if (story) story.hidden = !story.hidden; });
        }
      }
      if (story) {
        if (!geschichte) story.hidden = true;
        setzeText(doc, '#lb-story-titel', titel);
        var text = doc.getElementById('lb-story-text');
        if (text) text.innerHTML = markdown(geschichte);
      }
    }
  }));

  // ---------- Galerien: Karte in der Übersicht und Kopf der Galerie-Seite ----------
  CMS.registerPreviewTemplate('serien', vorlage({
    ansichten: [{ wert: 'karte', label: 'Übersicht' }, { wert: 'seite', label: 'Galerie-Seite' }],
    seite: function (d, ansicht, entry) {
      if (ansicht === 'karte') return '/galerien/';
      var slug = entry.get('slug');
      return slug ? '/galerien/' + slug + '/' : '/galerien/alle/';
    },
    ersatz: '/galerien/alle/',
    einsetzen: function (doc, d, getAsset, ansicht, komp) {
      var titel = wert(d, ['titel']);
      if (ansicht === 'karte') {
        var slug = komp.props.entry.get('slug');
        var karte = slug && doc.querySelector('.series a.serie[href="/galerien/' + slug + '/"]');
        if (!karte) {
          karte = doc.querySelector('.series a.serie[data-vorschau-neu]');
          var reihe = doc.querySelector('.series');
          if (!karte && reihe) {
            karte = doc.createElement('a');
            karte.className = 'serie';
            karte.dataset.vorschauNeu = '1';
            karte.innerHTML = '<div class="ph"><img alt=""></div><h3></h3>';
            reihe.appendChild(karte);
          }
        }
        if (!karte) return;
        var img = karte.querySelector('img');
        var src = bildUrl(getAsset, wert(d, ['titelbild']));
        if (img && src && img.getAttribute('src') !== src) img.setAttribute('src', src);
        var h3 = karte.querySelector('h3');
        if (h3) h3.textContent = titel;
        karte.style.outline = '2px solid #d6a24a';
        karte.style.outlineOffset = '6px';
        return;
      }
      setzeText(doc, '.g-title', titel);
      var crumbs = doc.querySelectorAll('.crumbs span');
      if (crumbs.length) crumbs[crumbs.length - 1].textContent = titel;
      var intro = doc.querySelector('.block-head > p');
      if (intro) intro.textContent = wert(d, ['kurztext']);
    }
  }));

  // ---------- Startseite, Über mich und Kontakt ----------
  CMS.registerPreviewTemplate('einstellungen', vorlage({
    ansichten: [{ wert: 'start', label: 'Startseite' }, { wert: 'bald', label: '«Bald hier»' }],
    seite: function (d, ansicht) { return ansicht === 'bald' ? '/bald/' : '/'; },
    einsetzen: function (doc, d, getAsset, ansicht) {
      if (ansicht === 'bald') {
        var b = d.get('baustelle');
        setzeText(doc, '.eyebrow', wert(b, ['eyebrow']));
        setzeText(doc, 'h1', wert(b, ['titel']));
        var main = doc.querySelector('main');
        if (main) {
          main.querySelectorAll('p.bald-text').forEach(function (p) { p.remove(); });
          var spur = main.querySelector('.spur');
          String(wert(b, ['text'])).split(/\n\s*\n/).filter(function (t) { return t.trim(); }).forEach(function (t) {
            var p = doc.createElement('p'); p.className = 'bald-text'; p.textContent = t.trim();
            main.insertBefore(p, spur || null);
          });
        }
        return;
      }
      var s = d.get('startseite');
      var h1 = doc.querySelector('.hero-text h1');
      if (h1) {
        var betont = wert(s, ['titel_betont']);
        h1.innerHTML = escape(wert(s, ['titel'])) + ' ' + (betont ? '<em>' + escape(betont) + '</em>' : '') + ' ' + escape(wert(s, ['titel_ende']));
      }
      setzeText(doc, '.hero-text p', wert(s, ['text']));
      setzeText(doc, '#werke .block-head h2', wert(s, ['werke_titel']) || 'Begegnungen');
      var werkeKnopf = doc.querySelector('#werke .werke-fuss .btn');
      if (werkeKnopf) {
        var kt = (wert(s, ['werke_knopf']) || 'Alle Galerien') + ' →';
        if (werkeKnopf.textContent !== kt) werkeKnopf.innerHTML = escape(wert(s, ['werke_knopf']) || 'Alle Galerien') + ' <span aria-hidden="true">→</span>';
      }
      var u = d.get('ueber_mich');
      var ueber = doc.querySelector('#ueber .about > div:first-child');
      if (ueber) {
        var html = '<p class="eyebrow">Über mich</p><h2>' + escape(wert(u, ['titel'])) + '</h2>' + absaetze(wert(u, ['text']));
        if (wert(u, ['link'])) html += '<a class="btn">' + escape(wert(u, ['knopf_text']) || 'Mehr über mich') + '</a>';
        if (wert(u, ['bild'])) html += '<img class="portrait" src="' + escape(bildUrl(getAsset, wert(u, ['bild']))) + '" alt="Porträt">';
        if (ueber.dataset.vorschau !== html) { ueber.innerHTML = html; ueber.dataset.vorschau = html; }
      }
      var k = d.get('kontakt');
      var kontakt = doc.getElementById('kontakt');
      if (kontakt) {
        setzeText(kontakt, 'h2', wert(k, ['titel']));
        setzeText(kontakt, 'h2 + p', wert(k, ['text']));
      }
    }
  }));
})();
