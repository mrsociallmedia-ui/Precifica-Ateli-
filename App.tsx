
import React, { useState, useEffect } from 'react';
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
  LogOut
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

  // Helper para gerar chaves de localStorage específicas do usuário
  const getUserKey = (key: string) => currentUser ? `${currentUser}_${key}` : key;

  // Carregamento de estados com isolamento por usuário
  const [companyData, setCompanyData] = useState<CompanyData>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_company` : 'craft_company');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_DATA;
  });

  const [materials, setMaterials] = useState<Material[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_materials` : 'craft_materials');
    return saved ? JSON.parse(saved) : [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_customers` : 'craft_customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_platforms` : 'craft_platforms');
    return saved ? JSON.parse(saved) : PLATFORMS_DEFAULT;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_projects` : 'craft_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_products` : 'craft_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_transactions` : 'craft_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [productCategories, setProductCategories] = useState<string[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_prod_categories` : 'craft_prod_categories');
    return saved ? JSON.parse(saved) : ['Festas', 'Papelaria', 'Presentes', 'Geral'];
  });

  const [transactionCategories, setTransactionCategories] = useState<string[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_trans_categories` : 'craft_trans_categories');
    return saved ? JSON.parse(saved) : ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Outros'];
  });

  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
    const userEmail = localStorage.getItem('precifica_current_user');
    const saved = localStorage.getItem(userEmail ? `${userEmail}_craft_pay_methods` : 'craft_pay_methods');
    return saved ? JSON.parse(saved) : ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência'];
  });

  // Atualiza os dados sempre que o usuário mudar (Login/Logout)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      localStorage.setItem(getUserKey('craft_company'), JSON.stringify(companyData));
      localStorage.setItem(getUserKey('craft_materials'), JSON.stringify(materials));
      localStorage.setItem(getUserKey('craft_customers'), JSON.stringify(customers));
      localStorage.setItem(getUserKey('craft_platforms'), JSON.stringify(platforms));
      localStorage.setItem(getUserKey('craft_projects'), JSON.stringify(projects));
      localStorage.setItem(getUserKey('craft_products'), JSON.stringify(products));
      localStorage.setItem(getUserKey('craft_transactions'), JSON.stringify(transactions));
      localStorage.setItem(getUserKey('craft_prod_categories'), JSON.stringify(productCategories));
      localStorage.setItem(getUserKey('craft_trans_categories'), JSON.stringify(transactionCategories));
      localStorage.setItem(getUserKey('craft_pay_methods'), JSON.stringify(paymentMethods));
    }
  }, [companyData, materials, customers, platforms, projects, products, transactions, productCategories, transactionCategories, paymentMethods, isAuthenticated, currentUser]);

  const handleLogin = (userEmail: string) => {
    setCurrentUser(userEmail);
    setIsAuthenticated(true);
    localStorage.setItem('precifica_session', 'true');
    localStorage.setItem('precifica_current_user', userEmail);
    // Recarregar os estados para os dados do novo usuário
    window.location.reload(); 
  };

  const handleLogout = () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      setIsAuthenticated(false);
      localStorage.removeItem('precifica_session');
      localStorage.removeItem('precifica_current_user');
      setCurrentUser(null);
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

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard projects={projects} customers={customers} materials={materials} companyData={companyData} platforms={platforms} transactions={transactions} />;
      case 'inventory': return <Inventory materials={materials} setMaterials={setMaterials} />;
      case 'products': return <Products 
        products={products} 
        setProducts={setProducts} 
        materials={materials} 
        companyData={companyData} 
        platforms={platforms}
        productCategories={productCategories}
        setProductCategories={setProductCategories}
      />;
      case 'customers': return <Customers 
        customers={customers} 
        setCustomers={setCustomers} 
        projects={projects}
        materials={materials}
        platforms={platforms}
        companyData={companyData}
      />;
      case 'pricing': return <PricingCalculator 
        materials={materials} 
        customers={customers} 
        platforms={platforms} 
        companyData={companyData} 
        projects={projects}
        products={products}
        setProjects={setProjects}
      />;
      case 'schedule': return <Schedule projects={projects} setProjects={setProjects} customers={customers} materials={materials} platforms={platforms} companyData={companyData} />;
      case 'finance': return <FinancialControl 
        transactions={transactions} 
        setTransactions={setTransactions} 
        projects={projects} 
        materials={materials} 
        platforms={platforms} 
        companyData={companyData} 
        categories={transactionCategories}
        setCategories={setTransactionCategories}
        paymentMethods={paymentMethods}
        setPaymentMethods={setPaymentMethods}
      />;
      case 'settings': return <SettingsView 
        companyData={companyData} 
        setCompanyData={setCompanyData} 
        platforms={platforms} 
        setPlatforms={setPlatforms} 
      />;
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
