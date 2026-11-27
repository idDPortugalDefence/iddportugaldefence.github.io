// Teste: o GitHub consegue abrir as páginas da NCIA e da NSPA? Grava as respostas em dados/sonda/.
import fs from 'node:fs';
import path from 'node:path';
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(raiz, 'dados', 'sonda');
fs.mkdirSync(dir, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-GB,en;q=0.9,pt;q=0.8' };
const alvos = [
  ['ncia', 'https://www.ncia.nato.int/business/procurement/current-opportunities'],
  ['ncia-html', 'https://www.ncia.nato.int/business/current-opportunities.html'],
  ['nspa-fbo', 'https://eportal.nspa.nato.int/eProcurement5G/Opportunities/OpportunitiesList?PreFilter=FBO'],
  ['nspa', 'https://eportal.nspa.nato.int/eProcurement5G/Opportunities/OpportunitiesList'],
  ['nspa-raiz', 'https://eportal.nspa.nato.int/eProcurement5G/Opportunities']
];
const resumo = [];
for (const [nome, url] of alvos) {
  try {
    const r = await fetch(url, { headers: H, redirect: 'follow' });
    const t = await r.text();
    fs.writeFileSync(path.join(dir, nome + '.html'), t);
    resumo.push({ nome, url, estado: r.status, final: r.url, tamanho: t.length, bloqueado: /Request Rejected|Access Denied|captcha/i.test(t) });
  } catch (e) { resumo.push({ nome, url, erro: String(e) }); }
}
fs.writeFileSync(path.join(dir, 'resumo.json'), JSON.stringify({ quando: new Date().toISOString(), resumo }, null, 1));
console.log(JSON.stringify(resumo));
