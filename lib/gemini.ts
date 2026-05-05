import { GoogleGenAI } from "@google/genai";

export const generateContent = async (prompt: string, modelName: string = "gemini-3-flash-preview") => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não encontrada. Por favor, adicione sua chave nas configurações do AI Studio.");
    }

    const ai = new GoogleGenAI({ apiKey });
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
