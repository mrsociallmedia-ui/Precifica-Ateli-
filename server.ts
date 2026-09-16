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
          : `${(payer?.phone || "cliente").replace(/\D/g, "") || "cliente"}@gmail.com`;

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
          // Verificar se o erro é por ausência de chave Pix habilitada na conta do recebedor (13253 / Financial Identity Use Case / Collector user without key)
          const isMissingPixKey = 
            mpData?.message?.includes("Collector user without key") ||
            mpData?.cause?.some((c: any) => c.code === 13253 || c.description?.includes("Financial Identity")) ||
            JSON.stringify(mpData).includes("Financial Identity") ||
            JSON.stringify(mpData).includes("Collector user without key");

          if (isMissingPixKey) {
            console.log("Mercado Pago: Conta sem chave Pix cadastrada para QR direto no v1/payments. Gerando link oficial do Checkout Pro...");
            try {
              const prefResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  items: [{
                    title: description || `Pedido #${orderId || 'Online'} - Ateliê`,
                    quantity: 1,
                    unit_price: Number(numAmount.toFixed(2)),
                    currency_id: "BRL"
                  }],
                  payer: {
                    name: payerName,
                    email: payerEmail
                  },
                  external_reference: String(orderId || "")
                })
              });

              if (prefResponse.ok) {
                const prefData: any = await prefResponse.json();
                return res.json({
                  fallbackToPreference: true,
                  initPoint: prefData.init_point,
                  sandboxInitPoint: prefData.sandbox_init_point,
                  id: prefData.id,
                  amount: numAmount,
                  missingPixKeyNotice: true,
                  message: "Para ativar o QR Code dinâmico do Pix direto no catálogo, cadastre uma Chave Pix no app do Mercado Pago (Menu > Seu Perfil > Chaves Pix). Enquanto isso, o cliente pode pagar com segurança pelo link oficial gerado abaixo!"
                });
              }
            } catch (prefErr) {
              console.warn("Aviso ao gerar preference fallback:", prefErr);
            }
          }

          console.warn("Mercado Pago Pix resposta de validação:", mpData?.message || mpData?.error || "Aviso no processamento Pix");

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
        console.warn("Aviso interno ao criar Pix no Mercado Pago:", error?.message || error);
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

        const origin = req.headers.origin || req.headers.referer || "";
        const cleanOrigin = origin.startsWith("http") ? origin.replace(/\/$/, "") : "";

        const prefPayload: any = {
          items: items.map((it: any) => ({
            title: String(it.name || it.title || "Item do Ateliê").substring(0, 250),
            quantity: Number(it.quantity) || 1,
            unit_price: Number(Number(it.price || it.unit_price).toFixed(2)),
            currency_id: "BRL"
          })),
          payer: {
            name: payer?.name || "Cliente",
            email: (payer?.email?.trim() || "").includes("@") ? payer.email.trim() : "cliente.pedidos@gmail.com"
          },
          external_reference: String(orderId || ""),
          statement_descriptor: "ATELIE PAPELARIA"
        };

        if (cleanOrigin && cleanOrigin.startsWith("https")) {
          prefPayload.back_urls = {
            success: `${cleanOrigin}/?order=${orderId}&payment=success`,
            failure: `${cleanOrigin}/?order=${orderId}&payment=failure`,
            pending: `${cleanOrigin}/?order=${orderId}&payment=pending`
          };
          prefPayload.auto_return = "approved";
        }

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
          console.warn("Mercado Pago Preference Aviso:", mpData?.message || mpData?.error);
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
        console.warn("Aviso interno ao criar preferência do Mercado Pago:", error?.message || error);
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
        console.warn("Aviso ao verificar pagamento no Mercado Pago:", error?.message || error);
        res.status(500).json({ error: error.message || "Erro interno ao consultar pagamento." });
      }
    });

    // Mercado Pago Webhook notification
    app.post("/api/mercadopago/webhook", (req: Request, res: Response) => {
      console.log("Mercado Pago Webhook Event received:", req.query, req.body);
      res.status(200).send("OK");
    });

    // API Route: Submeter Pedido do Catálogo Online (Automação de Cronograma + Financeiro)
    app.post("/api/catalog/submit-order", async (req: Request, res: Response) => {
      try {
        const {
          userEmail,
          orderNum,
          customerName,
          customerPhone,
          customerEmail,
          deliveryType,
          deliveryAddress,
          deliveryNeighborhood,
          deliveryCity,
          paymentMethod,
          cartTotal,
          items,
          orderObservations
        } = req.body;

        if (!userEmail || !customerName) {
          return res.status(400).json({ error: "E-mail do ateliê e nome do cliente são obrigatórios." });
        }

        const normalizedEmail = String(userEmail).toLowerCase().trim();
        const primarySupabaseUrl = process.env.VITE_SUPABASE_URL || 'https://scnjxuzapasdfgevegds.supabase.co';
        const primarySupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbmp4dXphcGFzZGZnZXZlZ2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDMzMzQsImV4cCI6MjA4NjQ3OTMzNH0.syp0Raq5x9q3zz8zNkhsKvcui62lNqEWZ95uKPsXwow';

        // 1. Buscar app_state atual do usuário
        let appState: any = {};
        try {
          const fetchRes = await fetch(`${primarySupabaseUrl}/rest/v1/user_data?user_email=eq.${encodeURIComponent(normalizedEmail)}&select=app_state`, {
            headers: {
              'apikey': primarySupabaseKey,
              'Authorization': `Bearer ${primarySupabaseKey}`
            }
          });
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            if (Array.isArray(data) && data.length > 0 && data[0]?.app_state) {
              appState = data[0].app_state;
            }
          }
        } catch (e) {
          console.warn("Aviso ao buscar estado no Supabase:", e);
        }

        const craftCustomers = Array.isArray(appState.craft_customers) ? [...appState.craft_customers] : [];
        const craftProjects = Array.isArray(appState.craft_projects) ? [...appState.craft_projects] : [];
        const craftTransactions = Array.isArray(appState.craft_transactions) ? [...appState.craft_transactions] : [];
        const craftTransCategories = Array.isArray(appState.craft_trans_categories) ? [...appState.craft_trans_categories] : ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Permuta', 'Outros'];

        // Encontrar ou cadastrar cliente
        const cleanPhone = (customerPhone || '').replace(/\D/g, '');
        let existingCustomer = craftCustomers.find((c: any) => 
          (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone) ||
          (c.name && c.name.toLowerCase().trim() === String(customerName).toLowerCase().trim())
        );

        let customerId = existingCustomer ? existingCustomer.id : `cust_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
        if (!existingCustomer) {
          const newCustomer = {
            id: customerId,
            name: customerName.trim(),
            birthDate: '',
            phone: customerPhone ? customerPhone.trim() : '',
            address: deliveryAddress ? deliveryAddress.trim() : '',
            neighborhood: deliveryNeighborhood ? deliveryNeighborhood.trim() : '',
            zipCode: ''
          };
          craftCustomers.push(newCustomer);
          appState.craft_customers = craftCustomers;
        }

        // Criar Projeto (Cronograma)
        const projectId = `proj_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date();
        const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateStr = now.toISOString().split('T')[0];
        const orderItems = Array.isArray(items) ? items : [];

        const itemsSummary = orderItems.map((i: any) => `${i.quantity || 1}x ${i.product?.name || i.name || 'Produto'}`).join(', ');

        const newProject = {
          id: projectId,
          name: `Pedido Catálogo: ${customerName.trim()}`,
          customerId: customerId,
          description: itemsSummary || 'Pedido realizado pelo Catálogo Online',
          observations: orderObservations ? String(orderObservations).trim() : '',
          notes: `Origem: Catálogo Online • Pedido ${orderNum || ''}\nModalidade: ${deliveryType === 'pickup' ? 'Retirada no Ateliê' : `Entrega: ${deliveryAddress || ''} ${deliveryNeighborhood ? `- ${deliveryNeighborhood}` : ''} ${deliveryCity ? `- ${deliveryCity}` : ''}`}\nPagamento: ${paymentMethod === 'pix' ? 'Pix' : 'Cartão de Crédito'}`,
          items: orderItems.map((i: any) => ({
            productId: i.product?.id || i.productId,
            name: i.product?.name || i.name || 'Produto',
            quantity: Number(i.quantity) || 1,
            hoursToMake: ((Number(i.product?.minutesToMake) || 60) / 60),
            materials: i.product?.materials || [],
            profitMargin: Number(i.product?.profitMargin) || 30,
            unitPrice: Number(i.price) || Number(i.product?.marketPrice) || 0,
            manualBaseCost: Number(i.product?.manualBaseCost) || 0,
            packagingCost: Number(i.product?.packagingCost) || 0,
            minOrderQuantity: Number(i.product?.minOrderQuantity) || 1
          })),
          platformId: '',
          excedente: 0,
          status: 'pending', // Aparece na coluna "Aguardando" no Cronograma
          createdAt: now.toISOString(),
          dueDate: dueDate,
          orderDate: dateStr,
          deliveryDate: dueDate,
          theme: orderObservations ? String(orderObservations).trim().slice(0, 40) : 'Catálogo Online',
          celebrantName: customerName.trim(),
          celebrantAge: '',
          quoteNumber: orderNum || `#PED-${Math.floor(1000 + Math.random() * 9000)}`,
          paymentMethod: paymentMethod === 'pix' ? 'Pix' : 'Cartão de Crédito',
          paidAt: now.toISOString(),
          hoursToMake: orderItems.reduce((acc: number, i: any) => acc + (((Number(i.product?.minutesToMake) || 60) / 60) * (Number(i.quantity) || 1)), 0),
          materials: [],
          profitMargin: 30,
          quantity: orderItems.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 1), 0),
          downPayment: Number(cartTotal) || 0
        };

        // Criar Transação (Financeiro)
        const transactionId = `tx_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const newTransaction = {
          id: transactionId,
          description: `Compra pelo Catálogo - ${customerName.trim()} (${orderNum || newProject.quoteNumber})`,
          amount: Number(cartTotal) || 0,
          type: 'income',
          category: 'Compra pelo Catálogo',
          paymentMethod: paymentMethod === 'pix' ? 'Pix' : 'Cartão de Crédito',
          date: dateStr,
          status: 'paid',
          projectId: projectId,
          customerId: customerId
        };

        // Adicionar categoria 'Compra pelo Catálogo' se não existir
        if (!craftTransCategories.includes('Compra pelo Catálogo')) {
          craftTransCategories.push('Compra pelo Catálogo');
          appState.craft_trans_categories = craftTransCategories;
        }

        // Adicionar projeto e transação
        craftProjects.unshift(newProject);
        craftTransactions.unshift(newTransaction);

        appState.craft_projects = craftProjects;
        appState.craft_transactions = craftTransactions;

        // Salvar via Supabase REST Upsert
        const saveRes = await fetch(`${primarySupabaseUrl}/rest/v1/user_data`, {
          method: 'POST',
          headers: {
            'apikey': primarySupabaseKey,
            'Authorization': `Bearer ${primarySupabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_email: normalizedEmail,
            app_state: appState,
            updated_at: new Date().toISOString()
          })
        });

        if (!saveRes.ok) {
          const errText = await saveRes.text();
          console.warn("Aviso ao salvar pedido no Supabase via REST:", errText);
        }

        res.json({
          success: true,
          project: newProject,
          transaction: newTransaction,
          customerId: customerId
        });
      } catch (error: any) {
        console.warn("Aviso ao registrar pedido automatizado do catálogo:", error?.message || error);
        res.status(500).json({ error: error.message || "Erro interno ao processar pedido." });
      }
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
