
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
  Database
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('precifica_session') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('precifica_current_user');
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  
  // Ref para garantir que não salvaremos dados vazios sobre dados existentes
  const initializedRef = useRef(false);

  // Carregamento Robusto
  const loadUserData = <T,>(key: string, defaultValue: T): T => {
    const userEmail = currentUser || localStorage.getItem('precifica_current_user');
    if (!userEmail) return defaultValue;
    const fullKey = `${userEmail.trim().toLowerCase()}_${key}`;
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(`Falha ao ler banco de dados (${fullKey}):`, e);
    }
    return defaultValue;
  };

  // Estados com inicialização imediata do LocalStorage
  const [companyData, setCompanyData] = useState<CompanyData>(() => loadUserData('craft_company', { ...INITIAL_COMPANY_DATA }));
  const [materials, setMaterials] = useState<Material[]>(() => loadUserData('craft_materials', []));
  const [customers, setCustomers] = useState<Customer[]>(() => loadUserData('craft_customers', []));
  const [platforms, setPlatforms] = useState<Platform[]>(() => loadUserData('craft_platforms', PLATFORMS_DEFAULT));
  const [projects, setProjects] = useState<Project[]>(() => loadUserData('craft_projects', []));
  const [products, setProducts] = useState<Product[]>(() => loadUserData('craft_products', []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadUserData('craft_transactions', []));
  const [productCategories, setProductCategories] = useState<string[]>(() => loadUserData('craft_prod_categories', ['Festas', 'Papelaria', 'Presentes', 'Geral']));
  const [transactionCategories, setTransactionCategories] = useState<string[]>(() => loadUserData('craft_trans_categories', ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Outros']));
  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => loadUserData('craft_pay_methods', ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']));

  // Sincronização de Banco de Dados
  const saveToDatabase = useCallback(() => {
    if (!currentUser || !initializedRef.current || isLoggingOut) return;
    
    const userKey = currentUser.trim().toLowerCase();
    setIsSaving(true);
    
    try {
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
      
      // Debounce visual do "Salvando..."
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error("Erro crítico de salvamento:", error);
      setIsSaving(false);
    }
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, currentUser, isLoggingOut]);

  // Efeito único para marcar inicialização
  useEffect(() => {
    initializedRef.current = true;
    setIsInitialLoadDone(true);
  }, []);

  // Persistência reativa
  useEffect(() => {
    if (isAuthenticated && currentUser && isInitialLoadDone) {
      saveToDatabase();
    }
  }, [saveToDatabase, isAuthenticated, currentUser, isInitialLoadDone]);

  const handleLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    localStorage.setItem('precifica_current_user', cleanEmail);
    localStorage.setItem('precifica_session', 'true');
    window.location.reload(); 
  };

  const handleLogout = () => {
    if (confirm('Sair do sistema? Todos os dados do seu usuário foram salvos.')) {
      setIsLoggingOut(true);
      // Força um salvamento final síncrono antes de destruir o estado
      saveToDatabase();
      
      setTimeout(() => {
        localStorage.removeItem('precifica_session');
        localStorage.removeItem('precifica_current_user');
        window.location.reload(); 
      }, 500);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, color: 'text-pink-500' },
    { id: 'pricing', label: 'Orçamentos', icon: Calculator, color: 'text-blue-500' },
    { id: 'products', label: 'Minhas Peças', icon: Sparkles, color: 'text-yellow-600' },
    { id: 'inventory', label: 'Estoque', icon: Package, color: 'text-yellow-600' },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'text-pink-500' },
    { id: 'schedule', label: 'Cronograma', icon: Calendar, color: 'text-blue-500' },
    { id: 'finance', label: 'Financeiro', icon: Wallet2, color: 'text-green-500' },
    { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-gray-600' },
  ];

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center animate-fadeIn">
         <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-pink-100">
            <Loader2 className="text-pink-500 animate-spin" size={32} />
         </div>
         <h2 className="text-xl font-black text-gray-800 tracking-tight">Salvando Banco de Dados...</h2>
         <p className="text-gray-400 font-medium mt-1">Sua segurança é nossa prioridade.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand']">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-r border-pink-100 flex flex-col z-20 shadow-sm overflow-hidden`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-pink-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-pink-100 shrink-0">P</div>
          {isSidebarOpen && <h1 className="text-pink-600 font-black text-lg tracking-tight truncate">Precifica Ateliê</h1>}
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? item.color : 'text-gray-300'}`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-3">
          <div className={`flex items-center gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-100 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0 flex items-center justify-center">
               {companyData.logo ? (
                 <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <Database size={14} className="text-gray-300" />
               )}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{currentUser?.split('@')[0]}</p>
                <div className="flex items-center gap-1.5">
                   <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}></div>
                   <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">{isSaving ? 'Gravando...' : 'Banco de Dados Ativo'}</span>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-red-400 hover:bg-red-50 transition-all ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={18} />
            {isSidebarOpen && <span className="font-black text-sm">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-pink-50 flex items-center justify-between px-8 z-10">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors">
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Usuário Ativo</p>
              <p className="text-xs font-black text-blue-600">{currentUser}</p>
            </div>
            <div className="w-10 h-10 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center shadow-inner">
               <Heart size={18} fill="currentColor" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
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

        {/* Barra de Status de Salvamento */}
        <div className="h-8 bg-white border-t border-gray-100 flex items-center justify-end px-6 gap-4">
           {isSaving ? (
             <div className="flex items-center gap-1.5 text-yellow-500">
               <RefreshCw size={10} className="animate-spin" />
               <span className="text-[9px] font-black uppercase tracking-widest">Salvando alterações...</span>
             </div>
           ) : (
             <div className="flex items-center gap-1.5 text-green-500">
               <CheckCircle2 size={10} />
               <span className="text-[9px] font-black uppercase tracking-widest">Banco de dados sincronizado</span>
             </div>
           )}
        </div>
      </main>

      {!isInitialLoadDone && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-4">
           <div className="relative">
              <RefreshCw className="text-pink-500 animate-spin" size={48} />
              <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-300" size={16} />
           </div>
           <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Sincronizando Banco de Dados...</p>
        </div>
      )}
    </div>
  );
};

export default App;
