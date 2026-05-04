import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to check server status and keys
  app.get("/api/status", (req: Request, res: Response) => {
    res.json({
      geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10),
      supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
    });
  });

  // API Route for Gemini Proxy
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      const { model, contents, prompt } = req.body;
      let apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.trim() === "") {
        console.error("ERRO: GEMINI_API_KEY não encontrada ou vazia no process.env");
        return res.status(500).json({ 
          error: "GEMINI_API_KEY não configurada no servidor. Por favor, adicione a chave nas configurações do AI Studio (Settings > Secrets)." 
        });
      }

      apiKey = apiKey.trim();

      // Verificação de erro comum: Chave do Supabase colocada como chave do Gemini
      if (apiKey.startsWith('sb_') || apiKey.includes('supabase')) {
        return res.status(400).json({ 
          error: "A chave configurada em GEMINI_API_KEY parece ser uma chave do Supabase. Por favor, adicione uma chave válida do Google AI (que normalmente começa com 'AIza')." 
        });
      }

      // Log seguro para depuração (apenas primeiros e últimos caracteres)
      console.log(`Iniciando geração com IA. Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || "gemini-1.5-flash",
        contents: contents || prompt,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Erro detalhado na API Gemini:", error);
      
      // Tentar extrair mensagem amigável de erro da API
      let errorMessage = "Erro ao gerar conteúdo";
      if (error.message) {
        try {
          // Se a mensagem for um JSON stringificado da API do Google
          if (error.message.includes('{"error":')) {
            const parsed = JSON.parse(error.message.substring(error.message.indexOf('{')));
            errorMessage = parsed.error?.message || error.message;
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage, details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
