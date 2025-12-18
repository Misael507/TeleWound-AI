export enum AppStage {
  WELCOME = 'WELCOME',
  ADMISSION = 'ADMISSION',
  ACQUISITION = 'ACQUISITION',
  AI_DIAGNOSTICS = 'AI_DIAGNOSTICS',
  CLINICAL_FILTER = 'CLINICAL_FILTER',
  CLOSURE = 'CLOSURE',
}

export interface Patient {
  id: string; // MRN
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  admissionId: string; // Encounter ID
  phone?: string;
  email?: string;
}

export interface CareProtocol {
  cleansing: string;
  debridement: string;
  primaryDressing: string;
  secondaryDressing: string;
  frequency: string;
  offloading: string;
}

export interface WoundAnalysis {
  granulationPercent: number;
  sloughPercent: number;
  necrosisPercent: number;
  areaCm2: number;
  tissueMapSvg?: string; 
  severityScore: number;
  analysisText: string; // Technical medical description
  patientFriendlyText: string; // Simple explanation for patient
  suggestedProtocol: CareProtocol; // AI suggested protocol
}

export interface ClinicalReport {
  validatedAnalysis: WoundAnalysis;
  finalProtocol: CareProtocol;
  doctorNotes: string;
  diagnosis: string;
  recommendedAction: string;
  fhirBundle?: string; 
}

export interface MapPlace {
  name: string;
  address: string;
  rating?: number;
  uri?: string;
}