
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
  AlertCircle
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
import { ProjectTracking } from './views/ProjectTracking';
import { App as CapApp } from '@capacitor/app';
import { CompanyData, Material, Customer, Platform, Project, Product, Transaction, CashClosure } from './types';
import { INITIAL_COMPANY_DATA, PLATFORMS_DEFAULT } from './constants';
import { supabase, isMock, clearStaleSupabaseAuth } from './supabaseClient';

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
        try { setter(JSON.parse(saved)); } catch (e) { console.error(`Erro ao carregar cache ${key}`, e); }
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
      localStorage.setItem(`${userKey}_${key}`, JSON.stringify(value));
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
      const { data, error } = await supabase
        .from('user_data')
        .select('app_state')
        .eq('user_email', email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Cloud Sync Fetch Error:", error);
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          console.warn("Tabela user_data não encontrada no Supabase. Siga as instruções em SUPABASE_SETUP.md");
          setSyncStatus('error');
          setSyncErrorMessage('A tabela "user_data" não foi encontrada no seu banco de dados Supabase.');
          return;
        }
        throw error;
      }

      if (data?.app_state) {
        const s = data.app_state;
        if (s.craft_company) setCompanyData(s.craft_company);
        if (s.craft_materials) setMaterials(s.craft_materials);
        if (s.craft_customers) setCustomers(s.craft_customers);
        if (s.craft_platforms) setPlatforms(s.craft_platforms);
        if (s.craft_projects) setProjects(s.craft_projects);
        if (s.craft_products) setProducts(s.craft_products);
        if (s.craft_transactions) setTransactions(s.craft_transactions);
        if (s.craft_closures) setClosures(s.craft_closures);
        if (s.craft_prod_categories) setProductCategories(s.craft_prod_categories);
        if (s.craft_trans_categories) setTransactionCategories(s.craft_trans_categories);
        if (s.craft_pay_methods) setPaymentMethods(s.craft_pay_methods);
        
        lastSyncedStateRef.current = JSON.stringify(s);
        setSyncStatus('synced');
        setSyncErrorMessage(null);
      } else {
        // Se não houver dados na nuvem mas o usuário está logado, 
        // consideramos 'synced' mas marcamos que precisamos fazer o primeiro push
        setSyncStatus('synced');
        // Agendar um push imediato para garantir que a nuvem tenha os dados iniciais
        // Passamos 'true' para forçar o push mesmo antes do initializedRef.current ser setado no turn seguinte
        setTimeout(() => pushCloudData(true), 500);
      }
    } catch (err: any) {
      console.error("Supabase Sync Error:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Erro de conexão com a nuvem');
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
      console.log("Cloud Sync: Nenhum dado alterado localmente. Pulando push.");
      setSyncStatus('synced');
      return;
    }

    setSyncStatus('syncing');
    console.log(`Cloud Sync: Salvando dados para ${currentUser}...`);
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({ 
          user_email: currentUser.toLowerCase(), 
          app_state: appState,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_email' });

      if (error) {
        console.error("Cloud Sync Push Error:", error);
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          setSyncStatus('error');
          setSyncErrorMessage('A tabela "user_data" não foi encontrada no seu banco de dados Supabase.');
          return;
        }
        throw error;
      }
      
      lastSyncedStateRef.current = serialized;
      setSyncStatus('synced');
      setSyncErrorMessage(null);
    } catch (err: any) {
      console.error("Supabase Push Error:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Erro ao salvar na nuvem');
    }
  }, [saveLocalCache, companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchCloudData(currentUser).then(() => {
        initializedRef.current = true;
        setIsInitialLoadDone(true);
      }).catch(() => setIsInitialLoadDone(true));

      // Configurar Sincronização em Tempo Real (Realtime)
      if (supabase && !isMock) {
        const channel = supabase
          .channel('user_data_realtime')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'user_data', 
            filter: `user_email=eq.${currentUser.toLowerCase()}` 
          }, (payload: any) => {
            // Quando os dados mudam no banco (por outro dispositivo), atualizamos o estado local
            if (payload.new && payload.new.app_state) {
              const s = payload.new.app_state;
              
              // Evitar loops redundantes se o dado que chegou for exatamente igual ao que já temos localmente
              const serializedPayload = JSON.stringify(s);
              if (serializedPayload === lastSyncedStateRef.current) return;

              if (s.craft_company) setCompanyData(s.craft_company);
              if (s.craft_materials) setMaterials(s.craft_materials);
              if (s.craft_customers) setCustomers(s.craft_customers);
              if (s.craft_platforms) setPlatforms(s.craft_platforms);
              if (s.craft_projects) setProjects(s.craft_projects);
              if (s.craft_products) setProducts(s.craft_products);
              if (s.craft_transactions) setTransactions(s.craft_transactions);
              if (s.craft_closures) setClosures(s.craft_closures);
              if (s.craft_prod_categories) setProductCategories(s.craft_prod_categories);
              if (s.craft_trans_categories) setTransactionCategories(s.craft_trans_categories);
              if (s.craft_pay_methods) setPaymentMethods(s.craft_pay_methods);
              
              lastSyncedStateRef.current = serializedPayload;
              setSyncStatus('synced');
            }
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [isAuthenticated, currentUser, fetchCloudData]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || !initializedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      pushCloudData();
    }, 2000);

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
    { id: 'finance', label: 'Financeiro', icon: Wallet2, color: 'text-green-500' },
    { id: 'products', label: 'Precificação', icon: Sparkles, color: 'text-yellow-600' },
    { id: 'inventory', label: 'Estoque', icon: Package, color: 'text-yellow-600' },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'text-pink-500' },
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
    return <PublicCatalog userEmail={publicCatalogEmail} />;
  }

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand'] overflow-x-hidden text-[#4b5563]">
      <div className={`fixed inset-0 bg-black/5 z-30 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-pink-100 flex flex-col shadow-xl lg:shadow-none transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-24'}`}>
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden group-hover:scale-110 transition-transform">
              <img src="https://cdn-icons-png.flaticon.com/512/4230/4230588.png" alt="Logo" className="w-7 h-7 filter brightness-0 invert" />
            </div>
            {isSidebarOpen && <h1 className="text-pink-600 font-black text-lg tracking-tight truncate animate-fadeIn">Calculiê</h1>}
          </div>
          {isSidebarOpen && <button className="lg:hidden text-gray-400 p-1 hover:text-pink-500 transition-colors" onClick={() => setSidebarOpen(false)}><X size={20}/></button>}
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-4 p-4' : 'justify-center p-4'} rounded-2xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-pink-500'
              }`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon className={`w-6 h-6 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? item.color : 'text-gray-300 group-hover:text-pink-400'}`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-tight truncate animate-fadeIn">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-3">
          <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarOpen ? 'gap-4 p-4' : 'justify-center p-4'} rounded-2xl text-red-400 hover:bg-red-50 transition-all group`} title={!isSidebarOpen ? 'Sair' : ''}>
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span className="font-black text-sm animate-fadeIn">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-pink-50 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors">
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
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
          
          <div className="flex items-center gap-4">
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
                  case 'finance': return <FinancialControl {...props} setTransactions={setTransactions} setCustomers={setCustomers} closures={closures} setClosures={setClosures} categories={transactionCategories} setCategories={setTransactionCategories} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} setProjects={setProjects} />;
                  case 'settings': return <SettingsView companyData={companyData} setCompanyData={setCompanyData} platforms={platforms} setPlatforms={setPlatforms} currentUser={currentUser || ''} />;
                  default: return <Dashboard {...props} setTransactions={setTransactions} setCompanyData={setCompanyData} />;
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
    </div>
  );
};

export default App;
