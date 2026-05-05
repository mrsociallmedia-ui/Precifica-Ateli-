import { GoogleGenAI } from "@google/genai";

export const generateContent = async (prompt: string, modelName: string = "gemini-1.5-flash") => {
  try {
    // Tenta obter a chave de process.env (injetada via Vite define ou environment do AI Studio)
    const apiKey = process.env.GEMINI_API_KEY || (import.meta.env.VITE_GEMINI_API_KEY as string);
    
    if (!apiKey || apiKey === "undefined") {
      throw new Error("Agente: GEMINI_API_KEY não configurada. Por favor, adicione sua chave de API nas configurações do AI Studio (ícone de engrenagem) para usar as funções de IA.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    
    // Usando o padrão da biblioteca @google/genai instalada
    const response = await (ai as any).models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    // A biblioteca parece retornar a resposta em um formato específico
    return response.text || response.response?.text?.() || JSON.stringify(response);
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("A chave de API do Gemini fornecida é inválida. Verifique suas configurações.");
    }
    throw error;
  }
};
