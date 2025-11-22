
export enum Category {
  ClinicalResearch = 'Clinical Research & Trials',
  Manufacturing = 'Manufacturing & Quality Systems',
  Pharmacovigilance = 'Pharmacovigilance & Drug Safety',
  RegulatorySubmissions = 'Regulatory Submissions & Compliance',
  MedicalDevices = 'Medical Devices & Diagnostics',
  Biologics = 'Biotechnology, Biologics & Biosimilars',
  DataIntegrity = 'Data Integrity & Electronic Records',
  QualityAssurance = 'Quality Assurance & Risk Management',
  Advertising = 'Advertising, Promotion & Labeling',
  DrugDevelopment = 'Drug Development & Regulatory Science',
  ControlledSubstances = 'Controlled Substances & Safety Controls',
  MarketAccess = 'Health Technology Assessment & Market Access',
  Privacy = 'Privacy, Security & Compliance',
  Environmental = 'Environmental, Occupational & Facility Regulations',
  SupplyChain = 'Supply Chain, Import/Export & Logistics'
}

export enum Region {
  US = 'United States (FDA)',
  EU = 'European Union (EMA)',
  APAC = 'Asia Pacific',
  Global = 'Global (ICH/WHO)',
  UK = 'United Kingdom (MHRA)'
}

export enum ImpactLevel {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  Unknown = 'Unknown'
}

export interface RegulationEntry {
  id: string;
  title: string;
  agency: string;
  region: Region;
  country: string; // Specific country or jurisdiction
  date: string;
  effectiveDate?: string;
  category: Category;
  summary: string;
  impact: ImpactLevel;
  status: 'Draft' | 'Final' | 'Consultation';
  content: string; // The full text or detailed description
  url?: string; // Citation URL
  
  // New fields for Rationalization and Approval
  riskLevel?: string;
  riskRationale?: string;
  adminApproved?: boolean;
}

export interface AnalysisResult {
  summary: string;
  operationalImpact: string;
  complianceRisk: string;
  riskRationale: string; // Rationale for the risk level
  keyChanges: string[];
  mitigationStrategies: string[];
  actionItems: string[];
  riskLevel: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface NewsItem {
  title: string;
  date: string;
  source: string;
  summary: string;
  content: string; // Detailed content for the read more view
  url?: string; // Link to the source
}

export interface DatabaseFilters {
  status?: string[];
  impact?: string[];
  category?: string[];
  country?: string[];
  agency?: string[];
}

export interface TMFDocument {
  zone: string;
  documentName: string;
  description: string;
  mandatory: boolean;
  localRequirement: string; // Specifics for the country
}
