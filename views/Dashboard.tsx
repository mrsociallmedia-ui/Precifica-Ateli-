
import React, { useMemo, useState } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Wallet2, 
  CalendarDays, 
  Clock, 
  ChevronRight, 
  FilterX, 
  CalendarCheck,
  PackageCheck,
  ArrowRightCircle,
  Lightbulb,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Scale,
  Calculator,
  X
} from 'lucide-react';
import { Project, Customer, Material, CompanyData, Platform, Transaction, Product } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface DashboardProps {
  projects: Project[];
  customers: Customer[];
  materials: Material[];
  companyData: CompanyData;
  platforms: Platform[];
  transactions: Transaction[];
  products: Product[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setCompanyData: React.Dispatch<React.SetStateAction<CompanyData>>;
}

type DashboardFilter = 'all' | 'today' | 'active' | 'pending' | 'receivable' | 'quotes_pending';

export const Dashboard: React.FC<DashboardProps> = ({ projects, customers, materials, companyData, platforms, transactions, products, setTransactions, setCompanyData }) => {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentGoal = companyData.monthlyGoals?.find(g => g.month === currentMonth && g.year === currentYear);

  const currentMonthIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && !t.closed && t.status !== 'pending' && new Date(t.date).getMonth() + 1 === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, currentMonth, currentYear]);

  const goalProgress = currentGoal ? Math.min((currentMonthIncome / currentGoal.goal) * 100, 100) : 0;

  const generateGrowthPlan = (goal: number) => {
    return `Plano de Crescimento para atingir R$ ${goal.toFixed(2)}:
• Meta Semanal: R$ ${(goal / 4).toFixed(2)}
• Meta Diária (20 dias úteis): R$ ${(goal / 20).toFixed(2)}
• Ação 1: Foque nos produtos de maior margem (ex: topos de bolo complexos).
• Ação 2: Reative 5 clientes antigos oferecendo um mimo na próxima compra.
• Ação 3: Poste 3 stories por dia mostrando os bastidores da produção.`;
  };

  const handleSaveGoal = () => {
    const goalValue = parseFloat(goalInput);
    if (isNaN(goalValue) || goalValue <= 0) {
      alert('Insira um valor válido para a meta.');
      return;
    }

    const newGoal = {
      id: `goal_${currentYear}_${currentMonth}`,
      month: currentMonth,
      year: currentYear,
      goal: goalValue,
      plan: generateGrowthPlan(goalValue)
    };

    const updatedGoals = companyData.monthlyGoals ? [...companyData.monthlyGoals.filter(g => g.id !== newGoal.id), newGoal] : [newGoal];
    
    setCompanyData(prev => ({ ...prev, monthlyGoals: updatedGoals }));
    setIsGoalModalOpen(false);
    setGoalInput('');
  };

  const handleDeleteGoal = () => {
    if (!confirm('Deseja realmente excluir a meta deste mês?')) return;
    const updatedGoals = companyData.monthlyGoals?.filter(g => g.id !== `goal_${currentYear}_${currentMonth}`) || [];
    setCompanyData(prev => ({ ...prev, monthlyGoals: updatedGoals }));
  };

  const statsCalculations = useMemo(() => {
    let totalOrçado = 0;
    projects.forEach(project => {
      const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
      totalOrçado += finalPrice;
    });

    const openTransactions = transactions.filter(t => !t.closed);
    const paidTransactions = openTransactions.filter(t => t.status !== 'pending');
    const income = paidTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = paidTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const actualBalance = income - expense;

    const dueToday = projects.filter(p => p.status !== 'completed' && p.deliveryDate === todayStr);
    const active = projects.filter(p => p.status !== 'completed' && p.status !== 'pending');
    
    let activeProjectsValue = 0;
    active.forEach(p => {
      const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      activeProjectsValue += finalPrice;
    });

    // Boletos / Contas a Vencer: Transações pendentes
    const pendingTransactions = transactions.filter(t => !t.closed && t.status === 'pending');
    const pendingToPay = pendingTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const pendingToReceive = pendingTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

    const pendingQuotes = projects.filter(p => p.status === 'pending');
    let pendingQuotesValue = 0;
    pendingQuotes.forEach(p => {
      const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      pendingQuotesValue += finalPrice;
    });

    // Cálculo de Produtos Mais Vendidos
    const productSales: Record<string, number> = {};
    projects.forEach(p => {
      p.items.forEach(item => {
        if (item.productId) {
          productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        }
      });
    });

    const bestSellers = Object.entries(productSales)
      .map(([id, qty]) => ({
        id,
        name: products.find(prod => prod.id === id)?.name || 'Produto Manual',
        quantity: qty
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return { 
      actualBalance, 
      income,
      expense,
      dueToday, 
      active,
      pendingTransactions,
      pendingToPay,
      pendingToReceive,
      pendingQuotes,
      pendingQuotesValue,
      activeProjectsValue,
      bestSellers,
      all: projects
    };
  }, [projects, materials, platforms, companyData, transactions, todayStr, products]);

  const tips = [
    "Sempre peça 50% de sinal antes de começar uma encomenda personalizada.",
    "Calcule seu custo fixo (luz, internet) proporcionalmente ao tempo de produção.",
    "Mantenha seu estoque atualizado para não ser pega de surpresa com falta de material.",
    "Tire fotos em luz natural para valorizar os detalhes do seu artesanato.",
    "Cobre um valor justo pelo seu talento, não apenas pelo custo do material.",
    "Responda orçamentos em menos de 2h para aumentar suas chances de fechamento.",
    "Ofereça um mimo ou cartinha escrita à mão em cada entrega.",
    "Analise seus lucros todo final de mês para entender onde investir.",
    "Separe suas contas pessoais das contas do seu ateliê.",
    "Use o cronograma para evitar trabalhar de madrugada no último dia."
  ];

  const tipOfTheDay = tips[new Date().getDate() % tips.length];

  const seasonalDates = [
    { name: 'Páscoa', date: '2026-04-05', month: 3, strategy: 'Foque em embalagens para ovos e mimos de chocolate. Comece a divulgar 45 dias antes.' },
    { name: 'Dia das Mães', date: '2026-05-10', month: 4, strategy: 'A data mais forte do ano! Crie kits personalizados. Planejamento deve começar em Março.' },
    { name: 'Dia dos Namorados', date: '2026-06-12', month: 5, strategy: 'Presentes românticos e álbuns de fotos. Inicie as vendas na segunda quinzena de Maio.' },
    { name: 'Festa Junina', date: '2026-06-24', month: 5, strategy: 'Topo de bolo e personalizados caipiras. Ótima época para itens de papelaria temática.' },
    { name: 'Dia dos Pais', date: '2026-08-09', month: 7, strategy: 'Kits de escritório e mimos úteis. Divulgação forte a partir de Julho.' },
    { name: 'Dia das Crianças', date: '2026-10-12', month: 9, strategy: 'Brinquedos de papel e kits de colorir. Planeje o estoque de papel colorido em Agosto.' },
    { name: 'Dia dos Professores', date: '2026-10-15', month: 9, strategy: 'Lembrancinhas de baixo custo e alta escala. Ideal para vender em grandes quantidades.' },
    { name: 'Black Friday', date: '2026-11-27', month: 10, strategy: 'Limpeza de estoque! Prepare descontos reais para materiais parados.' },
    { name: 'Natal', date: '2026-12-25', month: 11, strategy: 'Segunda maior data. Foque em cartões, tags e embalagens de presente. Comece em Outubro.' },
  ];

  const upcomingSeasonal = useMemo(() => {
    const now = new Date();
    return seasonalDates
      .filter(d => new Date(d.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, []);

  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case 'today': return { type: 'project', items: statsCalculations.dueToday };
      case 'active': return { type: 'project', items: statsCalculations.active };
      case 'pending': return { type: 'transaction', items: statsCalculations.pendingTransactions.filter(t => t.type === 'expense') };
      case 'receivable': return { type: 'transaction', items: statsCalculations.pendingTransactions.filter(t => t.type === 'income') };
      case 'quotes_pending': return { type: 'project', items: statsCalculations.pendingQuotes };
      default: return { type: 'project', items: [] };
    }
  }, [activeFilter, statsCalculations]);

  const stats = [
    { id: 'all', label: 'Saldo em Caixa', value: `R$ ${statsCalculations.actualBalance.toFixed(2)}`, icon: Wallet2, color: 'bg-green-100 text-green-600', sub: 'Dinheiro real hoje', clickable: false },
    { id: 'today', label: 'Vencendo Hoje', value: statsCalculations.dueToday.length, icon: CalendarDays, color: 'bg-pink-100 text-pink-600', sub: 'Entregas do dia', clickable: true },
    { id: 'pending', label: 'Contas a Pagar', value: `R$ ${statsCalculations.pendingToPay.toFixed(2)}`, icon: Scale, color: 'bg-purple-100 text-purple-600', sub: `${statsCalculations.pendingTransactions.filter(t => t.type === 'expense').length} boletos pendentes`, clickable: true },
    { id: 'active', label: 'Projetos Ativos', value: statsCalculations.active.length, icon: ShoppingBag, color: 'bg-yellow-100 text-yellow-600', sub: 'Em andamento', clickable: true },
  ];

  const getStatusBadge = (project: Project) => {
    if (project.deliveryDate < todayStr) return <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded-md flex items-center gap-1"><AlertCircle size={8}/> Atrasado</span>;
    if (project.deliveryDate === todayStr) return <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-[8px] font-black uppercase rounded-md flex items-center gap-1"><Clock size={8}/> Hoje</span>;
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 text-[8px] font-black uppercase rounded-md flex items-center gap-1"><PackageCheck size={8}/> Ativo</span>;
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Painel de <span className="text-pink-500">Gestão</span></h2>
          <p className="text-gray-400 font-medium">Controle total do seu ateliê em um só lugar.</p>
        </div>
        <div className="bg-white p-3 px-6 rounded-full border border-pink-50 shadow-sm flex items-center gap-3">
          <CalendarDays className="text-pink-500" size={18} />
          <span className="text-sm font-black text-gray-700">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {currentGoal && goalProgress >= 100 && (
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-6 rounded-[2rem] shadow-lg shadow-green-500/20 flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Sparkles className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-white font-black text-xl">Parabéns! Você bateu a meta do mês! 🎉</h3>
              <p className="text-green-50 font-medium text-sm">Seu faturamento de R$ {currentMonthIncome.toFixed(2)} ultrapassou a meta de R$ {currentGoal.goal.toFixed(2)}.</p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Saldo e Inteligência */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Card de Saldo Principal */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-gray-900 text-white p-8 rounded-[3rem] shadow-xl flex flex-col justify-between relative overflow-hidden group min-h-[220px]">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
              <Wallet2 size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Saldo Real em Caixa</p>
              <h3 className="text-4xl font-black">R$ {statsCalculations.actualBalance.toFixed(2)}</h3>
            </div>
            <div className="relative z-10 flex gap-4 mt-6">
              <div className="flex-1 bg-white/10 p-3 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-green-400 uppercase mb-1 flex items-center gap-1"><ArrowUpRight size={10}/> Entradas</p>
                <p className="text-xs font-black">R$ {statsCalculations.income.toFixed(2)}</p>
              </div>
              <div className="flex-1 bg-white/10 p-3 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-red-400 uppercase mb-1 flex items-center gap-1"><ArrowDownRight size={10}/> Saídas</p>
                <p className="text-xs font-black">R$ {statsCalculations.expense.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveFilter('today')}
            className={`p-8 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'today' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white border-pink-50 hover:shadow-xl'}`}
          >
            <div className={`p-4 rounded-2xl shadow-sm w-fit ${activeFilter === 'today' ? 'bg-white/10' : 'bg-pink-100 text-pink-500'}`}>
              <CalendarCheck size={28} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'today' ? 'text-white/60' : 'text-gray-400'}`}>Vencimentos de Hoje</p>
              <p className="text-3xl font-black mt-1">{statsCalculations.dueToday.length}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'today' ? 'text-white/40' : 'text-gray-300'}`}>Compromissos pendentes</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveFilter('pending')}
            className={`p-8 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'pending' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-purple-50 hover:shadow-xl'}`}
          >
            <div className={`p-4 rounded-2xl shadow-sm w-fit ${activeFilter === 'pending' ? 'bg-white/10' : 'bg-purple-100 text-purple-600'}`}>
              <Scale size={28} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'pending' ? 'text-white/60' : 'text-gray-400'}`}>Contas a Pagar</p>
              <p className="text-3xl font-black mt-1">R$ {statsCalculations.pendingToPay.toFixed(2)}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'pending' ? 'text-white/40' : 'text-gray-300'}`}>Boletos e despesas</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveFilter('receivable')}
            className={`p-8 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'receivable' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-emerald-50 hover:shadow-xl'}`}
          >
            <div className={`p-4 rounded-2xl shadow-sm w-fit ${activeFilter === 'receivable' ? 'bg-white/10' : 'bg-emerald-100 text-emerald-600'}`}>
              <TrendingUp size={28} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'receivable' ? 'text-white/60' : 'text-gray-400'}`}>Contas a Receber</p>
              <p className="text-3xl font-black mt-1">R$ {statsCalculations.pendingToReceive.toFixed(2)}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'receivable' ? 'text-white/40' : 'text-gray-300'}`}>Sinais e saldos pendentes</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveFilter('active')}
            className={`p-8 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'active' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white border-yellow-50 hover:shadow-xl'}`}
          >
            <div className={`p-4 rounded-2xl shadow-sm w-fit ${activeFilter === 'active' ? 'bg-white/10' : 'bg-yellow-100 text-yellow-600'}`}>
              <ShoppingBag size={28} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'active' ? 'text-white/60' : 'text-gray-400'}`}>Valor em Produção</p>
              <p className="text-3xl font-black mt-1">R$ {statsCalculations.activeProjectsValue.toFixed(2)}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'active' ? 'text-white/40' : 'text-gray-300'}`}>{statsCalculations.active.length} projetos em andamento</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveFilter('quotes_pending')}
            className={`p-8 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'quotes_pending' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-blue-50 hover:shadow-xl'}`}
          >
            <div className={`p-4 rounded-2xl shadow-sm w-fit ${activeFilter === 'quotes_pending' ? 'bg-white/10' : 'bg-blue-100 text-blue-500'}`}>
              <Calculator size={28} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'quotes_pending' ? 'text-white/60' : 'text-gray-400'}`}>Projetos Aguardando Aprovação</p>
              <p className="text-3xl font-black mt-1">R$ {statsCalculations.pendingQuotesValue.toFixed(2)}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'quotes_pending' ? 'text-white/40' : 'text-gray-300'}`}>{statsCalculations.pendingQuotes.length} aguardando aprovação</p>
            </div>
          </button>

          {/* Card de Meta do Mês */}
          <div className="p-8 rounded-[3rem] border bg-white border-blue-50 hover:shadow-xl transition-all flex flex-col justify-between text-left group min-h-[220px] relative">
            <div className="flex justify-between items-start">
              <div className="p-4 rounded-2xl shadow-sm w-fit bg-blue-100 text-blue-600">
                <Star size={28} />
              </div>
              <button onClick={() => { setGoalInput(currentGoal?.goal.toString() || ''); setIsGoalModalOpen(true); }} className="text-[10px] font-black text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors">
                {currentGoal ? 'Editar Meta' : 'Definir Meta'}
              </button>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meta do Mês</p>
              {currentGoal ? (
                <>
                  <p className="text-3xl font-black mt-1 text-gray-800">R$ {currentGoal.goal.toFixed(2)}</p>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                    <div className={`h-2 rounded-full ${goalProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${goalProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] font-bold mt-2 text-gray-400 flex justify-between">
                    <span>{goalProgress.toFixed(1)}% alcançado</span>
                    {goalProgress >= 100 && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={10}/> Batida!</span>}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold mt-2 text-gray-400">Nenhuma meta definida para este mês.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dica de Gestão Card */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-blue-50 relative overflow-hidden flex flex-col justify-between">
           <div className="absolute -top-4 -right-4 bg-blue-500/10 w-32 h-32 rounded-full blur-3xl"></div>
           <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-100">
                <Lightbulb size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-800">Dica de Gestão</h4>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Para crescer seu ateliê</p>
              </div>
           </div>
           <p className="text-base font-medium text-gray-600 leading-relaxed italic mb-4 relative z-10">
              "{tipOfTheDay}"
           </p>
           <div className="flex items-center gap-2 pt-4 border-t border-gray-50 mt-auto relative z-10">
              <Sparkles size={14} className="text-blue-500" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dica atualizada diariamente</p>
           </div>
      </div>

      {/* Visualização de Filtro Dinâmico */}
      {activeFilter !== 'all' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-pink-50 animate-slideUp">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className={`p-4 text-white rounded-3xl shadow-xl ${activeFilter === 'pending' ? 'bg-purple-600' : activeFilter === 'receivable' ? 'bg-emerald-600' : activeFilter === 'quotes_pending' ? 'bg-blue-500' : 'bg-gray-900'}`}>
                    {activeFilter === 'today' ? <CalendarCheck size={28} /> : activeFilter === 'pending' ? <Scale size={28} /> : activeFilter === 'receivable' ? <TrendingUp size={28} /> : activeFilter === 'quotes_pending' ? <Calculator size={28} /> : <ShoppingBag size={28} />}
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                      {activeFilter === 'today' ? 'Vencimentos de Hoje' : activeFilter === 'pending' ? 'Contas a Pagar (Boletos)' : activeFilter === 'receivable' ? 'Contas a Receber' : activeFilter === 'quotes_pending' ? 'Projetos Aguardando Aprovação' : 'Projetos em Produção'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                      {filteredData.items.length} {filteredData.items.length === 1 ? 'item identificado' : 'itens identificados'}
                    </p>
                 </div>
              </div>
              <button 
                onClick={() => setActiveFilter('all')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 hover:bg-pink-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
              >
                <FilterX size={16} /> Fechar Detalhes
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredData.type === 'project' ? (
                (filteredData.items as Project[]).map(project => {
                  const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
                  const customer = customers.find(c => c.id === project.customerId);
                  return (
                    <div key={project.id} className="p-8 rounded-[2.5rem] border hover:shadow-2xl transition-all group flex flex-col justify-between bg-gray-50/50 border-gray-100 hover:bg-white">
                       <div>
                         <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col gap-2">
                               {getStatusBadge(project)}
                               <h4 className="font-black text-gray-800 text-lg group-hover:text-pink-600 transition-colors leading-tight">{project.theme}</h4>
                               <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 italic"><Clock size={10} /> {customer?.name || 'Cliente Avulso'}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-lg font-black text-pink-500">R$ {finalPrice.toFixed(2)}</p>
                            </div>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-6">
                          <div className="flex-1">
                             <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1 text-gray-300">Prazo de Entrega</p>
                             <p className="text-xs font-black leading-none text-gray-700">
                                {new Date(project.deliveryDate).toLocaleDateString('pt-BR')}
                             </p>
                          </div>
                          <button className="p-3 rounded-2xl shadow-sm transition-all group-hover:scale-110 bg-white text-gray-300 hover:bg-pink-500 hover:text-white">
                             <ArrowRightCircle size={20} />
                          </button>
                       </div>
                    </div>
                  );
                })
              ) : (
                (filteredData.items as Transaction[]).map(transaction => (
                  <div key={transaction.id} className={`p-8 rounded-[2.5rem] border hover:shadow-2xl transition-all group flex flex-col justify-between ${transaction.type === 'income' ? 'bg-emerald-50/30 border-emerald-100 hover:bg-white' : 'bg-purple-50/30 border-purple-100 hover:bg-white'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-2">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md w-fit ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'}`}>Pendente</span>
                          <h4 className={`font-black text-gray-800 text-lg transition-colors leading-tight ${transaction.type === 'income' ? 'group-hover:text-emerald-600' : 'group-hover:text-purple-600'}`}>{transaction.description}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 italic">{transaction.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-4 pt-6 border-t mt-6 ${transaction.type === 'income' ? 'border-emerald-100' : 'border-purple-100'}`}>
                      <div className="flex-1">
                        <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${transaction.type === 'income' ? 'text-emerald-300' : 'text-purple-300'}`}>Data Esperada</p>
                        <p className="text-xs font-black leading-none text-gray-700">
                          {new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm(`Marcar este lançamento como ${transaction.type === 'income' ? 'RECEBIDO' : 'PAGO'}?`)) {
                            setTransactions(prev => prev.map(t => 
                              t.id === transaction.id ? { ...t, status: 'paid' } : t
                            ));
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-sm"
                      >
                        <CheckCircle2 size={14} /> {transaction.type === 'income' ? 'Receber' : 'Dar Baixa'}
                      </button>
                    </div>
                  </div>
                ))
              )}
              {filteredData.items.length === 0 && (
                <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                  <div className="p-6 bg-gray-100 text-gray-300 rounded-full"><CheckCircle2 size={48} /></div>
                  <p className="text-gray-400 font-black uppercase text-xs tracking-widest italic">Tudo em ordem por aqui!</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Grid Secundário: Ranking e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Calendário Sazonal e Planejamento */}
        <div className="lg:col-span-12 bg-white p-10 rounded-[3rem] shadow-sm border border-pink-50">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                 <div className="p-4 bg-pink-500 text-white rounded-3xl shadow-lg shadow-pink-100">
                    <CalendarDays size={24} />
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-gray-800">Calendário Sazonal</h4>
                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Planejamento Estratégico de Vendas</p>
                 </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-full">
                 <Sparkles size={14} className="text-pink-500" />
                 <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Dicas da Calculiê</span>
              </div>
           </div>

           <div className="max-w-2xl mx-auto">
              {upcomingSeasonal.length > 0 ? (
                (() => {
                  const event = upcomingSeasonal[0];
                  const eventDate = new Date(event.date);
                  const now = new Date();
                  const diffTime = eventDate.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isUpcoming = diffDays > 0 && diffDays <= 60;

                  return (
                    <div className={`p-10 rounded-[3rem] border transition-all flex flex-col gap-6 relative overflow-hidden bg-pink-50/30 border-pink-100 shadow-xl scale-[1.02]`}>
                       <div className="absolute top-0 right-0 bg-pink-500 text-white px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                          Próxima Data Sazonal
                       </div>
                       
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{eventDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                             <h5 className="text-3xl font-black text-gray-800 mt-1">{event.name}</h5>
                          </div>
                          <div className="w-20 h-20 bg-pink-500 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-lg shadow-pink-200">
                             {eventDate.getDate()}
                          </div>
                       </div>
                       
                       <div className="space-y-6">
                          <div className="flex items-start gap-4 p-6 bg-white rounded-[2rem] border border-pink-50">
                             <div className="mt-1 p-2 bg-pink-100 text-pink-600 rounded-xl">
                                <Lightbulb size={20} />
                             </div>
                             <div>
                                <h6 className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Estratégia de Venda</h6>
                                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                                   {event.strategy}
                                </p>
                             </div>
                          </div>
                          
                          <div className="pt-4">
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Status do Planejamento</span>
                                <span className="text-xs font-black text-pink-600 uppercase tracking-widest">{diffDays} dias restantes</span>
                             </div>
                             <div className="h-3 bg-pink-100 rounded-full overflow-hidden">
                                <div 
                                   className="h-full bg-pink-500 rounded-full transition-all duration-1000" 
                                   style={{ width: `${Math.max(0, Math.min(100, (60 - diffDays) / 60 * 100))}%` }}
                                />
                             </div>
                             <div className="flex items-center gap-2 mt-4 bg-white/50 p-3 rounded-2xl border border-pink-50/50">
                                <AlertTriangle size={14} className="text-pink-500" />
                                <p className="text-[10px] font-bold text-pink-400 italic">
                                   {diffDays > 45 ? 'Tempo de criar protótipos e fotos.' : diffDays > 30 ? 'Hora de abrir a agenda de encomendas!' : 'Últimos dias para aceitar pedidos.'}
                                </p>
                             </div>
                          </div>
                       </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-10 text-center text-gray-300 italic text-xs font-bold uppercase tracking-widest">
                  Nenhuma data sazonal próxima...
                </div>
              )}
           </div>
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="lg:col-span-5 bg-white p-10 rounded-[3rem] shadow-sm border border-yellow-50">
           <div className="flex items-center gap-3 mb-10">
              <div className="p-4 bg-yellow-400 text-yellow-900 rounded-3xl shadow-lg shadow-yellow-100">
                <Star size={24} />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-800">Mais Vendidos</h4>
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Os favoritos das clientes</p>
              </div>
           </div>

           <div className="space-y-8">
              {statsCalculations.bestSellers.map((item, index) => {
                 const maxQty = statsCalculations.bestSellers[0].quantity;
                 const percentage = (item.quantity / maxQty) * 100;
                 return (
                   <div key={item.id} className="space-y-2 group">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                           <span className="text-xs font-black text-gray-300 group-hover:text-yellow-500 transition-colors">#{index + 1}</span>
                           <p className="text-sm font-black text-gray-700 truncate max-w-[180px]">{item.name}</p>
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.quantity} un.</p>
                      </div>
                      <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                         <div 
                           className="h-full bg-yellow-400 rounded-full transition-all duration-1000 group-hover:bg-yellow-500" 
                           style={{ width: `${percentage}%` }}
                         />
                      </div>
                   </div>
                 );
              })}
              {statsCalculations.bestSellers.length === 0 && (
                <div className="py-10 text-center text-gray-300 italic text-xs font-bold uppercase tracking-widest">
                  Aguardando primeiras vendas...
                </div>
              )}
           </div>
        </div>

        {/* Atividade Recente (Resumo Financeiro e Entregas) */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[3rem] shadow-sm border border-pink-50">
            <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <TrendingUp className="text-blue-500" /> Fluxo do Ateliê
                </h3>
                <span className="text-[10px] font-black bg-pink-50 text-pink-500 px-4 py-2 rounded-full uppercase tracking-widest">
                    Últimas Movimentações
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-4 flex items-center gap-2">
                       <ArrowRight size={12} /> Próximas Entregas
                    </h4>
                    {projects.filter(p => p.status !== 'completed').slice(0, 4).map(p => (
                        <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border ${p.deliveryDate < todayStr ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'} hover:bg-white transition-all cursor-default`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 bg-white rounded-xl shadow-sm ${p.deliveryDate < todayStr ? 'text-red-500' : 'text-blue-500'}`}><ShoppingBag size={14} /></div>
                                <div className="max-w-[100px]">
                                    <p className="text-xs font-black text-gray-700 truncate">{p.theme}</p>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase truncate">{p.celebrantName || 'S/N'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-[9px] font-black uppercase ${p.deliveryDate < todayStr ? 'text-red-600' : 'text-blue-600'}`}>
                                  {new Date(p.deliveryDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {projects.filter(p => p.status !== 'completed').length === 0 && (
                      <p className="text-[10px] text-gray-300 font-bold uppercase italic text-center py-4">Nenhuma entrega agendada</p>
                    )}
                </div>

                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] border-b border-purple-50 pb-4 flex items-center gap-2">
                       <ArrowRight size={12} /> Contas a Pagar
                    </h4>
                    {transactions.filter(t => !t.closed && t.status === 'pending' && t.type === 'expense').slice(0, 4).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border bg-purple-50/50 border-purple-100 hover:bg-white transition-all cursor-default">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-purple-500">
                                  <Scale size={14} />
                                </div>
                                <div className="max-w-[100px]">
                                    <p className="text-xs font-black text-gray-700 truncate">{t.description}</p>
                                    <p className="text-[8px] text-purple-400 font-bold uppercase">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-red-600">
                                  R$ {t.amount.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                    {transactions.filter(t => !t.closed && t.status === 'pending' && t.type === 'expense').length === 0 && (
                      <p className="text-[10px] text-gray-300 font-bold uppercase italic text-center py-4">Nenhuma conta pendente</p>
                    )}
                </div>

                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-emerald-50 pb-4 flex items-center gap-2">
                       <ArrowRight size={12} /> Contas a Receber
                    </h4>
                    {transactions.filter(t => !t.closed && t.status === 'pending' && t.type === 'income').slice(0, 4).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border bg-emerald-50/50 border-emerald-100 hover:bg-white transition-all cursor-default">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-500">
                                  <TrendingUp size={14} />
                                </div>
                                <div className="max-w-[100px]">
                                    <p className="text-xs font-black text-gray-700 truncate">{t.description}</p>
                                    <p className="text-[8px] text-emerald-400 font-bold uppercase">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-emerald-600">
                                  R$ {t.amount.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                    {transactions.filter(t => !t.closed && t.status === 'pending' && t.type === 'income').length === 0 && (
                      <p className="text-[10px] text-gray-300 font-bold uppercase italic text-center py-4">Nenhum valor a receber</p>
                    )}
                </div>

                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-4 flex items-center gap-2">
                       <ArrowRight size={12} /> Caixa Recente
                    </h4>
                    {transactions.filter(t => !t.closed && t.status !== 'pending').slice(0, 4).map(t => (
                        <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl border ${t.type === 'income' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} hover:bg-white transition-all cursor-default`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 bg-white rounded-xl shadow-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                  <Wallet2 size={14} />
                                </div>
                                <div className="max-w-[100px]">
                                    <p className="text-xs font-black text-gray-700 truncate">{t.description}</p>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase">{t.category}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {t.amount.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Modal de Meta do Mês */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setIsGoalModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Meta do <span className="text-blue-500">Mês</span></h3>
            <p className="text-sm font-bold text-gray-400 mb-6">Defina um objetivo de faturamento para {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Valor da Meta (R$)</label>
                <input 
                  type="number" 
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 5000.00"
                />
              </div>

              {currentGoal && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Plano de Crescimento Atual:</h4>
                  <p className="text-xs font-bold text-blue-800 whitespace-pre-line leading-relaxed">{currentGoal.plan}</p>
                </div>
              )}

              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-50">
                <button 
                  onClick={handleSaveGoal}
                  className="flex-1 bg-blue-500 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                >
                  Salvar Meta
                </button>
                {currentGoal && (
                  <button 
                    onClick={handleDeleteGoal}
                    className="px-6 bg-red-50 text-red-500 font-black rounded-2xl hover:bg-red-100 transition-colors"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
