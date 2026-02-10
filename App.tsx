
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
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  
  const initializedRef = useRef(false);

  // Monitorar largura da tela para responsividade
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error("Erro crítico de salvamento:", error);
      setIsSaving(false);
    }
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, currentUser, isLoggingOut]);

  useEffect(() => {
    initializedRef.current = true;
    setIsInitialLoadDone(true);
  }, []);

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
      saveToDatabase();
      setTimeout(() => {
        localStorage.removeItem('precifica_session');
        localStorage.removeItem('precifica_current_user');
        window.location.reload(); 
      }, 500);
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

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center animate-fadeIn">
         <Loader2 className="text-pink-500 animate-spin mb-6" size={48} />
         <h2 className="text-xl font-black text-gray-800 tracking-tight">Salvando Banco de Dados...</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand'] overflow-x-hidden">
      {/* Sidebar Desktop e Mobile Drawer */}
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

      {/* Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-pink-50 flex items-center justify-between px-6 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors">
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
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

        {/* Barra de Navegação Inferior para Mobile */}
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
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-4">
           <RefreshCw className="text-pink-500 animate-spin" size={48} />
           <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Iniciando Precifica Ateliê...</p>
        </div>
      )}
    </div>
  );
};

export default App;
