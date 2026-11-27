/* Oportunidades na Defesa · site idD · lê dados/ do mesmo repositório */
(function () {
  'use strict';
  var mount = document.getElementById('pdx-app');
  if (!mount || mount.getAttribute('data-init')) return;
  mount.setAttribute('data-init', '1');
  var BASE = mount.getAttribute('data-base') || 'https://iddportugaldefence.github.io/dados/';
  var ASSETS = mount.getAttribute('data-assets') || BASE.replace(/dados\/$/, 'assets/');
  var POR_PAG = 24;

  /* ---------- utilitários ---------- */
  var MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
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
  var NTIPO = { FBO: 'Oportunidade futura', RFP: 'Pedido de propostas', RFQ: 'Pedido de cotação', RFI: 'Pedido de informação', IFB: 'Convite para propostas', IFIB: 'Convite para propostas', NCP: 'Concurso NATO', NOI: 'Notificação de intenção', 'ICB / BOA+': 'Concurso internacional (BOA+)', RFIP: 'Pedido de informação', SP: 'Procedimento simplificado', NPO: 'Notificação de oportunidade' };
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
  var SK = 'idd-oportunidades-selecao', SEL = {};
  try { (JSON.parse(localStorage.getItem(SK) || '[]') || []).forEach(function (x) { SEL[x] = 1; }); } catch (e) {}
  function guardaSel() { try { localStorage.setItem(SK, JSON.stringify(Object.keys(SEL))); } catch (e) {} }
  function chave(k, o) { return k + '|' + o.id; }
  function selN() { var n = { total: 0 }; ORDEM.forEach(function (k) { n[k] = (S.dados[k] || []).filter(function (o) { return SEL[chave(k, o)]; }).length; n.total += n[k]; }); return n; }
  function selLista(k) { return (S.dados[k] || []).filter(function (o) { return SEL[chave(k, o)]; }); }
  S.soSel = false;
  var NK = 'idd-oportunidades-notas', NOTAS = {};
  try { NOTAS = JSON.parse(localStorage.getItem(NK) || '{}') || {}; } catch (e) {}
  function guardaNotas() { try { localStorage.setItem(NK, JSON.stringify(NOTAS)); } catch (e) {} }
  var COMO = {
    nacionais: ['Os procedimentos decorrem na plataforma eletrónica indicada em cada anúncio (por exemplo ACIN ou Vortal). É necessário registo da empresa na plataforma e certificado de assinatura digital qualificada.',
      'As peças do procedimento (programa e caderno de encargos) estão na plataforma. Os pedidos de esclarecimento têm prazo próprio, mais curto do que o das propostas.',
      'Antes de concorrer, tenha em dia os documentos de habilitação: declarações de não dívida às Finanças e à Segurança Social, registo criminal e certidão permanente.',
      'Alguns contratos exigem credenciação de segurança (Gabinete Nacional de Segurança) ou licenciamento para bens e tecnologias militares.'],
    nato: ['Registo obrigatório no portal de cada entidade: eProcurement da NSPA, Neo eProcurement da NCIA, portal de fornecedores do ACO e portal da NATO HQ. O ACT recebe propostas por e-mail ou correio.',
      'Muitos concursos, por exemplo na NSPA, exigem uma Declaração de Elegibilidade (DoE), emitida pelo Ministério da Defesa Nacional a pedido da empresa.',
      'Para a DoE, a empresa deve ter credenciação de segurança (Gabinete Nacional de Segurança) e licenciamento para bens e tecnologias militares.',
      'O registo na idD como entidade da indústria de Defesa é um dos passos do processo. A idD esclarece dúvidas e apoia as candidaturas.'],
    ue: ['As candidaturas são submetidas no portal Funding & Tenders da Comissão Europeia, com registo prévio da entidade (código PIC).',
      'No Fundo Europeu de Defesa, a candidatura é feita em consórcio: em regra, pelo menos 3 entidades independentes de 3 Estados-Membros da UE ou países associados. Nos concursos de tecnologias disruptivas podem bastar 2.',
      'Os beneficiários e subcontratados têm de estar estabelecidos na UE ou em país associado, com a gestão executiva aí sediada. Há regras próprias para entidades controladas por países terceiros.',
      'Cada concurso tem condições próprias, incluindo os do EDIP: confirme sempre o documento do concurso. A idD pode ajudar a encontrar parceiros portugueses.']
  };
  var GUIA_NATO = 'https://www.iddportugal.pt/wp-content/uploads/2023/07/Guia-Aquisicao-NATO-2023.pdf';
  var h0 = (location.hash || '').replace('#', '');
  if (FONTES[h0]) S.tab = h0;

  /* ---------- estrutura ---------- */
  mount.innerHTML =
    '<div class="pdx-tabs" role="tablist">' + ORDEM.map(function (k) { var F = FONTES[k]; return '<button type="button" role="tab" class="pdx-tab" data-tab="' + k + '" style="--c:' + F.cor + '"><b>' + F.nome + '</b><small>' + F.sub + '</small><i data-cnt="' + k + '">…</i></button>'; }).join('') + '</div>' +
    '<div class="pdx-bar"><div class="pdx-chips" data-chips></div><div class="pdx-tools"><label class="pdx-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Pesquisar por palavra, referência, CPV…" data-q aria-label="Pesquisar"></label><select data-sort aria-label="Ordenar"></select></div></div>' +
    '<div class="pdx-info"><span><span data-res></span><button type="button" class="pdx-lnk" data-pickall></button></span><span data-upd></span></div>' +
    '<div class="pdx-list" data-list></div>' +
    '<div class="pdx-more"><button type="button" class="pdx-btn pdx-btn-o" data-more hidden>Mostrar mais</button></div>' +
    '<div class="pdx-selbar" data-selbar hidden><div class="pdx-selbar-t"><b data-seltot></b><small data-selsub></small></div><div class="pdx-selbar-a"><button type="button" class="pdx-sb-l" data-selview></button><button type="button" class="pdx-sb-l" data-selclear>Limpar seleção</button><button type="button" class="pdx-sb-p" data-pdf>Catálogo PDF</button></div></div>' +
    '<div class="pdx-dlg" data-dlg hidden><div class="pdx-dlg-bg" data-close></div><div class="pdx-dlg-in" role="dialog" aria-modal="true"><button type="button" class="pdx-x" data-close aria-label="Fechar">×</button><div data-body></div></div></div>';
  var $ = function (s) { return mount.querySelector(s); };

  /* ---------- desenho ---------- */
  function cartao(k, o, i) {
    var c = FONTES[k].cartao(o);
    var on = SEL[chave(k, o)];
    return '<article class="pdx-op' + (on ? ' pdx-picked' : '') + '" style="--c:' + FONTES[k].cor + '"><button type="button" class="pdx-pick' + (on ? ' pdx-on' : '') + '" data-pick="' + i + '" aria-pressed="' + !!on + '">' + (on ? '✓ Selecionada' : '+ Selecionar') + '</button><button type="button" class="pdx-op-b" data-open="' + i + '">' +
      '<span class="pdx-top"><span class="pdx-tag">' + esc(c.tag) + '</span>' + (c.extra ? '<span class="pdx-new">' + esc(c.extra) + '</span>' : '') + (NOTAS[chave(k, o)] ? '<span class="pdx-nt">Nota</span>' : '') + '<span class="pdx-ref">' + esc(c.ref) + '</span></span>' +
      '<span class="pdx-t">' + esc(c.titulo) + '</span>' +
      '<span class="pdx-meta">' + c.meta.filter(Boolean).map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</span>' +
      '<span class="pdx-foot"><span class="pdx-val"><small>' + esc(c.valL) + '</small><b>' + esc(c.val) + '</b></span>' + prazoHtml(o) + '</span></button></article>';
  }
  var ATUAL = [];
  function lista(k) {
    var F = FONTES[k], f = S.f[k], todos = (S.dados[k] || []).filter(aberta);
    return todos.filter(function (o) { return (!S.soSel || SEL[chave(k, o)]) && (!f.ent || F.ent(o) === f.ent) && match(f.q, F.pesquisa(o)); });
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
    var faltam = L.filter(function (o) { return !SEL[chave(k, o)]; }).length, pa = $('[data-pickall]');
    pa.hidden = !L.length || S.soSel; pa.textContent = faltam ? '+ Selecionar todas (' + L.length + ')' : '✓ Todas selecionadas';
    pa.disabled = !faltam;
    barra();
  }
  function barra() {
    var n = selN(), b = $('[data-selbar]');
    b.hidden = !n.total && !S.soSel;
    $('[data-seltot]').textContent = 'A minha seleção · ' + n.total + (n.total === 1 ? ' oportunidade' : ' oportunidades');
    $('[data-selsub]').textContent = ORDEM.filter(function (k) { return n[k]; }).map(function (k) { return FONTES[k].nome + ' ' + n[k]; }).join(' · ');
    $('[data-selview]').textContent = S.soSel ? 'Ver todas' : 'Ver só a seleção';
    $('[data-pdf]').textContent = 'Catálogo PDF (' + n.total + ')'; $('[data-pdf]').disabled = !n.total;
  }
  function abrir(i) {
    var k = S.tab, o = ATUAL[i]; if (!o) return; var D = FONTES[k].detalhe(o);
    $('[data-body]').innerHTML = '<div class="pdx-dh" style="--c:' + FONTES[k].cor + '"><span class="pdx-tag">' + esc(D.tag) + '</span><h2>' + esc(D.titulo) + '</h2>' + (D.texto ? '<p>' + esc(D.texto) + '</p>' : '') + '</div>' +
      '<div class="pdx-dg"><div><small>' + esc(D.valL) + '</small><b>' + esc(D.val) + '</b></div><div>' + prazoHtml(o) + '</div></div>' +
      (D.obj ? '<div class="pdx-obj"><span>Objetivo (texto original)</span><p>' + esc(D.obj) + '</p></div>' : '') +
      '<div class="pdx-kvs">' + D.linhas + '</div>' +
      '<div class="pdx-acts"><a class="pdx-btn" href="' + esc(o.link) + '" target="_blank" rel="noopener">' + esc(D.botao) + ' ↗</a><button type="button" class="pdx-btn pdx-btn-o" data-dpick="' + i + '">' + (SEL[chave(k, o)] ? '✓ Selecionada' : '+ Selecionar') + '</button></div>' +
      '<div class="pdx-nf"><label for="pdx-nota-t">Nota interna <small>Aparece no catálogo PDF. Fica guardada só neste browser.</small></label><textarea id="pdx-nota-t" data-nota="' + i + '" rows="3" placeholder="Ex.: Responsável: Ana · decidir até 5 dez · pedir DoE">' + esc(NOTAS[chave(k, o)] || '') + '</textarea></div>' +
      (D.nota ? '<p class="pdx-nota">' + esc(D.nota) + '</p>' : '');
    $('[data-dlg]').hidden = false; document.documentElement.classList.add('pdx-lock');
    var x = $('.pdx-x'); if (x) x.focus();
  }
  function alterna(o) { if (!o) return; var c = chave(S.tab, o); if (SEL[c]) delete SEL[c]; else SEL[c] = 1; guardaSel(); }
  function fechar() { $('[data-dlg]').hidden = true; document.documentElement.classList.remove('pdx-lock'); }

  /* ---------- eventos ---------- */
  mount.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'); if (t) { S.tab = t.getAttribute('data-tab'); if (history.replaceState) history.replaceState(null, '', '#' + S.tab); render(); return; }
    var c = e.target.closest('[data-ent]'); if (c) { var f = S.f[S.tab]; f.ent = c.getAttribute('data-ent'); f.n = POR_PAG; render(); return; }
    var pk = e.target.closest('[data-pick]'); if (pk) { alterna(ATUAL[+pk.getAttribute('data-pick')]); render(); return; }
    var dp = e.target.closest('[data-dpick]'); if (dp) { var oo = ATUAL[+dp.getAttribute('data-dpick')]; alterna(oo); dp.textContent = SEL[chave(S.tab, oo)] ? '✓ Selecionada' : '+ Selecionar'; render(); return; }
    if (e.target.closest('[data-pickall]')) { ATUAL.forEach(function (x) { SEL[chave(S.tab, x)] = 1; }); guardaSel(); render(); return; }
    if (e.target.closest('[data-selclear]')) { SEL = {}; S.soSel = false; guardaSel(); render(); return; }
    if (e.target.closest('[data-selview]')) { S.soSel = !S.soSel; render(); return; }
    if (e.target.closest('[data-pdf]')) { catalogo(); return; }
    var o = e.target.closest('[data-open]'); if (o) { abrir(+o.getAttribute('data-open')); return; }
    if (e.target.closest('[data-more]')) { S.f[S.tab].n += POR_PAG; render(); return; }
    if (e.target.closest('[data-close]')) fechar();
  });
  var tq; $('[data-q]').addEventListener('input', function (e) { clearTimeout(tq); var v = e.target.value; tq = setTimeout(function () { var f = S.f[S.tab]; f.q = v; f.n = POR_PAG; render(); }, 180); });
  mount.addEventListener('input', function (e) {
    var t = e.target.closest('[data-nota]'); if (!t) return;
    var o = ATUAL[+t.getAttribute('data-nota')]; if (!o) return; var c = chave(S.tab, o), v = t.value.trim();
    if (v) NOTAS[c] = t.value; else delete NOTAS[c]; guardaNotas();
  });
  mount.addEventListener('change', function (e) { if (e.target.closest('[data-nota]')) render(); });
  $('[data-sort]').addEventListener('change', function (e) { S.f[S.tab].sort = e.target.value; render(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('[data-dlg]').hidden) fechar(); });
  window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (FONTES[h]) { S.tab = h; render(); mount.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  /* ---------- catálogo PDF ---------- */
  var RODAPE = null;
  function carregaRodape() {
    if (RODAPE) return Promise.resolve(RODAPE);
    return fetch(ASSETS + 'logo-idd-rodape.svg').then(function (r) { return r.text(); }).then(function (t) { RODAPE = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t))); return RODAPE; }).catch(function () { return ''; });
  }
  function hojeExt() { var d = new Date(); return d.getDate() + ' de ' + MES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function catalogo() {
    var n = selN(); if (!n.total) return;
    var grupos = ORDEM.filter(function (k) { return n[k]; }).map(function (k) { var L = selLista(k).slice(); L.sort(function (a, b) { return String(a.prazo || '9').localeCompare(String(b.prazo || '9')); }); return { k: k, F: FONTES[k], L: L }; });
    var num = 0, idx = '', fichas = '', cal = [];
    grupos.forEach(function (g) {
      idx += '<div class="pdc-ig" style="--c:' + g.F.cor + '"><h3>' + esc(g.F.nome) + ' <small>' + esc(g.F.sub) + ' · ' + g.L.length + '</small></h3><div class="pdc-ih"><span>N.º</span><span>Oportunidade</span><span>Prazo</span></div>';
      fichas += '<section class="pdc-src" style="--c:' + g.F.cor + '"><span>' + esc(g.F.sub) + '</span><h2>' + esc(g.F.nome) + '</h2><b>' + g.L.length + (g.L.length === 1 ? ' oportunidade' : ' oportunidades') + '</b></section>' +
        '<div class="pdc-como" style="--c:' + g.F.cor + '"><h4>Como participar</h4><ol>' + COMO[g.k].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
        (g.k === 'nato' ? '<a href="' + GUIA_NATO + '">Guia da idD de participação em concursos NATO ↗</a>' : '') + '</div>';
      g.L.forEach(function (o) {
        num++; var id = 'pdc-' + num, c = g.F.cartao(o), D = g.F.detalhe(o), host = (String(o.link).match(/^https?:\/\/([^/]+)/) || [])[1] || 'fonte oficial';
        cal.push({ o: o, k: g.k, F: g.F, id: id, num: num, t: c.titulo, tag: c.tag });
        idx += '<a class="pdc-ir" href="#' + id + '"><i>' + ('0' + num).slice(-2) + '</i><span><b>' + esc(c.titulo) + '</b><small>' + esc(c.tag) + ' · ' + esc(c.ref) + '</small></span><em>' + (o.prazo ? esc(dfmt(o.prazo)) : '') + '</em></a>';
        var nd = dias(o.prazo), pcls = nd <= 3 ? ' pdc-hot' : nd <= 7 ? ' pdc-warm' : '';
        fichas += '<article class="pdc-f" id="' + id + '" style="--c:' + g.F.cor + '"><div class="pdc-ft"><span class="pdc-n">' + ('0' + num).slice(-2) + '</span><span class="pdc-tag">' + esc(D.tag) + '</span>' +
          (o.prazo ? '<span class="pdc-pz' + pcls + '"><small>Prazo</small> ' + esc(quando(o.prazo)) + ' · <b>' + (nd <= 0 ? 'termina hoje' : nd === 1 ? 'termina amanhã' : 'faltam ' + nd + ' dias') + '</b></span>' : '') + '</div>' +
          '<h3>' + esc(D.titulo) + '</h3>' + (D.texto ? '<p class="pdc-tx">' + esc(D.texto) + '</p>' : '') +
          (D.obj ? '<p class="pdc-obj">' + esc(D.obj.length > 260 ? D.obj.slice(0, 260).replace(/\s+\S*$/, '') + '…' : D.obj) + '</p>' : '') +
          (NOTAS[chave(g.k, o)] ? '<div class="pdc-nota"><span>Nota interna</span>' + esc(NOTAS[chave(g.k, o)]) + '</div>' : '') +
          '<div class="pdc-kvs"><div class="pdx-kv pdc-val"><span>' + esc(D.valL) + '</span><b>' + esc(D.val) + '</b></div>' + D.linhas + '</div><a class="pdc-go" href="' + esc(o.link) + '">' + esc(D.botao) + ' · ' + esc(host) + ' ↗</a></article>';
      });
      idx += '</div>';
    });
    var bk = [['Terminam nos próximos 7 dias', 0, 7, 'pdc-hot'], ['Terminam entre 8 e 30 dias', 8, 30, 'pdc-warm'], ['Terminam daqui a mais de 30 dias', 31, 1e9, '']];
    cal.sort(function (a, b) { return String(a.o.prazo).localeCompare(String(b.o.prazo)); });
    var calHtml = '<section class="pdc-cal"><span class="pdc-eb2">Calendário</span><h2>Prazos <b>por ordem</b></h2>' + bk.map(function (b) {
      var L = cal.filter(function (x) { var d = dias(x.o.prazo); return d >= b[1] && d <= b[2]; }); if (!L.length) return '';
      return '<div class="pdc-cb2 ' + b[3] + '"><h3>' + b[0] + ' <small>' + L.length + '</small></h3>' + L.map(function (x) { var d = dias(x.o.prazo);
        return '<a class="pdc-cr" href="#' + x.id + '" style="--c:' + x.F.cor + '"><span class="pdc-cd"><b>' + new Date(x.o.prazo).getDate() + '</b><small>' + M[new Date(x.o.prazo).getMonth()] + '</small></span><span class="pdc-ct"><b>' + esc(x.t) + '</b><small><i></i>' + esc(x.F.nome) + ' · ' + esc(x.tag) + ' · ficha ' + ('0' + x.num).slice(-2) + '</small></span><em>' + (d <= 0 ? 'hoje' : d === 1 ? 'amanhã' : d + ' dias') + '</em></a>'; }).join('') + '</div>';
    }).join('') + '</section>';
    var stats = ORDEM.map(function (k) { return '<div style="--c:' + FONTES[k].cor + '"><b>' + (n[k] || 0) + '</b><span>' + FONTES[k].nome + '</span><small>' + FONTES[k].sub + '</small></div>'; }).join('');
    var chips = [];
    ORDEM.forEach(function (k) { if (!n[k]) return; var ents = {}; selLista(k).forEach(function (o) { var e = FONTES[k].ent(o); ents[e] = (ents[e] || 0) + 1; }); Object.keys(ents).forEach(function (e) { chips.push('<span>' + esc(e) + ' · ' + ents[e] + '</span>'); }); });
    var html =
      '<section class="pdc-cv"><div class="pdc-cv-in"><img class="pdc-logo" src="' + ASSETS + 'logo-idd-white.png" alt="idD Portugal Defence">' +
      '<div class="pdc-cv-mid"><span class="pdc-eb">Catálogo de oportunidades · ' + new Date().getFullYear() + '</span><h1>Oportunidades na <b>Defesa</b></h1>' +
      '<div class="pdc-sel"><b>' + n.total + (n.total === 1 ? ' oportunidade selecionada' : ' oportunidades selecionadas') + '</b><div class="pdc-chips">' + chips.join('') + '</div></div></div>' +
      '<div class="pdc-cv-ft"><div class="pdc-stats">' + stats + '</div><p class="pdc-cv-av">Informação extraída a ' + hojeExt() + '. Os prazos e as condições podem mudar: consulte sempre a fonte oficial, indicada em cada oportunidade.</p><div class="pdc-cv-bt"><span>' + hojeExt() + '</span><span>www.iddportugal.pt</span></div></div></div></section>' +
      '<section class="pdc-idx"><span class="pdc-eb2">Índice</span><h2>Oportunidades <b>selecionadas</b></h2><p class="pdc-aviso">Informação extraída a ' + hojeExt() + ', às ' + tfmt(new Date()) + '. Os prazos e as condições podem mudar: consulte sempre a fonte oficial, indicada em cada oportunidade.</p>' + idx + '</section>' +
      calHtml + fichas +
      '<section class="pdc-cb"><div class="pdc-cb-in"><img class="pdc-logo" src="' + ASSETS + 'logo-idd-white.png" alt="idD Portugal Defence"><span class="pdc-eb">idD Portugal Defence</span><h2>Ao serviço da <b>indústria de Defesa Nacional</b></h2>' +
      '<p>A idD acompanha as oportunidades das Forças Armadas, da NATO e da UE e apoia as empresas portuguesas no acesso a estes mercados.</p>' +
      '<div class="pdc-cb-l"><a href="https://www.iddportugal.pt/">www.iddportugal.pt</a><a href="mailto:geral@iddportugal.pt">geral@iddportugal.pt</a></div><small>Catálogo gerado a ' + hojeExt() + '.</small></div></section>';
    var box = document.getElementById('pdx-print'); if (!box) { box = document.createElement('div'); box.id = 'pdx-print'; document.body.appendChild(box); }
    box.innerHTML = html;
    var imgs = Array.prototype.slice.call(box.querySelectorAll('img'));
    Promise.all([carregaRodape()].concat(imgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.onload = im.onerror = r; }); }))).then(function (res) {
      var logo = res[0], st = document.getElementById('pdx-print-st');
      if (!st) { st = document.createElement('style'); st.id = 'pdx-print-st'; document.head.appendChild(st); }
      st.textContent = '@page{size:A4;margin:16mm 15mm 18mm;' + (logo ? '@bottom-left{content:url("' + logo + '");vertical-align:middle}' : '') + '@bottom-center{content:"Extraído a ' + hojeExt() + ' · confirme sempre na fonte oficial";font:500 6.5pt Montserrat,Arial,sans-serif;color:#8a978d;vertical-align:middle}@bottom-right{content:counter(page);font:600 8pt Montserrat,Arial,sans-serif;color:#5d6b61;vertical-align:middle}}@page pdxcv{margin:0;@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}}';
      if (logo) { var pre = new Image(); pre.className = 'pdc-pre'; pre.src = logo; box.insertBefore(pre, box.firstChild); }
      document.body.classList.add('pdx-printing');
      var doc = document.title; document.title = 'Oportunidades na Defesa · idD · ' + new Date().toISOString().slice(0, 10);
      var fim = function () { document.body.classList.remove('pdx-printing'); document.title = doc; window.removeEventListener('afterprint', fim); };
      window.addEventListener('afterprint', fim);
      setTimeout(function () { window.print(); }, 250);
    });
  }

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
