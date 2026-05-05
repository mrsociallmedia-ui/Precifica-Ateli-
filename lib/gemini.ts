// Removed client-side SDK import as we're using a server-side proxy
export const generateContent = async (prompt: string, modelName: string = "gemini-1.5-flash") => {
  try {
    // Adicionando timestamp para evitar cache e usando URL absoluta para evitar ambiguidades
    const url = `${window.location.origin}/api/generate?t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model: modelName }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      } else {
        const text = await response.text();
        console.error("Resposta não-JSON do servidor:", text);
        throw new Error(`O servidor retornou um erro inesperado (${response.status}). Se o problema persistir, verifique a chave da API do Gemini.`);
      }
    }

    const data = await response.json();
    if (!data || typeof data.text !== 'string') {
      throw new Error("Resposta da IA no formato inválido.");
    }
    return data.text;
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    throw error;
  }
};
