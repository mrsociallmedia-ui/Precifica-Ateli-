import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  try {
    // Load .env manually to process.env if available, so that dev behaves correctly
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        envContent.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const index = trimmed.indexOf("=");
          if (index > 0) {
            const key = trimmed.substring(0, index).trim();
            let val = trimmed.substring(index + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            } else if (val.startsWith("'") && val.endsWith("'")) {
              val = val.substring(1, val.length - 1);
            }
            if (key && !process.env[key]) {
              process.env[key] = val;
            }
          }
        });
      }
    } catch (err) {
      console.warn("Could not parse .env file manually:", err);
    }

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
        const { prompt, model: modelName = "gemini-3.7-flash", config } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
          return res.status(403).json({ 
            error: "GEMINI_API_KEY não configurada. Por favor, adicione sua chave nas configurações do AI Studio." 
          });
        }

        if (!prompt) {
          return res.status(400).json({ error: "O prompt é obrigatório." });
        }

        // Configuração recomendada com httpOptions e User-Agent
        const genAI = new GoogleGenAI({ 
          apiKey: apiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        
        const targetModel = (modelName === "gemini-1.5-flash" || modelName === "gemini-3.5-flash") ? "gemini-3.7-flash" : modelName;

        let text = "";
        try {
          const response = await genAI.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: config
          });
          text = response.text || "";
        } catch (sdkError: any) {
          console.error("SDK Call Error:", sdkError);
          const rawMsg = sdkError?.message || String(sdkError) || "";
          let errorMessage = "Ocorreu um erro ao comunicar com a API do Gemini.";
          
          if (rawMsg.includes("reported as leaked") || rawMsg.includes("PERMISSION_DENIED") || sdkError?.status === 403 || rawMsg.includes("403")) {
            errorMessage = "Sua chave de API do Gemini foi reportada como vazada/inválida pelo Google. Por favor, gere uma nova chave de API no Google AI Studio e atualize nas configurações.";
          } else if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_INVALID")) {
            errorMessage = "A chave de API do Gemini é inválida. Por favor, verifique se inseriu a chave correta nas configurações.";
          } else if (rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota") || rawMsg.includes("429")) {
            errorMessage = "Limite de requisições do Gemini atingido temporariamente. Tente novamente em alguns instantes.";
          } else if (rawMsg) {
            errorMessage = `Erro na API do Gemini: ${rawMsg}`;
          }

          res.setHeader('Content-Type', 'application/json');
          return res.status(502).json({ error: errorMessage, rawError: rawMsg });
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.json({ text });
      } catch (error: any) {
        console.error("Gemini Proxy Global Error:", error);
        res.setHeader('Content-Type', 'application/json');
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
  } catch (error: any) {
    console.error("FATAL ERROR STARTING SERVER:", error);
    try {
      fs.writeFileSync("server_crash.log", error?.stack || error?.message || String(error));
    } catch (e) {
      console.error("Could not write server_crash.log:", e);
    }
    process.exit(1);
  }
}

startServer().catch((err: any) => {
  console.error("UNHANDLED REJECTION DURING SERVER START:", err);
  try {
    fs.writeFileSync("server_crash.log", err?.stack || err?.message || String(err));
  } catch (e) {
    console.error("Could not write server_crash.log on unhandled rejection:", e);
  }
  process.exit(1);
});
