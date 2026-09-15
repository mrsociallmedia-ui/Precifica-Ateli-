"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
async function startServer() {
  try {
    try {
      const envPath = import_path.default.join(process.cwd(), ".env");
      if (import_fs.default.existsSync(envPath)) {
        const envContent = import_fs.default.readFileSync(envPath, "utf-8");
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
    const app = (0, import_express.default)();
    const PORT = 3e3;
    app.use(import_express.default.json());
    app.use(import_express.default.urlencoded({ extended: true }));
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - [${req.method}] ${req.url} - Status: ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
    app.get("/api/status", (req, res) => {
      const geminiKey = process.env.GEMINI_API_KEY;
      res.json({
        status: "online",
        geminiConfigured: !!(geminiKey && geminiKey.trim().length > 10),
        supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
        nodeEnv: process.env.NODE_ENV
      });
    });
    app.post("/api/generate", async (req, res) => {
      try {
        const { prompt, model: modelName = "gemini-3.8-flash", config } = req.body;
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        const isKnownLeakedKey = apiKey && apiKey.includes("AIzaSyDJ-j_lMJPyVYdV3_XZ7Uy0Z1NIQbBbSog");
        if (!apiKey || isKnownLeakedKey) {
          res.setHeader("Content-Type", "application/json");
          return res.status(400).json({
            error: "Sua chave de API do Gemini precisa ser renovada nas configura\xE7\xF5es do AI Studio. O Motor Criativo integrado continuar\xE1 gerando seus conte\xFAdos com perfei\xE7\xE3o.",
            isLeakedKey: true
          });
        }
        if (!prompt) {
          res.setHeader("Content-Type", "application/json");
          return res.status(400).json({ error: "O prompt \xE9 obrigat\xF3rio." });
        }
        const genAI = new import_genai.GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        const targetModel = modelName === "gemini-1.5-flash" || modelName === "gemini-3.5-flash" || modelName === "gemini-3.7-flash" ? "gemini-3.8-flash" : modelName;
        let text = "";
        try {
          const response = await genAI.models.generateContent({
            model: targetModel,
            contents: prompt,
            config
          });
          text = response.text || "";
        } catch (sdkError) {
          console.error("SDK Call Error:", sdkError);
          const rawMsg = sdkError?.message || String(sdkError) || "";
          let errorMessage = "Ocorreu um erro ao comunicar com a API do Gemini.";
          if (rawMsg.includes("reported as leaked") || rawMsg.includes("PERMISSION_DENIED") || sdkError?.status === 403 || rawMsg.includes("403")) {
            errorMessage = "Sua chave de API do Gemini foi reportada como vazada/inv\xE1lida pelo Google. Por favor, gere uma nova chave de API no Google AI Studio e atualize nas configura\xE7\xF5es.";
          } else if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_INVALID")) {
            errorMessage = "A chave de API do Gemini \xE9 inv\xE1lida. Por favor, verifique se inseriu a chave correta nas configura\xE7\xF5es.";
          } else if (rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota") || rawMsg.includes("429")) {
            errorMessage = "Limite de requisi\xE7\xF5es do Gemini atingido temporariamente. Tente novamente em alguns instantes.";
          } else if (rawMsg) {
            errorMessage = `Erro na API do Gemini: ${rawMsg}`;
          }
          res.setHeader("Content-Type", "application/json");
          return res.status(400).json({ error: errorMessage, rawError: rawMsg, isLeakedKey: true });
        }
        res.setHeader("Content-Type", "application/json");
        res.json({ text });
      } catch (error) {
        console.error("Gemini Proxy Global Error:", error);
        res.setHeader("Content-Type", "application/json");
        res.status(500).json({ error: error.message || "Erro interno ao processar IA" });
      }
    });
    if (process.env.NODE_ENV !== "production") {
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*all", (req, res) => {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Gemini Key configured: ${!!process.env.GEMINI_API_KEY}`);
      console.log(`Supabase URL configured: ${!!process.env.VITE_SUPABASE_URL}`);
    });
  } catch (error) {
    console.error("FATAL ERROR STARTING SERVER:", error);
    try {
      import_fs.default.writeFileSync("server_crash.log", error?.stack || error?.message || String(error));
    } catch (e) {
      console.error("Could not write server_crash.log:", e);
    }
    process.exit(1);
  }
}
startServer().catch((err) => {
  console.error("UNHANDLED REJECTION DURING SERVER START:", err);
  try {
    import_fs.default.writeFileSync("server_crash.log", err?.stack || err?.message || String(err));
  } catch (e) {
    console.error("Could not write server_crash.log on unhandled rejection:", e);
  }
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
