import { GoogleGenAI } from "@google/genai";

export const generateContent = async (prompt: string, modelName: string = "gemini-3-flash-preview") => {
  try {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || '') : '');
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found. Please set it in your environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    return response.text;
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    throw error;
  }
};
