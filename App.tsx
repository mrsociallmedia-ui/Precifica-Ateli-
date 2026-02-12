
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
  Cloud,
  CloudOff,
  CloudDownload,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { Customers } from './views/Customers';
import { PricingCalculator } from './views/PricingCalculator';
import { Schedule } from './views/Schedule';
import { SettingsView } from './views/SettingsView';
import { Products } from './views/Products';
import { FinancialControl } from './views/FinancialControl';
import { LoginView } from './views/LoginView';
import { CompanyData, Material, Customer, Platform, Project, Product, Transaction } from './types';
import { INITIAL_COMPANY_DATA, PLATFORMS_DEFAULT } from './constants';

// Configuração do Supabase
// Prioriza variáveis de ambiente do Vite (import.meta.env) ou fallback para process.env
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).process?.env?.SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any).process?.env?.SUPABASE_ANON_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('precifica_session') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('precifica_current_user');
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  
  const initializedRef = useRef(false);
  const syncTimeoutRef = useRef<any>(null);

  // Estados principais da aplicação
  const [companyData, setCompanyData] = useState<CompanyData>(INITIAL_COMPANY_DATA);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS_DEFAULT);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(['Festas', 'Papelaria', 'Presentes', 'Geral']);
  const [transactionCategories, setTransactionCategories] = useState<string[]>(['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Outros']);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']);

  // Carregar do cache local (emergência/offline)
  const loadLocalCache = useCallback((email: string) => {
    const userKey = email.trim().toLowerCase();
    const dataKeys = {
      craft_company: setCompanyData,
      craft_materials: setMaterials,
      craft_customers: setCustomers,
      craft_platforms: setPlatforms,
      craft_projects: setProjects,
      craft_products: setProducts,
      craft_transactions: setTransactions,
      craft_prod_categories: setProductCategories,
      craft_trans_categories: setTransactionCategories,
      craft_pay_methods: setPaymentMethods
    };

    Object.entries(dataKeys).forEach(([key, setter]) => {
      const saved = localStorage.getItem(`${userKey}_${key}`);
      if (saved) {
        try { setter(JSON.parse(saved)); } catch (e) { console.error(`Erro ao ler cache ${key}:`, e); }
      }
    });
  }, []);

  // Buscar dados na Nuvem (Supabase)
  const fetchCloudData = useCallback(async (email: string) => {
    if (!supabase) {
      setSyncStatus('offline');
      loadLocalCache(email);
      return;
    }

    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('user_data')
        .select('app_state')
        .eq('user_email', email.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (data?.app_state) {
        const s = data.app_state;
        if (s.craft_company) setCompanyData(s.craft_company);
        if (s.craft_materials) setMaterials(s.craft_materials);
        if (s.craft_customers) setCustomers(s.craft_customers);
        if (s.craft_platforms) setPlatforms(s.craft_platforms);
        if (s.craft_projects) setProjects(s.craft_projects);
        if (s.craft_products) setProducts(s.craft_products);
        if (s.craft_transactions) setTransactions(s.craft_transactions);
        if (s.craft_prod_categories) setProductCategories(s.craft_prod_categories);
        if (s.craft_trans_categories) setTransactionCategories(s.craft_trans_categories);
        if (s.craft_pay_methods) setPaymentMethods(s.craft_pay_methods);
      } else {
        loadLocalCache(email);
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro no fetch cloud:", err);
      setSyncStatus('error');
      loadLocalCache(email);
    }
  }, [loadLocalCache]);

  // Enviar dados para Nuvem (Supabase)
  const pushCloudData = useCallback(async () => {
    if (!currentUser || !initializedRef.current) return;
    
    const appState = {
      craft_company: companyData,
      craft_materials: materials,
      craft_customers: customers,
      craft_platforms: platforms,
      craft_projects: projects,
      craft_products: products,
      craft_transactions: transactions,
      craft_prod_categories: productCategories,
      craft_trans_categories: transactionCategories,
      craft_pay_methods: paymentMethods,
    };

    // Salva localmente primeiro
    const userKey = currentUser.trim().toLowerCase();
    Object.entries(appState).forEach(([key, value]) => {
      localStorage.setItem(`${userKey}_${key}`, JSON.stringify(value));
    });

    if (!supabase) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({ 
          user_email: currentUser.toLowerCase(), 
          app_state: appState,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_email' });

      if (error) throw error;
      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro no push cloud:", err);
      setSyncStatus('error');
    }
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchCloudData(currentUser).then(() => {
        initializedRef.current = true;
        setIsInitialLoadDone(true);
      });
    } else {
      setIsInitialLoadDone(true);
    }
  }, [isAuthenticated, currentUser, fetchCloudData]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || !initializedRef.current) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      pushCloudData();
    }, 2000);

    return () => clearTimeout(syncTimeoutRef.current);
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, isAuthenticated, currentUser, pushCloudData]);

  const handleLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    localStorage.setItem('precifica_current_user', cleanEmail);
    localStorage.setItem('precifica_session', 'true');
    setCurrentUser(cleanEmail);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (confirm('Deseja sair? Seus dados estão salvos na nuvem.')) {
      localStorage.removeItem('precifica_session');
      localStorage.removeItem('precifica_current_user');
      window.location.reload(); 
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, color: 'text-pink-500', mobile: true },
    { id: 'pricing', label: 'Orçamentos', icon: Calculator, color: 'text-blue-500', mobile: true },
    { id: 'schedule', label: 'Cronograma', icon: Calendar, color: 'text-blue-500', mobile: true },
    { id: 'finance', label: 'Financeiro', icon: Wallet2, color: 'text-green-500', mobile: true },
    { id: 'products', label: 'Peças', icon: Sparkles, color: 'text-yellow-600', mobile: false },
    { id: 'inventory', label: 'Estoque', icon: Package, color: 'text-yellow-600', mobile: false },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'text-pink-500', mobile: false },
    { id: 'settings', label: 'Ajustes', icon: Settings, color: 'text-gray-600', mobile: false },
  ];

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand'] overflow-x-hidden text-[#4b5563]">
      <div className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-pink-100 flex flex-col shadow-xl lg:shadow-none transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isSidebarOpen ? 'w-64' : 'lg:w-20'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-pink-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shrink-0">P</div>
            {isSidebarOpen && <h1 className="text-pink-600 font-black text-lg tracking-tight truncate">Precifica Ateliê</h1>}
          </div>
          <button className="lg:hidden text-gray-400 p-1" onClick={() => setSidebarOpen(false)}><X size={20}/></button>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <item.icon className={`w-6 h-6 shrink-0 ${activeTab === item.id ? item.color : 'text-gray-300'}`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-3">
          <button onClick={handleLogout} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-50 transition-all ${!isSidebarOpen && 'justify-center'}`}>
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-black text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-pink-50 flex items-center justify-between px-6 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors">
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all ${syncStatus === 'error' ? 'bg-red-50 border-red-100' : syncStatus === 'offline' ? 'bg-gray-50 border-gray-100' : 'bg-green-50 border-green-100'}`}>
               {syncStatus === 'syncing' ? (
                  <RefreshCw className="text-blue-500 animate-spin" size={14} />
               ) : syncStatus === 'error' ? (
                  <AlertCircle className="text-red-500" size={14} />
               ) : syncStatus === 'offline' ? (
                  <CloudOff className="text-gray-400" size={14} />
               ) : (
                  <Cloud className="text-green-500" size={14} />
               )}
               <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${syncStatus === 'error' ? 'text-red-500' : syncStatus === 'offline' ? 'text-gray-400' : 'text-green-600'}`}>
                  {syncStatus === 'syncing' ? 'Salvando...' : syncStatus === 'error' ? 'Erro Nuvem' : syncStatus === 'offline' ? 'Offline' : 'Online'}
               </span>
            </div>

            <div className="hidden sm:flex flex-col items-end border-l border-gray-100 pl-4">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Ateliê de</p>
              <p className="text-xs font-black text-pink-600 truncate max-w-[150px] leading-none">{currentUser}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10 pb-24 lg:pb-10">
          <div className="max-w-[1600px] mx-auto">
             {(() => {
                const props = { projects, customers, materials, companyData, platforms, transactions };
                switch (activeTab) {
                  case 'dashboard': return <Dashboard {...props} />;
                  case 'inventory': return <Inventory materials={materials} setMaterials={setMaterials} />;
                  case 'products': return <Products products={products} setProducts={setProducts} materials={materials} companyData={companyData} platforms={platforms} productCategories={productCategories} setProductCategories={setProductCategories} />;
                  case 'customers': return <Customers {...props} setCustomers={setCustomers} />;
                  case 'pricing': return <PricingCalculator {...props} products={products} setProjects={setProjects} />;
                  case 'schedule': return <Schedule {...props} setProjects={setProjects} />;
                  case 'finance': return <FinancialControl {...props} setTransactions={setTransactions} categories={transactionCategories} setCategories={setTransactionCategories} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} />;
                  case 'settings': return <SettingsView companyData={companyData} setCompanyData={setCompanyData} platforms={platforms} setPlatforms={setPlatforms} currentUser={currentUser || ''} />;
                  default: return <Dashboard {...props} />;
                }
             })()}
          </div>
        </div>
      </main>

      {!isInitialLoadDone && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-6">
           <div className="relative">
              <RefreshCw className="text-pink-500 animate-spin" size={56} />
              <CloudDownload className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-400" size={24} />
           </div>
           <div className="text-center">
             <p className="text-gray-800 font-black uppercase text-xs tracking-[0.3em] mb-2">Sincronizando Ateliê</p>
             <p className="text-gray-400 font-bold text-[10px] animate-pulse">Buscando os dados do seu ateliê para este dispositivo...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
