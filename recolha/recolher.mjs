// Recolha diária das oportunidades (Diário da República e NATO) para a Plataforma Defesa da idD.
// Uso: node recolha/recolher.mjs   (Node 18 ou superior; grava em dados/)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = require(path.join(raiz, 'oportunidades-core.js'));
globalThis.window = {};
require(path.join(raiz, 'config.js'));
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
for (const [nome, f] of [['Diário da República', dr], ['NATO', nato], ['UE', ue]]) {
  try { console.log(`${nome}: ${await f()} oportunidades`); }
  catch (e) { erros++; console.error(`${nome}: erro (${e.message}); mantém-se a recolha anterior`); }
}
process.exit(erros === 3 ? 1 : 0);
