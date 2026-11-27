// Teste 2: listas completas da NSPA (paginação) e uma página de detalhe. Grava em dados/sonda/.
import fs from 'node:fs';
import path from 'node:path';
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(raiz, 'dados', 'sonda');
fs.mkdirSync(dir, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const B = 'https://eportal.nspa.nato.int';
const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en-GB,en;q=0.9' };
const resumo = [];
let cookie = '';
async function get(nome, url, extra = {}) {
  try {
    const r = await fetch(url, { headers: { ...H, ...(cookie ? { Cookie: cookie } : {}), ...extra }, redirect: 'follow' });
    const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    if (sc.length) cookie = [cookie, ...sc.map(c => c.split(';')[0])].filter(Boolean).join('; ');
    const t = await r.text();
    fs.writeFileSync(path.join(dir, nome + '.html'), t);
    resumo.push({ nome, url, estado: r.status, tamanho: t.length, linhas: (t.match(/row-id="/g) || []).length });
    return t;
  } catch (e) { resumo.push({ nome, url, erro: String(e) }); return ''; }
}
const p1 = await get('nspa-p1', B + '/eProcurement5G/Opportunities/OpportunitiesList');
const feed = (q, ps) => B + '/eProcurement5G/Opportunities/OpportunitiesList/OpportunitiesList?DisplayMode=Default&QueryMode=AvailableForActionOnly&NavigationContext=None&CurrentPageIndex=1&SkippedPages=0&PageSize=' + ps + '&FilterKeywords=Contracts.DTO.Common.ValueTypeDTO%5B%5D&ColumnsToGet=%2A' + q + '&IsFavorite=False&IsImportant=False&IsTodo=False&IsDone=False&UseDelegation=False&IsDelegationFilterVisible=True&isFlagFilterVisible=True&IsContractPointOfContactFilterVisible=True&IsAssignToMeFilterVisible=False';
const XHR = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/html, */*; q=0.01', Referer: B + '/eProcurement5G/Opportunities/OpportunitiesList' };
await get('nspa-feed-200', feed('', 200), XHR);
await get('nspa-feed-200-fbo', feed('&PreFilter=FBO', 200), XHR);
await get('nspa-pager', feed('', 200).replace('/OpportunitiesList?', '/OpportunitiesListPager?'), XHR);
await get('nspa-p2', B + '/eProcurement5G/Opportunities/OpportunitiesList?CurrentPageIndex=2');
const id = (p1.match(/RowIDEncrypted=([^&"]+)/) || [])[1];
if (id) await get('nspa-detalhe', B + '/eProcurement5G/Opportunities/Opportunities/DetailsOpportunity?RowIDEncrypted=' + id);
fs.writeFileSync(path.join(dir, 'resumo.json'), JSON.stringify({ quando: new Date().toISOString(), resumo }, null, 1));
console.log(JSON.stringify(resumo));
