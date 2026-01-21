
import { Category, ImpactLevel, Region, RegulationEntry, BuildRequirement } from './types';

export const SYSTEM_BUILD_HISTORY: BuildRequirement[] = [
  {
    id: 'BR-001',
    version: '1.0.0',
    timestamp: 1738150000000,
    prompt: "built a regulatory intelligence data base to evaluate the regulatory changes for Health care, focusing GMP, GCP, PV an",
    status: 'Implemented',
    scope: ['Core Platform', 'Regulatory Intelligence Module', 'Database Schema']
  },
  {
    id: 'BR-002',
    version: '1.1.0',
    timestamp: 1738160000000,
    prompt: "Requirement Tracking should include all the prompt provided to built this application as of now",
    status: 'Implemented',
    scope: ['Audit Trail Interface', 'Requirement Traceability Matrix']
  },
  {
    id: 'BR-003',
    version: '1.2.0',
    timestamp: 1738165000000,
    prompt: "Remove Regulatory Intelligence",
    status: 'Implemented',
    scope: ['UI Refactoring', 'Requirement Tracking Simplification']
  },
  {
    id: 'BR-004',
    version: '1.3.0',
    timestamp: 1738170000000,
    prompt: "Add Traditional Chinese",
    status: 'Implemented',
    scope: ['Translation Engine Localization', 'Voice Synthesis Locale Mapping']
  },
  {
    id: 'BR-005',
    version: '1.3.1',
    timestamp: 1738175000000,
    prompt: "track the requirement from the start of building this platform",
    status: 'Implemented',
    scope: ['Lifecycle Audit Logging', 'Version Control History']
  },
  {
    id: 'BR-006',
    version: '1.4.0',
    timestamp: 1738180000000,
    prompt: "list all the requirements and prompts in requirement tracking",
    status: 'Implemented',
    scope: ['Comprehensive Audit View', 'Requirement Inventory Update']
  },
  {
    id: 'BR-007',
    version: '1.5.0',
    timestamp: 1738185000000,
    prompt: "Enhance the application by adding features related to data integrity, such as input validation and audit trails for user actions",
    status: 'Implemented',
    scope: ['Data Integrity Framework', 'User Action Audit Log', 'Real-time Input Validation']
  },
  {
    id: 'BR-008',
    version: '1.6.0',
    timestamp: 1738190000000,
    prompt: "For report builder include Digital Notes, Link to Digital Notes fetching and adding contextually, Voice upload option, integrating with meeting minutes field to generate Report",
    status: 'Implemented',
    scope: ['Multi-modal Input Pipeline', 'Neural Audio Transcription', 'Correlated Data Synthesis']
  },
  {
    id: 'BR-009',
    version: '1.7.0',
    timestamp: 1738195000000,
    prompt: "In the Clinical Visit Context, incorporate Template upon which report needs to be generated as reference. Also create include option to create confirmation letter for upcoming visit based on key follow up items and Create option for generating the follow up letter from the follow up item identified in the Monitoring Visit Report Summary",
    status: 'Implemented',
    scope: ['Correspondence Engine', 'Follow-up Letter Automation', 'Confirmation Letter Integration', 'Template Contextualization']
  },
  {
    id: 'BR-010',
    version: '1.8.0',
    timestamp: Date.now(),
    prompt: "Final deployment of clinical surveillance engine with template file upload and summary-based PI correspondence automation.",
    status: 'Implemented',
    scope: ['Template Docx Support', 'PI Correspondence AI', 'Microphone Permissions', 'UI Synchronization']
  }
];

export const REGION_COUNTRY_MAP: Record<string, string[]> = {
  [Region.US]: ['United States', 'Canada', 'Mexico'],
  [Region.EU]: ['European Union', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'Belgium', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Poland', 'Portugal', 'Greece', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovakia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania'],
  [Region.APAC]: ['Japan', 'China', 'India', 'Australia', 'Singapore', 'South Korea', 'New Zealand', 'Taiwan', 'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines', 'Hong Kong', 'Pakistan', 'Bangladesh'],
  [Region.UK]: ['United Kingdom'],
  [Region.Global]: ['Global', 'WHO', 'ICH', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'South Africa', 'Egypt', 'Saudi Arabia', 'UAE', 'Turkey', 'Israel', 'Russia', 'Nigeria', 'Kenya']
};

export const ALL_COUNTRIES = Array.from(new Set(Object.values(REGION_COUNTRY_MAP).flat())).sort();

export const COUNTRY_AUTHORITY_MAP: Record<string, { agency: string; url: string; acronym: string }> = {
  'Global': { agency: 'World Health Organization / ICH', acronym: 'WHO/ICH', url: 'https://www.who.int/news' },
  'United States': { agency: 'Food and Drug Administration', acronym: 'FDA', url: 'https://www.fda.gov/news-events' },
  'Canada': { agency: 'Health Canada', acronym: 'HC', url: 'https://www.canada.ca/en/health-canada/services/drugs-health-products/medeffect-canada/adverse-reaction-database.html' },
  'Mexico': { agency: 'COFEPRIS', acronym: 'COFEPRIS', url: 'https://www.gob.mx/cofepris/archivo/prensa' },
  'European Union': { agency: 'European Medicines Agency', acronym: 'EMA', url: 'https://www.ema.europa.eu/en/news' },
  'United Kingdom': { agency: 'Medicines and Healthcare products Regulatory Agency', acronym: 'MHRA', url: 'https://www.gov.uk/search/news-and-communications?organisations%5B%5D=medicines-and-healthcare-products-regulatory-agency' },
  'Germany': { agency: 'BfArM / PEI', acronym: 'BfArM', url: 'https://www.bfarm.de/EN/News/_node.html' },
  'France': { agency: 'Agence Nationale de Sécurité du Médicament', acronym: 'ANSM', url: 'https://ansm.sante.fr/actualites' },
  'Spain': { agency: 'Agencia Española de Medicamentos y Productos Sanitarios', acronym: 'AEMPS', url: 'https://www.aemps.gob.es/en/informa/notasInformativas/home.htm' },
  'Italy': { agency: 'Agenzia Italiana del Farmaco', acronym: 'AIFA', url: 'https://www.aifa.gov.it/en/news' },
  'Czech Republic': { agency: 'State Institute for Drug Control', acronym: 'SÚKL', url: 'https://www.sukl.eu/sukl/sukl-news' },
  'Poland': { agency: 'Office for Registration of Medicinal Products', acronym: 'URPL', url: 'https://urpl.gov.pl/en/news' },
  'Switzerland': { agency: 'Swissmedic', acronym: 'Swissmedic', url: 'https://www.swissmedic.ch/swissmedic/en/home/news.html' },
  'Ireland': { agency: 'Health Products Regulatory Authority', acronym: 'HPRA', url: 'https://www.hpra.ie/homepage/medicines/safety-information' },
  'Netherlands': { agency: 'Medicines Evaluation Board', acronym: 'CBG-MEB', url: 'https://english.cbg-meb.nl/news' },
  'Sweden': { agency: 'Swedish Medical Products Agency', acronym: 'Läkemedelsverket', url: 'https://www.lakemedelsverket.se/en/news' },
  'Norway': { agency: 'Norwegian Medical Products Agency', acronym: 'NOMA', url: 'https://www.dmp.no/en/news/' },
  'Denmark': { agency: 'Danish Medicines Agency', acronym: 'DKMA', url: 'https://laegemiddelstyrelsen.dk/en/news/' },
  'Finland': { agency: 'Fimea', acronym: 'Fimea', url: 'https://www.fimea.fi/web/en/news' },
  'Belgium': { agency: 'Federal Agency for Medicines and Health Products', acronym: 'FAMHP', url: 'https://www.famhp.be/en/news' },
  'Austria': { agency: 'Austrian Medicines and Medical Devices Agency', acronym: 'BASG', url: 'https://www.basg.gv.at/en/news-center' },
  'Portugal': { agency: 'INFARMED', acronym: 'INFARMED', url: 'https://www.infarmed.pt/web/infarmed/noticias' },
  'Greece': { agency: 'National Organization for Medicines', acronym: 'EOF', url: 'https://www.eof.gr/web/guest/news' },
  'Hungary': { agency: 'National Institute of Pharmacy and Nutrition', acronym: 'OGYÉI', url: 'https://ogyei.gov.hu/news_highlights' },
  'Romania': { agency: 'National Agency for Medicines and Medical Devices', acronym: 'NAMMDR', url: 'https://www.anm.ro/' },
  'Bulgaria': { agency: 'Bulgarian Drug Agency', acronym: 'BDA', url: 'https://www.bda.bg/en/' },
  'Croatia': { agency: 'Agency for Medicinal Products and Medical Devices', acronym: 'HALMED', url: 'https://www.halmed.hr/en/Novosti-i-edukacije/Novosti/' },
  'Australia': { agency: 'Therapeutic Goods Administration', acronym: 'TGA', url: 'https://www.tga.gov.au/news' },
  'New Zealand': { agency: 'Medsafe', acronym: 'Medsafe', url: 'https://www.medsafe.govt.nz/safety/safety.asp' },
  'Singapore': { agency: 'Health Sciences Authority', acronym: 'HSA', url: 'https://www.hsa.gov.sg/announcements/news' },
  'Thailand': { agency: 'Thai Food and Drug Administration', acronym: 'Thai FDA', url: 'https://www.fda.moph.go.th/' },
  'Taiwan': { agency: 'Taiwan Food and Drug Administration', acronym: 'TFDA', url: 'https://www.fda.gov.tw/ENG/list.aspx?code=5001' },
  'China': { agency: 'National Medical Products Administration', acronym: 'NMPA', url: 'https://english.nmpa.gov.cn/news.html' },
  'Japan': { agency: 'Pharmaceuticals and Medical Devices Agency', acronym: 'PMDA', url: 'https://www.pmda.go.jp/english/index.html' },
  'South Korea': { agency: 'Ministry of Food and Drug Safety', acronym: 'MFDS', url: 'https://www.mfds.go.kr/eng/brd/m_11/list.do' },
  'Philippines': { agency: 'Food and Drug Administration Philippines', acronym: 'FDA', url: 'https://www.fda.gov.ph/press-releases/' },
  'India': { agency: 'Central Drugs Standard Control Organisation', acronym: 'CDSCO', url: 'https://cdsco.gov.in/opencms/opencms/en/Notifications/Public-Notices/' },
  'Malaysia': { agency: 'National Pharmaceutical Regulatory Agency', acronym: 'NPRA', url: 'https://npra.gov.my/index.php/en/consumers/safety-information' },
  'Indonesia': { agency: 'Badan POM', acronym: 'BPOM', url: 'https://www.pom.go.id/berita' },
  'Vietnam': { agency: 'Dav Vietnam', acronym: 'DAV', url: 'https://dav.gov.vn/' },
  'Brazil': { agency: 'Agência Nacional de Vigilância Sanitária', acronym: 'ANVISA', url: 'https://www.gov.br/anvisa/pt-br' },
  'Argentina': { agency: 'ANMAT', acronym: 'ANMAT', url: 'https://www.argentina.gob.ar/anmat' },
  'Chile': { agency: 'Instituto de Salud Pública', acronym: 'ISP', url: 'https://www.ispch.cl/noticias/' },
  'Colombia': { agency: 'INVIMA', acronym: 'INVIMA', url: 'https://www.invima.gov.co/noticias' },
  'Peru': { agency: 'DIGEMID', acronym: 'DIGEMID', url: 'http://www.digemid.minsa.gob.pe/' },
  'Venezuela': { agency: 'Instituto Nacional de Higiene Rafael Rangel', acronym: 'INHRR', url: 'http://www.inhrr.gob.ve/' },
  'South Africa': { agency: 'South African Health Products Regulatory Authority', acronym: 'SAHPRA', url: 'https://www.sahpra.org.za/news-and-updates/' },
  'Saudi Arabia': { agency: 'Saudi Food and Drug Authority', acronym: 'SFDA', url: 'https://sfda.gov.sa/en/news-list' },
  'Turkey': { agency: 'Turkish Medicines and Medical Devices Agency', acronym: 'TMMDA', url: 'https://www.titck.gov.tr/duyuru' },
  'Russia': { agency: 'Roszdravnadzor', acronym: 'Roszdravnadzor', url: 'https://roszdravnadzor.gov.ru/en' },
  'Israel': { agency: 'Ministry of Health', acronym: 'MOH', url: 'https://www.gov.il/en/departments/ministry_of_health/govil-landing-page' },
  'Egypt': { agency: 'Egyptian Drug Authority', acronym: 'EDA', url: 'https://www.edaegypt.gov.eg/en/' },
  'UAE': { agency: 'Ministry of Health and Prevention', acronym: 'MOHAP', url: 'https://mohap.gov.ae/en/media-center/news' },
  'Nigeria': { agency: 'NAFDAC', acronym: 'NAFDAC', url: 'https://nafdac.gov.ng/news/' },
  'Kenya': { agency: 'Pharmacy and Poisons Board', acronym: 'PPB', url: 'https://web.pharmacyboardkenya.org/' }
};

export const INITIAL_REGULATIONS: RegulationEntry[] = ([
  {
    id: '15',
    trackingId: 'REG-2024-015',
    title: 'MHRA AI Airlock: Regulatory Sandbox for AI Medical Devices',
    agency: 'MHRA',
    region: Region.UK,
    country: 'United Kingdom',
    date: '2024-05-09',
    effectiveDate: '2024-05-09',
    category: Category.MedicalDevices,
    summary: 'Launch of the AI Airlock, a regulatory sandbox to assist in the safe development and deployment of AI as a Medical Device (AIaMD).',
    impact: ImpactLevel.High,
    status: 'Final',
    content: 'The AI Airlock is a collaborative regulatory sandbox designed to test and support AIaMD products in the NHS. It aims to identify and address regulatory challenges for AI devices early in the development process, fostering innovation while ensuring patient safety.',
    url: 'https://www.gov.uk/government/news/mhra-launches-ai-airlock-to-address-challenges-for-regulating-medical-devices-that-use-artificial-intelligence'
  }
] as RegulationEntry[]).sort((a, b) => b.date.localeCompare(a.date));
