import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface AISuggestion {
  family: string;
  genus: string;
  species: string;
  confidence: number;
  description: string;
}

export async function analyzeFieldImage(base64Image: string, type: 'plant' | 'animal'): Promise<AISuggestion[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: `You are an expert field biologist and taxonomist. Analyze this ${type} image and provide precise taxonomic identification. 
              Use Google Search to verify the species based on visual features seen in the image.
              Suggest the most likely family, genus, and species. 
              Return the results as a JSON array of objects, each with 'family', 'genus', 'species', 'confidence' (0.0 to 1.0), and a brief 'description' explaining the identifying features seen in the image.
              Suggest up to 3 possibilities if there is uncertainty.`,
            }
          ],
        }
      ],
      tools: [{ googleSearch: {} }] as any,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              family: { type: Type.STRING },
              genus: { type: Type.STRING },
              species: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ["family", "genus", "species", "confidence", "description"]
          }
        }
      }
    } as any);

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as AISuggestion[];
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return [];
  }
}
