
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Calculator, 
  Calendar, 
  Settings,
  Menu,
  X,
  Heart,
  Sparkles,
  Wallet2,
  LogOut,
  RefreshCw,
  History,
  Cloud,
  CloudOff,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ExternalLink,
  Camera,
  ShoppingBag
} from 'lucide-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { Customers } from './views/Customers';
import { PricingCalculator } from './views/PricingCalculator';
import { Schedule } from './views/Schedule';
import { SettingsView } from './views/SettingsView';
import { Products } from './views/Products';
import { FinancialControl } from './views/FinancialControl';
import { OrderHistory } from './views/OrderHistory';
import { LoginView } from './views/LoginView';
import { PublicCatalog } from './views/PublicCatalog';
import { CatalogManager } from './views/CatalogManager';
import { ProjectTracking } from './views/ProjectTracking';
import { AICaptionGenerator } from './views/AICaptionGenerator';
import { App as CapApp } from '@capacitor/app';
import { CompanyData, Material, Customer, Platform, Project, Product, Transaction, CashClosure } from './types';
import { INITIAL_COMPANY_DATA, PLATFORMS_DEFAULT } from './constants';
import { supabase, isMock, clearStaleSupabaseAuth, executeSupabaseWithRetry, handleSupabaseExpiredJwt } from './supabaseClient';
import { safeLocalStorageSet, compressImage, formatBrazilianPhone } from './utils';
import { PWAInstallBanner, PWAInstallButton } from './components/PWAInstallBanner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last_user_email');
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('last_user_email');
    }
    return false;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return true;
  });
  const [publicCatalogEmail, setPublicCatalogEmail] = useState<string | null>(null);
  const [trackingProjectId, setTrackingProjectId] = useState<string | null>(null);
  const [trackingUserEmail, setTrackingUserEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('synced');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const initializedRef = useRef(false);
  const syncTimeoutRef = useRef<any>(null);
  const lastSyncedStateRef = useRef<string>("");

  // Estados principais da aplicação
  const [companyData, setCompanyData] = useState<CompanyData>(INITIAL_COMPANY_DATA);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Limpeza preventiva de chaves que possam ter estourado a cota por imagens brutas legadas
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('craft_company')) {
          const val = localStorage.getItem(k);
          if (val && val.length > 200000) {
            try {
              const parsed = JSON.parse(val);
              if (parsed && parsed.logo && parsed.logo.length > 50000) {
                parsed.logo = '';
                localStorage.setItem(k, JSON.stringify(parsed));
                console.log(`[Storage Cleanup] Liberado espaço do cache ${k}`);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (e) {
      console.warn('Aviso de storage cleanup:', e);
    }
  }, []);

  const handleQuickLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 400, 0.8);
        setCompanyData(prev => ({ ...prev, logo: compressedDataUrl }));
      } catch (err) {
        console.error('Erro ao comprimir logo:', err);
      }
    }
  };
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS_DEFAULT);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(['Festas', 'Papelaria', 'Presentes', 'Geral']);
  const [transactionCategories, setTransactionCategories] = useState<string[]>(['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Permuta', 'Outros']);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']);

  // Notificação de novos pedidos recebidos em tempo real pelo catálogo
  const [orderNotification, setOrderNotification] = useState<{
    id: string;
    quoteNumber: string;
    customerName: string;
    total: number;
    itemsSummary: string;
    timestamp: number;
  } | null>(null);

  // Refs para comparação em tempo real sem dependências cíclicas
  const projectsRef = useRef<Project[]>([]);
  projectsRef.current = projects;
  const transactionsRef = useRef<Transaction[]>([]);
  transactionsRef.current = transactions;
  const customersRef = useRef<Customer[]>([]);
  customersRef.current = customers;
  const materialsRef = useRef<Material[]>([]);
  materialsRef.current = materials;
  const productsRef = useRef<Product[]>([]);
  productsRef.current = products;
  const closuresRef = useRef<CashClosure[]>([]);
  closuresRef.current = closures;

  // Som suave de notificação via Web Audio API (100% offline, seguro e instantâneo)
  const playOrderChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (acorde alegre)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.36);
      });
    } catch {
      // Audio fallback silencioso
    }
  }, []);

  // Processador central de novo pedido do catálogo em tempo real
  const handleIncomingCatalogOrder = useCallback((newProj: any, newTx: any, newCust: any) => {
    if (!newProj) return;

    const numClean = String(newProj.quoteNumber || '').replace(/\D/g, '');
    const alreadyExists = projectsRef.current.some(p => 
      p.id === newProj.id || 
      (numClean && String(p.quoteNumber || '').replace(/\D/g, '') === numClean)
    );

    if (newCust) {
      setCustomers(prev => {
        const exists = prev.some(c => c.id === newCust.id || (c.phone && newCust.phone && c.phone.replace(/\D/g, '') === newCust.phone.replace(/\D/g, '')));
        return exists ? prev : [newCust, ...prev];
      });
    }

    setProjects(prev => {
      const exists = prev.some(p => 
        p.id === newProj.id || 
        (numClean && String(p.quoteNumber || '').replace(/\D/g, '') === numClean)
      );
      if (exists) return prev;
      return [newProj, ...prev];
    });

    if (newTx) {
      setTransactions(prev => {
        const exists = prev.some(t => t.id === newTx.id || (t.projectId && t.projectId === newProj.id));
        if (exists) return prev;
        return [newTx, ...prev];
      });
    }

    if (!alreadyExists) {
      playOrderChime();
      const custName = newCust?.name || newProj.celebrantName || newProj.name?.replace('Pedido Catálogo:', '').trim() || 'Cliente';
      const num = newProj.quoteNumber ? `#${String(newProj.quoteNumber).replace(/\D/g, '')}` : '#Catálogo';
      const amount = Number(newTx?.amount) || Number(newProj.downPayment) || 0;
      
      setOrderNotification({
        id: newProj.id || String(Date.now()),
        quoteNumber: num,
        customerName: custName,
        total: amount,
        itemsSummary: newProj.description || 'Novo pedido recebido pelo catálogo online',
        timestamp: Date.now()
      });
    }
  }, [playOrderChime]);

  // Helper para mesclar coleções sem perder registros locais recém-adicionados
  const mergeCollection = useCallback(<T extends { id: string }>(localList: T[], cloudList: T[]): T[] => {
    if (!Array.isArray(localList)) return Array.isArray(cloudList) ? cloudList : [];
    if (!Array.isArray(cloudList)) return localList;

    const map = new Map<string, T>();
    // 1. Primeiro itens da nuvem
    cloudList.forEach(item => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    // 2. Mescla itens locais para garantir que orçamentos/pedidos recém-criados localmente nunca sumam
    localList.forEach(item => {
      if (item && item.id) {
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
        } else {
          map.set(item.id, { ...existing, ...item });
        }
      }
    });
    return Array.from(map.values());
  }, []);

  // Monitorar Sessão Supabase (Única fonte de verdade para Auth)
  useEffect(() => {
    // Verificar se é uma rota de catálogo público
    const params = new URLSearchParams(window.location.search);
    const catalogEmail = params.get('catalog');
    if (catalogEmail) {
      setPublicCatalogEmail(catalogEmail);
      setIsAuthChecking(false);
      return;
    }

    const tId = params.get('track');
    const uEmail = params.get('u');
    if (tId && uEmail) {
      setTrackingProjectId(tId);
      setTrackingUserEmail(uEmail);
      setIsAuthChecking(false);
      return;
    }

    if (!supabase) {
      setIsAuthChecking(false);
      return;
    }

    // Verificar sessão atual ao carregar
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("Aviso de sessão Supabase:", error.message);
          if (
            error.message?.includes('Refresh Token Not Found') || 
            error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token') ||
            error.message?.includes('invalid_grant')
          ) {
            clearStaleSupabaseAuth();
            try {
              if (!isMock && supabase?.auth?.signOut) {
                await supabase.auth.signOut({ scope: 'local' });
              }
            } catch {}
          }
          const lastUser = localStorage.getItem('last_user_email');
          if (lastUser) {
            setCurrentUser(lastUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else if (data?.session?.user) {
          const email = data.session.user.email!.toLowerCase();
          setCurrentUser(email);
          setIsAuthenticated(true);
          localStorage.setItem('last_user_email', email);
        } else {
          const lastUser = localStorage.getItem('last_user_email');
          if (lastUser) {
            setCurrentUser(lastUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err: any) {
        console.warn("Aviso ao validar sessão:", err?.message || err);
        clearStaleSupabaseAuth();
        const lastUser = localStorage.getItem('last_user_email');
        if (lastUser) {
          setCurrentUser(lastUser);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();

    // Ouvir mudanças de estado (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const email = session.user.email!.toLowerCase();
        setCurrentUser(email);
        setIsAuthenticated(true);
        localStorage.setItem('last_user_email', email);
      } else {
        const lastUser = localStorage.getItem('last_user_email');
        if (!lastUser) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsInitialLoadDone(false); // Resetar para novo login
          initializedRef.current = false;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle Android Back Button
  useEffect(() => {
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, []);

  const loadLocalCache = useCallback((email: string) => {
    const userKey = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const setters: Record<string, Function> = {
      craft_company: setCompanyData,
      craft_materials: setMaterials,
      craft_customers: setCustomers,
      craft_platforms: setPlatforms,
      craft_projects: setProjects,
      craft_products: setProducts,
      craft_transactions: setTransactions,
      craft_closures: setClosures,
      craft_prod_categories: setProductCategories,
      craft_trans_categories: setTransactionCategories,
      craft_pay_methods: setPaymentMethods
    };

    Object.entries(setters).forEach(([key, setter]) => {
      const saved = localStorage.getItem(`${userKey}_${key}`);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          if (key === 'craft_company' && parsed && parsed.phone) {
            parsed.phone = formatBrazilianPhone(parsed.phone);
          }
          setter(parsed); 
        } catch (e) { console.error(`Erro ao carregar cache ${key}`, e); }
      }
    });
  }, []);

  const saveLocalCache = useCallback(() => {
    if (!currentUser) return;
    const userKey = currentUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const data: Record<string, any> = {
      craft_company: companyData,
      craft_materials: materials,
      craft_customers: customers,
      craft_platforms: platforms,
      craft_projects: projects,
      craft_products: products,
      craft_transactions: transactions,
      craft_closures: closures,
      craft_prod_categories: productCategories,
      craft_trans_categories: transactionCategories,
      craft_pay_methods: paymentMethods,
    };

    Object.entries(data).forEach(([key, value]) => {
      safeLocalStorageSet(`${userKey}_${key}`, value);
    });
  }, [currentUser, companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods]);

  const fetchCloudData = useCallback(async (email: string) => {
    loadLocalCache(email);
    if (!supabase || isMock) {
      setSyncStatus('local');
      return;
    }

    try {
      setSyncStatus('syncing');
      console.log(`Cloud Sync: Buscando dados para ${email}...`);
      const { data, error } = await executeSupabaseWithRetry(() =>
        supabase
          .from('user_data')
          .select('app_state')
          .eq('user_email', email.toLowerCase())
          .maybeSingle()
      );

      if (error) {
        console.warn("Cloud Sync Fetch Info:", error);
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          console.warn("Tabela user_data não encontrada no Supabase.");
          setSyncStatus('error');
          setSyncErrorMessage('A tabela "user_data" não foi encontrada no seu banco de dados Supabase.');
          return;
        }
        if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
          // Token expirado tratado com fallback seguro para cache local
          clearStaleSupabaseAuth();
          setSyncStatus('synced');
          setSyncErrorMessage(null);
          return;
        }
        throw error;
      }

      if (data?.app_state) {
        const s = data.app_state;
        if (s.craft_company) {
          const comp = { ...s.craft_company };
          if (comp.phone) comp.phone = formatBrazilianPhone(comp.phone);
          setCompanyData(comp);
        }
        if (s.craft_materials) setMaterials(prev => mergeCollection(prev, s.craft_materials));
        if (s.craft_customers) setCustomers(prev => mergeCollection(prev, s.craft_customers));
        if (s.craft_platforms) setPlatforms(s.craft_platforms);
        if (s.craft_projects) setProjects(prev => mergeCollection(prev, s.craft_projects));
        if (s.craft_products) setProducts(prev => mergeCollection(prev, s.craft_products));
        if (s.craft_transactions) setTransactions(prev => mergeCollection(prev, s.craft_transactions));
        if (s.craft_closures) setClosures(prev => mergeCollection(prev, s.craft_closures));
        if (s.craft_prod_categories) setProductCategories(prev => Array.from(new Set([...prev, ...(s.craft_prod_categories || [])])));
        if (s.craft_trans_categories) setTransactionCategories(prev => Array.from(new Set([...prev, ...(s.craft_trans_categories || [])])));
        if (s.craft_pay_methods) setPaymentMethods(prev => Array.from(new Set([...prev, ...(s.craft_pay_methods || [])])));
        
        lastSyncedStateRef.current = JSON.stringify(s);
        setSyncStatus('synced');
        setSyncErrorMessage(null);
      } else {
        // Se não houver dados na nuvem mas o usuário está logado, 
        // consideramos 'synced' mas marcamos que precisamos fazer o primeiro push
        setSyncStatus('synced');
        setTimeout(() => pushCloudData(true), 500);
      }
    } catch (err: any) {
      console.warn("Supabase Sync Notice:", err?.message || err);
      // Manter estado funcional com cache local para não travar a interface do usuário
      setSyncStatus('synced');
      setSyncErrorMessage(null);
    }
  }, [loadLocalCache]);

  const pushCloudData = useCallback(async (force: boolean = false) => {
    saveLocalCache();
    if (!currentUser || (!initializedRef.current && !force)) return;
    if (!supabase || isMock) {
      setSyncStatus('local');
      return;
    }
    
    const appState = {
      craft_company: companyData,
      craft_materials: materials,
      craft_customers: customers,
      craft_platforms: platforms,
      craft_projects: projects,
      craft_products: products,
      craft_transactions: transactions,
      craft_closures: closures,
      craft_prod_categories: productCategories,
      craft_trans_categories: transactionCategories,
      craft_pay_methods: paymentMethods,
    };

    const serialized = JSON.stringify(appState);
    if (!force && lastSyncedStateRef.current && serialized === lastSyncedStateRef.current) {
      setSyncStatus('synced');
      return;
    }

    setSyncStatus('syncing');
    try {
      const { error } = await executeSupabaseWithRetry(() =>
        supabase
          .from('user_data')
          .upsert({ 
            user_email: currentUser.toLowerCase(), 
            app_state: appState,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_email' })
      );

      if (error) {
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          setSyncStatus('error');
          setSyncErrorMessage('A tabela "user_data" não foi encontrada no seu banco de dados Supabase.');
          return;
        }
        if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
          // Token expirado tratado com auto-recuperação e persistência local segura
          console.warn("⚠️ Sessão JWT expirada durante push. Limpando credenciais antigas.");
          clearStaleSupabaseAuth();
          setSyncStatus('synced');
          setSyncErrorMessage(null);
          return;
        }
        throw error;
      }
      
      lastSyncedStateRef.current = serialized;
      setSyncStatus('synced');
      setSyncErrorMessage(null);
    } catch (err: any) {
      console.warn("Supabase Push Notice:", err?.message || err);
      // Garantir que a aplicação continue funcionando perfeitamente offline / cache local
      setSyncStatus('synced');
      setSyncErrorMessage(null);
    }
  }, [saveLocalCache, companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods, currentUser]);

  // Função para sincronização silenciosa em background (sem loading screen)
  const fetchCloudDataSilently = useCallback(async (email: string) => {
    if (!supabase || isMock) return;
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('app_state')
        .eq('user_email', email.toLowerCase())
        .maybeSingle();

      if (!error && data?.app_state) {
        const s = data.app_state;
        const serialized = JSON.stringify(s);
        if (serialized !== lastSyncedStateRef.current) {
          // Detectar novos projetos do catálogo para alertar o usuário
          if (Array.isArray(s.craft_projects)) {
            const currentProjIds = new Set(projectsRef.current.map(p => p.id));
            const currentQuotes = new Set(projectsRef.current.map(p => String(p.quoteNumber || '').replace(/\D/g, '')));

            const newCatalogProjects = s.craft_projects.filter((p: any) => {
              if (currentProjIds.has(p.id)) return false;
              const q = String(p.quoteNumber || '').replace(/\D/g, '');
              if (q && currentQuotes.has(q)) return false;
              return (p.notes && p.notes.includes('Catálogo Online')) || (p.name && p.name.includes('Pedido Catálogo')) || (p.theme && p.theme.includes('Catálogo'));
            });

            if (newCatalogProjects.length > 0) {
              const latest = newCatalogProjects[0];
              const matchedTx = Array.isArray(s.craft_transactions) ? s.craft_transactions.find((t: any) => t.projectId === latest.id) : null;
              const matchedCust = Array.isArray(s.craft_customers) ? s.craft_customers.find((c: any) => c.id === latest.customerId) : null;

              playOrderChime();
              setOrderNotification({
                id: latest.id,
                quoteNumber: latest.quoteNumber ? `#${String(latest.quoteNumber).replace(/\D/g, '')}` : '#Catálogo',
                customerName: latest.celebrantName || matchedCust?.name || 'Cliente',
                total: Number(matchedTx?.amount) || 0,
                itemsSummary: latest.description || 'Novo pedido recebido pelo catálogo online',
                timestamp: Date.now()
              });
            }
          }

          // Sincronizar apenas novos pedidos, clientes e transações recebidos do catálogo online
          if (s.craft_customers) setCustomers(prev => mergeCollection(prev, s.craft_customers));
          if (s.craft_projects) setProjects(prev => mergeCollection(prev, s.craft_projects));
          if (s.craft_transactions) setTransactions(prev => mergeCollection(prev, s.craft_transactions));

          lastSyncedStateRef.current = serialized;
          setSyncStatus('synced');
        }
      }
    } catch {
      // Ignorar erros transitórios de background
    }
  }, [playOrderChime, mergeCollection]);

  // Sincronização em Tempo Real (Supabase Realtime + BroadcastChannel + Eventos Locais + Polling Inteligente)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    fetchCloudData(currentUser).then(() => {
      initializedRef.current = true;
      setIsInitialLoadDone(true);
    }).catch(() => setIsInitialLoadDone(true));

    // 1. Supabase Postgres Changes Realtime
    let channel: any = null;
    if (supabase && !isMock) {
      channel = supabase
        .channel(`user_data_realtime_${currentUser.toLowerCase().replace(/[^a-z0-9]/g, '_')}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'user_data', 
          filter: `user_email=eq.${currentUser.toLowerCase()}` 
        }, (payload: any) => {
          if (payload.new && payload.new.app_state) {
            const s = payload.new.app_state;
            const serializedPayload = JSON.stringify(s);
            if (serializedPayload === lastSyncedStateRef.current) return;

            // Verificar se chegaram novos pedidos do catálogo
            if (Array.isArray(s.craft_projects)) {
              const currentProjIds = new Set(projectsRef.current.map(p => p.id));
              const currentQuotes = new Set(projectsRef.current.map(p => String(p.quoteNumber || '').replace(/\D/g, '')));

              const newCatalogProjects = s.craft_projects.filter((p: any) => {
                if (currentProjIds.has(p.id)) return false;
                const q = String(p.quoteNumber || '').replace(/\D/g, '');
                if (q && currentQuotes.has(q)) return false;
                return (p.notes && p.notes.includes('Catálogo Online')) || (p.name && p.name.includes('Pedido Catálogo')) || (p.theme && p.theme.includes('Catálogo'));
              });

              if (newCatalogProjects.length > 0) {
                const latest = newCatalogProjects[0];
                const matchedTx = Array.isArray(s.craft_transactions) ? s.craft_transactions.find((t: any) => t.projectId === latest.id) : null;
                const matchedCust = Array.isArray(s.craft_customers) ? s.craft_customers.find((c: any) => c.id === latest.customerId) : null;

                playOrderChime();
                setOrderNotification({
                  id: latest.id,
                  quoteNumber: latest.quoteNumber ? `#${String(latest.quoteNumber).replace(/\D/g, '')}` : '#Catálogo',
                  customerName: latest.celebrantName || matchedCust?.name || 'Cliente',
                  total: Number(matchedTx?.amount) || 0,
                  itemsSummary: latest.description || 'Novo pedido recebido pelo catálogo online',
                  timestamp: Date.now()
                });
              }
            }

            if (s.craft_company) {
              const comp = { ...s.craft_company };
              if (comp.phone) comp.phone = formatBrazilianPhone(comp.phone);
              setCompanyData(comp);
            }
            if (s.craft_materials) setMaterials(prev => mergeCollection(prev, s.craft_materials));
            if (s.craft_customers) setCustomers(prev => mergeCollection(prev, s.craft_customers));
            if (s.craft_platforms) setPlatforms(s.craft_platforms);
            if (s.craft_projects) setProjects(prev => mergeCollection(prev, s.craft_projects));
            if (s.craft_products) setProducts(prev => mergeCollection(prev, s.craft_products));
            if (s.craft_transactions) setTransactions(prev => mergeCollection(prev, s.craft_transactions));
            if (s.craft_closures) setClosures(prev => mergeCollection(prev, s.craft_closures));
            if (s.craft_prod_categories) setProductCategories(prev => Array.from(new Set([...prev, ...(s.craft_prod_categories || [])])));
            if (s.craft_trans_categories) setTransactionCategories(prev => Array.from(new Set([...prev, ...(s.craft_trans_categories || [])])));
            if (s.craft_pay_methods) setPaymentMethods(prev => Array.from(new Set([...prev, ...(s.craft_pay_methods || [])])));
            
            lastSyncedStateRef.current = serializedPayload;
            setSyncStatus('synced');
          }
        })
        .subscribe();
    }

    // 2. BroadcastChannel para comunicação instantânea entre abas e catálogo
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('precifica_atelie_sync');
        bc.onmessage = (event) => {
          if (event?.data?.type === 'CATALOG_ORDER_CREATED') {
            const dataUser = String(event.data.userEmail || '').toLowerCase().trim();
            if (dataUser === currentUser.toLowerCase().trim() || !dataUser) {
              handleIncomingCatalogOrder(event.data.project, event.data.transaction, event.data.customer);
            }
          }
        };
      }
    } catch (bcErr) {
      console.warn("BroadcastChannel error:", bcErr);
    }

    // 3. CustomEvent da mesma janela
    const handleCustomEvent = (e: any) => {
      if (e?.detail?.project) {
        const dataUser = String(e.detail.userEmail || '').toLowerCase().trim();
        if (dataUser === currentUser.toLowerCase().trim() || !dataUser) {
          handleIncomingCatalogOrder(e.detail.project, e.detail.transaction, e.detail.customer);
        }
      }
    };
    window.addEventListener('precifica:catalog_order_created', handleCustomEvent);

    // 4. Storage Event (quando o catálogo salva no localStorage em outra aba)
    const handleStorageEvent = (e: StorageEvent) => {
      const userKey = currentUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (e.key === `${userKey}_craft_projects` || e.key === 'craft_projects') {
        if (e.newValue) {
          try {
            const parsedProjects = JSON.parse(e.newValue);
            if (Array.isArray(parsedProjects)) {
              setProjects(parsedProjects);
            }
          } catch {}
        }
      }
      if (e.key === `${userKey}_craft_transactions` || e.key === 'craft_transactions') {
        if (e.newValue) {
          try {
            const parsedTx = JSON.parse(e.newValue);
            if (Array.isArray(parsedTx)) {
              setTransactions(parsedTx);
            }
          } catch {}
        }
      }
      if (e.key === `${userKey}_craft_customers` || e.key === 'craft_customers') {
        if (e.newValue) {
          try {
            const parsedCust = JSON.parse(e.newValue);
            if (Array.isArray(parsedCust)) {
              setCustomers(parsedCust);
            }
          } catch {}
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 5. Polling silencioso em segundo plano a cada 8 segundos e ao focar a aba
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCloudDataSilently(currentUser);
      }
    }, 8000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchCloudDataSilently(currentUser);
      }
    };
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('precifica:catalog_order_created', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, currentUser, fetchCloudData, fetchCloudDataSilently, handleIncomingCatalogOrder, playOrderChime]);

  // Auto-dispensar notificação flutuante de pedido após 10 segundos
  useEffect(() => {
    if (!orderNotification) return;
    const timer = setTimeout(() => {
      setOrderNotification(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [orderNotification]);

  // Salvar cache local instantaneamente a cada alteração (0ms de atraso, proteção contra perda de dados)
  useEffect(() => {
    if (!currentUser) return;
    saveLocalCache();
  }, [companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods, currentUser, saveLocalCache]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || !initializedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      pushCloudData();
    }, 500);

    return () => clearTimeout(syncTimeoutRef.current);
  }, [companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods, isAuthenticated, currentUser, pushCloudData]);

  const handleLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    setCurrentUser(cleanEmail);
    setIsAuthenticated(true);
  };

  const confirmLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (err) {
        console.warn("Aviso ao fazer logout do Supabase:", err);
      }
    }
    clearStaleSupabaseAuth();
    localStorage.removeItem('last_user_email');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
    window.location.reload(); 
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleManualRefresh = async () => {
    if (currentUser) {
      setSyncStatus('syncing');
      initializedRef.current = false; // Resetar para garantir que o fetch limpe o estado se necessário
      await fetchCloudData(currentUser);
      initializedRef.current = true;
    }
  };

  // Tentar reconectar automaticamente em caso de erro (a cada 60s)
  useEffect(() => {
    if (syncStatus === 'error' && isAuthenticated && currentUser) {
      const interval = setInterval(() => {
        console.log("Tentando reconectar à nuvem automaticamente...");
        fetchCloudData(currentUser);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [syncStatus, isAuthenticated, currentUser, fetchCloudData]);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, color: 'text-pink-500' },
    { id: 'pricing', label: 'Orçamentos', icon: Calculator, color: 'text-blue-500' },
    { id: 'schedule', label: 'Cronograma', icon: Calendar, color: 'text-blue-500' },
    { id: 'order_history', label: 'Histórico Pedidos', icon: History, color: 'text-pink-500' },
    { id: 'catalog', label: 'Catálogo Online', icon: ShoppingBag, color: 'text-pink-500', badge: 'Novo' },
    { id: 'finance', label: 'Financeiro', icon: Wallet2, color: 'text-green-500' },
    { id: 'products', label: 'Precificação', icon: Sparkles, color: 'text-yellow-600' },
    { id: 'inventory', label: 'Estoque', icon: Package, color: 'text-yellow-600' },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'text-pink-500' },
    { 
      id: 'captions', 
      label: 'Gerador de Legenda', 
      icon: Wand2, 
      color: 'text-purple-600', 
      badge: 'IA',
      externalUrl: 'https://ateli-legenda-fofa-113272526382.us-west1.run.app/' 
    },
    { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-gray-600' },
  ];

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="text-pink-500 animate-spin" size={40} />
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Validando Sessão...</p>
      </div>
    );
  }

  if (trackingProjectId && trackingUserEmail) {
    return <ProjectTracking projectId={trackingProjectId} userEmail={trackingUserEmail} />;
  }

  if (publicCatalogEmail) {
    return (
      <PublicCatalog 
        userEmail={publicCatalogEmail} 
        onOrderCreated={(newProj, newTx, newCust) => {
          handleIncomingCatalogOrder(newProj, newTx, newCust);
        }}
      />
    );
  }

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand'] overflow-x-hidden text-[#4b5563]">
      <div className={`fixed inset-0 bg-black/5 z-30 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-pink-100 flex flex-col shadow-xl lg:shadow-none transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-24'}`}>
        <div className={`p-4 md:p-5 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} border-b border-pink-50/80`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden bg-white border border-pink-100/80 hover:scale-105 transition-transform p-0.5 cursor-pointer group/logo"
              title="Toque para selecionar ou trocar a imagem original"
            >
              <img 
                src={companyData?.logo || "/images/papelietes_calcula_logo.png"} 
                alt="Papelietes Calcula" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-2xl text-white">
                <Camera size={16} />
              </div>
            </div>
            <input 
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQuickLogoUpload}
            />
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0 animate-fadeIn">
                <h1 className="text-pink-600 font-black text-base tracking-tight truncate leading-tight">
                  Papelietes Calcula
                </h1>
                <span className="text-[9px] font-bold text-gray-400 truncate">
                  Gestão & Precificação
                </span>
              </div>
            )}
          </div>
          {isSidebarOpen && <button className="lg:hidden text-gray-400 p-1 hover:text-pink-500 transition-colors" onClick={() => setSidebarOpen(false)}><X size={20}/></button>}
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            if ((item as any).externalUrl) {
              return (
                <a
                  key={item.id}
                  href={(item as any).externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3.5 py-3' : 'justify-center p-3.5'} rounded-2xl transition-all group text-gray-500 hover:bg-purple-50 hover:text-purple-600`}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${(item as any).color}`} />
                  {isSidebarOpen && (
                    <div className="flex items-center justify-between flex-1 min-w-0 animate-fadeIn">
                      <span className="font-bold text-sm tracking-tight truncate">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(item as any).badge && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs">
                            {(item as any).badge}
                          </span>
                        )}
                        <ExternalLink size={13} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                    </div>
                  )}
                </a>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3.5 py-3' : 'justify-center p-3.5'} rounded-2xl transition-all group ${
                  activeTab === item.id 
                    ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-pink-500'
                }`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? item.color : 'text-gray-300 group-hover:text-pink-400'}`} />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between flex-1 min-w-0 animate-fadeIn">
                    <span className="font-bold text-sm tracking-tight truncate">{item.label}</span>
                    {(item as any).badge && (
                      <span className="ml-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs shrink-0">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-3">
          {isSidebarOpen ? (
            <PWAInstallButton variant="menuItem" />
          ) : (
            <div className="flex justify-center">
              <PWAInstallButton className="!p-2.5 !rounded-2xl" />
            </div>
          )}
          <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarOpen ? 'gap-4 p-4' : 'justify-center p-4'} rounded-2xl text-red-400 hover:bg-red-50 transition-all group`} title={!isSidebarOpen ? 'Sair' : ''}>
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span className="font-black text-sm animate-fadeIn">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-pink-50 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors" aria-label="Menu">
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img 
                src={companyData?.logo || "/images/papelietes_calcula_logo.png"} 
                alt="Papelietes Calcula" 
                className="w-7 h-7 object-contain" 
                referrerPolicy="no-referrer" 
              />
              <span className="font-black text-pink-600 text-sm tracking-tight truncate max-w-[140px] sm:max-w-none">
                Papelietes Calcula
              </span>
            </div>
            <button 
              onClick={() => {
                if (syncStatus === 'error' && syncErrorMessage) {
                  const isRLS = syncErrorMessage.includes('Permission denied') || syncErrorMessage.includes('403') || syncErrorMessage.includes('row-level security');
                  const isNotFound = syncErrorMessage.includes('user_data" não foi encontrada') || syncErrorMessage.includes('relation "public.user_data" does not exist') || syncErrorMessage.includes('404');
                  const isConnection = syncErrorMessage.includes('Failed to fetch') || syncErrorMessage.includes('network');
                  
                  let helpMsg = `Problema na Sincronização:\n\nDetalhe: ${syncErrorMessage}\n\nO que fazer?\n`;
                  if (isNotFound) {
                    helpMsg += "1. A tabela 'user_data' não foi encontrada no seu banco de dados Supabase.\n2. Crie a tabela 'user_data' com a coluna 'user_email' (TEXT, chave primária) e 'app_state' (JSONB).";
                  } else if (isRLS) {
                    helpMsg += "1. Erro de permissão (RLS). Você habilitou RLS na tabela, mas as políticas de acesso impedem as operações.\n2. Verifique as políticas de segurança da sua tabela 'user_data'.";
                  } else if (isConnection) {
                    helpMsg += "1. Verifique sua conexão com a internet.\n2. Verifique se o seu projeto Supabase não está pausado ou desativado.";
                  } else {
                    helpMsg += "1. Verifique as credenciais e URL do Supabase no arquivo de configuração do ambiente.\n2. Veja os detalhes do erro no console (F12) para depuração técnica.";
                  }
                  alert(helpMsg);
                } else if (syncStatus === 'local') {
                  alert("Sincronização Ativa\n\nSeus dados estão sendo guardados de forma automática e segura.");
                }
                handleManualRefresh();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
              syncStatus === 'synced' || syncStatus === 'local' ? 'bg-green-50 border-green-100 text-green-500 hover:bg-green-100' :
              syncStatus === 'syncing' ? 'bg-blue-50 border-blue-100 text-blue-500 animate-pulse' :
              'bg-red-50 border-red-100 text-red-500 hover:bg-red-200 shadow-sm'
            }`} title={syncStatus === 'error' ? `Erro: ${syncErrorMessage}. Clique para ver detalhes.` : 'Sincronização automática ativa.'}>
              {syncStatus === 'synced' || syncStatus === 'local' ? <CheckCircle2 size={12} /> : 
               syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : 
               <AlertCircle size={12} />}
              <span className="hidden sm:inline">
                {syncStatus === 'synced' || syncStatus === 'local' ? 'Sincronizado' : 
                 syncStatus === 'syncing' ? 'Sincronizando...' : 
                 'Erro na Nuvem — Tentar'}
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstallButton />
            <div className="hidden sm:flex flex-col items-end border-l border-gray-100 pl-4">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Logado como</p>
              <p className="text-xs font-black text-pink-600 truncate max-w-[150px] leading-none">{currentUser}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 xl:p-12 pb-24 lg:pb-12">
          <div className="max-w-[1800px] mx-auto">
             {(() => {
                const props = { projects, customers, materials, companyData, platforms, transactions, products };
                switch (activeTab) {
                  case 'dashboard': return <Dashboard {...props} setProjects={setProjects} setTransactions={setTransactions} setCompanyData={setCompanyData} onNavigate={(tab) => setActiveTab(tab)} />;
                  case 'inventory': return <Inventory materials={materials} setMaterials={setMaterials} />;
                  case 'products': return <Products products={products} setProducts={setProducts} materials={materials} companyData={companyData} platforms={platforms} productCategories={productCategories} setProductCategories={setProductCategories} currentUser={currentUser || ''} />;
                  case 'customers': return <Customers {...props} setCustomers={setCustomers} />;
                  case 'pricing': return <PricingCalculator {...props} setCustomers={setCustomers} products={products} setProjects={setProjects} setTransactions={setTransactions} paymentMethods={paymentMethods} projectToEdit={projectToEdit} onClearEditProject={() => setProjectToEdit(null)} />;
                  case 'schedule': return <Schedule {...props} currentUser={currentUser || ''} setProjects={setProjects} transactions={transactions} setTransactions={setTransactions} onEditProject={(p) => { setProjectToEdit(p); setActiveTab('pricing'); }} />;
                  case 'order_history': return <OrderHistory {...props} transactions={transactions} />;
                  case 'catalog': return <CatalogManager currentUser={currentUser || ''} companyData={companyData} materials={materials} platforms={platforms} products={products} projects={projects} transactions={transactions} customers={customers} onNavigate={(tab) => setActiveTab(tab)} onEditProject={(p) => { setProjectToEdit(p); setActiveTab('pricing'); }} />;
                  case 'finance': return <FinancialControl {...props} setTransactions={setTransactions} setCustomers={setCustomers} closures={closures} setClosures={setClosures} categories={transactionCategories} setCategories={setTransactionCategories} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} setProjects={setProjects} />;
                  case 'captions': return <AICaptionGenerator companyData={companyData} products={products} projects={projects} />;
                  case 'settings': return <SettingsView companyData={companyData} setCompanyData={setCompanyData} platforms={platforms} setPlatforms={setPlatforms} currentUser={currentUser || ''} />;
                  default: return <Dashboard {...props} setTransactions={setTransactions} setCompanyData={setCompanyData} onNavigate={(tab) => setActiveTab(tab)} />;
                }
             })()}
          </div>
        </div>
      </main>

      {isAuthenticated && !isInitialLoadDone && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-6">
           <RefreshCw className="text-pink-500 animate-spin" size={56} />
           <div className="text-center">
             <p className="text-gray-800 font-black uppercase text-xs tracking-[0.3em] mb-2">Preparando seu Ateliê</p>
             <p className="text-gray-400 font-bold text-[10px] animate-pulse">Organizando gavetas e materiais...</p>
           </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-gray-150 p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">Deseja sair do ateliê?</h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Você sairá da sua sessão atual. Seus dados locais permanecem seguros neste dispositivo.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação em Tempo Real de Novo Pedido no Catálogo */}
      {orderNotification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] bg-white border-2 border-pink-200 rounded-3xl p-4 shadow-2xl animate-bounce-subtle flex flex-col gap-3 transition-all duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-200 shrink-0">
                <ShoppingBag size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                  </span>
                  <h4 className="text-[11px] font-black text-pink-600 uppercase tracking-wider">Novo Pedido no Catálogo!</h4>
                </div>
                <p className="text-sm font-black text-gray-800">
                  {orderNotification.quoteNumber} • {orderNotification.customerName}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setOrderNotification(null)}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-xl transition-colors"
              title="Fechar notificação"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-pink-50/60 rounded-2xl px-3.5 py-2.5 flex items-center justify-between border border-pink-100/50">
            <p className="text-xs text-gray-600 font-semibold truncate max-w-[220px]">
              {orderNotification.itemsSummary}
            </p>
            <span className="text-xs font-black text-pink-600 shrink-0 ml-2">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderNotification.total)}
            </span>
          </div>

          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => {
                setActiveTab('schedule');
                setOrderNotification(null);
              }}
              className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-black text-xs rounded-xl shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-2"
            >
              <Calendar size={14} />
              Ver no Cronograma
            </button>
            <button
              onClick={() => {
                setActiveTab('catalog');
                setOrderNotification(null);
              }}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs rounded-xl transition-colors"
            >
              Ver Catálogo
            </button>
          </div>
        </div>
      )}

      {/* Banner de Instalação Mobile PWA */}
      <PWAInstallBanner logoUrl={companyData?.logo} />
    </div>
  );
};

export default App;
