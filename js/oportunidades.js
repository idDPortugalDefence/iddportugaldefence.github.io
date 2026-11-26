/* Oportunidades na Defesa · site idD · lê dados/ do mesmo repositório */
(function () {
  'use strict';
  var mount = document.getElementById('pdx-app');
  if (!mount || mount.getAttribute('data-init')) return;
  mount.setAttribute('data-init', '1');
  var BASE = mount.getAttribute('data-base') || 'https://iddportugaldefence.github.io/dados/';
  var POR_PAG = 24;

  /* ---------- utilitários ---------- */
  var M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function d0(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dias(p) { return Math.round((d0(p) - d0(Date.now())) / 864e5); }
  function dfmt(p) { if (!p) return ''; var d = new Date(p); return isNaN(d) ? '' : d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear(); }
  function tfmt(p) { var d = new Date(p); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function quando(p) { return dfmt(p) + (String(p).slice(-8) === '23:59:00' ? '' : ', ' + tfmt(p)); }
  function aberta(o) { return o.prazo && new Date(o.prazo) >= Date.now(); }
  function money(v, m) { return v == null ? '' : (m === 'EUR' || !m ? eur.format(v) : v.toLocaleString('pt-PT') + ' ' + m); }
  function eurK(v) { return v >= 1e6 ? (v / 1e6).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + ' M€' : v >= 1e4 ? Math.round(v / 1e3).toLocaleString('pt-PT') + ' mil €' : eur.format(v); }
  function cap(s) { s = String(s || ''); return s === s.toUpperCase() && s.length > 6 ? s.charAt(0) + s.slice(1).toLowerCase() : s; }
  function novo(p) { return p && (Date.now() - new Date(p)) / 864e5 <= 3; }
  function prazoHtml(o) {
    var n = dias(o.prazo), cls = n <= 3 ? ' pdx-hot' : n <= 7 ? ' pdx-warm' : '';
    var t = n <= 0 ? 'Termina hoje' : n === 1 ? 'Termina amanhã' : 'Faltam ' + n + ' dias';
    return '<span class="pdx-dl' + cls + '"><b>' + t + '</b><small>' + esc(quando(o.prazo)) + '</small></span>';
  }
  function row(l, v) { return v ? '<div class="pdx-kv"><span>' + esc(l) + '</span><b>' + v + '</b></div>' : ''; }
  function match(q, campos) { if (!q) return true; var h = norm(campos.join(' ')); return norm(q).split(/\s+/).every(function (w) { return h.indexOf(w) > -1; }); }

  /* ---------- fontes ---------- */
  var NTIPO = { FBO: 'Oportunidade futura', RFP: 'Pedido de propostas', RFQ: 'Pedido de cotação', RFI: 'Pedido de informação', IFB: 'Convite para propostas', IFIB: 'Convite para propostas', NCP: 'Concurso NATO', NOI: 'Notificação de intenção', 'ICB / BOA+': 'Concurso internacional (BOA+)', RFIP: 'Pedido de informação' };
  var FONTES = {
    nacionais: {
      fich: 'oportunidades.json', nome: 'Nacionais', sub: 'Diário da República', cor: '#2c5e3b',
      ents: ['EMGFA', 'Marinha', 'Exército', 'Força Aérea'], ent: function (o) { return o.emitente; },
      ordens: [['recentes', 'Mais recentes'], ['prazo', 'Prazo mais próximo'], ['valor', 'Maior valor']],
      ordenar: function (L, s) { if (s === 'prazo') L.sort(function (a, b) { return a.prazo.localeCompare(b.prazo); }); else if (s === 'valor') L.sort(function (a, b) { return (b.preco || 0) - (a.preco || 0); }); else L.sort(function (a, b) { return String(b.enviado || '').localeCompare(String(a.enviado || '')); }); },
      pesquisa: function (o) { return [o.titulo, o.emitente, o.emitenteNome, o.servico, o.cpv, o.ref, o.id, o.distrito, o.concelho, o.tipoContr]; },
      cartao: function (o) {
        var local = [o.concelho, o.distrito].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(', ');
        return { tag: o.emitente, extra: novo(o.enviado) ? 'Novo' : '', ref: 'Anúncio n.º ' + o.id, titulo: o.titulo,
          meta: [o.cpv ? (o.cpv.split(' · ')[1] || o.cpv) : '', local || 'Vários locais', o.lotes ? o.lotes + ' lotes' : ''],
          valL: o.precoTipo === 'estimado' ? 'Preço estimado' : 'Preço base', val: o.preco != null ? eur.format(o.preco) : '—' };
      },
      detalhe: function (o) {
        return { tag: o.emitenteNome, titulo: o.titulo, texto: o.desc,
          valL: (o.precoTipo === 'estimado' ? 'Preço estimado' : 'Preço base') + ' (s/IVA)', val: o.preco != null ? eur.format(o.preco) : '—',
          linhas: row('Anúncio', 'n.º ' + esc(o.id)) + row('Enviado para publicação', esc(dfmt(o.enviado))) + row('Serviço', esc(o.servico)) + row('Referência interna', esc(o.ref)) +
            row('Tipo de procedimento', esc(o.tipoProc)) + row('Tipo de contrato', esc(o.tipoContr)) + row('CPV', esc(o.cpv)) + row('Lotes', o.lotes ? String(o.lotes) : '') +
            row('Local de execução', esc([o.localidade, o.concelho, o.distrito].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(', ') || 'Vários locais')) +
            row('Prazo de execução', esc(String(o.execucao || '').toLowerCase())) + row('Plataforma eletrónica', esc(o.plataforma)) + row('Fundos UE', o.fundosUE ? 'Sim' : ''),
          botao: 'Ver anúncio no Diário da República', nota: '' };
      }
    },
    nato: {
      fich: 'nato.json', nome: 'NATO', sub: 'Agências da NATO', cor: '#004b87',
      ents: ['NSPA', 'NCIA', 'NATO HQ', 'ACO', 'ACT'], ent: function (o) { return o.entidade; },
      ordens: [['recentes', 'Mais recentes'], ['prazo', 'Prazo mais próximo'], ['valor', 'Maior valor']],
      ordenar: function (L, s) { if (s === 'prazo') L.sort(function (a, b) { return a.prazo.localeCompare(b.prazo); }); else if (s === 'valor') L.sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); }); else L.sort(function (a, b) { return String(b.nopo || '').localeCompare(String(a.nopo || '')); }); },
      pesquisa: function (o) { return [o.titulo, o.ref, o.tipo, NTIPO[o.tipo], o.entidade, o.entidadeNome]; },
      cartao: function (o) {
        return { tag: o.entidade, extra: novo(o.nopo) ? 'Novo' : '', ref: o.ref, titulo: cap(o.titulo),
          meta: [o.tipo + (NTIPO[o.tipo] ? ' · ' + NTIPO[o.tipo] : '')],
          valL: o.valor != null ? 'Valor estimado' : 'Publicado', val: o.valor != null ? money(o.valor, o.moeda) : (o.nopo ? dfmt(o.nopo) : '—') };
      },
      detalhe: function (o) {
        var host = (String(o.link).match(/^https?:\/\/([^/]+)/) || [])[1] || '';
        var plat = /nspa/.test(host) ? 'portal da NSPA' : /ncia/.test(host) ? 'site da NCIA' : /act\.nato/.test(host) ? 'site do ACT' : /procureware/.test(host) ? 'portal do ACO' : /bonfire/.test(host) ? 'portal da NATO HQ' : 'site da entidade';
        return { tag: o.entidadeNome, titulo: cap(o.titulo), texto: '',
          valL: 'Valor estimado', val: o.valor != null ? money(o.valor, o.moeda) : '—',
          linhas: row('Referência', esc(o.ref)) + row('Tipo', esc(o.tipo + (NTIPO[o.tipo] ? ' · ' + NTIPO[o.tipo] : ''))) + row('Publicação (NOPO)', esc(dfmt(o.nopo))) +
            row('Lançamento previsto da solicitação', esc(dfmt(o.lancamento))) + row(o.prazoFBO ? 'Data indicada na oportunidade' : 'Fecho previsto da solicitação', esc(o.prazo ? quando(o.prazo) : '')) +
            row('Adjudicação prevista', esc(dfmt(o.adjudicacao))),
          botao: 'Ver no ' + plat,
          nota: 'A participação em concursos NATO está sujeita às regras de cada entidade, incluindo o registo na plataforma e a declaração de elegibilidade pelas autoridades nacionais. A idD pode ajudar neste processo.' };
      }
    },
    ue: {
      fich: 'ue.json', nome: 'UE', sub: 'FED e EDIP', cor: '#003399',
      ents: ['FED', 'EDIP'], ent: function (o) { return o.programa; }, entNome: { FED: 'Fundo Europeu de Defesa (FED)', EDIP: 'EDIP' },
      ordens: [['prazo', 'Prazo mais próximo'], ['valor', 'Maior orçamento'], ['recentes', 'Abertura mais recente']],
      ordenar: function (L, s) { if (s === 'valor') L.sort(function (a, b) { return (b.orcamento || 0) - (a.orcamento || 0); }); else if (s === 'recentes') L.sort(function (a, b) { return String(b.abertura || '').localeCompare(String(a.abertura || '')); }); else L.sort(function (a, b) { return a.prazo.localeCompare(b.prazo); }); },
      pesquisa: function (o) { return [o.titulo, o.concurso, o.id, o.call, o.programa, o.objetivo, o.tipoAcao]; },
      cartao: function (o) {
        return { tag: o.programa + (o.usi ? ' · Ucrânia (USI)' : ''), extra: o.estado === 'previsto' ? 'Previsto' : '', ref: o.id, titulo: o.titulo,
          meta: [o.tipoAcao ? o.tipoAcao.replace(/^EDF\s*/, '') : '', o.multi ? 'Várias datas de candidatura' : ''],
          valL: o.orcamento ? 'Orçamento indicativo' : 'Abertura', val: o.orcamento ? eurK(o.orcamento) : (o.abertura ? dfmt(o.abertura) : '—') };
      },
      detalhe: function (o) {
        var hoje = new Date().toISOString().slice(0, 10);
        return { tag: (o.programa === 'FED' ? 'Fundo Europeu de Defesa' : 'EDIP · Programa para a Indústria de Defesa') + (o.usi ? ' · Ucrânia (USI)' : ''), titulo: o.titulo, texto: o.concurso,
          valL: 'Orçamento indicativo', val: o.orcamento ? eur.format(o.orcamento) : '—',
          obj: o.objetivo ? o.objetivo + (o.objetivo.length >= 600 ? '…' : '') : '',
          linhas: row('Código do tópico', esc(o.id)) + row('Concurso', esc(o.call)) + row('Tipo de ação', esc(o.tipoAcao)) + row('Abertura', esc(dfmt(o.abertura))) +
            row(o.multi ? 'Datas de candidatura' : 'Prazo de candidatura', esc((o.prazos || []).map(function (d) { return dfmt(d + 'T12:00:00') + (d < hoje ? ' (passou)' : ''); }).join(' · '))),
          botao: 'Ver no portal Funding & Tenders', nota: '' };
      }
    }
  };
  var ORDEM = ['nacionais', 'nato', 'ue'];

  /* ---------- estado ---------- */
  var S = { tab: 'nacionais', dados: {}, gerado: {}, f: {} };
  ORDEM.forEach(function (k) { S.f[k] = { ent: '', q: '', sort: FONTES[k].ordens[0][0], n: POR_PAG }; S.dados[k] = null; });
  var h0 = (location.hash || '').replace('#', '');
  if (FONTES[h0]) S.tab = h0;

  /* ---------- estrutura ---------- */
  mount.innerHTML =
    '<div class="pdx-tabs" role="tablist">' + ORDEM.map(function (k) { var F = FONTES[k]; return '<button type="button" role="tab" class="pdx-tab" data-tab="' + k + '" style="--c:' + F.cor + '"><b>' + F.nome + '</b><small>' + F.sub + '</small><i data-cnt="' + k + '">…</i></button>'; }).join('') + '</div>' +
    '<div class="pdx-bar"><div class="pdx-chips" data-chips></div><div class="pdx-tools"><label class="pdx-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Pesquisar por palavra, referência, CPV…" data-q aria-label="Pesquisar"></label><select data-sort aria-label="Ordenar"></select></div></div>' +
    '<div class="pdx-info"><span data-res></span><span data-upd></span></div>' +
    '<div class="pdx-list" data-list></div>' +
    '<div class="pdx-more"><button type="button" class="pdx-btn pdx-btn-o" data-more hidden>Mostrar mais</button></div>' +
    '<div class="pdx-dlg" data-dlg hidden><div class="pdx-dlg-bg" data-close></div><div class="pdx-dlg-in" role="dialog" aria-modal="true"><button type="button" class="pdx-x" data-close aria-label="Fechar">×</button><div data-body></div></div></div>';
  var $ = function (s) { return mount.querySelector(s); };

  /* ---------- desenho ---------- */
  function cartao(k, o, i) {
    var c = FONTES[k].cartao(o);
    return '<article class="pdx-op" style="--c:' + FONTES[k].cor + '"><button type="button" class="pdx-op-b" data-open="' + i + '">' +
      '<span class="pdx-top"><span class="pdx-tag">' + esc(c.tag) + '</span>' + (c.extra ? '<span class="pdx-new">' + esc(c.extra) + '</span>' : '') + '<span class="pdx-ref">' + esc(c.ref) + '</span></span>' +
      '<span class="pdx-t">' + esc(c.titulo) + '</span>' +
      '<span class="pdx-meta">' + c.meta.filter(Boolean).map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</span>' +
      '<span class="pdx-foot"><span class="pdx-val"><small>' + esc(c.valL) + '</small><b>' + esc(c.val) + '</b></span>' + prazoHtml(o) + '</span></button></article>';
  }
  var ATUAL = [];
  function lista(k) {
    var F = FONTES[k], f = S.f[k], todos = (S.dados[k] || []).filter(aberta);
    return todos.filter(function (o) { return (!f.ent || F.ent(o) === f.ent) && match(f.q, F.pesquisa(o)); });
  }
  function render() {
    var k = S.tab, F = FONTES[k], f = S.f[k];
    mount.style.setProperty('--c', F.cor);
    Array.prototype.forEach.call(mount.querySelectorAll('[data-tab]'), function (b) { var on = b.getAttribute('data-tab') === k; b.classList.toggle('pdx-on', on); b.setAttribute('aria-selected', on); });
    $('[data-q]').value = f.q;
    $('[data-sort]').innerHTML = F.ordens.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.sort ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    if (!S.dados[k]) {
      $('[data-chips]').innerHTML = ''; $('[data-res]').textContent = ''; $('[data-more]').hidden = true;
      $('[data-list]').innerHTML = S.dados[k] === false ? '<div class="pdx-empty"><b>Não foi possível carregar as oportunidades.</b><span>Tente novamente dentro de alguns minutos.</span></div>' : '<div class="pdx-sk"></div><div class="pdx-sk"></div><div class="pdx-sk"></div><div class="pdx-sk"></div>';
      return;
    }
    var abertas = S.dados[k].filter(aberta);
    $('[data-chips]').innerHTML = '<button type="button" class="pdx-chip' + (!f.ent ? ' pdx-on' : '') + '" data-ent="">Todas <i>' + abertas.length + '</i></button>' +
      F.ents.map(function (e) { var n = abertas.filter(function (o) { return F.ent(o) === e; }).length; return '<button type="button" class="pdx-chip' + (f.ent === e ? ' pdx-on' : '') + '" data-ent="' + esc(e) + '">' + esc((F.entNome && F.entNome[e]) || e) + ' <i>' + n + '</i></button>'; }).join('');
    var L = lista(k); F.ordenar(L, f.sort); ATUAL = L;
    $('[data-res]').textContent = L.length === 1 ? '1 oportunidade em aberto' : L.length + ' oportunidades em aberto';
    var g = S.gerado[k]; $('[data-upd]').textContent = g ? 'Atualizado a ' + new Date(g).toLocaleDateString('pt-PT') + ', ' + tfmt(g) : '';
    $('[data-list]').innerHTML = L.length ? L.slice(0, f.n).map(function (o, i) { return cartao(k, o, i); }).join('') :
      '<div class="pdx-empty"><b>Sem oportunidades em aberto com estes critérios.</b><span>' + (k === 'ue' && f.ent === 'FED' ? 'Os concursos do FED abrem uma vez por ano, quando é aprovado o programa de trabalho.' : 'Experimente limpar os filtros ou a pesquisa.') + '</span></div>';
    $('[data-more]').hidden = L.length <= f.n;
  }
  function abrir(i) {
    var k = S.tab, o = ATUAL[i]; if (!o) return; var D = FONTES[k].detalhe(o);
    $('[data-body]').innerHTML = '<div class="pdx-dh" style="--c:' + FONTES[k].cor + '"><span class="pdx-tag">' + esc(D.tag) + '</span><h2>' + esc(D.titulo) + '</h2>' + (D.texto ? '<p>' + esc(D.texto) + '</p>' : '') + '</div>' +
      '<div class="pdx-dg"><div><small>' + esc(D.valL) + '</small><b>' + esc(D.val) + '</b></div><div>' + prazoHtml(o) + '</div></div>' +
      (D.obj ? '<div class="pdx-obj"><span>Objetivo (texto original)</span><p>' + esc(D.obj) + '</p></div>' : '') +
      '<div class="pdx-kvs">' + D.linhas + '</div>' +
      '<div class="pdx-acts"><a class="pdx-btn" href="' + esc(o.link) + '" target="_blank" rel="noopener">' + esc(D.botao) + ' ↗</a></div>' +
      (D.nota ? '<p class="pdx-nota">' + esc(D.nota) + '</p>' : '');
    $('[data-dlg]').hidden = false; document.documentElement.classList.add('pdx-lock');
    var x = $('.pdx-x'); if (x) x.focus();
  }
  function fechar() { $('[data-dlg]').hidden = true; document.documentElement.classList.remove('pdx-lock'); }

  /* ---------- eventos ---------- */
  mount.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'); if (t) { S.tab = t.getAttribute('data-tab'); if (history.replaceState) history.replaceState(null, '', '#' + S.tab); render(); return; }
    var c = e.target.closest('[data-ent]'); if (c) { var f = S.f[S.tab]; f.ent = c.getAttribute('data-ent'); f.n = POR_PAG; render(); return; }
    var o = e.target.closest('[data-open]'); if (o) { abrir(+o.getAttribute('data-open')); return; }
    if (e.target.closest('[data-more]')) { S.f[S.tab].n += POR_PAG; render(); return; }
    if (e.target.closest('[data-close]')) fechar();
  });
  var tq; $('[data-q]').addEventListener('input', function (e) { clearTimeout(tq); var v = e.target.value; tq = setTimeout(function () { var f = S.f[S.tab]; f.q = v; f.n = POR_PAG; render(); }, 180); });
  $('[data-sort]').addEventListener('change', function (e) { S.f[S.tab].sort = e.target.value; render(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('[data-dlg]').hidden) fechar(); });
  window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (FONTES[h]) { S.tab = h; render(); mount.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  /* ---------- dados ---------- */
  render();
  ORDEM.forEach(function (k) {
    fetch(BASE + FONTES[k].fich, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      S.dados[k] = j.lista || []; S.gerado[k] = j.gerado;
      var el = mount.querySelector('[data-cnt="' + k + '"]'); if (el) el.textContent = S.dados[k].filter(aberta).length;
      if (k === S.tab) render();
    }).catch(function () { S.dados[k] = false; var el = mount.querySelector('[data-cnt="' + k + '"]'); if (el) el.textContent = '–'; if (k === S.tab) render(); });
  });
  if (FONTES[h0]) setTimeout(function () { mount.scrollIntoView({ block: 'start' }); }, 300);
})();
