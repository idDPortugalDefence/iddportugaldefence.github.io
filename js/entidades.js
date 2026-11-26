/* Indústria de Defesa · entidades · site idD (fase de testes: participadas) */
(function () {
  'use strict';
  var mount = document.getElementById('pde-app');
  if (!mount || mount.getAttribute('data-init')) return;
  mount.setAttribute('data-init', '1');
  var BASE = mount.getAttribute('data-base') || 'https://iddportugaldefence.github.io/';
  var MP = window.MAPPT;

  var DOMS = [
    { id: 'mar', nome: 'Marítimo', ic: '<path d="M3 17c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0"/><path d="M5 14l1.5-5h11L19 14"/><path d="M9 9V5h5l1.5 4"/>' },
    { id: 'ter', nome: 'Terrestre', ic: '<rect x="3" y="10" width="14" height="6" rx="1.5"/><path d="M17 12h3l1 4h-4"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="14" cy="17.5" r="1.8"/><path d="M7 10V7h6l2 3"/>' },
    { id: 'aer', nome: 'Aéreo', ic: '<path d="M2 14l20-6-2-2-7 2-5-4-2 1 3 4-4 1-2-1-1 1 3 3z"/>' },
    { id: 'esp', nome: 'Espaço', ic: '<circle cx="12" cy="12" r="3.5"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)"/>' },
    { id: 'cib', nome: 'Ciberespaço', ic: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.5"/>' }
  ];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function svg(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  function host(u) { return String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''); }
  function n(x) { return x === 1 ? '1 entidade' : x + ' entidades'; }
  function pct(v) { return String(v).replace('.', ',') + '%'; }

  var S = { lista: [], dom: [], dist: null, q: '' };

  mount.innerHTML =
    '<div class="pde-doms" data-doms></div>' +
    '<div class="pde-map-wrap"><div class="pde-map" data-map></div><div class="pde-panel" data-panel></div></div>' +
    '<div class="pde-bar"><label class="pde-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Pesquisar por nome, setor ou concelho" data-q aria-label="Pesquisar entidades"></label><div class="pde-act" data-act></div><span class="pde-res" data-res></span></div>' +
    '<div class="pde-grid" data-grid><div class="pde-sk"></div><div class="pde-sk"></div><div class="pde-sk"></div></div>' +
    '<div class="pde-dlg" data-dlg hidden><div class="pde-dlg-bg" data-close></div><div class="pde-dlg-in" role="dialog" aria-modal="true"><button type="button" class="pde-x" data-close aria-label="Fechar">×</button><div data-body></div></div></div>';
  var $ = function (s) { return mount.querySelector(s); };

  function filtradas(semDist) {
    return S.lista.filter(function (e) {
      return (!S.dom.length || S.dom.some(function (d) { return e.dominios.indexOf(d) > -1; })) &&
        (semDist || !S.dist || e.distrito === S.dist) &&
        (!S.q || norm([e.nome, e.curto, e.tag, e.setores.join(' '), e.concelho, e.distrito, e.resumo].join(' ')).indexOf(norm(S.q)) > -1);
    });
  }

  /* ---------- domínios ---------- */
  function renderDoms() {
    $('[data-doms]').innerHTML = DOMS.map(function (d) {
      var c = S.lista.filter(function (e) { return e.dominios.indexOf(d.id) > -1; }).length, on = S.dom.indexOf(d.id) > -1;
      return '<button type="button" class="pde-dom' + (on ? ' pde-on' : '') + '" data-dom="' + d.id + '" aria-pressed="' + on + '"><span class="pde-ic">' + svg(d.ic) + '</span><b>' + d.nome + '</b><span>' + n(c) + '</span></button>';
    }).join('');
  }

  /* ---------- mapa ---------- */
  function grupos() {
    var g = {};
    filtradas(true).forEach(function (e) {
      if (!e.distrito) return; var k = e.distrito;
      if (!g[k]) { var c = MP && MP.dc && MP.dc[k], p = MP && MP.pts[e.concelho]; g[k] = { n: 0, x: c ? c[0] : (p ? p[0] : 300), y: c ? c[1] : (p ? p[1] : 400) }; }
      g[k].n++;
    });
    return g;
  }
  function renderMap() {
    if (!MP) { $('[data-map]').innerHTML = ''; return; }
    if (!$('[data-map] svg')) {
      $('[data-map]').innerHTML = '<svg viewBox="0 0 600 820" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa de Portugal com as entidades por distrito">' +
        '<defs><linearGradient id="pde-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1f5ec"/></linearGradient></defs>' +
        '<rect x="-2000" y="-2000" width="5000" height="5000" class="pde-sea"/><path class="pde-es" d="' + MP.es + '"/><path class="pde-pt" d="' + MP.main + '"/>' +
        '<rect class="pde-inset" x="12" y="62" width="198" height="124" rx="6"/><path class="pde-pt" d="' + MP.az + '"/>' +
        '<rect class="pde-inset" x="58" y="248" width="104" height="94" rx="6"/><path class="pde-pt" d="' + MP.ma + '"/>' +
        '<text class="pde-il" x="22" y="80">Açores</text><text class="pde-il" x="68" y="266">Madeira</text><g data-pins></g></svg>';
    }
    var G = grupos(), it = Object.keys(G).map(function (k) { return { k: k, n: G[k].n, x: G[k].x, y: G[k].y, r: 13 + Math.sqrt(G[k].n) * 4 }; });
    it.sort(function (a, b) { return b.n - a.n; });
    for (var t = 0; t < 60; t++) { var mv = false; for (var i = 0; i < it.length; i++) for (var j = i + 1; j < it.length; j++) { var a = it[i], b = it[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = a.r + b.r + 6; if (d < m) { var p = (m - d) / 2; dx /= d; dy /= d; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; mv = true; } } if (!mv) break; }
    $('[data-pins]').innerHTML = it.map(function (p) {
      return '<g class="pde-pin' + (S.dist === p.k ? ' pde-on' : '') + '" data-dist="' + esc(p.k) + '" transform="translate(' + p.x + ' ' + p.y + ')" tabindex="0" role="button" aria-label="' + esc(p.k) + ': ' + n(p.n) + '"><title>' + esc(p.k) + ' · ' + p.n + '</title>' +
        '<circle class="pde-halo" r="' + p.r * 1.5 + '"/><circle class="pde-dot" r="' + p.r + '"/><text dy="' + p.r * .35 + '" font-size="' + p.r * .95 + '">' + p.n + '</text><text class="pde-lbl" y="' + (p.r + 14) + '">' + esc(p.k) + '</text></g>';
    }).join('');
  }
  function renderPanel() {
    var G = grupos(), ks = Object.keys(G).sort(function (a, b) { return G[b].n - G[a].n; }), mx = ks.length ? G[ks[0]].n : 1, tot = ks.reduce(function (s, k) { return s + G[k].n; }, 0);
    if (!S.dist) {
      $('[data-panel]').innerHTML = '<span class="pde-eb">Presença no território</span><h3>Onde está a <b>indústria de Defesa</b></h3><p>' + n(tot) + ' em ' + ks.length + (ks.length === 1 ? ' distrito' : ' distritos') + '. Toque num distrito para ver as entidades aí sediadas.</p>' +
        ks.map(function (k) { return '<button type="button" class="pde-row" data-dist="' + esc(k) + '"><span>' + esc(k) + '</span><i><em style="width:' + (G[k].n / mx * 100) + '%"></em></i><b>' + G[k].n + '</b></button>'; }).join('');
      return;
    }
    var L = filtradas().filter(function (e) { return e.distrito === S.dist; });
    $('[data-panel]').innerHTML = '<button type="button" class="pde-back" data-dist="">← Todo o país</button><span class="pde-eb">Distrito</span><h3>' + esc(S.dist) + ' · ' + n(L.length) + '</h3>' +
      '<div class="pde-ml">' + L.map(function (e) { return '<button type="button" class="pde-mi" data-ent="' + e.id + '">' + logoBox(e) + '<span><b>' + esc(e.curto) + '</b><small>' + esc(e.concelho) + '</small></span></button>'; }).join('') + '</div>';
  }
  function logoBox(e) { return '<span class="pde-lg">' + (e.logo ? '<img src="' + BASE + 'assets/' + esc(e.logo) + '" alt="" loading="lazy">' : '<i>' + esc(e.curto.slice(0, 2)) + '</i>') + '</span>'; }

  /* ---------- lista ---------- */
  function cartao(e) {
    var dn = e.dominios.map(function (d) { var x = DOMS.filter(function (y) { return y.id === d; })[0]; return x ? x.nome : ''; }).filter(Boolean);
    return '<button type="button" class="pde-c" data-ent="' + e.id + '"><span class="pde-ph"' + (e.foto ? ' style="background-image:url(\'' + BASE + 'assets/' + esc(e.foto) + '\')"' : '') + '><span class="pde-gr">Grupo idD · ' + pct(e.pctIdD) + '</span></span>' +
      '<span class="pde-cb">' + logoBox(e) + '<span class="pde-tg">' + esc(e.tag) + '</span><b>' + esc(e.curto) + '</b><small>' + esc(e.resumo) + '</small>' +
      '<span class="pde-meta"><span>' + esc(e.concelho) + ', ' + esc(e.distrito) + '</span>' + (dn.length ? '<span>' + esc(dn.join(' · ')) + '</span>' : '') + '</span></span></button>';
  }
  function render() {
    renderDoms(); renderMap(); renderPanel();
    var L = filtradas();
    $('[data-res]').textContent = n(L.length);
    var act = [];
    S.dom.forEach(function (d) { var x = DOMS.filter(function (y) { return y.id === d; })[0]; act.push('<button type="button" class="pde-fc" data-undom="' + d + '">' + x.nome + ' ×</button>'); });
    if (S.dist) act.push('<button type="button" class="pde-fc" data-dist="">' + esc(S.dist) + ' ×</button>');
    if (act.length > 1) act.push('<button type="button" class="pde-clr" data-clear>Limpar filtros</button>');
    $('[data-act]').innerHTML = act.join('');
    $('[data-grid]').innerHTML = L.length ? L.map(cartao).join('') : '<div class="pde-empty"><b>Sem entidades com estes critérios.</b><span>Experimente limpar os filtros ou a pesquisa.</span></div>';
  }
  function abrir(id) {
    var e = S.lista.filter(function (x) { return String(x.id) === String(id); })[0]; if (!e) return;
    var dn = e.dominios.map(function (d) { var x = DOMS.filter(function (y) { return y.id === d; })[0]; return x ? x.nome : ''; }).filter(Boolean);
    var row = function (l, v) { return v ? '<div class="pde-kv"><span>' + l + '</span><b>' + v + '</b></div>' : ''; };
    $('[data-body]').innerHTML = '<div class="pde-dh"' + (e.foto ? ' style="background-image:linear-gradient(0deg,rgba(20,48,30,.95),rgba(20,48,30,.35)),url(\'' + BASE + 'assets/' + esc(e.foto) + '\')"' : '') + '>' + logoBox(e) + '<span class="pde-tg">' + esc(e.tag) + '</span><h2>' + esc(e.nome) + '</h2></div>' +
      '<div class="pde-db"><p>' + esc(e.descricao || e.resumo) + '</p><div class="pde-kvs">' +
      row('Localização', esc(e.concelho + ', ' + e.distrito)) + row('Domínios', esc(dn.join(' · '))) + row('Setores', esc(e.setores.join(' · '))) +
      row('Participação da idD', '<span class="pde-pc"><i><em style="width:' + e.pctIdD + '%"></em></i>' + pct(e.pctIdD) + '</span>' + (e.outros ? '<small>' + esc(e.outros) + '</small>' : '')) +
      row('Website', e.url ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(host(e.url)) + ' ↗</a>' : '') +
      row('E-mail', e.email ? '<a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a>' : '') + '</div>' +
      (e.url ? '<a class="pde-btn" href="' + esc(e.url) + '" target="_blank" rel="noopener">Visitar o site ↗</a>' : '') + '</div>';
    $('[data-dlg]').hidden = false; document.documentElement.classList.add('pde-lock'); var x = $('.pde-x'); if (x) x.focus();
  }
  function fechar() { $('[data-dlg]').hidden = true; document.documentElement.classList.remove('pde-lock'); }

  mount.addEventListener('click', function (ev) {
    var t = ev.target;
    var d = t.closest('[data-dom]'); if (d) { var id = d.getAttribute('data-dom'), i = S.dom.indexOf(id); if (i > -1) S.dom.splice(i, 1); else S.dom.push(id); render(); return; }
    var u = t.closest('[data-undom]'); if (u) { S.dom = S.dom.filter(function (x) { return x !== u.getAttribute('data-undom'); }); render(); return; }
    var di = t.closest('[data-dist]'); if (di) { var k = di.getAttribute('data-dist'); S.dist = k && S.dist !== k ? k : null; render(); return; }
    if (t.closest('[data-clear]')) { S.dom = []; S.dist = null; S.q = ''; $('[data-q]').value = ''; render(); return; }
    var e = t.closest('[data-ent]'); if (e) { abrir(e.getAttribute('data-ent')); return; }
    if (t.closest('[data-close]')) fechar();
  });
  mount.addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest('.pde-pin')) { ev.preventDefault(); ev.target.closest('.pde-pin').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('[data-dlg]').hidden) fechar(); });
  var tq; $('[data-q]').addEventListener('input', function (ev) { clearTimeout(tq); var v = ev.target.value; tq = setTimeout(function () { S.q = v; render(); }, 160); });

  var dq = new URLSearchParams(location.search).get('dominio');
  fetch(BASE + 'dados/entidades.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    S.lista = (j.lista || []).sort(function (a, b) { return a.curto.localeCompare(b.curto, 'pt'); });
    if (dq) DOMS.forEach(function (d) { if (d.id === dq || norm(d.nome) === norm(dq)) S.dom = [d.id]; });
    render();
  }).catch(function () { $('[data-grid]').innerHTML = '<div class="pde-empty"><b>Não foi possível carregar as entidades.</b><span>Tente novamente dentro de alguns minutos.</span></div>'; });
})();
