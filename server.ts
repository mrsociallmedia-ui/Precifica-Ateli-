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
  app.use(express.urlencoded({ extended: true }));

  // Log all requests with timestamp and details
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${new Date().toISOString()} - [${req.method}] ${req.url} - Status: ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // API Route to check server status and keys
  app.get("/api/status", (req: Request, res: Response) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    res.json({
      status: "online",
      geminiConfigured: !!(geminiKey && geminiKey.trim().length > 10),
      supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      nodeEnv: process.env.NODE_ENV
    });
  });

  // API Route for Gemini content generation
  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const { prompt, model: modelName = "gemini-1.5-flash" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(403).json({ 
          error: "GEMINI_API_KEY não configurada. Por favor, adicione sua chave nas configurações do AI Studio." 
        });
      }

      if (!prompt) {
        return res.status(400).json({ error: "O prompt é obrigatório." });
      }

      const genAI = new GoogleGenAI({ apiKey });
      
      // Forçamos a chamada em um bloco try-catch interno para capturar erros específicos do SDK
      let aiResponse;
      try {
        aiResponse = await (genAI as any).models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
      } catch (sdkError: any) {
        console.error("SDK Call Error:", sdkError);
        return res.status(502).json({ error: `Erro na API do Gemini: ${sdkError.message}` });
      }
      
      const text = aiResponse.text || aiResponse.response?.text?.() || 
                   (typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse));
      
      res.json({ text });
    } catch (error: any) {
      console.error("Gemini Proxy Global Error:", error);
      res.status(500).json({ error: error.message || "Erro interno ao processar IA" });
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
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Gemini Key configured: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`Supabase URL configured: ${!!process.env.VITE_SUPABASE_URL}`);
  });
}

startServer();
