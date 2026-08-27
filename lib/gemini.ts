// Client-side helper for server-side Gemini API proxy
export const generateContent = async (prompt: string, modelName: string = "gemini-3.7-flash"): Promise<string> => {
  try {
    const url = `/api/generate?t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model: modelName }),
    });

    const responseText = await response.text();
    let data: any = null;

    try {
      data = JSON.parse(responseText);
    } catch {
      // Se não for JSON válido (ex: HTML de erro do servidor ou Vite)
      if (!response.ok) {
        throw new Error(`Erro do servidor (${response.status}). Verifique a chave da API do Gemini.`);
      }
      throw new Error("O servidor retornou uma resposta em formato inesperado.");
    }

    if (!response.ok) {
      const errorMsg = data?.error || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    if (!data || typeof data.text !== 'string') {
      throw new Error("Resposta da IA em formato inválido.");
    }

    return data.text;
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    throw error;
  }
};

