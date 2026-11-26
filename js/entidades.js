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

  var S = { lista: [], dom: [], dist: null, q: '', soSel: false };
  var SK = 'idd-entidades-selecao', OK = 'idd-entidades-catalogo', SEL = {}, OPT = { num: true, grp: true, idx: true };
  try { (JSON.parse(localStorage.getItem(SK) || '[]') || []).forEach(function (x) { SEL[x] = 1; }); } catch (e) {}
  try { var oo = JSON.parse(localStorage.getItem(OK) || 'null'); if (oo) OPT = oo; } catch (e) {}
  function guarda() { try { localStorage.setItem(SK, JSON.stringify(Object.keys(SEL))); } catch (e) {} }
  var MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function hoje() { var d = new Date(); return d.getDate() + ' de ' + MES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function dnomes(e) { return e.dominios.map(function (d) { var x = DOMS.filter(function (y) { return y.id === d; })[0]; return x ? x.nome : ''; }).filter(Boolean); }

  mount.innerHTML =
    '<div class="pde-doms" data-doms></div>' +
    '<div class="pde-bar"><label class="pde-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Pesquisar por nome, setor ou concelho" data-q aria-label="Pesquisar entidades"></label><div class="pde-act" data-act></div><span class="pde-res"><span data-res></span><button type="button" class="pde-lnk" data-pickall></button></span></div>' +
    '<div class="pde-grid" data-grid><div class="pde-sk"></div><div class="pde-sk"></div><div class="pde-sk"></div></div>' +
    '<div class="pde-map-wrap"><div class="pde-map" data-map></div><div class="pde-panel" data-panel></div></div>' +
    '<div class="pde-selbar" data-selbar hidden><div><b data-seltot></b><small data-selsub></small></div><div class="pde-selbar-a"><button type="button" class="pde-sb-l" data-selview></button><button type="button" class="pde-sb-l" data-selclear>Limpar seleção</button><button type="button" class="pde-sb-p" data-pdf>Catálogo PDF</button></div></div>' +
    '<div class="pde-dlg" data-opts hidden><div class="pde-dlg-bg" data-oclose></div><div class="pde-dlg-in pde-op-in" role="dialog" aria-modal="true"><button type="button" class="pde-x pde-x-d" data-oclose aria-label="Fechar">×</button>' +
      '<div class="pde-op"><span class="pde-eb">Catálogo PDF</span><h3>O que quer incluir?</h3><p data-optxt></p>' +
      '<label class="pde-ck"><input type="checkbox" data-o="num"><span><b>Números da indústria de Defesa</b><small>Entidades, volume de negócios, exportações e trabalhadores</small></span></label>' +
      '<label class="pde-ck"><input type="checkbox" data-o="grp"><span><b>Grupo idD</b><small>Números do grupo e empresas participadas</small></span></label>' +
      '<label class="pde-ck"><input type="checkbox" data-o="idx"><span><b>Índice</b><small>Lista das entidades com ligação para cada ficha</small></span></label>' +
      '<p class="pde-op-n">O catálogo inclui sempre a capa, as fichas das entidades selecionadas e a contracapa. Na janela de impressão escolha "Guardar como PDF" e ative "Gráficos de fundo".</p>' +
      '<button type="button" class="pde-btn pde-btn-w" data-go>Gerar catálogo PDF</button></div></div></div>' +
    '<div class="pde-dlg" data-dlg hidden><div class="pde-dlg-bg" data-close></div><div class="pde-dlg-in" role="dialog" aria-modal="true"><button type="button" class="pde-x" data-close aria-label="Fechar">×</button><div data-body></div></div></div>';
  var $ = function (s) { return mount.querySelector(s); };

  function filtradas(semDist) {
    return S.lista.filter(function (e) {
      return (!S.soSel || SEL[e.id]) && (!S.dom.length || S.dom.some(function (d) { return e.dominios.indexOf(d) > -1; })) &&
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
    var on = SEL[e.id];
    return '<div class="pde-cw' + (on ? ' pde-picked' : '') + '"><button type="button" class="pde-pick' + (on ? ' pde-on' : '') + '" data-pick="' + e.id + '" aria-pressed="' + !!on + '">' + (on ? '✓ Selecionada' : '+ Selecionar') + '</button><button type="button" class="pde-c" data-ent="' + e.id + '"><span class="pde-ph"' + (e.foto ? ' style="background-image:url(\'' + BASE + 'assets/' + esc(e.foto) + '\')"' : '') + '><span class="pde-gr">Grupo idD · ' + pct(e.pctIdD) + '</span></span>' +
      '<span class="pde-cb">' + logoBox(e) + '<span class="pde-tg">' + esc(e.tag) + '</span><b>' + esc(e.curto) + '</b><small>' + esc(e.resumo) + '</small>' +
      '<span class="pde-meta"><span>' + esc(e.concelho) + ', ' + esc(e.distrito) + '</span>' + (dn.length ? '<span>' + esc(dn.join(' · ')) + '</span>' : '') + '</span></span></button></div>';
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
    var falta = L.filter(function (e) { return !SEL[e.id]; }).length, pa = $('[data-pickall]');
    pa.hidden = !L.length || S.soSel; pa.disabled = !falta; pa.textContent = falta ? '+ Selecionar todas (' + L.length + ')' : '✓ Todas selecionadas';
    var ns = S.lista.filter(function (e) { return SEL[e.id]; });
    $('[data-selbar]').hidden = !ns.length && !S.soSel;
    $('[data-seltot]').textContent = 'A minha seleção · ' + n(ns.length);
    var dc = {}; ns.forEach(function (e) { dnomes(e).forEach(function (d) { dc[d] = (dc[d] || 0) + 1; }); });
    $('[data-selsub]').textContent = Object.keys(dc).map(function (d) { return d + ' ' + dc[d]; }).join(' · ');
    $('[data-selview]').textContent = S.soSel ? 'Ver todas' : 'Ver só a seleção';
    $('[data-pdf]').textContent = 'Catálogo PDF (' + ns.length + ')'; $('[data-pdf]').disabled = !ns.length;
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
  function abreOpcoes() {
    var k = S.lista.filter(function (e) { return SEL[e.id]; }).length; if (!k) return;
    $('[data-optxt]').textContent = n(k) + (k === 1 ? ' selecionada.' : ' selecionadas.');
    Array.prototype.forEach.call(mount.querySelectorAll('[data-o]'), function (c) { c.checked = OPT[c.getAttribute('data-o')] !== false; });
    $('[data-opts]').hidden = false; document.documentElement.classList.add('pde-lock');
  }

  /* ---------- catálogo PDF ---------- */
  var RODAPE = null;
  function rodape() {
    if (RODAPE) return Promise.resolve(RODAPE);
    return fetch(BASE + 'assets/logo-idd-rodape.svg').then(function (r) { return r.text(); }).then(function (t) { RODAPE = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t))); return RODAPE; }).catch(function () { return ''; });
  }
  var NUM = [['444', '', 'Entidades', 'Empresas e instituições de I&D e ensino, em 47 setores de atividade'], ['10,97', 'mil M€', 'Volume de negócios', 'Vendas somadas das empresas, das quais 4,39 mil M€ para a Defesa'], ['3,31', 'mil M€', 'Exportações', 'Cerca de 30% do volume de negócios; mais do que duplicaram desde 2012'], ['54.184', '', 'Trabalhadores', 'Mão de obra qualificada, com forte base em engenharia']];
  var GRP = [['8', '', 'Empresas'], ['440', 'M€', 'Volume de negócios'], ['3.000', '', 'Colaboradores'], ['350', 'M€', 'Exportações']];
  function catalogo() {
    var L = S.lista.filter(function (e) { return SEL[e.id]; }).sort(function (a, b) { return a.curto.localeCompare(b.curto, 'pt'); }); if (!L.length) return;
    var IMG = function (p) { return BASE + 'assets/' + p; }, logo = function (e) { return e.logo ? '<img src="' + IMG(e.logo) + '" alt="">' : '<i>' + esc(e.curto.slice(0, 2)) + '</i>'; };
    var dc = {}, dist = {}; L.forEach(function (e) { dnomes(e).forEach(function (d) { dc[d] = (dc[d] || 0) + 1; }); dist[e.distrito] = 1; });
    var filtros = S.dom.map(function (d) { return DOMS.filter(function (y) { return y.id === d; })[0].nome; }).concat(S.dist ? [S.dist] : []);
    var h = '<section class="pec-cv"><div class="pec-in"><img class="pec-logo" src="' + IMG('logo-idd-white.png') + '" alt="idD Portugal Defence">' +
      '<div class="pec-mid"><span class="pec-eb">Catálogo · ' + new Date().getFullYear() + '</span><h1>Indústria de Defesa <b>portuguesa</b></h1>' +
      '<div class="pec-sel"><b>' + (L.length === 1 ? '1 entidade selecionada' : L.length + ' entidades selecionadas') + '</b>' + (filtros.length ? '<small>Filtros: ' + esc(filtros.join(' · ')) + '</small>' : '') +
      '<div class="pec-chips">' + Object.keys(dc).map(function (d) { return '<span>' + esc(d) + ' · ' + dc[d] + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="pec-ft"><div class="pec-st"><div><b>' + L.length + '</b><span>Entidades</span></div><div><b>' + Object.keys(dc).length + '</b><span>Domínios</span></div><div><b>' + Object.keys(dist).length + '</b><span>Distritos</span></div></div>' +
      '<div class="pec-bt"><span>' + hoje() + '</span><span>www.iddportugal.pt</span></div></div></div></section>';
    if (OPT.num) h += '<section class="pec-dk"><div class="pec-in"><span class="pec-eb">Indústria de Defesa portuguesa</span><h2>Os números da <b>indústria de Defesa</b></h2>' +
      '<p class="pec-lead">Empresas, universidades e centros de I&amp;D que intervêm em todo o ciclo de vida dos sistemas de defesa, da conceção ao apoio, integrados em cadeias de abastecimento globais.</p>' +
      '<div class="pec-kp">' + NUM.map(function (k) { return '<div><b>' + k[0] + (k[1] ? '<small> ' + k[1] + '</small>' : '') + '</b><h3>' + k[2] + '</h3><p>' + k[3] + '</p></div>'; }).join('') + '</div>' +
      '<div class="pec-dm">' + DOMS.map(function (d) { return '<span>' + svg(d.ic) + d.nome + '</span>'; }).join('') + '</div>' +
      '<p class="pec-src">Dados atualizados em março de 2026 · Fontes: idD, INFORMA, IES, INE e Banco de Portugal</p></div></section>';
    if (OPT.grp) {
      var P = S.lista.slice().sort(function (a, b) { return b.pctIdD - a.pctIdD; });
      h += '<section class="pec-gp"><span class="pec-eb2">Grupo idD Portugal</span><h2>O grupo <b>em números</b></h2><p class="pec-lead2">Dados de 2025 do grupo idD Portugal Defence.</p>' +
        '<div class="pec-gn">' + GRP.map(function (k) { return '<div><b>' + k[0] + (k[1] ? '<small> ' + k[1] + '</small>' : '') + '</b><span>' + k[2] + '</span></div>'; }).join('') + '</div>' +
        '<h3 class="pec-gh">Empresas <b>participadas</b></h3><div class="pec-gc">' + P.map(function (e) {
          return '<div class="pec-pc"><span class="pec-ph"' + (e.foto ? ' style="background-image:url(\'' + IMG(e.foto) + '\')"' : '') + '></span><div class="pec-pb"><span class="pec-tg">' + esc(e.tag) + '</span><b>' + esc(e.curto) + '</b><small>' + esc(e.resumo) + '</small>' +
            '<span class="pec-bar"><i><em style="width:' + e.pctIdD + '%"></em></i>' + pct(e.pctIdD) + '</span>' + (e.outros ? '<span class="pec-ot">' + esc(e.outros) + '</span>' : '') + '</div></div>'; }).join('') + '</div></section>';
    }
    if (OPT.idx) h += '<section class="pec-ix"><span class="pec-eb2">Índice</span><h2>Entidades <b>selecionadas</b></h2><div class="pec-ih"><span>N.º</span><span>Entidade</span><span>Localização</span></div>' +
      L.map(function (e, i) { return '<a class="pec-ir" href="#pec-' + e.id + '"><i>' + ('0' + (i + 1)).slice(-2) + '</i><span><b>' + esc(e.nome) + '</b><small>' + esc(dnomes(e).join(' · ') || e.tag) + '</small></span><em>' + esc(e.concelho) + '</em></a>'; }).join('') + '</section>';
    h += '<section class="pec-ls">' + L.map(function (e, i) {
      var kv = function (l, v) { return v ? '<dt>' + l + '</dt><dd>' + v + '</dd>' : ''; };
      return '<article class="pec-f" id="pec-' + e.id + '">' + (e.foto ? '<div class="pec-fp" style="background-image:url(\'' + IMG(e.foto) + '\')"></div>' : '') +
        '<div class="pec-fb"><aside><span class="pec-lg">' + logo(e) + '</span><dl>' + kv('Localização', esc(e.concelho + ', ' + e.distrito)) + kv('Website', e.url ? '<a href="' + esc(e.url) + '">' + esc(host(e.url)) + '</a>' : '') +
        kv('E-mail', e.email ? '<a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a>' : '') + kv('Participação da idD', pct(e.pctIdD) + (e.outros ? '<small>' + esc(e.outros) + '</small>' : '')) + '</dl></aside>' +
        '<div class="pec-fm"><span class="pec-n">' + ('0' + (i + 1)).slice(-2) + '</span><div class="pec-tags">' + dnomes(e).map(function (d) { return '<span class="pec-d">' + esc(d) + '</span>'; }).join('') + e.setores.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
        '<h3>' + esc(e.nome) + '</h3><p>' + esc(e.descricao || e.resumo) + '</p></div></div></article>'; }).join('') + '</section>';
    h += '<section class="pec-cb"><div class="pec-in pec-in-b"><img class="pec-logo" src="' + IMG('logo-idd-white.png') + '" alt="idD Portugal Defence"><span class="pec-eb">idD Portugal Defence</span><h2>Ao serviço da <b>indústria de Defesa Nacional</b></h2>' +
      '<p>A idD promove a indústria de Defesa portuguesa, aproxima as empresas das Forças Armadas, da NATO e da UE e apoia a sua internacionalização.</p>' +
      '<div class="pec-cl"><a href="https://www.iddportugal.pt/">www.iddportugal.pt</a><a href="mailto:geral@iddportugal.pt">geral@iddportugal.pt</a></div><small>Catálogo gerado a ' + hoje() + '.</small></div></section>';
    var box = document.getElementById('pde-print'); if (!box) { box = document.createElement('div'); box.id = 'pde-print'; document.body.appendChild(box); }
    box.innerHTML = h;
    var imgs = Array.prototype.slice.call(box.querySelectorAll('img')), bgs = [];
    Array.prototype.forEach.call(box.querySelectorAll('[style*="background-image"]'), function (el) { var m = el.getAttribute('style').match(/url\('([^']+)'\)/); if (m) bgs.push(m[1]); });
    var espera = imgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.onload = im.onerror = r; }); }).concat(bgs.map(function (u) { return new Promise(function (r) { var i2 = new Image(); i2.onload = i2.onerror = r; i2.src = u; }); }));
    Promise.all([rodape()].concat(espera)).then(function (res) {
      var lg = res[0], st = document.getElementById('pde-print-st');
      if (!st) { st = document.createElement('style'); st.id = 'pde-print-st'; document.head.appendChild(st); }
      st.textContent = '@page{size:A4;margin:16mm 15mm 18mm;' + (lg ? '@bottom-left{content:url("' + lg + '");vertical-align:middle}' : '') + '@bottom-center{content:"Indústria de Defesa portuguesa · catálogo idD · ' + hoje() + '";font:500 6.5pt Montserrat,Arial,sans-serif;color:#8a978d;vertical-align:middle}@bottom-right{content:counter(page);font:600 8pt Montserrat,Arial,sans-serif;color:#5d6b61;vertical-align:middle}}@page pecdk{margin:0;@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}}';
      if (lg) { var pre = new Image(); pre.className = 'pec-pre'; pre.src = lg; box.insertBefore(pre, box.firstChild); }
      document.body.classList.add('pde-printing');
      var tit = document.title; document.title = 'Indústria de Defesa · catálogo idD · ' + new Date().toISOString().slice(0, 10);
      var fim = function () { document.body.classList.remove('pde-printing'); document.title = tit; window.removeEventListener('afterprint', fim); };
      window.addEventListener('afterprint', fim);
      setTimeout(function () { window.print(); }, 250);
    });
  }
  function fechar() { $('[data-dlg]').hidden = true; document.documentElement.classList.remove('pde-lock'); }

  mount.addEventListener('click', function (ev) {
    var t = ev.target;
    var d = t.closest('[data-dom]'); if (d) { var id = d.getAttribute('data-dom'), i = S.dom.indexOf(id); if (i > -1) S.dom.splice(i, 1); else S.dom.push(id); render(); return; }
    var u = t.closest('[data-undom]'); if (u) { S.dom = S.dom.filter(function (x) { return x !== u.getAttribute('data-undom'); }); render(); return; }
    var di = t.closest('[data-dist]'); if (di) { var k = di.getAttribute('data-dist'); S.dist = k && S.dist !== k ? k : null; render(); return; }
    if (t.closest('[data-clear]')) { S.dom = []; S.dist = null; S.q = ''; $('[data-q]').value = ''; render(); return; }
    var pk = t.closest('[data-pick]'); if (pk) { var pid = pk.getAttribute('data-pick'); if (SEL[pid]) delete SEL[pid]; else SEL[pid] = 1; guarda(); render(); return; }
    if (t.closest('[data-pickall]')) { filtradas().forEach(function (x) { SEL[x.id] = 1; }); guarda(); render(); return; }
    if (t.closest('[data-selclear]')) { SEL = {}; S.soSel = false; guarda(); render(); return; }
    if (t.closest('[data-selview]')) { S.soSel = !S.soSel; render(); return; }
    if (t.closest('[data-pdf]')) { abreOpcoes(); return; }
    if (t.closest('[data-oclose]')) { $('[data-opts]').hidden = true; document.documentElement.classList.remove('pde-lock'); return; }
    if (t.closest('[data-go]')) { Array.prototype.forEach.call(mount.querySelectorAll('[data-o]'), function (c) { OPT[c.getAttribute('data-o')] = c.checked; }); try { localStorage.setItem(OK, JSON.stringify(OPT)); } catch (er) {} $('[data-opts]').hidden = true; document.documentElement.classList.remove('pde-lock'); catalogo(); return; }
    var e = t.closest('[data-ent]'); if (e) { abrir(e.getAttribute('data-ent')); return; }
    if (t.closest('[data-close]')) fechar();
  });
  mount.addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest('.pde-pin')) { ev.preventDefault(); ev.target.closest('.pde-pin').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('keydown', function (ev) { if (ev.key !== 'Escape') return; if (!$('[data-dlg]').hidden) fechar(); if (!$('[data-opts]').hidden) { $('[data-opts]').hidden = true; document.documentElement.classList.remove('pde-lock'); } });
  var tq; $('[data-q]').addEventListener('input', function (ev) { clearTimeout(tq); var v = ev.target.value; tq = setTimeout(function () { S.q = v; render(); }, 160); });

  var dq = new URLSearchParams(location.search).get('dominio');
  fetch(BASE + 'dados/entidades.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    S.lista = (j.lista || []).sort(function (a, b) { return a.curto.localeCompare(b.curto, 'pt'); });
    if (dq) DOMS.forEach(function (d) { if (d.id === dq || norm(d.nome) === norm(dq)) S.dom = [d.id]; });
    render();
  }).catch(function () { $('[data-grid]').innerHTML = '<div class="pde-empty"><b>Não foi possível carregar as entidades.</b><span>Tente novamente dentro de alguns minutos.</span></div>'; });
})();
