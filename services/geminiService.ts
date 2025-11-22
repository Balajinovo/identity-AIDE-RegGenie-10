
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, RegulationEntry, NewsItem, TMFDocument } from '../types';

const getAiClient = () => {
  // Check process.env.google_api_key (from metadata) first, then standard API_KEY
  const apiKey = process.env.google_api_key || process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const analyzeRegulation = async (regulation: RegulationEntry): Promise<AnalysisResult> => {
  const ai = getAiClient();
  
  const prompt = `
    You are a senior Regulatory Affairs expert and Risk Manager. Analyze the following regulatory document summary/content.
    
    Title: ${regulation.title}
    Agency: ${regulation.agency}
    Category: ${regulation.category}
    Content: ${regulation.content}
    
    Provide a comprehensive Impact Assessment and Risk Management Plan in JSON format containing the fields below.
    If the full content is not provided (e.g., only a summary is available), infer the likely operational impact and risks based on the Title and Agency.
    
    1. executiveSummary: A concise executive summary (max 50 words).
    2. operationalImpact: A detailed assessment of how this regulation affects operations (e.g., manufacturing, clinical data, safety reporting, IT security, data governance, legal compliance).
    3. complianceRisk: An analysis of the risks of non-compliance (e.g., enforcement actions, fines, delays).
    4. riskRationale: A clear rationale explaining WHY the specific Risk Level was assigned.
    5. keyChanges: A list of 3-5 specific regulatory changes or new requirements (inferred if necessary).
    6. riskLevel: Overall risk level (Low, Medium, High, Critical).
    7. mitigationStrategies: A list of 3-5 specific risk mitigation strategies.
    8. actionItems: A list of 3-5 immediate action items for the company.
  `;

  try {
    // Switch to gemini-2.5-flash for faster, more reliable JSON generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            operationalImpact: { type: Type.STRING },
            complianceRisk: { type: Type.STRING },
            riskRationale: { type: Type.STRING },
            keyChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskLevel: { type: Type.STRING },
            mitigationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          }
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");
    // Cleanup markdown if present to ensure valid JSON parsing
    text = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Error analyzing regulation:", error);
    return {
      summary: "Analysis could not be completed at this time. Ensure the API key is valid.",
      operationalImpact: "Analysis unavailable due to an error.",
      complianceRisk: "Analysis unavailable.",
      riskRationale: "Analysis unavailable.",
      keyChanges: [],
      mitigationStrategies: [],
      actionItems: [],
      riskLevel: "Unknown"
    };
  }
};

export const categorizeNewEntry = async (rawText: string): Promise<Partial<RegulationEntry>> => {
  const ai = getAiClient();
  
  const categories = [
    "Clinical Research & Trials",
    "Manufacturing & Quality Systems",
    "Pharmacovigilance & Drug Safety",
    "Regulatory Submissions & Compliance",
    "Medical Devices & Diagnostics",
    "Biotechnology, Biologics & Biosimilars",
    "Data Integrity & Electronic Records",
    "Quality Assurance & Risk Management",
    "Advertising, Promotion & Labeling",
    "Drug Development & Regulatory Science",
    "Controlled Substances & Safety Controls",
    "Health Technology Assessment & Market Access",
    "Privacy, Security & Compliance",
    "Environmental, Occupational & Facility Regulations",
    "Supply Chain, Import/Export & Logistics"
  ];

  const prompt = `
    Extract regulatory metadata from the following text to populate a database entry.
    Text: "${rawText}"
    
    Return JSON with: 
    - title
    - agency
    - region (Mapped to: United States (FDA), European Union (EMA), Asia Pacific, Global (ICH/WHO), United Kingdom (MHRA))
    - country (Specific country name, e.g., United States, China, Germany, United Kingdom, Global)
    - date (YYYY-MM-DD, publication date)
    - effectiveDate (YYYY-MM-DD, or "Pending", "TBD" if not found)
    - category (Select one BEST match from this list: ${categories.join(', ')})
    - summary (brief)
    - impact (High, Medium, Low)
    
    If information is missing, infer it or use "Unknown".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });
    
    if(response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Error parsing new entry:", error);
    throw error;
  }
};

export const streamChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  onChunk: (text: string) => void
) => {
  const ai = getAiClient();
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash', // Using flash for speed and reliability in chat
    config: {
      systemInstruction: "You are AIDE Reg Genie, an expert AI assistant for Regulatory Affairs professionals. You specialize in GMP, GCP, PV, Medical Device, Information Security (InfoSec), and Data Governance regulations.",
    },
    history: history
  });

  const result = await chat.sendMessageStream({ message });
  
  for await (const chunk of result) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
};

// --- OpenAI Integration ---
export const streamOpenAIResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  apiKey: string,
  onChunk: (text: string) => void
) => {
  // Convert Gemini history format to OpenAI format
  const messages = history.map(h => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.parts[0].text
  }));
  
  // Add System Prompt
  messages.unshift({ 
    role: 'system', 
    content: "You are AIDE Reg Genie, an expert AI assistant for Regulatory Affairs professionals. You specialize in GMP, GCP, PV, Medical Device, Information Security (InfoSec), and Data Governance regulations." 
  } as any);

  // Add current user message
  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', 
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') return;
          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';
            if (content) onChunk(content);
          } catch (e) {
            // console.error('Error parsing SSE', e);
          }
        }
      }
    }
  } catch (error) {
    console.error("OpenAI Stream Error:", error);
    throw error;
  }
};

export const getRegulatoryNews = async (): Promise<NewsItem[]> => {
  const ai = getAiClient();

  // Step 1: Search the web for real news
  // Optimized prompt: Increased count to 8.
  // Explicit instruction to prioritize 12-24 hour window.
  const searchPrompt = `
    Find 8 recent regulatory news updates from official government health agency websites (FDA, EMA, MHRA, PMDA, NMPA).
    
    **URGENT PRIORITY**: You must STRICTLY prioritize finding news published within the **last 12 hours**.
    If 12-hour news is scarce, include updates from the last 24 hours.
    Fill remaining slots with significant updates from the **last 14 days** (2 weeks) ONLY if necessary.
    
    Criteria:
    - Must be official press releases, guidance documents, or safety communications.
    - Topics: Clinical Trials, GMP, AI in Healthcare, Medical Devices, Drug Safety.
    - **MANDATORY**: Ensure every news item has a direct, verifiable source URL.
    
    For each item, provide the Title, Date (and time if available), Source Agency, Summary, and the direct URL.
  `;

  try {
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const searchResultText = searchResponse.text || "";
    
    // Extract Grounding Metadata which contains the actual high-quality URLs
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    // Step 2: Parse the search results into structured JSON with SOURCE URLs
    const parsePrompt = `
      You are a regulatory intelligence analyst. Extract distinct regulatory news items from the provided text and mapped source URLs.
      
      Search Result Text: "${searchResultText}"
      
      Verified Source URLs: ${JSON.stringify(sources)}
      
      Instructions:
      1. Identify distinct news items from the text.
      2. For each item, match it to the most relevant URL from the "Verified Source URLs" list. 
      3. **CRITICAL**: The 'url' field MUST be an exact string match from the "Verified Source URLs" list. 
      4. **STRICT FILTER**: If a news item does NOT have a matching Verified Source URL, DO NOT include it in the output.
      5. Ensure dates are in YYYY-MM-DD format.
      
      Return a JSON array of objects with fields:
      - title
      - date (YYYY-MM-DD)
      - source (Agency Name)
      - summary (Concise summary)
      - content (Detailed description)
      - url (The matched verified URL - REQUIRED)
    `;

    const parseResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parsePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              source: { type: Type.STRING },
              summary: { type: Type.STRING },
              content: { type: Type.STRING },
              url: { type: Type.STRING },
            }
          }
        }
      }
    });

    if (parseResponse.text) {
      const items = JSON.parse(parseResponse.text) as NewsItem[];
      // Filter strictly for items that have a non-empty URL
      return items.filter(i => i.title && i.summary && i.url && i.url.trim().length > 0);
    }
    return [];
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
};

export const getArchivedRegulatoryNews = async (): Promise<NewsItem[]> => {
  const ai = getAiClient();
  
  const searchPrompt = `
    Find significant regulatory news, major approvals, and key guidance documents released by major health authorities (FDA, EMA, MHRA, PMDA, NMPA) over the past 12 months.
    
    Focus on "High Impact" updates such as:
    - New Laws or Acts (e.g., AI Act, Modernization Acts)
    - Major Guideline revisions (e.g., ICH revisions, Annex 1)
    - Key Approvals (First-in-class therapies)
    
    Criteria:
    - Timeframe: Past 12 months (excluding the most recent 2 weeks).
    - **MANDATORY**: Every item MUST have a direct source URL.
    
    Return 12-15 items.
  `;

  try {
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const searchResultText = searchResponse.text || "";
    
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    const parsePrompt = `
      Extract historical regulatory news items from the text and map to verified source URLs.
      
      Search Result Text: "${searchResultText}"
      Verified Source URLs: ${JSON.stringify(sources)}
      
      Instructions:
      1. Identify distinct news items.
      2. Match each to a Verified Source URL.
      3. **STRICT FILTER**: Drop any item without a verified URL.
      4. Dates must be YYYY-MM-DD.
      
      Return JSON array of objects:
      - title
      - date (YYYY-MM-DD)
      - source (Agency Name)
      - summary
      - content
      - url (REQUIRED)
    `;

    const parseResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parsePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              source: { type: Type.STRING },
              summary: { type: Type.STRING },
              content: { type: Type.STRING },
              url: { type: Type.STRING },
            }
          }
        }
      }
    });

    if (parseResponse.text) {
      const items = JSON.parse(parseResponse.text) as NewsItem[];
      return items.filter(i => i.title && i.summary && i.url && i.url.trim().length > 0);
    }
    return [];
  } catch (error) {
    console.error("Error fetching archived news:", error);
    return [];
  }
};

// --- Web Search Grounding Capabilities ---

export const searchWebForRegulations = async (query: string, jurisdiction?: string): Promise<{ text: string; sources: {uri: string, title: string}[] }> => {
  const ai = getAiClient();
  
  let context = "global regulatory authorities including FDA, EMA, MHRA, PMDA, NMPA, ANVISA, TGA, Health Canada, CDSCO, WHO, ICH";
  if (jurisdiction && jurisdiction !== 'Global') {
      context = `the regulatory authority for ${jurisdiction} (official government sources)`;
  }

  const prompt = `
    Find the most recent regulatory guidelines, draft guidances, regulations, or consultation papers related to "${query}" issued by ${context}.
    
    Focus on finding specific documents (Guidance for Industry, Regulations, Directives) with clear titles and publication dates. 
    Prioritize official government sources.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    return { text, sources };
  } catch (error) {
    console.error("Web search error:", error);
    throw error;
  }
};

export const parseWebSearchResults = async (searchText: string, sources: {uri: string, title: string}[]): Promise<RegulationEntry[]> => {
  const ai = getAiClient();
  
  const categories = [
    "Clinical Research & Trials",
    "Manufacturing & Quality Systems",
    "Pharmacovigilance & Drug Safety",
    "Regulatory Submissions & Compliance",
    "Medical Devices & Diagnostics",
    "Biotechnology, Biologics & Biosimilars",
    "Data Integrity & Electronic Records",
    "Quality Assurance & Risk Management",
    "Advertising, Promotion & Labeling",
    "Drug Development & Regulatory Science",
    "Controlled Substances & Safety Controls",
    "Health Technology Assessment & Market Access",
    "Privacy, Security & Compliance",
    "Environmental, Occupational & Facility Regulations",
    "Supply Chain, Import/Export & Logistics"
  ];

  const prompt = `
    Analyze the following text which contains search results for regulatory documents. 
    Extract distinct regulatory entries into a structured JSON array.
    
    Search Result Text: "${searchText}"
    
    Available Source URLs: ${JSON.stringify(sources)}
    
    For each entry, extract:
    - title
    - agency (e.g., FDA, EMA, MHRA, ANVISA, PMDA, NMPA, TGA, CDSCO)
    - region (Map to one of: United States (FDA), European Union (EMA), Asia Pacific, Global (ICH/WHO), United Kingdom (MHRA))
    - country (Specific country name)
    - date (YYYY-MM-DD, or approximate)
    - category (Infer the BEST match from: ${categories.join(', ')})
    - summary (A concise summary)
    - impact (Infer Impact Level: High, Medium, Low based on the text)
    - status (Draft, Final, or Consultation)
    - url (Attempt to match the most relevant URL from the Available Source URLs list to this entry. If no match, leave empty.)
    
    If exact mappings (like Region) aren't clear, use your best judgment based on the agency.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
           type: Type.ARRAY,
           items: {
              type: Type.OBJECT,
              properties: {
                 title: { type: Type.STRING },
                 agency: { type: Type.STRING },
                 region: { type: Type.STRING },
                 country: { type: Type.STRING },
                 date: { type: Type.STRING },
                 category: { type: Type.STRING },
                 summary: { type: Type.STRING },
                 impact: { type: Type.STRING },
                 status: { type: Type.STRING },
                 url: { type: Type.STRING },
              }
           }
        }
      }
    });
    
    if (response.text) {
       const parsed = JSON.parse(response.text);
       return parsed.map((p: any, index: number) => ({
          ...p,
          id: `web-${Date.now()}-${index}`,
          content: p.summary, 
          effectiveDate: 'TBD',
          adminApproved: false
       }));
    }
    return [];
  } catch (error) {
    console.error("Parsing error:", error);
    return [];
  }
}

export const getTMFChecklist = async (country: string): Promise<TMFDocument[]> => {
  const ai = getAiClient();
  
  const prompt = `
    Generate a comprehensive Trial Master File (TMF) checklist aligned with the **DIA TMF Reference Model (latest version)** for a clinical trial in ${country}.
    
    CRITICAL: You MUST structure the output strictly according to the standard DIA Zones (Zone 01 to Zone 11).
    The 'zone' field MUST start with the exact zone string (e.g., "Zone 01: Trial Management").
    
    Include artifacts required for Study Startup, Conduct, and Closeout.
    Focus on specific local requirements for ${country} (e.g. local ethics committee forms, specific health authority submissions, translation requirements).
    
    Return a JSON array where each item includes:
    - zone (e.g., "Zone 01: Trial Management", "Zone 02: Central Trial Documents")
    - documentName (The standard DIA artifact name)
    - description (Brief description of purpose)
    - mandatory (true/false)
    - localRequirement (Any specific notes for ${country}, e.g., "Must be in local language", "Form FDA 1572 equivalent")
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              zone: { type: Type.STRING },
              documentName: { type: Type.STRING },
              description: { type: Type.STRING },
              mandatory: { type: Type.BOOLEAN },
              localRequirement: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
       return JSON.parse(response.text) as TMFDocument[];
    }
    return [];
  } catch (error) {
    console.error("Error generating TMF checklist:", error);
    return [];
  }
};
