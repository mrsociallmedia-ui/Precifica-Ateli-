
import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw
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

  // Carregamento Robusto de Dados
  const loadUserData = <T,>(key: string, defaultValue: T): T => {
    const userEmail = currentUser || localStorage.getItem('precifica_current_user');
    if (!userEmail) return defaultValue;
    const fullKey = `${userEmail.trim().toLowerCase()}_${key}`;
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved && saved !== "undefined") return JSON.parse(saved);
    } catch (e) {
      console.error(`Erro ao carregar ${fullKey}:`, e);
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

  const persistAllData = useCallback((targetUser: string) => {
    if (!targetUser || isLoggingOut) return;
    const userKey = targetUser.trim().toLowerCase();
    setIsSaving(true);
    
    try {
      localStorage.setItem(`${userKey}_craft_company`, JSON.stringify(companyData));
      localStorage.setItem(`${userKey}_craft_materials`, JSON.stringify(materials));
      localStorage.setItem(`${userKey}_craft_customers`, JSON.stringify(customers));
      localStorage.setItem(`${userKey}_craft_platforms`, JSON.stringify(platforms));
      localStorage.setItem(`${userKey}_craft_projects`, JSON.stringify(projects));
      localStorage.setItem(`${userKey}_craft_products`, JSON.stringify(products));
      localStorage.setItem(`${userKey}_craft_transactions`, JSON.stringify(transactions));
      localStorage.setItem(`${userKey}_craft_prod_categories`, JSON.stringify(productCategories));
      localStorage.setItem(`${userKey}_craft_trans_categories`, JSON.stringify(transactionCategories));
      localStorage.setItem(`${userKey}_craft_pay_methods`, JSON.stringify(paymentMethods));
      
      setTimeout(() => setIsSaving(false), 300);
    } catch (error) {
      console.error("Falha no salvamento:", error);
      setIsSaving(false);
    }
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, isLoggingOut]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoadDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Persistência Automática
  useEffect(() => {
    if (isAuthenticated && currentUser && isInitialLoadDone && !isLoggingOut) {
      persistAllData(currentUser);
    }
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, isAuthenticated, currentUser, isInitialLoadDone, isLoggingOut, persistAllData]);

  const handleLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    localStorage.setItem('precifica_current_user', cleanEmail);
    localStorage.setItem('precifica_session', 'true');
    setCurrentUser(cleanEmail);
    setIsAuthenticated(true);
    // Força o recarregamento para puxar os dados do novo usuário corretamente
    window.location.reload(); 
  };

  const handleLogout = async () => {
    if (confirm('Deseja sair do sistema? Seus dados estão salvos com segurança.')) {
      setIsLoggingOut(true);
      // Salva uma última vez antes de limpar a sessão
      if (currentUser) {
        persistAllData(currentUser);
      }
      
      setTimeout(() => {
        localStorage.removeItem('precifica_session');
        localStorage.removeItem('precifica_current_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
        window.location.reload(); 
      }, 800);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-pink-500' },
    { id: 'pricing', label: 'Orçamento', icon: Calculator, color: 'text-blue-500' },
    { id: 'products', label: 'Precificação', icon: Sparkles, color: 'text-yellow-600' },
    { id: 'inventory', label: 'Materiais', icon: Package, color: 'text-yellow-600' },
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
         <h2 className="text-xl font-black text-gray-800">Salvando e Saindo...</h2>
         <p className="text-gray-400 font-medium mt-1">Até a próxima!</p>
      </div>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard projects={projects} customers={customers} materials={materials} companyData={companyData} platforms={platforms} transactions={transactions} />;
      case 'inventory': return <Inventory materials={materials} setMaterials={setMaterials} />;
      case 'products': return <Products products={products} setProducts={setProducts} materials={materials} companyData={companyData} platforms={platforms} productCategories={productCategories} setProductCategories={setProductCategories} />;
      case 'customers': return <Customers customers={customers} setCustomers={setCustomers} projects={projects} materials={materials} platforms={platforms} companyData={companyData} />;
      case 'pricing': return <PricingCalculator materials={materials} customers={customers} platforms={platforms} companyData={companyData} projects={projects} products={products} setProjects={setProjects} />;
      case 'schedule': return <Schedule projects={projects} setProjects={setProjects} customers={customers} materials={materials} platforms={platforms} companyData={companyData} />;
      case 'finance': return <FinancialControl transactions={transactions} setTransactions={setTransactions} projects={projects} materials={materials} platforms={platforms} companyData={companyData} categories={transactionCategories} setCategories={setTransactionCategories} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} />;
      case 'settings': return <SettingsView companyData={companyData} setCompanyData={setCompanyData} platforms={platforms} setPlatforms={setPlatforms} />;
      default: return <Dashboard projects={projects} customers={customers} materials={materials} companyData={companyData} platforms={platforms} transactions={transactions} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand']">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-r border-pink-100 flex flex-col z-20 shadow-sm`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold">P</div>
              <h1 className="text-pink-500 font-bold text-xl tracking-tight">Precifica Ateliê</h1>
            </div>
          ) : (
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold m-auto">P</div>
          )}
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-pink-50 text-pink-600 shadow-sm' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? item.color : 'text-gray-300'}`} />
              {isSidebarOpen && <span className="font-semibold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-2">
          <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-yellow-100 border border-white shrink-0">
               {companyData.logo ? (
                 <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-yellow-600 font-bold text-xs uppercase">A</div>
               )}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-700 truncate">{companyData.name || 'Seu Ateliê'}</p>
                <div className="flex items-center gap-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{isSaving ? 'Gravando...' : 'Sincronizado'}</span>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl text-red-400 hover:bg-red-50 transition-all ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={18} />
            {isSidebarOpen && <span className="font-bold text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-pink-50 flex items-center justify-between px-8 z-10">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400">
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Usuário</p>
              <p className="text-xs font-black text-blue-600">{currentUser}</p>
            </div>
            <div className="w-px h-8 bg-gray-100 mx-2"></div>
            <div className="p-2.5 bg-pink-100 text-pink-500 rounded-2xl">
               <Heart size={16} fill="currentColor" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
          {renderView()}
        </div>
      </main>

      {!isInitialLoadDone && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-4">
           <RefreshCw className="text-pink-500 animate-spin" size={40} />
           <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Preparando seu Ateliê...</p>
        </div>
      )}
    </div>
  );
};

export default App;
