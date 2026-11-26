window.PLATAFORMA_CONFIG = {
  fonteOportunidadesCopia: 'dados/oportunidades.json',
  fonteOportunidades: 'https://raw.githubusercontent.com/damiaocode/DRE-RSS/main/data/ativos.json',
  fonteData: 'https://api.github.com/repos/damiaocode/DRE-RSS/commits?path=data/ativos.json&per_page=1',
  emitentes: [
    { nome: 'Estado-Maior-General das Forças Armadas (EMGFA)', curto: 'EMGFA' },
    { nome: 'Ministério da Defesa Nacional - Marinha', curto: 'Marinha' },
    { nome: 'Estado-Maior do Exército', curto: 'Exército' },
    { nome: 'Estado Maior da Força Aérea', curto: 'Força Aérea' }
  ],
  fonteNato: 'https://www.nato.int/content/nato/en/work-with-us/business-and-project-opportunities/procurement-opportunities/jcr:content/root/container/procurement-listing.search.json?sortBy=nopoDate&sortOrder=desc&page=1&pageSize=1000',
  fonteNatoCopia: 'dados/nato.json',
  siteOportunidades: 'https://www.iddportugal.pt/',
  googleAnalytics: '',
  diasNovo: 3
};
