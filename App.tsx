
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
  Loader2,
  RefreshCw,
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudDownload
} from 'lucide-react';
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

// Configuração do Supabase (Usando variáveis de ambiente ou placeholders)
const SUPABASE_URL = (window as any).process?.env?.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = (window as any).process?.env?.SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';
const supabase = (window as any).supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

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

  const loadLocalData = <T,>(key: string, defaultValue: T): T => {
    const userEmail = currentUser || localStorage.getItem('precifica_current_user');
    if (!userEmail) return defaultValue;
    const fullKey = `${userEmail.trim().toLowerCase()}_${key}`;
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(`Falha ao ler cache local (${fullKey}):`, e);
    }
    return defaultValue;
  };

  const [companyData, setCompanyData] = useState<CompanyData>(() => loadLocalData('craft_company', { ...INITIAL_COMPANY_DATA }));
  const [materials, setMaterials] = useState<Material[]>(() => loadLocalData('craft_materials', []));
  const [customers, setCustomers] = useState<Customer[]>(() => loadLocalData('craft_customers', []));
  const [platforms, setPlatforms] = useState<Platform[]>(() => loadLocalData('craft_platforms', PLATFORMS_DEFAULT));
  const [projects, setProjects] = useState<Project[]>(() => loadLocalData('craft_projects', []));
  const [products, setProducts] = useState<Product[]>(() => loadLocalData('craft_products', []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadLocalData('craft_transactions', []));
  const [productCategories, setProductCategories] = useState<string[]>(() => loadLocalData('craft_prod_categories', ['Festas', 'Papelaria', 'Presentes', 'Geral']));
  const [transactionCategories, setTransactionCategories] = useState<string[]>(() => loadLocalData('craft_trans_categories', ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Outros']));
  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => loadLocalData('craft_pay_methods', ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']));

  // Sincronização com Supabase (Puxar Dados)
  const fetchCloudData = useCallback(async (email: string) => {
    if (!supabase) return;
    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('user_data')
        .select('app_state')
        .eq('user_email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.app_state) {
        const state = data.app_state;
        if (state.craft_company) setCompanyData(state.craft_company);
        if (state.craft_materials) setMaterials(state.craft_materials);
        if (state.craft_customers) setCustomers(state.craft_customers);
        if (state.craft_platforms) setPlatforms(state.craft_platforms);
        if (state.craft_projects) setProjects(state.craft_projects);
        if (state.craft_products) setProducts(state.craft_products);
        if (state.craft_transactions) setTransactions(state.craft_transactions);
        if (state.craft_prod_categories) setProductCategories(state.craft_prod_categories);
        if (state.craft_trans_categories) setTransactionCategories(state.craft_trans_categories);
        if (state.craft_pay_methods) setPaymentMethods(state.craft_pay_methods);
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro ao sincronizar com nuvem:", err);
      setSyncStatus('error');
    }
  }, []);

  // Sincronização com Supabase (Enviar Dados)
  const pushCloudData = useCallback(async () => {
    if (!supabase || !currentUser) return;
    
    setSyncStatus('syncing');
    try {
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
      console.error("Falha no upload para nuvem:", err);
      setSyncStatus('error');
    }
    // REMOVIDO: pushCloudData da própria lista de dependências para evitar ReferenceError
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, currentUser]);

  const saveToLocalAndCloud = useCallback(() => {
    if (!currentUser || !initializedRef.current) return;
    const userKey = currentUser.trim().toLowerCase();
    
    // 1. Salvar no LocalStorage (Cache Imediato)
    const data = {
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

    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(`${userKey}_${key}`, JSON.stringify(value));
    });

    // 2. Debounce para o Cloud Sync (Evitar muitas requisições)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      pushCloudData();
    }, 2000);
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, currentUser, pushCloudData]);

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
    if (isAuthenticated && currentUser && initializedRef.current) {
      saveToLocalAndCloud();
    }
  }, [saveToLocalAndCloud, isAuthenticated, currentUser]);

  const handleLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    localStorage.setItem('precifica_current_user', cleanEmail);
    localStorage.setItem('precifica_session', 'true');
    window.location.reload(); 
  };

  const handleLogout = () => {
    if (confirm('Sair do sistema? Todos os dados em nuvem estão seguros.')) {
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
    { id: 'settings', label: 'Configuração', icon: Settings, color: 'text-gray-600', mobile: false },
  ];

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand'] overflow-x-hidden">
      <div className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-pink-100 flex flex-col shadow-xl lg:shadow-none transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isSidebarOpen ? 'w-64' : 'lg:w-20'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-pink-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-pink-100 shrink-0">P</div>
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
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-50 transition-all ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-black text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-pink-50 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors">
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
               {syncStatus === 'syncing' ? (
                  <RefreshCw className="text-blue-500 animate-spin" size={14} />
               ) : syncStatus === 'error' ? (
                  <CloudOff className="text-red-400" size={14} />
               ) : (
                  <Cloud className="text-green-500" size={14} />
               )}
               <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'error' ? 'Erro de Conexão' : 'Na Nuvem'}
               </span>
            </div>

            <div className="hidden sm:flex flex-col items-end border-l border-gray-100 pl-4 ml-2">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ateliê</p>
              <p className="text-xs font-black text-blue-600 truncate max-w-[120px]">{companyData.name}</p>
            </div>
            <div className="w-10 h-10 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center shadow-inner">
               <Heart size={18} fill="currentColor" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10 pb-24 lg:pb-10">
          <div className="max-w-[1600px] mx-auto">
             {(() => {
                switch (activeTab) {
                  case 'dashboard': return <Dashboard projects={projects} customers={customers} materials={materials} companyData={companyData} platforms={platforms} transactions={transactions} />;
                  case 'inventory': return <Inventory materials={materials} setMaterials={setMaterials} />;
                  case 'products': return <Products products={products} setProducts={setProducts} materials={materials} companyData={companyData} platforms={platforms} productCategories={productCategories} setProductCategories={setProductCategories} />;
                  case 'customers': return <Customers customers={customers} setCustomers={setCustomers} projects={projects} materials={materials} platforms={platforms} companyData={companyData} />;
                  case 'pricing': return <PricingCalculator materials={materials} customers={customers} platforms={platforms} companyData={companyData} projects={projects} products={products} setProjects={setProjects} />;
                  case 'schedule': return <Schedule projects={projects} setProjects={setProjects} customers={customers} materials={materials} platforms={platforms} companyData={companyData} />;
                  case 'finance': return <FinancialControl transactions={transactions} setTransactions={setTransactions} projects={projects} materials={materials} platforms={platforms} companyData={companyData} categories={transactionCategories} setCategories={setTransactionCategories} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} />;
                  case 'settings': return <SettingsView companyData={companyData} setCompanyData={setCompanyData} platforms={platforms} setPlatforms={setPlatforms} currentUser={currentUser || ''} />;
                  default: return <Dashboard projects={projects} customers={customers} materials={materials} companyData={companyData} platforms={platforms} transactions={transactions} />;
                }
             })()}
          </div>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-pink-100 flex items-center justify-around p-3 lg:hidden z-30 mobile-nav-animation shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          {navItems.filter(item => item.mobile).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-pink-600 scale-110' : 'text-gray-300'}`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'text-pink-500' : ''} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-gray-300"
          >
            <Menu size={22} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Mais</span>
          </button>
        </nav>
      </main>

      {!isInitialLoadDone && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-6">
           <div className="relative">
              <RefreshCw className="text-pink-500 animate-spin" size={56} />
              <CloudDownload className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-400" size={24} />
           </div>
           <div className="text-center">
             <p className="text-gray-800 font-black uppercase text-xs tracking-[0.3em] mb-2">Sincronizando com a Nuvem</p>
             <p className="text-gray-400 font-bold text-[10px] animate-pulse">Buscando seus dados salvos em outros dispositivos...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
