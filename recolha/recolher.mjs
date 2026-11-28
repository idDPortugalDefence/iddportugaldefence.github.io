// Recolha das oportunidades (Diário da República, NATO e UE) para o site da idD.
// Uso: node recolha/recolher.mjs   (Node 18 ou superior; grava em dados/)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = require(path.join(raiz, 'recolha', 'oportunidades-core.js'));
globalThis.window = {};
require(path.join(raiz, 'recolha', 'config.js'));
const CFG = globalThis.window.PLATAFORMA_CONFIG;
const saida = path.join(raiz, 'dados');
fs.mkdirSync(saida, { recursive: true });
const grava = (nome, obj) => fs.writeFileSync(path.join(saida, nome), JSON.stringify(obj));
const agora = new Date().toISOString();

async function dr() {
  // 1) dataset diário (damiaocode) + 2) leitura direta do DR (RSS + detalhe) + 3) recolha anterior ainda em prazo
  const fontes = [], erros = [];
  try {
    const r = await fetch(process.env.FONTE_DR || CFG.fonteOportunidades);
    if (!r.ok) throw new Error('dataset ' + r.status);
    fontes.push(...(await r.json()));
  } catch (e) { erros.push(e.message); }
  let diretos = [];
  try { diretos = await drDireto(); } catch (e) { erros.push('direto: ' + e.message); }
  if (!fontes.length && !diretos.length) throw new Error(erros.join('; '));
  const substituidos = new Set();
  diretos.forEach(p => { const m = String(p.detalhes_completos).match(/Altera[çc][ãa]o do An[úu]ncio de procedimento n\.?º?\s*(\d+\/\d{4})/i); if (m) substituidos.add(m[1]); });
  const novos = core.build(diretos.concat(fontes), CFG.emitentes);
  let anteriores = [];
  try { anteriores = JSON.parse(fs.readFileSync(path.join(saida, 'oportunidades.json'), 'utf8')).lista || []; } catch (e) {}
  const vistos = new Set(novos.map(o => String(o.id))), agoraIso = new Date().toISOString().slice(0, 16);
  anteriores.forEach(o => { if (!vistos.has(String(o.id)) && o.prazo && o.prazo >= agoraIso) { novos.push(o); vistos.add(String(o.id)); } });
  const lista = novos.filter(o => !substituidos.has(String(o.id)))
    .sort((a, b) => (b.enviado || '').localeCompare(a.enviado || '') || String(b.id).localeCompare(String(a.id)));
  grava('oportunidades.json', { gerado: agora, direto: diretos.length, lista });
  return lista.length + ' (' + diretos.length + ' lidas diretamente do DR' + (erros.length ? '; avisos: ' + erros.join('; ') : '') + ')';
}

// Leitura direta do Diário da República: RSS da 2.ª série (contratos públicos) + detalhe de cada anúncio da Defesa.
async function drDireto() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
  const base = 'https://diariodarepublica.pt';
  const r = await fetch('https://files.diariodarepublica.pt/rss/serie2&parte=l-html.xml', { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('RSS ' + r.status);
  const rss = await r.text();
  const nomes = CFG.emitentes.map(e => e.nome);
  const itens = [...rss.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/g)]
    .map(m => ({ titulo: m[1].trim(), descricao: m[2].trim(), link: m[3].trim() }))
    .filter(i => nomes.some(n => i.descricao.startsWith(n)));
  if (!itens.length) return [];
  let tok = 'T6C+9iB49TLra4jEsMeSckDMNhQ=', cookie = '';
  try {
    const h = await fetch(base + '/dr/home', { headers: { 'User-Agent': UA } });
    const sc = h.headers.getSetCookie ? h.headers.getSetCookie() : [h.headers.get('set-cookie') || ''];
    cookie = sc.map(c => c.split(';')[0]).join('; ');
    const nr = sc.find(c => c.startsWith('nr2Users='));
    if (nr) { const m = decodeURIComponent(nr.split(';')[0].slice(9)).match(/crf=([^;]+)/); if (m) tok = m[1]; }
  } catch (e) {}
  const out = [];
  for (const it of itens) {
    const key = (it.link.match(/\/([^/]+)$/) || [])[1] || '';
    const corpo = { versionInfo: { moduleVersion: 'AFPBEWM7W0l5DYC7iaLqbw', apiVersion: 'B3l5BYZxaLmWUxGR3tmKGw' }, viewName: 'Legislacao_Conteudos.Conteudo_Detalhe',
      screenData: { variables: { ParteIdAux: '0', Pesquisa: '', Comes: '', Tipo: 'anuncio-procedimento', _tipoInDataFetchStatus: 1, Key: key, _keyInDataFetchStatus: 1, ParteId: '', _parteIdInDataFetchStatus: 1 } }, clientVariables: {} };
    try {
      const d = await fetch(base + '/dr/screenservices/dr/Legislacao_Conteudos/Conteudo_Detalhe/DataActionGetAllConteudoDetalheData', {
        method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=UTF-8', Accept: 'application/json', 'x-csrftoken': tok, 'outsystems-locale': 'pt-PT', Cookie: cookie }, body: JSON.stringify(corpo) });
      if (!d.ok) continue;
      const c = ((await d.json()).data || {}).DetalheConteudo || {};
      if (!c.Texto) continue;
      out.push({ link: it.link, entidade: c.Emissor || '', designacao_contrato: c.Sumario || '', detalhes_completos: c.Texto, pdf: c.URL_PDF || '' });
    } catch (e) {}
  }
  return out;
}

// Junta a lista de um portal (ex.: dados/ncia.json, enviado pelo PC) à lista da página da NATO.
// Se a recolha do portal for recente, as oportunidades dessa entidade vêm só do portal;
// se for antiga, juntam-se as duas (sem repetir títulos) e só ficam as do portal ainda em prazo.
function juntaPortal(lista, ent, ficheiro, horasMax) {
  let p; try { p = JSON.parse(fs.readFileSync(path.join(saida, ficheiro), 'utf8')); } catch (e) { return lista; }
  if (!p || !Array.isArray(p.lista) || !p.lista.length) return lista;
  const fresco = p.gerado && (Date.now() - new Date(p.gerado)) / 36e5 <= horasMax;
  const t = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const agoraIso = new Date().toISOString().slice(0, 16);
  const portal = p.lista.filter(o => fresco || (o.prazo && o.prazo >= agoraIso));
  const titulos = new Set(portal.map(o => t(o.titulo)));
  const base = lista.filter(o => o.entidade !== ent || (!fresco && !titulos.has(t(o.titulo))));
  console.log(`${ent}: ${portal.length} do portal (${fresco ? 'recolha recente' : 'recolha antiga, junta com a página da NATO'})`);
  return base.concat(portal);
}

// NSPA: lê diretamente o eProcurement da NSPA (lista pública, 200 por página, mais recentes primeiro).
async function nspa() {
  const B = 'https://eportal.nspa.nato.int';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const feed = pg => B + '/eProcurement5G/Opportunities/OpportunitiesList/OpportunitiesList?DisplayMode=Default&QueryMode=AvailableForActionOnly&NavigationContext=None&CurrentPageIndex=' + pg + '&SkippedPages=0&PageSize=200&FilterKeywords=Contracts.DTO.Common.ValueTypeDTO%5B%5D&ColumnsToGet=%2A&IsFavorite=False&IsImportant=False&IsTodo=False&IsDone=False&UseDelegation=False&IsDelegationFilterVisible=True&isFlagFilterVisible=True&IsContractPointOfContactFilterVisible=True&IsAssignToMeFilterVisible=False';
  const MES = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const data = (s, fim) => { const m = String(s || '').match(/(\d{1,2}) (\w{3}) (\d{4})(?: (\d{2}):(\d{2}))?/); if (!m || !MES[m[2]]) return null; return `${m[3]}-${MES[m[2]]}-${m[1].padStart(2, '0')}T${m[4] ? m[4] + ':' + m[5] : (fim ? '23:59' : '00:00')}:00`; };
  const txt = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const agoraIso = new Date().toISOString().slice(0, 16), lista = [], vistos = new Set();
  let total = 0;
  for (let pg = 1; pg <= 10; pg++) {
    let h;
    if (process.env.NSPA_FIXTURE) { if (pg > 1) break; h = fs.readFileSync(process.env.NSPA_FIXTURE, 'utf8'); }
    else {
      const r = await fetch(feed(pg), { headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/html, */*; q=0.01', Referer: B + '/eProcurement5G/Opportunities/OpportunitiesList' } });
      if (!r.ok) throw new Error('NSPA ' + r.status);
      h = await r.text();
    }
    const linhas = [...h.matchAll(/<tr[^>]*row-id="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)];
    if (!linhas.length) break;
    let ativasNaPagina = 0;
    for (const [, rid, corpo] of linhas) {
      total++;
      const td = [...corpo.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
      if (td.length < 6) continue;
      const estado = txt(td[3]);
      if (/closed|cancel|award|withdraw|suspend/i.test(estado) || !/publish|amend|open/i.test(estado)) continue;
      const c0 = td[0].split(/<br\s*\/?>/i), c1 = td[1].split(/<br\s*\/?>/i), c2 = td[2].split(/<br\s*\/?>/i);
      const ref = txt(c0[0]), titulo = txt(c0.slice(1).join(' ')), tipo = txt(c1[0]) || 'RFP', natureza = txt(c1[1]);
      const org = txt(c2[0]), orgNome = txt(c2.slice(1).join(' '));
      const pub = data(txt(td[4]).replace(/Modified on.*/, '')), mod = data((txt(td[4]).match(/Modified on (.*)/) || [])[1]);
      const fbo = /FBO|NPO/.test(tipo), dt = txt(td[5]);
      const prazo = fbo ? data(dt.replace(/^.*?Date/, ''), true) : data(dt.replace(/^.*?\)/, '').replace(/^.*?Date/, ''), true);
      if (!fbo && prazo && prazo < agoraIso) continue;
      const url = ((corpo.match(/href="(\/eProcurement5G\/[^"]*RowIDEncrypted=[^"&]+)/) || [])[1] || '').replace(/&amp;/g, '&');
      const id = 'NSPA:' + ref + ':' + rid.slice(-10);
      if (!titulo || vistos.has(id)) continue;
      vistos.add(id); ativasNaPagina++;
      lista.push({ id, fonte: 'nspa', entidade: 'NSPA', entidadeNome: 'NATO Support and Procurement Agency' + (orgNome ? ' · ' + orgNome : ''), tipo, tipoNome: natureza,
        titulo, ref, valor: null, moeda: '', nopo: pub, modificado: mod, lancamento: null, prazo, prazoFBO: fbo, adjudicacao: null,
        link: url ? B + url : B + '/eProcurement5G/Opportunities/OpportunitiesList' });
    }
    if (pg >= 4 && !ativasNaPagina) break;
  }
  if (!lista.length) throw new Error('NSPA sem resultados');
  grava('nspa.json', { gerado: agora, fonte: B + '/eProcurement5G/Opportunities/OpportunitiesList', lidas: total, lista });
  return lista.length + ' em aberto (de ' + total + ' lidas)';
}

async function nato() {
  if (process.env.NATO_FIXTURE) {
    const j = JSON.parse(fs.readFileSync(process.env.NATO_FIXTURE, 'utf8'));
    const lista = core.natoBuild(j.items);
    grava('nato.json', { gerado: agora, lista });
    return lista.length;
  }
  const base = CFG.fonteNato.replace(/([?&])page=\d+/, '$1page={p}').replace(/([?&])pageSize=\d+/, '$1pageSize=200');
  let items = [], p = 1, total = 1;
  do {
    const r = await fetch(base.replace('{p}', p), { headers: { 'User-Agent': 'Mozilla/5.0 (Plataforma Defesa idD)', Accept: 'application/json' } });
    if (!r.ok) throw new Error('NATO ' + r.status);
    const j = await r.json();
    items = items.concat(j.items || []);
    total = (j.pagination && j.pagination.totalPages) || 1;
    p++;
  } while (p <= total && p <= 50);
  let lista = core.natoBuild(items);
  if (!lista.length) throw new Error('NATO sem resultados');
  lista = juntaPortal(lista, 'NCIA', 'ncia.json', 6);
  lista = juntaPortal(lista, 'NSPA', 'nspa.json', 6);
  grava('nato.json', { gerado: agora, lista });
  return lista.length;
}

async function ue() {
  const q = '{"bool":{"must":[{"terms":{"type":["1","2","8"]}},{"terms":{"status":["31094501","31094502"]}},{"term":{"programmePeriod":"2021 - 2027"}},{"terms":{"frameworkProgramme":["44181033"]}}]}}';
  let results = [], p = 1, total = 1;
  do {
    const fd = new FormData();
    fd.append('query', new Blob([q], { type: 'application/json' }), 'blob');
    fd.append('languages', new Blob(['["en"]'], { type: 'application/json' }), 'blob');
    const r = await fetch('https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***&pageSize=100&pageNumber=' + p, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('UE ' + r.status);
    const j = await r.json();
    results = results.concat(j.results || []);
    total = Math.ceil((j.totalResults || 0) / 100);
    p++;
  } while (p <= total && p <= 30);
  const lista = core.ueBuild(results.filter(x => ((x.metadata || {}).frameworkProgramme || [])[0] === '44181033'));
  grava('ue.json', { gerado: agora, lista });
  return lista.length;
}

const UE_ENT = [
  ['EDA', 1, /European Defence Agency|\(EDA\)|^EDA\b/i], ['DEFIS', 1, /DEFIS|Defence Industry and Space/i], ['SATCEN', 1, /SATCEN|Satellite Cent/i], ['EUSPA', 1, /EUSPA|Space Programme/i],
  ['EEAS', 2, /EEAS|External Action/i], ['FPI', 2, /\bFPI\b|Foreign Policy Instruments/i], ['FRONTEX', 2, /Frontex|Border and Coast Guard/i], ['EMSA', 2, /EMSA|Maritime Safety/i],
  ['ECCC', 2, /ECCC|Cybersecurity Industrial/i], ['ENISA', 2, /ENISA|Agency for Cybersecurity/i], ['EUROPOL', 2, /Europol|Law Enforcement Cooperation/i], ['eu-LISA', 2, /LISA|Large-Scale IT/i],
  ['CEPOL', 3, /CEPOL|Law Enforcement Training/i], ['JRC', 3, /\bJRC\b|Joint Research Cent/i], ['HOME', 3, /\bHOME\b|Migration and Home Affairs/i], ['ECHO', 3, /\bECHO\b|Civil Protection|Humanitarian Aid/i],
  ['HERA', 3, /\bHERA\b|Health Emergency Preparedness/i], ['HR', 3, /\bDG HR\b|Human Resources and Security/i], ['SAFE', 3, /DG SAFE|Security and Safety/i], ['CNECT', 3, /CNECT|Communications Networks/i],
  ['EASA', 3, /EASA|Aviation Safety/i], ['CONSILIUM', 3, /CONSILIUM|Council of the European Union|General Secretariat of the Council/i]
];
const UE_TERMOS = /\b(defen[cs]e|military|armed forces|security|surveillance|drones?|uas|uav|rpas|unmanned|cbrn|cyber\w*|satellite|space|ammunition|weapon\w*|munition\w*|border|maritime awareness|crisis management|csdp|cfsp)\b/i;
async function ueConcursos() {
  const tipos = [['0'], ['4'], ['3']];
  let results = [], tipoUsado = null;
  for (const t of tipos) {
    const q = JSON.stringify({ bool: { must: [{ terms: { type: t } }, { terms: { status: ['31094501', '31094502'] } }] } });
    let p = 1, total = 1, res = [];
    do {
      const fd = new FormData();
      fd.append('query', new Blob([q], { type: 'application/json' }), 'blob');
      fd.append('languages', new Blob(['["en"]'], { type: 'application/json' }), 'blob');
      fd.append('sort', new Blob(['{"field":"startDate","order":"DESC"}'], { type: 'application/json' }), 'blob');
      const r = await fetch('https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***&pageSize=100&pageNumber=' + p, { method: 'POST', body: fd });
      if (!r.ok) throw new Error('UE concursos ' + r.status);
      const j = await r.json();
      res = res.concat(j.results || []);
      total = Math.ceil((j.totalResults || 0) / 100);
      p++;
    } while (p <= total && p <= 40);
    if (res.length) { results = res; tipoUsado = t[0]; break; }
  }
  const md = x => x.metadata || {};
  const g = (x, k) => [].concat(md(x)[k] || [])[0];
  const caName = x => String(g(x, 'caName') || '').trim();
  const ident = n => UE_ENT.find(([, , re]) => re.test(n)) || null;
  const lista = [], vistos = new Set();
  for (const x of results) {
    const n = caName(x), e = ident(n);
    if (!e) continue;
    const titulo = String(g(x, 'title') || x.summary || '').replace(/\s+/g, ' ').trim();
    const desc = String(g(x, 'description') || '').replace(/\s+/g, ' ').trim();
    if (e[1] === 3 && !UE_TERMOS.test(titulo + ' ' + desc)) continue;
    const id = g(x, 'identifier') || x.reference;
    if (!id || vistos.has(id)) continue; vistos.add(id);
    const prazo = g(x, 'deadlineDate') || g(x, 'closingDate');
    lista.push({ id, fonte: 'ue', programa: 'Concurso', entidade: e[0], entidadeNome: n, grupo: e[1], titulo, ref: g(x, 'callIdentifier') || '',
      objetivo: desc.slice(0, 600), cpv: g(x, 'mainCpv') || '', procedimento: g(x, 'procedureType') || '',
      abertura: g(x, 'startDate') ? String(g(x, 'startDate')).slice(0, 10) : null,
      prazo: prazo ? String(prazo).slice(0, 16) : null, estado: g(x, 'status') === '31094501' ? 'previsto' : 'aberto',
      link: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/tender-details/' + id,
      plataforma: g(x, 'url') || '' });
  }
  fs.mkdirSync(path.join(saida, 'sonda'), { recursive: true });
  fs.writeFileSync(path.join(saida, 'sonda', 'ue-concursos-amostra.json'), JSON.stringify({ gerado: agora, tipoUsado, total: results.length,
    entidades: results.reduce((a, x) => { const n = caName(x); a[n] = (a[n] || 0) + 1; return a; }, {}),
    escolhidas: lista.reduce((a, o) => { a[o.entidade + ' | ' + o.entidadeNome] = (a[o.entidadeNome && o.entidade + ' | ' + o.entidadeNome] || 0) + 1; return a; }, {}),
    exemplos: results.slice(0, 3) }, null, 1));
  grava('ue-concursos.json', { gerado: agora, lista });
  return lista.length + ' (de ' + results.length + ' concursos abertos)';
}

let erros = 0;
for (const [nome, f] of [['Diário da República', dr], ['NSPA', nspa], ['NATO', nato], ['UE', ue], ['UE concursos', ueConcursos]]) {
  try { console.log(`${nome}: ${await f()} oportunidades`); }
  catch (e) { erros++; console.error(`${nome}: erro (${e.message}); mantém-se a recolha anterior`); }
}
