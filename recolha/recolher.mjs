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
  const r = await fetch(process.env.FONTE_DR || CFG.fonteOportunidades);
  if (!r.ok) throw new Error('DR ' + r.status);
  const lista = core.build(await r.json(), CFG.emitentes);
  grava('oportunidades.json', { gerado: agora, lista });
  return lista.length;
}

// Leitura direta do Diário da República (RSS + detalhe). Por agora só grava uma amostra para análise.
async function drDireto() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
  const base = 'https://diariodarepublica.pt';
  const r = await fetch('https://files.diariodarepublica.pt/rss/serie2&parte=l-html.xml', { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('RSS ' + r.status);
  const rss = await r.text();
  const nomes = CFG.emitentes.map(e => e.nome);
  const itens = [...rss.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/g)]
    .map(m => ({ titulo: m[1].trim(), descricao: m[2].trim(), link: m[3].trim() }));
  const nossos = itens.filter(i => nomes.some(n => i.descricao.startsWith(n)));
  let tok = 'T6C+9iB49TLra4jEsMeSckDMNhQ=', cookie = '';
  try {
    const h = await fetch(base + '/dr/home', { headers: { 'User-Agent': UA } });
    const sc = (h.headers.getSetCookie ? h.headers.getSetCookie() : [h.headers.get('set-cookie') || '']);
    cookie = sc.map(c => c.split(';')[0]).join('; ');
    const nr = sc.find(c => c.startsWith('nr2Users='));
    if (nr) { const m = decodeURIComponent(nr.split(';')[0].slice(9)).match(/crf=([^;]+)/); if (m) tok = m[1]; }
  } catch (e) {}
  const detalhes = [];
  for (const it of nossos.slice(0, 4)) {
    const key = (it.link.match(/\/([^/]+)$/) || [])[1] || '';
    const corpo = { versionInfo: { moduleVersion: 'AFPBEWM7W0l5DYC7iaLqbw', apiVersion: 'B3l5BYZxaLmWUxGR3tmKGw' }, viewName: 'Legislacao_Conteudos.Conteudo_Detalhe',
      screenData: { variables: { ParteIdAux: '0', Pesquisa: '', Comes: '', Tipo: 'anuncio-procedimento', _tipoInDataFetchStatus: 1, Key: key, _keyInDataFetchStatus: 1, ParteId: '', _parteIdInDataFetchStatus: 1 } }, clientVariables: {} };
    try {
      const d = await fetch(base + '/dr/screenservices/dr/Legislacao_Conteudos/Conteudo_Detalhe/DataActionGetAllConteudoDetalheData', {
        method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=UTF-8', Accept: 'application/json', 'x-csrftoken': tok, 'outsystems-locale': 'pt-PT', Cookie: cookie }, body: JSON.stringify(corpo) });
      const t = await d.text();
      detalhes.push({ key, estado: d.status, resposta: t.slice(0, 60000) });
    } catch (e) { detalhes.push({ key, erro: String(e) }); }
  }
  grava('dr-direto-amostra.json', { gerado: agora, totalRss: itens.length, defesa: nossos.length, itens: nossos, detalhes, primeirosRss: itens.slice(0, 3) });
  return nossos.length;
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
  const lista = core.natoBuild(items);
  if (!lista.length) throw new Error('NATO sem resultados');
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

let erros = 0;
for (const [nome, f] of [['Diário da República', dr], ['NATO', nato], ['UE', ue], ['DR direto (amostra)', drDireto]]) {
  try { console.log(`${nome}: ${await f()} oportunidades`); }
  catch (e) { erros++; console.error(`${nome}: erro (${e.message}); mantém-se a recolha anterior`); }
}
process.exit(erros >= 4 ? 1 : 0);
