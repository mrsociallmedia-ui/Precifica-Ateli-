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

    // Cadastro / Atualização de Cliente pelo Catálogo Online
    app.post("/api/catalog/customer/register", async (req: Request, res: Response) => {
      try {
        const { userEmail, customer } = req.body;
        if (!userEmail || !customer || !customer.name || !customer.phone) {
          return res.status(400).json({ error: "Dados incompletos do cliente ou do catálogo." });
        }

        const normalizedEmail = userEmail.trim().toLowerCase();
        const primarySupabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const primarySupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

        let appState: any = {};
        if (primarySupabaseUrl && primarySupabaseKey) {
          try {
            const getRes = await fetch(`${primarySupabaseUrl}/rest/v1/user_data?user_email=eq.${encodeURIComponent(normalizedEmail)}&select=app_state`, {
              headers: {
                'apikey': primarySupabaseKey,
                'Authorization': `Bearer ${primarySupabaseKey}`
              }
            });
            if (getRes.ok) {
              const rows: any = await getRes.json();
              if (rows && rows.length > 0 && rows[0].app_state) {
                appState = rows[0].app_state;
              }
            }
          } catch (fetchErr) {
            console.warn("Aviso ao carregar app_state para cadastro de cliente:", fetchErr);
          }
        }

        const craftCustomers = Array.isArray(appState.craft_customers) ? [...appState.craft_customers] : [];
        const cleanPhone = String(customer.phone).replace(/\D/g, '');
        const cleanEmail = String(customer.email || '').trim().toLowerCase();

        let existingCustomer = craftCustomers.find((c: any) => 
          (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone) ||
          (cleanEmail && c.email && c.email.toLowerCase().trim() === cleanEmail)
        );

        let customerId = existingCustomer ? existingCustomer.id : `cust_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

        const updatedCustomer = {
          id: customerId,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email ? customer.email.trim() : (existingCustomer?.email || ''),
          cpf: customer.cpf ? customer.cpf.trim() : (existingCustomer?.cpf || ''),
          address: customer.address ? customer.address.trim() : (existingCustomer?.address || ''),
          neighborhood: customer.neighborhood ? customer.neighborhood.trim() : (existingCustomer?.neighborhood || ''),
          city: customer.city ? customer.city.trim() : (existingCustomer?.city || ''),
          zipCode: customer.zipCode ? customer.zipCode.trim() : (existingCustomer?.zipCode || ''),
          complement: customer.complement ? customer.complement.trim() : (existingCustomer?.complement || ''),
          birthDate: existingCustomer?.birthDate || ''
        };

        if (existingCustomer) {
          const idx = craftCustomers.findIndex((c: any) => c.id === customerId);
          if (idx >= 0) craftCustomers[idx] = updatedCustomer;
        } else {
          craftCustomers.push(updatedCustomer);
        }

        appState.craft_customers = craftCustomers;

        if (primarySupabaseUrl && primarySupabaseKey) {
          await fetch(`${primarySupabaseUrl}/rest/v1/user_data`, {
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
        }

        res.json({
          success: true,
          customer: updatedCustomer
        });
      } catch (err: any) {
        console.warn("Aviso ao cadastrar cliente do catálogo:", err);
        res.status(500).json({ error: err?.message || "Erro ao cadastrar cliente." });
      }
    });

    // Consulta e Acompanhamento de Pedidos pelo Cliente no Catálogo Online
    app.get("/api/catalog/track-orders", async (req: Request, res: Response) => {
      try {
        const userEmail = (req.query.userEmail as string || '').trim().toLowerCase();
        const search = (req.query.search as string || '').trim();

        if (!userEmail) {
          return res.status(400).json({ error: "E-mail do catálogo não informado." });
        }

        const primarySupabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const primarySupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

        let appState: any = {};
        if (primarySupabaseUrl && primarySupabaseKey) {
          try {
            const getRes = await fetch(`${primarySupabaseUrl}/rest/v1/user_data?user_email=eq.${encodeURIComponent(userEmail)}&select=app_state`, {
              headers: {
                'apikey': primarySupabaseKey,
                'Authorization': `Bearer ${primarySupabaseKey}`
              }
            });
            if (getRes.ok) {
              const rows: any = await getRes.json();
              if (rows && rows.length > 0 && rows[0].app_state) {
                appState = rows[0].app_state;
              }
            }
          } catch (fetchErr) {
            console.warn("Aviso ao buscar projetos para acompanhamento:", fetchErr);
          }
        }

        const craftProjects = Array.isArray(appState.craft_projects) ? appState.craft_projects : [];
        const craftCustomers = Array.isArray(appState.craft_customers) ? appState.craft_customers : [];

        const cleanSearch = search.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanPhoneSearch = search.replace(/\D/g, '');

        // Encontrar clientes que batem com a busca (se for por telefone, nome ou email)
        const matchedCustomerIds = new Set<string>();
        if (search) {
          craftCustomers.forEach((c: any) => {
            const cPhone = String(c.phone || '').replace(/\D/g, '');
            const cEmail = String(c.email || '').toLowerCase().trim();
            const cName = String(c.name || '').toLowerCase().trim();

            if (
              (cleanPhoneSearch && cleanPhoneSearch.length >= 6 && cPhone.includes(cleanPhoneSearch)) ||
              (cEmail && search.includes('@') && cEmail === search.toLowerCase().trim()) ||
              (cName && search.length >= 3 && cName.includes(search.toLowerCase().trim()))
            ) {
              matchedCustomerIds.add(c.id);
            }
          });
        }

        // Filtrar projetos
        const matchedProjects = craftProjects.filter((p: any) => {
          if (!search) return false;

          const pQuote = String(p.quoteNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const pName = String(p.name || '').toLowerCase();
          const pCelebrant = String(p.celebrantName || '').toLowerCase();
          const pNotes = String(p.notes || '').toLowerCase();

          // 1. Bateu por número do pedido (ex: #PED-1234 ou 1234)
          if (cleanSearch && pQuote.includes(cleanSearch)) return true;

          // 2. Bateu com o cliente associado
          if (p.customerId && matchedCustomerIds.has(p.customerId)) return true;

          // 3. Bateu pelo telefone anotado nas observações ou notas
          if (cleanPhoneSearch && cleanPhoneSearch.length >= 6 && pNotes.replace(/\D/g, '').includes(cleanPhoneSearch)) return true;

          // 4. Bateu pelo nome do cliente no pedido
          if (search.length >= 3 && (pCelebrant.includes(search.toLowerCase()) || pName.includes(search.toLowerCase()))) return true;

          return false;
        });

        // Mapear para objeto de acompanhamento claro para o cliente
        const orders = matchedProjects.map((p: any) => {
          const cust = craftCustomers.find((c: any) => c.id === p.customerId);
          return {
            id: p.id,
            orderNum: p.quoteNumber || p.id,
            date: p.orderDate || p.createdAt || new Date().toISOString(),
            createdAt: p.createdAt || p.orderDate,
            dueDate: p.dueDate || p.deliveryDate,
            deliveryDate: p.deliveryDate || p.dueDate,
            status: p.status || 'pending',
            celebrantName: p.celebrantName || cust?.name || 'Cliente',
            theme: p.theme || 'Catálogo Online',
            description: p.description || '',
            notes: p.notes || '',
            observations: p.observations || '',
            items: Array.isArray(p.items) ? p.items.map((it: any) => ({
              name: it.name || 'Produto',
              quantity: it.quantity || 1,
              price: it.unitPrice || 0
            })) : [],
            total: Number(p.downPayment) || 0,
            paymentMethod: p.paymentMethod || 'Pix',
            paidAt: p.paidAt,
            customer: cust ? {
              name: cust.name,
              phone: cust.phone,
              address: cust.address,
              neighborhood: cust.neighborhood,
              city: cust.city
            } : undefined
          };
        });

        res.json({
          success: true,
          orders
        });
      } catch (err: any) {
        console.warn("Aviso ao buscar pedidos para acompanhamento:", err);
        res.status(500).json({ error: err?.message || "Erro ao consultar pedidos." });
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
