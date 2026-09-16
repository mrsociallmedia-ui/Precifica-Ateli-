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
      const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      res.json({
        status: "online",
        geminiConfigured: !!(geminiKey && geminiKey.trim().length > 10),
        mercadoPagoConfigured: !!(mpToken && mpToken.trim().length > 10),
        supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
        nodeEnv: process.env.NODE_ENV
      });
    });

    // Helper to get sanitized Mercado Pago token
    const getMercadoPagoToken = () => {
      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
      return token && token.length > 10 ? token : null;
    };

    // Mercado Pago Status Endpoint
    app.get("/api/mercadopago/status", (req: Request, res: Response) => {
      const token = getMercadoPagoToken();
      res.json({
        configured: !!token,
        isSandbox: token ? token.startsWith("TEST-") : false
      });
    });

    // Mercado Pago Create Pix Payment
    app.post("/api/mercadopago/create-pix", async (req: Request, res: Response) => {
      try {
        const token = getMercadoPagoToken();
        if (!token) {
          return res.status(400).json({ 
            error: "Mercado Pago não configurado. Adicione a secret MERCADO_PAGO_ACCESS_TOKEN no AI Studio.",
            configured: false 
          });
        }

        const { amount, description, orderId, payer } = req.body;
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return res.status(400).json({ error: "Valor inválido para cobrança Pix." });
        }

        const payerEmail = (payer?.email?.trim() || "").includes("@")
          ? payer.email.trim()
          : `${(payer?.phone || "cliente").replace(/\D/g, "") || "cliente"}@mercadopago.com`;

        const payerName = payer?.name?.trim() || "Cliente";
        const nameParts = payerName.split(" ");
        const firstName = nameParts[0] || "Cliente";
        const lastName = nameParts.slice(1).join(" ") || "Ateliê";

        const idempotencyKey = `pix-${orderId || 'ped'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        const mpPayload: any = {
          transaction_amount: Number(numAmount.toFixed(2)),
          description: description || `Pedido #${orderId || 'Online'} - Ateliê`,
          payment_method_id: "pix",
          payer: {
            email: payerEmail,
            first_name: firstName,
            last_name: lastName
          },
          external_reference: String(orderId || "")
        };

        if (payer?.cpf) {
          const cleanCpf = String(payer.cpf).replace(/\D/g, "");
          if (cleanCpf.length === 11) {
            mpPayload.payer.identification = {
              type: "CPF",
              number: cleanCpf
            };
          }
        }

        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey
          },
          body: JSON.stringify(mpPayload)
        });

        const mpData: any = await mpResponse.json();

        if (!mpResponse.ok) {
          console.error("Mercado Pago Pix Error:", mpData);
          return res.status(mpResponse.status).json({
            error: mpData.message || mpData.error || "Erro ao gerar cobrança Pix no Mercado Pago.",
            details: mpData
          });
        }

        const pointOfInteraction = mpData.point_of_interaction?.transaction_data;
        res.json({
          id: mpData.id,
          status: mpData.status,
          statusDetail: mpData.status_detail,
          qrCode: pointOfInteraction?.qr_code,
          qrCodeBase64: pointOfInteraction?.qr_code_base64,
          ticketUrl: pointOfInteraction?.ticket_url,
          amount: mpData.transaction_amount,
          dateOfExpiration: mpData.date_of_expiration
        });
      } catch (error: any) {
        console.error("Erro interno ao criar Pix no Mercado Pago:", error);
        res.status(500).json({ error: error.message || "Erro interno ao processar Pix." });
      }
    });

    // Mercado Pago Create Checkout Preference (Cartão de Crédito / Débito / Checkout Pro)
    app.post("/api/mercadopago/create-preference", async (req: Request, res: Response) => {
      try {
        const token = getMercadoPagoToken();
        if (!token) {
          return res.status(400).json({ 
            error: "Mercado Pago não configurado. Adicione a secret MERCADO_PAGO_ACCESS_TOKEN no AI Studio.",
            configured: false 
          });
        }

        const { items, orderId, payer, returnUrl } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: "Itens do pedido não fornecidos." });
        }

        const origin = req.headers.origin || req.headers.referer || "http://localhost:3000";
        const backUrlSuccess = returnUrl || `${origin}/?order=${orderId}&payment=success`;
        const backUrlFailure = returnUrl || `${origin}/?order=${orderId}&payment=failure`;
        const backUrlPending = returnUrl || `${origin}/?order=${orderId}&payment=pending`;

        const prefPayload: any = {
          items: items.map((it: any) => ({
            title: String(it.name || it.title || "Item do Ateliê").substring(0, 250),
            quantity: Number(it.quantity) || 1,
            unit_price: Number(Number(it.price || it.unit_price).toFixed(2)),
            currency_id: "BRL"
          })),
          payer: {
            name: payer?.name || "Cliente",
            email: (payer?.email?.trim() || "").includes("@") ? payer.email.trim() : "cliente@mercadopago.com"
          },
          external_reference: String(orderId || ""),
          back_urls: {
            success: backUrlSuccess,
            failure: backUrlFailure,
            pending: backUrlPending
          },
          auto_return: "approved",
          statement_descriptor: "ATELIE PAPELARIA"
        };

        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(prefPayload)
        });

        const mpData: any = await mpResponse.json();

        if (!mpResponse.ok) {
          console.error("Mercado Pago Preference Error:", mpData);
          return res.status(mpResponse.status).json({
            error: mpData.message || mpData.error || "Erro ao criar link de pagamento no Mercado Pago.",
            details: mpData
          });
        }

        res.json({
          id: mpData.id,
          initPoint: mpData.init_point,
          sandboxInitPoint: mpData.sandbox_init_point
        });
      } catch (error: any) {
        console.error("Erro interno ao criar preferência do Mercado Pago:", error);
        res.status(500).json({ error: error.message || "Erro interno ao processar link de pagamento." });
      }
    });

    // Mercado Pago Check Payment Status
    app.get("/api/mercadopago/check-payment/:paymentId", async (req: Request, res: Response) => {
      try {
        const token = getMercadoPagoToken();
        if (!token) {
          return res.status(400).json({ error: "Mercado Pago não configurado." });
        }

        const paymentId = req.params.paymentId;
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const mpData: any = await mpResponse.json();
        if (!mpResponse.ok) {
          return res.status(mpResponse.status).json({
            error: mpData.message || "Erro ao consultar pagamento.",
            details: mpData
          });
        }

        res.json({
          id: mpData.id,
          status: mpData.status, // "approved", "pending", "rejected", etc.
          statusDetail: mpData.status_detail,
          transactionAmount: mpData.transaction_amount,
          dateApproved: mpData.date_approved
        });
      } catch (error: any) {
        console.error("Erro ao verificar pagamento no Mercado Pago:", error);
        res.status(500).json({ error: error.message || "Erro interno ao consultar pagamento." });
      }
    });

    // Mercado Pago Webhook notification
    app.post("/api/mercadopago/webhook", (req: Request, res: Response) => {
      console.log("Mercado Pago Webhook Event received:", req.query, req.body);
      res.status(200).send("OK");
    });

    // API Route for Gemini content generation
    app.post("/api/generate", async (req: Request, res: Response) => {
      try {
        const { prompt, model: modelName = "gemini-3.8-flash", config } = req.body;
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        const isKnownLeakedKey = apiKey && apiKey.includes("AIzaSyDJ-j_lMJPyVYdV3_XZ7Uy0Z1NIQbBbSog");

        if (!apiKey || isKnownLeakedKey) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(400).json({ 
            error: "Sua chave de API do Gemini precisa ser renovada nas configurações do AI Studio. O Motor Criativo integrado continuará gerando seus conteúdos com perfeição.",
            isLeakedKey: true
          });
        }

        if (!prompt) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(400).json({ error: "O prompt é obrigatório." });
        }

        // Configuração recomendada com httpOptions e User-Agent
        const genAI = new GoogleGenAI({ 
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        
        const targetModel = (modelName === "gemini-1.5-flash" || modelName === "gemini-3.5-flash" || modelName === "gemini-3.7-flash") ? "gemini-3.8-flash" : modelName;

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
          return res.status(400).json({ error: errorMessage, rawError: rawMsg, isLeakedKey: true });
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
      app.get("*all", (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Gemini Key configured: ${!!process.env.GEMINI_API_KEY}`);
      console.log(`Mercado Pago Token configured: ${!!process.env.MERCADO_PAGO_ACCESS_TOKEN}`);
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
