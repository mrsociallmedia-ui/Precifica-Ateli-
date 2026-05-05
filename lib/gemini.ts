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
      const text = await response.text();
      let errorMessage = `Erro ${response.status}: `;
      try {
        const errorData = JSON.parse(text);
        errorMessage += errorData.error || response.statusText;
      } catch (e) {
        // Resposta não é JSON (provavelmente HTML de erro 404/500)
        errorMessage += `O servidor retornou uma página inesperada. Isso pode acontecer se ele ainda estiver iniciando. Conteúdo parcial: ${text.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
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
