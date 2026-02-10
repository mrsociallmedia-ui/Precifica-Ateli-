
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
  RefreshCw,
  Loader2,
  CheckCircle2
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
  const [isBackupSyncing, setIsBackupSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Estados principais da aplicação
  const [companyData, setCompanyData] = useState<CompanyData>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return INITIAL_COMPANY_DATA;
    const saved = localStorage.getItem(`${userEmail}_craft_company`);
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_DATA;
  });

  const [materials, setMaterials] = useState<Material[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return [];
    const saved = localStorage.getItem(`${userEmail}_craft_materials`);
    return saved ? JSON.parse(saved) : [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return [];
    const saved = localStorage.getItem(`${userEmail}_craft_customers`);
    return saved ? JSON.parse(saved) : [];
  });

  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return PLATFORMS_DEFAULT;
    const saved = localStorage.getItem(`${userEmail}_craft_platforms`);
    return saved ? JSON.parse(saved) : PLATFORMS_DEFAULT;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return [];
    const saved = localStorage.getItem(`${userEmail}_craft_projects`);
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return [];
    const saved = localStorage.getItem(`${userEmail}_craft_products`);
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return [];
    const saved = localStorage.getItem(`${userEmail}_craft_transactions`);
    return saved ? JSON.parse(saved) : [];
  });

  const [productCategories, setProductCategories] = useState<string[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return ['Festas', 'Papelaria', 'Presentes', 'Geral'];
    const saved = localStorage.getItem(`${userEmail}_craft_prod_categories`);
    return saved ? JSON.parse(saved) : ['Festas', 'Papelaria', 'Presentes', 'Geral'];
  });

  const [transactionCategories, setTransactionCategories] = useState<string[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Outros'];
    const saved = localStorage.getItem(`${userEmail}_craft_trans_categories`);
    return saved ? JSON.parse(saved) : ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Outros'];
  });

  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    if (!userEmail) return ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência'];
    const saved = localStorage.getItem(`${userEmail}_craft_pay_methods`);
    return saved ? JSON.parse(saved) : ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência'];
  });

  // Função mestre para salvar dados (pode ser chamada manualmente no logout)
  const saveAllData = useCallback((targetUser: string) => {
    const dataToSave = {
      companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods
    };

    localStorage.setItem(`${targetUser}_craft_company`, JSON.stringify(companyData));
    localStorage.setItem(`${targetUser}_craft_materials`, JSON.stringify(materials));
    localStorage.setItem(`${targetUser}_craft_customers`, JSON.stringify(customers));
    localStorage.setItem(`${targetUser}_craft_platforms`, JSON.stringify(platforms));
    localStorage.setItem(`${targetUser}_craft_projects`, JSON.stringify(projects));
    localStorage.setItem(`${targetUser}_craft_products`, JSON.stringify(products));
    localStorage.setItem(`${targetUser}_craft_transactions`, JSON.stringify(transactions));
    localStorage.setItem(`${targetUser}_craft_prod_categories`, JSON.stringify(productCategories));
    localStorage.setItem(`${targetUser}_craft_trans_categories`, JSON.stringify(transactionCategories));
    localStorage.setItem(`${targetUser}_craft_pay_methods`, JSON.stringify(paymentMethods));

    // Snapshot de segurança
    const snapshot = {
      timestamp: new Date().toISOString(),
      data: dataToSave
    };
    localStorage.setItem(`${targetUser}_system_snapshot`, JSON.stringify(snapshot));
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods]);

  // Efeito de Auto-Save em tempo real
  useEffect(() => {
    if (isAuthenticated && currentUser && !isLoggingOut) {
      setIsBackupSyncing(true);
      saveAllData(currentUser);
      const timeout = setTimeout(() => setIsBackupSyncing(false), 800);
      return () => clearTimeout(timeout);
    }
  }, [saveAllData, isAuthenticated, currentUser, isLoggingOut]);

  const handleLogin = (userEmail: string) => {
    setCurrentUser(userEmail);
    setIsAuthenticated(true);
    localStorage.setItem('precifica_session', 'true');
    localStorage.setItem('precifica_current_user', userEmail);
    window.location.reload(); 
  };

  const handleLogout = async () => {
    if (confirm('Deseja sair do sistema? Seus dados serão salvos agora.')) {
      setIsLoggingOut(true);
      
      // Simulação de sincronização final para garantir que o usuário veja que salvou
      if (currentUser) {
        saveAllData(currentUser);
      }

      // Pequeno delay para feedback visual de "Salvando..."
      setTimeout(() => {
        setIsAuthenticated(false);
        localStorage.removeItem('precifica_session');
        localStorage.removeItem('precifica_current_user');
        setCurrentUser(null);
        window.location.reload(); 
      }, 1200);
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

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-fadeIn">
         <div className="w-24 h-24 bg-pink-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-pink-50">
            <Loader2 className="text-pink-500 animate-spin" size={40} />
         </div>
         <h2 className="text-2xl font-black text-gray-800">Salvando tudo...</h2>
         <p className="text-gray-400 font-medium mt-2 flex items-center gap-2">
           <CheckCircle2 size={16} className="text-green-500" /> Seus dados estão seguros. Até breve!
         </p>
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
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-r border-pink-100 flex flex-col z-20 shadow-sm`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-400 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">P</div>
              <h1 className="text-pink-500 font-bold text-xl tracking-tight">Precifica Ateliê</h1>
            </div>
          ) : (
            <div className="w-8 h-8 bg-pink-400 rounded-lg flex items-center justify-center text-white font-bold m-auto">P</div>
          )}
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-pink-50 text-pink-600 shadow-[0_0_15px_-5px_rgba(236,72,153,0.3)]' 
                  : 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
              }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? (item.color) : 'text-gray-300'}`} />
              {isSidebarOpen && <span className="font-semibold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-2">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <RefreshCw size={10} className={`text-green-500 ${isBackupSyncing ? 'animate-spin' : 'animate-pulse'}`} />
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                {isBackupSyncing ? 'Sincronizando...' : 'Backup Atualizado'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-yellow-100 border-2 border-white shadow-sm shrink-0">
               {companyData.logo ? (
                 <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-yellow-600 font-bold text-xs uppercase">LOGO</div>
               )}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-700 truncate">{companyData.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl text-red-400 hover:bg-red-50 transition-all ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-bold text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-blue-50 flex items-center justify-between px-8 z-10 sticky top-0">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Usuário Ativo</p>
              <p className="text-sm font-black text-blue-600 truncate max-w-[150px]">{currentUser}</p>
            </div>
            <div className="w-px h-8 bg-gray-100 mx-2"></div>
            <div className="p-2.5 bg-pink-100 text-pink-500 rounded-2xl shadow-sm">
               <Heart size={18} fill="currentColor" />
            </div>
          </div>
        </header>

        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
