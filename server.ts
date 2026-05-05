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
    const geminiKey = process.env.GEMINI_API_KEY;
    res.json({
      geminiConfigured: !!(geminiKey && geminiKey.trim().length > 10),
      supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
    });
  });

  // API Route for Gemini content generation
  app.post("/api/generate", async (req: Request, res: Response) => {
    const { prompt, model: modelName = "gemini-1.5-flash" } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY não configurada no servidor. Por favor, adicione sua chave de API nas configurações do AI Studio." 
      });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      
      // Attempting to use the SDK pattern that matches the library version
      const response = await (genAI as any).models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const text = response.text || response.response?.text?.() || (typeof response === 'string' ? response : JSON.stringify(response));
      
      res.json({ text });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: error.message || "Erro ao processar requisição de IA" });
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
