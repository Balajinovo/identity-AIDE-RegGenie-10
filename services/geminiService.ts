
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, RegulationEntry, NewsItem, TMFDocument, GapAnalysisResult, MonitoringReportLog } from '../types';

const extractJson = (text: string): any => {
  if (!text) return null;
  let cleanText = text.trim();
  cleanText = cleanText.replace(/^```json/g, '').replace(/^```/g, '').replace(/```$/g, '');
  const firstCurly = cleanText.indexOf('{');
  const lastCurly = cleanText.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1) {
      try { return JSON.parse(cleanText.substring(firstCurly, lastCurly + 1)); } catch (e) {}
  }
  return null;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    contents: [
      { inlineData: { data: base64Audio, mimeType } },
      { text: "Accurately transcribe this clinical monitoring memo. Focus on subject IDs, dates, and medical terminology. Return ONLY the transcript text." }
    ]
  });
  return response.text || '';
};

export const synthesizeMonitoringReport = async (
    visitType: string, 
    inputs: { notes: string; minutes?: string; transcript?: string; linkedContext?: string },
    templateText: string, 
    metadata: any
): Promise<Partial<MonitoringReportLog>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
        TASK: Synthesize a GxP Clinical Monitoring Report (${visitType}).
        METADATA: ${JSON.stringify(metadata)}
        REFERENCE TEMPLATE STRUCTURE: ${templateText}
        
        INPUTS:
        - Site Notes: ${inputs.notes}
        - Meeting Minutes: ${inputs.minutes}
        - Voice Transcript: ${inputs.transcript}
        - External Context: ${inputs.linkedContext}
        
        REQUIREMENTS:
        1. Create a "Monitoring Visit Report Summary" section highlighting key findings.
        2. Create an "Action Item Registry" for follow-up.
        3. Harmonize discrepancies between meeting minutes and site notes.
        4. Use Tailwind CSS classes for HTML formatting.
        5. Return JSON with 'contentHtml' and 'audit' (explainability, traceability, modelAccuracy).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return extractJson(response.text || '{}');
};

export const generateFollowUpLetter = async (reportHtml: string, metadata: any): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on the following Monitoring Visit Report Summary: "${reportHtml}", generate a formal Follow-up Letter to the Principal Investigator. 
        Metadata: ${JSON.stringify(metadata)}.
        Focus strictly on the follow-up items identified in the report. Include clear timelines for remediation. Return as clean HTML.`
    });
    return response.text || '';
};

export const generateConfirmationLetter = async (reportHtml: string, nextDate: string, metadata: any): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on the Action Items in this report: "${reportHtml}", generate a Confirmation Letter for the next visit on ${nextDate}.
        Include a checklist of key follow-up items from the current report that the site must have ready for verification. Return as clean HTML.`
    });
    return response.text || '';
};

// Fixed translateDocument implementation
export const translateDocument = async (content: string | string[], targetLanguage: string, mode: string = 'General', onProgress?: (msg: string) => void): Promise<string | string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isArray = Array.isArray(content);
  // Fix: input used content before declaration error
  const inputStrings = isArray ? (content as string[]) : [content as string];
  const results: string[] = [];
  for (let i = 0; i < inputStrings.length; i++) {
    if (onProgress) onProgress(`Processing chunk ${i+1}/${inputStrings.length}...`);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate to ${targetLanguage} (${mode}): ${inputStrings[i]}`,
    });
    results.push(response.text || '');
  }
  return isArray ? results : results[0];
};

// Implemented missing export used in TranslationTool.tsx
export const getAlternateSuggestions = async (word: string, context: string, targetLanguage: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `In the context of this clinical text: "${context}", provide 4 alternative translations for the word/phrase "${word}" in ${targetLanguage}. Return ONLY a JSON array of strings.`,
    config: { responseMimeType: "application/json" }
  });
  const json = extractJson(response.text || '[]');
  return Array.isArray(json) ? json : [];
};

export const streamChatResponse = async (history: any[], message: string, onChunk: (chunk: string, metadata?: any) => void) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({ 
    model: 'gemini-3-flash-preview', 
    config: { tools: [{ googleSearch: {} }] } 
  });
  const stream = await chat.sendMessageStream({ message });
  for await (const chunk of stream) { 
    onChunk(chunk.text || '', chunk.candidates?.[0]?.groundingMetadata); 
  }
};

export const getRegulatoryNews = async (): Promise<NewsItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "List 5 recent global regulatory news items (title, summary, date, source, url) for Health, GMP, GCP, PV. Return ONLY JSON array.",
    config: { 
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }]
    }
  });
  return extractJson(response.text) || [];
};

export const getArchivedRegulatoryNews = async (): Promise<NewsItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "List 8 significant historical clinical regulatory milestones (title, date, source). Return ONLY JSON array.",
    config: { responseMimeType: "application/json" }
  });
  return extractJson(response.text) || [];
};

export const analyzeRegulation = async (input: any): Promise<AnalysisResult> => ({ summary: '', complianceRisk: '', operationalImpact: '', actionItems: [] });
export const syncIntelligence = async (e: any) => [];
export const categorizeNewEntry = async (t: any) => ({});

export const getTMFChecklist = async (country: string): Promise<TMFDocument[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a DIA TMF Reference Model checklist for ${country}. Include zone, documentName, description, mandatory (bool), and localRequirement. Return ONLY JSON array.`,
    config: { responseMimeType: "application/json" }
  });
  return extractJson(response.text) || [];
};

export const generateGapAnalysis = async (sop: string, reg: string): Promise<GapAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Compare this SOP: "${sop}" against this Regulation: "${reg}". Identify gaps. Return JSON following GapAnalysisResult interface.`,
    config: { responseMimeType: "application/json" }
  });
  return extractJson(response.text) || { complianceScore: 0, executiveSummary: '', missingElements: [], remediationPlan: [] };
};

export const generateICF = async (p: any, t: any, r: any, country: string, type: string, lang: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate a ${type} Informed Consent Form for ${country} in ${lang}. Use protocol: ${JSON.stringify(p)}, template: ${JSON.stringify(t)}, regulation: ${JSON.stringify(r)}. Return as clean HTML.`,
  });
  return response.text || '';
};

export const analyzeDoseEscalation = async (data: any): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze dose escalation data: ${JSON.stringify(data)}. Recommend next cohort dose. Return JSON with recommendation, predictedMTD, rationale, safetyWarnings, nextSteps.`,
    config: { responseMimeType: "application/json" }
  });
  return extractJson(response.text) || { recommendation: 'Unknown', predictedMTD: 'N/A', rationale: '', safetyWarnings: [], nextSteps: [] };
};
