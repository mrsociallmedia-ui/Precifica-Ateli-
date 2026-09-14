// Client-side helper for server-side Gemini API proxy
export const generateContent = async (prompt: string, modelName: string = "gemini-3.8-flash"): Promise<string> => {
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
      // Se não for JSON válido (ex: página HTML de proxy ou erro de gateway)
      if (responseText.includes("leaked") || responseText.includes("PERMISSION_DENIED") || response.status === 403) {
        throw new Error("Sua chave de API do Gemini foi reportada como vazada pelo Google. Por favor, atualize sua chave de API nas configurações do AI Studio.");
      }
      if (response.status === 502 || response.status === 504 || response.status === 500) {
        throw new Error(`Falha temporária no serviço de IA (${response.status}). Ativando motor criativo.`);
      }
      throw new Error(`O servidor retornou uma resposta em formato inesperado (${response.status}).`);
    }

    if (!response.ok || data?.error) {
      const errorMsg = data?.error || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    if (!data || typeof data.text !== 'string') {
      throw new Error("Resposta da IA em formato inválido.");
    }

    return data.text;
  } catch (error: any) {
    console.warn("Gemini Assistant Notice:", error?.message || error);
    throw error;
  }
};

