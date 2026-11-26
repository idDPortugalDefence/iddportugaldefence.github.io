(function(root){
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
const clean=s=>String(s||'').replace(/\u0096|\u0097/g,'-').replace(/\s+/g,' ').trim();
function field(t,label){const m=t.match(new RegExp('(?:^|\\n)'+label+':[ \\t]*(.*)'));return m?clean(m[1]):'';}
function section(t,start,end){const a=t.indexOf(start);if(a<0)return '';const b=end?t.indexOf(end,a+start.length):-1;return t.slice(a,b<0?undefined:b);}
function money(s){const m=String(s||'').match(/([\d.]+,\d{2}|[\d.]+)\s*EUR/);if(!m)return null;return parseFloat(m[1].replace(/\./g,'').replace(',','.'));}
function date(s){const m=String(s||'').match(/(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/);if(!m)return null;
  return `${m[3]}-${m[2]}-${m[1]}T${m[4]||'23'}:${m[5]||'59'}:00`;}
const ORG=/dire|servi|se[cç]|depar|comando|unidade|hosp|escola|centro|base|minist|estado|for[cç]a|gabinete|divis|reparti|reg|batalh|superint|aquisi|financ|log[ií]st|dep|hfar|ceom|\//i;
function servico(s){if(!s)return '';if(!ORG.test(s)&&/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+\s+){2,}[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+$/.test(s))return '';return s;}
function place(s){return /^todos?$/i.test(s)?'':s;}
function caps(t){const L=t.replace(/[^A-Za-zÀ-ÿ]/g,'');if(L.length<8||L.replace(/[^A-ZÀ-Þ]/g,'').length/L.length<.7)return t;
  return t.toLowerCase().replace(/\(([^)]+)\)/g,(m,x)=>'('+x.toUpperCase()+')').replace(/\b(eap\d*|hfar|ef|bnl|ceom|rx|gnr|eh-\d+|edge)\b/g,x=>x.toUpperCase()).replace(/\b(força aérea|marinha|exército|forças armadas|portugal|lisboa|porto)\b/g,x=>x.replace(/(^|\s)\S/g,c=>c.toUpperCase()));}
function stripRef(title,ref){let t=caps(clean(title));
  if(ref&&t.toLowerCase().startsWith(ref.toLowerCase()))t=t.slice(ref.length).replace(/^[\s\-–/:.]+/,'');
  const m=t.match(/^([A-Z0-9][\w./]*\d[\w./]*)(\s*[-–/:]\s*)(.{12,})$/);if(m)t=m[3];
  const m2=t.match(/^[A-Z]{2,6}\s+\d{6,}\s*[-–]\s*(.{12,})$/);if(m2)t=m2[1];
  t=t.replace(/^[A-Z]{1,5}\/(?=[A-Za-zÀ-ÿ]{4})/i,'');
  return t.charAt(0).toUpperCase()+t.slice(1);}
function parse(p,emitentes){
  const t=String(p.detalhes_completos||'').replace(/\r/g,'');if(!t)return null;
  const entName=field(t,'Designação da entidade adjudicante')||clean(p.entidade);
  const em=emitentes.find(e=>norm(e.nome)===norm(entName));if(!em)return null;
  const lid=(String(p.link).match(/anuncio-procedimento\/(\d+)-(\d{4})-/)||[]);
  const ref=field(t,'Número de referência interna');
  const loc=section(t,'9 - LOCAL','10 - ');
  const cpv=field(t,'Vocabulário Principal');
  const lots=(t.match(/N[ºo°]\s*:\s*LOT-/g)||[]).length;
  const titulo=stripRef(field(t,'Designação do contrato')||p.designacao_contrato||'',ref);
  let desc=field(t,'Descrição');if(norm(desc)===norm(field(t,'Designação do contrato'))||norm(stripRef(desc,ref))===norm(titulo))desc='';
  return {
    id:lid[1]?`${lid[1]}/${lid[2]}`:p.link,
    link:p.link,
    emitente:em.curto,emitenteNome:em.nome,
    servico:servico(field(t,'Serviço/Órgão/Pessoa de contacto')),
    titulo,desc:stripRef(desc,ref),ref,
    tipoProc:field(t,'Tipo de Procedimento'),
    tipoContr:field(t,'Tipo de Contrato Principal')||field(t,'Tipo de Contrato'),
    cpv:cpv.replace(/\s*-\s*/,' · '),cpvCod:(cpv.match(/^\d{8}/)||[''])[0],
    ...(()=>{const b=money(field(t,'Valor do preço base do procedimento'))??(/Preço base do procedimento:\s*Não/.test(t)?null:money(field(t,'Preço base s/IVA')));
      if(b!=null)return {preco:b,precoTipo:'base'};const e=money(field(t,'Valor do preço estimado do procedimento'));return {preco:e,precoTipo:e!=null?'estimado':''};})(),
    prazo:date(field(t,'Prazo para apresentação das propostas')||field(t,'Prazo para apresentação das candidaturas')),
    enviado:date(field(t,'Data de Envio do Anúncio'))?.slice(0,10)||null,
    execucao:field(t,'Prazo de execução do contrato'),
    distrito:place(field(loc,'Distrito')),concelho:place(field(loc,'Concelho')),localidade:place(field(loc,'Localidade')),
    lotes:lots,fundosUE:/^sim/i.test(field(t,'Têm fundos EU')),joue:/\?\s*Sim/.test(section(t,'2 - JORNAL','3 - ')),
    plataforma:field(t,'Plataforma eletrónica utilizada pela entidade adjudicante'),
    urlPropostas:field(t,'URL para Apresentação')||field(t,'eDelivery Gateway \\(URL\\)'),
    contacto:{email:field(t,'Endereço Eletrónico'),tel:field(t,'Telefone')}
  };}
function build(lista,emitentes){const seen=new Set(),out=[];
  (lista||[]).forEach(p=>{const o=parse(p,emitentes);if(!o||seen.has(o.id))return;seen.add(o.id);out.push(o);});
  return out.sort((a,b)=>(b.enviado||'').localeCompare(a.enviado||'')||String(b.id).localeCompare(String(a.id)));}
const CPV=[['03',['Alimentação']],['09',['Energia']],['14',['Materiais']],['15',['Alimentação']],['16',['Veículos']],['18',['Têxtil & Vestuário & Calçado & EPI']],['19',['Têxtil & Vestuário & Calçado & EPI','Materiais']],
 ['24',['Saúde & NBQR','Materiais']],['30',['Software','C4i']],['31',['Robótica & Automatização & Eletrónica','Energia']],['32',['C4i','Robótica & Automatização & Eletrónica']],['33',['Saúde & NBQR']],
 ['34',['Veículos']],['345',['Naval']],['347',['Aeronáutica']],['35',['Armamento','Veículos','Drones']],['38',['Robótica & Automatização & Eletrónica','Materiais']],['39',['Outros serviços']],
 ['42',['Metalomecânica & Processos Produtivos','Robótica & Automatização & Eletrónica']],['43',['Metalomecânica & Processos Produtivos']],['44',['Materiais','Metalomecânica & Processos Produtivos']],
 ['45',['Construção & Engenharia Civil']],['48',['Software']],['50',['Metalomecânica & Processos Produtivos']],['5021',['Aeronáutica']],['5024',['Naval']],['503',['C4i','Robótica & Automatização & Eletrónica']],
 ['51',['Robótica & Automatização & Eletrónica']],['55',['Alimentação']],['60',['Logística']],['63',['Logística']],['64',['C4i']],['65',['Energia']],['71',['Construção & Engenharia Civil','Formação & Consultoria']],
 ['72',['Software','Ciber']],['73',['TTO','Inteligência Artificial & Realidade Aumentada']],['79',['Formação & Consultoria']],['80',['Formação & Consultoria']],['85',['Saúde & NBQR']],['90',['Ambiente']]];
function setores(cod){let best=null;CPV.forEach(([p,s])=>{if(String(cod).startsWith(p)&&(!best||p.length>best[0].length))best=[p,s];});return best?best[1]:[];}
const NATO_ENT={NSPA:'NSPA',NCIA:'NCIA',IS:'NATO HQ',ACO:'ACO',ACT:'ACT'};
const NATO_NOME={NSPA:'NATO Support and Procurement Agency',NCIA:'NATO Communications and Information Agency',IS:'NATO HQ · International Staff',ACO:'Allied Command Operations (SHAPE)',ACT:'Allied Command Transformation'};
const MES={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
function ndate(s,end){const m=String(s||'').trim().match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);if(!m)return null;
  return `${m[3]}-${MES[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}T${m[4]?m[4].padStart(2,'0')+':'+m[5]:(end?'23:59':'00:00')}:00`;}
function csv(text){const rows=[];let row=[],f='',q=false;text=String(text).replace(/^\ufeff/,'');
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);f='';if(row.length>1||row[0])rows.push(row);row=[];}else f+=c;}
  if(f||row.length){row.push(f);rows.push(row);}
  const h=rows.shift()||[];return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k.trim(),(r[i]||'').trim()])));}
function bxl(ms,end){if(ms==null||ms==='')return null;const d=new Date(+ms);if(isNaN(d))return null;
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
  const hm=(p.hour==='00'&&p.minute==='00')?(end?'23:59':'00:00'):p.hour+':'+p.minute;return `${p.year}-${p.month}-${p.day}T${hm}:00`;}
function natoJson(r){const org=r.originator||'',tipo=r.opportunityType||'',fbo=tipo==='FBO';
  const close=bxl(r.plannedSolicitationClosing,true),rel=bxl(r.plannedSolicitationRelease,true);
  return {id:org+':'+(r.reference||'')+':'+String(r.detailsUrl||'').slice(-12),fonte:'nato',entidade:NATO_ENT[org]||org,entidadeNome:NATO_NOME[org]||r.originatorFull||org,
    tipo,tipoNome:r.opportunityTypeFull||'',titulo:clean(r.projectTitle||'').replace(/,(?=\S)/g,', '),ref:r.reference||'',
    valor:r.estimatedValue!=null&&r.estimatedValue!==''?+r.estimatedValue:null,moeda:r.currency||'',
    nopo:bxl(r.nopoDate),lancamento:fbo?null:rel,prazo:close||(fbo?rel:null),prazoFBO:fbo&&!close,adjudicacao:bxl(r.plannedContractAward),link:r.detailsUrl||''};}
function natoItem(r){if('projectTitle' in r||'detailsUrl' in r)return natoJson(r);const org=r['Originator']||r.originator||'',tipo=r['Opportunity Type']||r.opportunityType||'';
  const close=ndate(r['Solicitation Closing']||r.solicitationClosing,true),rel=ndate(r['Solicitation Release']||r.solicitationRelease,true);
  const fbo=tipo==='FBO';const prazo=close||(fbo?rel:null);
  const v=parseFloat(r['Estimated Value']||r.estimatedValue||'');
  return {id:org+':'+(r['Reference']||r.reference||'')+':'+(r['Website']||r.website||'').slice(-12),fonte:'nato',
    entidade:NATO_ENT[org]||org,entidadeNome:NATO_NOME[org]||org,tipo,
    titulo:clean(r['Opportunity Title']||r.opportunityTitle||'').replace(/,(?=\S)/g,', ').replace(/\s{2,}/g,' '),
    ref:r['Reference']||r.reference||'',valor:isNaN(v)?null:v,moeda:r['Currency']||r.currency||'',
    nopo:ndate(r['NOPO']||r.nopo),lancamento:fbo?null:rel,prazo,prazoFBO:fbo&&!close,
    adjudicacao:ndate(r['Contract Award']||r.contractAward),link:r['Website']||r.website||''};}
function natoBuild(rows){const seen=new Set();return (rows||[]).map(natoItem).filter(o=>o.titulo&&!seen.has(o.id)&&seen.add(o.id));}
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
function ueItem(r){const m=r.metadata||{},g=k=>(m[k]||[])[0];const id=g('identifier');if(!id)return null;
  const prog=/^EDF-EDIP-USI/.test(id)?'EDIP':/^EDF-EDIP/.test(id)?'EDIP':/^EDF-.*(ASAP)/.test(id)?'ASAP':/^EDF-.*EDIRPA/.test(id)?'EDIRPA':/^EDF/.test(id)?'FED':(id.split('-')[0]);
  const hoje=new Date().toISOString().slice(0,10);
  const prazos=(m.deadlineDate||[]).map(d=>String(d).slice(0,10)).filter(Boolean).sort();
  const prox=prazos.find(d=>d>=hoje)||prazos[prazos.length-1]||null;
  let orc=null;try{const b=JSON.parse(g('budgetOverview')||'{}');Object.values(b.budgetTopicActionMap||{}).forEach(arr=>arr.forEach(a=>{if(String(a.action||'').startsWith(id+' ')){orc=Object.values(a.budgetYearMap||{}).reduce((s,v)=>s+(+v||0),0);}}));}catch(e){}
  const d=strip(g('descriptionByte'));const obj=(d.match(/Objective:\s*(.*?)(?:\s(?:Scope|Targeted outcomes|Expected Impact|Budget):|$)/)||[])[1]||'';
  return {id,fonte:'ue',programa:prog,usi:/^EDF-EDIP-USI/.test(id),titulo:clean(g('title')),concurso:clean(g('callTitle')),call:g('callIdentifier')||'',
    tipoAcao:clean(g('typesOfAction')||''),abertura:g('startDate')?String(g('startDate')).slice(0,10):null,
    prazo:prox?prox+'T23:59:00':null,prazos,multi:prazos.length>1,orcamento:orc||null,objetivo:obj.slice(0,600),
    estado:g('status')==='31094501'?'previsto':'aberto',
    link:'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/'+id};}
function ueBuild(results){const seen=new Set();return (results||[]).map(ueItem).filter(o=>o&&!seen.has(o.id)&&seen.add(o.id));}
const api={norm,parse,build,setores,csv,natoBuild,ueBuild};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OPCORE=api;
})(this);
