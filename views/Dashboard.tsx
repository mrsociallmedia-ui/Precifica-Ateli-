
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
  X,
  Instagram,
  Store,
  Video,
  Image,
  MessageSquare,
  Send,
  RefreshCw,
  Layout,
  Plus,
  Trash2,
  Calendar,
  Filter
} from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { Project, Customer, Material, CompanyData, Platform, Transaction, Product, MonthlyGoal, PlatformGoal } from '../types';
import { calculateProjectBreakdown } from '../utils';
import { AICaptionGenerator } from './AICaptionGenerator';

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
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  onNavigate?: (tab: string) => void;
}

type DashboardFilter = 'all' | 'today' | 'active' | 'pending' | 'receivable' | 'quotes_pending' | 'pending_payments';
type PendingPaymentDateFilter = 'this_week' | 'next_week' | 'this_month' | 'all' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({ projects, customers, materials, companyData, platforms, transactions, products, setTransactions, setCompanyData, setProjects, onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  
  // Filtro por Data e Semana para Pagamentos Pendentes
  const [pendingDateFilter, setPendingDateFilter] = useState<PendingPaymentDateFilter>('this_week');
  const [pendingStartDate, setPendingStartDate] = useState('');
  const [pendingEndDate, setPendingEndDate] = useState('');

  // Dynamic platform goals states
  const [platformGoalsList, setPlatformGoalsList] = useState<PlatformGoal[]>([]);
  const [newPlatformId, setNewPlatformId] = useState('');
  const [newPlatformCustomName, setNewPlatformCustomName] = useState('');
  const [newPlatformValue, setNewPlatformValue] = useState('');
  const [newPlatformType, setNewPlatformType] = useState<'units' | 'money'>('units');

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

  // Calcula o progresso real atual para cada meta de plataforma no mês vigente
  const platformProgressList = useMemo(() => {
    if (!currentGoal) return [];

    let goals = currentGoal.platformGoals;
    if (!goals || goals.length === 0) {
      // Compatibilidade retroativa para registros antigos do banco
      goals = [];
      if (currentGoal.shopeeSalesGoal) {
        goals.push({
          platformId: 'shopee',
          platformName: 'Shopee',
          targetValue: currentGoal.shopeeSalesGoal,
          targetType: 'units'
        });
      }
      if (currentGoal.elo7SalesGoal) {
        goals.push({
          platformId: 'elo7',
          platformName: 'Elo7',
          targetValue: currentGoal.elo7SalesGoal,
          targetType: 'units'
        });
      }
    }

    return goals.map(g => {
      // Filtrar projetos ativos ou concluídos no mês e ano correntes que combinam com este canal
      const matchingProjects = projects.filter(p => {
        const isPlatformMatch = p.platformId === g.platformId || 
                              (g.platformId.startsWith('custom_') && p.platformId === g.platformId);
        
        if (!isPlatformMatch) return false;
        if (p.status === 'pending') return false; // ignorar orçamentos / cancelados

        const pMonth = p.orderDate ? parseInt(p.orderDate.split('-')[1], 10) : 0;
        const pYear = p.orderDate ? parseInt(p.orderDate.split('-')[0], 10) : 0;
        return pMonth === currentMonth && pYear === currentYear;
      });

      let actualValue = 0;
      if (g.targetType === 'money') {
        // Faturamento real somando valor total dos projetos vendidos neste canal
        actualValue = matchingProjects.reduce((acc, p) => {
          const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
          return acc + finalPrice;
        }, 0);
      } else {
        // Quantidade total de unidades vendidas das peças do projeto
        actualValue = matchingProjects.reduce((acc, p) => {
          const itemsQty = p.items ? p.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
          return acc + itemsQty;
        }, 0);
      }

      const progressPercent = g.targetValue > 0 ? Math.min((actualValue / g.targetValue) * 100, 100) : 0;

      return {
        ...g,
        actualValue,
        progressPercent
      };
    });
  }, [currentGoal, projects, currentMonth, currentYear, materials, platforms, companyData, transactions]);

  const generateGrowthPlan = (goal: number) => {
    return `Plano de Crescimento para atingir R$ ${goal.toFixed(2)}:
• Meta Semanal: R$ ${(goal / 4).toFixed(2)}
• Meta Diária (20 dias úteis): R$ ${(goal / 20).toFixed(2)}
• Ação 1: Foque nos produtos de maior margem (ex: topos de bolo complexos).
• Ação 2: Reative 5 clientes antigos oferecendo um mimo na próxima compra.
• Ação 3: Diversifique seus canais de vendas e atinja mais clientes em suas plataformas preferidas!`;
  };

  const handleAddPlatformGoal = () => {
    if (!newPlatformId) {
      alert('Selecione uma plataforma.');
      return;
    }
    const targetVal = parseFloat(newPlatformValue);
    if (isNaN(targetVal) || targetVal <= 0) {
      alert('Insira um valor de faturamento ou unidades válido.');
      return;
    }

    let pName = '';
    if (newPlatformId === 'custom') {
      pName = newPlatformCustomName.trim();
      if (!pName) {
        alert('Digite o nome da plataforma personalizada.');
        return;
      }
    } else {
      const foundPlat = platforms.find(p => p.id === newPlatformId);
      pName = foundPlat ? foundPlat.name : newPlatformId;
    }

    if (platformGoalsList.some(item => item.platformId === newPlatformId && item.platformName === pName && item.targetType === newPlatformType)) {
      alert('Já existe uma meta cadastrada para esta plataforma com o mesmo tipo de faturamento/unidade.');
      return;
    }

    const newGoalItem: PlatformGoal = {
      platformId: newPlatformId === 'custom' ? `custom_${Date.now()}` : newPlatformId,
      platformName: pName,
      targetValue: targetVal,
      targetType: newPlatformType
    };

    setPlatformGoalsList(prev => [...prev, newGoalItem]);
    setNewPlatformId('');
    setNewPlatformCustomName('');
    setNewPlatformValue('');
  };

  const handleRemovePlatformGoal = (index: number) => {
    setPlatformGoalsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveGoal = () => {
    const goalValue = parseFloat(goalInput);
    if (isNaN(goalValue) || goalValue <= 0) {
      alert('Insira um valor válido para a meta de faturamento.');
      return;
    }

    const newGoal: MonthlyGoal = {
      id: `goal_${currentYear}_${currentMonth}`,
      month: currentMonth,
      year: currentYear,
      goal: goalValue,
      plan: generateGrowthPlan(goalValue),
      platformGoals: platformGoalsList,
      // Se houver shopee e elo7 na lista em unidades, salvamos no nível raiz de forma retrocompatível
      shopeeSalesGoal: platformGoalsList.find(p => p.platformId === 'shopee' && p.targetType === 'units')?.targetValue || 0,
      elo7SalesGoal: platformGoalsList.find(p => p.platformId === 'elo7' && p.targetType === 'units')?.targetValue || 0
    };

    const updatedGoals = companyData.monthlyGoals ? [...companyData.monthlyGoals.filter(g => g.id !== newGoal.id), newGoal] : [newGoal];
    
    setCompanyData(prev => ({ ...prev, monthlyGoals: updatedGoals }));
    setIsGoalModalOpen(false);
    setGoalInput('');
    setPlatformGoalsList([]);
    setNewPlatformId('');
    setNewPlatformCustomName('');
    setNewPlatformValue('');
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

    // Pagamentos Pendentes de Encomendas (pedidos ativos/aprovados com saldo a receber ou status pending_payment)
    const pendingPaymentProjects = projects.filter(p => {
      if (p.status === 'completed' || p.isExchange) return false;
      const { remainingBalance } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      return p.status === 'pending_payment' || remainingBalance > 0;
    });

    let pendingProjectsValue = 0;
    pendingPaymentProjects.forEach(p => {
      const { remainingBalance, finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      pendingProjectsValue += remainingBalance > 0 ? remainingBalance : (p.status === 'pending_payment' ? finalPrice : 0);
    });

    // Transações pendentes de entrada avulsas
    const pendingIncomeTransactions = pendingTransactions.filter(t => t.type === 'income');
    const pendingIncomeTransactionsValue = pendingIncomeTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Total Geral de Pagamentos Pendentes
    const totalPendingPayments = pendingProjectsValue + pendingIncomeTransactionsValue;

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
      pendingPaymentProjects,
      pendingProjectsValue,
      pendingIncomeTransactions,
      totalPendingPayments,
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

  // Intervalos de Datas para Filtros Semanais e Mensais
  const dateRanges = useMemo(() => {
    const now = new Date();

    // Esta Semana (Segunda a Domingo)
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);

    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);
    thisSunday.setHours(23, 59, 59, 999);

    // Próxima Semana
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    // Este Mês
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const fmtPt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return {
      thisWeek: {
        start: fmt(thisMonday),
        end: fmt(thisSunday),
        label: `${fmtPt(thisMonday)} a ${fmtPt(thisSunday)}`
      },
      nextWeek: {
        start: fmt(nextMonday),
        end: fmt(nextSunday),
        label: `${fmtPt(nextMonday)} a ${fmtPt(nextSunday)}`
      },
      thisMonth: {
        start: fmt(monthStart),
        end: fmt(monthEnd),
        label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      }
    };
  }, []);

  // Cálculos de Pagamentos Pendentes agrupados e filtrados por Semana / Data
  const pendingPaymentsByPeriod = useMemo(() => {
    const isWithinRange = (dateStr: string, start?: string, end?: string) => {
      if (!dateStr) return false;
      if (start && dateStr < start) return false;
      if (end && dateStr > end) return false;
      return true;
    };

    const getItemAmount = (p: Project) => {
      const { remainingBalance, finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      return remainingBalance > 0 ? remainingBalance : (p.status === 'pending_payment' ? finalPrice : 0);
    };

    const allProjects = statsCalculations.pendingPaymentProjects;
    const allTxs = statsCalculations.pendingIncomeTransactions;

    // Calcular valores por período
    const thisWeekProjects = allProjects.filter(p => isWithinRange(p.deliveryDate || '', dateRanges.thisWeek.start, dateRanges.thisWeek.end));
    const thisWeekTxs = allTxs.filter(t => isWithinRange(t.date, dateRanges.thisWeek.start, dateRanges.thisWeek.end));
    const thisWeekTotal = thisWeekProjects.reduce((sum, p) => sum + getItemAmount(p), 0) + thisWeekTxs.reduce((sum, t) => sum + t.amount, 0);

    const nextWeekProjects = allProjects.filter(p => isWithinRange(p.deliveryDate || '', dateRanges.nextWeek.start, dateRanges.nextWeek.end));
    const nextWeekTxs = allTxs.filter(t => isWithinRange(t.date, dateRanges.nextWeek.start, dateRanges.nextWeek.end));
    const nextWeekTotal = nextWeekProjects.reduce((sum, p) => sum + getItemAmount(p), 0) + nextWeekTxs.reduce((sum, t) => sum + t.amount, 0);

    const thisMonthProjects = allProjects.filter(p => isWithinRange(p.deliveryDate || '', dateRanges.thisMonth.start, dateRanges.thisMonth.end));
    const thisMonthTxs = allTxs.filter(t => isWithinRange(t.date, dateRanges.thisMonth.start, dateRanges.thisMonth.end));
    const thisMonthTotal = thisMonthProjects.reduce((sum, p) => sum + getItemAmount(p), 0) + thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);

    const allTotal = statsCalculations.totalPendingPayments;

    // Itens de acordo com o filtro selecionado (pendingDateFilter)
    let filteredProjects = allProjects;
    let filteredTxs = allTxs;
    let activeLabel = 'Todas as Datas';

    if (pendingDateFilter === 'this_week') {
      filteredProjects = thisWeekProjects;
      filteredTxs = thisWeekTxs;
      activeLabel = `Esta Semana (${dateRanges.thisWeek.label})`;
    } else if (pendingDateFilter === 'next_week') {
      filteredProjects = nextWeekProjects;
      filteredTxs = nextWeekTxs;
      activeLabel = `Próxima Semana (${dateRanges.nextWeek.label})`;
    } else if (pendingDateFilter === 'this_month') {
      filteredProjects = thisMonthProjects;
      filteredTxs = thisMonthTxs;
      activeLabel = `Este Mês (${dateRanges.thisMonth.label})`;
    } else if (pendingDateFilter === 'custom') {
      filteredProjects = allProjects.filter(p => isWithinRange(p.deliveryDate || '', pendingStartDate, pendingEndDate));
      filteredTxs = allTxs.filter(t => isWithinRange(t.date, pendingStartDate, pendingEndDate));
      const startFmt = pendingStartDate ? new Date(pendingStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';
      const endFmt = pendingEndDate ? new Date(pendingEndDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';
      activeLabel = startFmt || endFmt ? `Período: ${startFmt || 'Início'} até ${endFmt || 'Hoje/Futuro'}` : 'Período Personalizado';
    }

    const currentTotal = filteredProjects.reduce((sum, p) => sum + getItemAmount(p), 0) + filteredTxs.reduce((sum, t) => sum + t.amount, 0);

    return {
      thisWeekTotal,
      thisWeekCount: thisWeekProjects.length + thisWeekTxs.length,
      nextWeekTotal,
      nextWeekCount: nextWeekProjects.length + nextWeekTxs.length,
      thisMonthTotal,
      thisMonthCount: thisMonthProjects.length + thisMonthTxs.length,
      allTotal,
      allCount: allProjects.length + allTxs.length,
      filteredProjects,
      filteredTxs,
      currentTotal,
      currentCount: filteredProjects.length + filteredTxs.length,
      activeLabel
    };
  }, [statsCalculations, dateRanges, pendingDateFilter, pendingStartDate, pendingEndDate, materials, platforms, companyData, transactions]);

  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case 'today': return { type: 'project', items: statsCalculations.dueToday };
      case 'active': return { type: 'project', items: statsCalculations.active };
      case 'pending': return { type: 'transaction', items: statsCalculations.pendingTransactions.filter(t => t.type === 'expense') };
      case 'receivable': return { type: 'transaction', items: statsCalculations.pendingTransactions.filter(t => t.type === 'income') };
      case 'quotes_pending': return { type: 'project', items: statsCalculations.pendingQuotes };
      case 'pending_payments': return { 
        type: 'pending_payments', 
        items: pendingPaymentsByPeriod.filteredProjects,
        extraTransactions: pendingPaymentsByPeriod.filteredTxs
      };
      default: return { type: 'project', items: [] };
    }
  }, [activeFilter, statsCalculations, pendingPaymentsByPeriod]);

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
            <div className="p-3 bg-white/20 rounded-2xl">
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
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
          <div className="bg-gray-900 text-white p-8 rounded-[3rem] shadow-xl flex flex-col justify-between relative overflow-hidden group min-h-[220px] 2xl:col-span-2">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
              <Wallet2 size={120} />
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Saldo Real em Caixa</p>
                <h3 className="text-4xl font-black">R$ {statsCalculations.actualBalance.toFixed(2)}</h3>
              </div>
              {statsCalculations.totalPendingPayments > 0 && (
                <button
                  onClick={() => setActiveFilter('pending_payments')}
                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-3.5 py-1.5 rounded-2xl transition-all text-right group/badge"
                  title="Clique para ver pagamentos pendentes"
                >
                  <span className="text-[8px] font-black uppercase tracking-wider flex items-center justify-end gap-1 text-orange-300">
                    <Clock size={10} /> Pendentes ({pendingDateFilter === 'this_week' ? 'Semana' : pendingDateFilter === 'next_week' ? 'Próx. Sem.' : 'Total'})
                  </span>
                  <span className="text-xs font-black text-white group-hover/badge:text-orange-200">
                    R$ {pendingPaymentsByPeriod.currentTotal.toFixed(2)}
                  </span>
                </button>
              )}
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

          {/* Card: Pagamentos Pendentes com Seletor Semanal */}
          <div 
            className={`p-7 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'pending_payments' ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-500/20' : 'bg-white border-orange-100 hover:shadow-xl'}`}
          >
            <div className="flex items-start justify-between w-full mb-3 gap-2">
              <button 
                type="button"
                onClick={() => setActiveFilter('pending_payments')}
                className={`p-3.5 rounded-2xl shadow-sm w-fit transition-transform hover:scale-105 ${activeFilter === 'pending_payments' ? 'bg-white/10 text-white' : 'bg-orange-100 text-orange-600'}`}
                title="Abrir detalhes de pagamentos pendentes"
              >
                <Clock size={24} />
              </button>

              {/* Seletor Rápido de Semana */}
              <div className={`flex items-center p-1 rounded-2xl text-[9px] font-black uppercase transition-colors ${activeFilter === 'pending_payments' ? 'bg-black/20' : 'bg-gray-100'}`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDateFilter('this_week');
                  }}
                  className={`px-2.5 py-1 rounded-xl transition-all ${
                    pendingDateFilter === 'this_week' 
                      ? (activeFilter === 'pending_payments' ? 'bg-white text-orange-600 shadow-sm' : 'bg-orange-500 text-white shadow-sm')
                      : (activeFilter === 'pending_payments' ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-800')
                  }`}
                  title={`Esta Semana: ${dateRanges.thisWeek.label}`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDateFilter('next_week');
                  }}
                  className={`px-2.5 py-1 rounded-xl transition-all ${
                    pendingDateFilter === 'next_week' 
                      ? (activeFilter === 'pending_payments' ? 'bg-white text-orange-600 shadow-sm' : 'bg-orange-500 text-white shadow-sm')
                      : (activeFilter === 'pending_payments' ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-800')
                  }`}
                  title={`Próxima Semana: ${dateRanges.nextWeek.label}`}
                >
                  Próxima
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDateFilter('all');
                  }}
                  className={`px-2.5 py-1 rounded-xl transition-all ${
                    pendingDateFilter === 'all' 
                      ? (activeFilter === 'pending_payments' ? 'bg-white text-orange-600 shadow-sm' : 'bg-orange-500 text-white shadow-sm')
                      : (activeFilter === 'pending_payments' ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-800')
                  }`}
                  title="Todos os pagamentos pendentes"
                >
                  Geral
                </button>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setActiveFilter('pending_payments')}
              className="text-left w-full focus:outline-none cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'pending_payments' ? 'text-white/80' : 'text-orange-500 font-extrabold'}`}>
                  Pagamentos Pendentes
                </p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${activeFilter === 'pending_payments' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                  {pendingDateFilter === 'this_week' ? 'Esta Semana' : pendingDateFilter === 'next_week' ? 'Próx. Semana' : pendingDateFilter === 'this_month' ? 'Este Mês' : pendingDateFilter === 'custom' ? 'Por Data' : 'Todas'}
                </span>
              </div>
              <p className="text-3xl font-black mt-1">
                R$ {pendingPaymentsByPeriod.currentTotal.toFixed(2)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className={`text-[10px] font-bold ${activeFilter === 'pending_payments' ? 'text-white/70' : 'text-gray-400'}`}>
                  {pendingPaymentsByPeriod.currentCount} {pendingPaymentsByPeriod.currentCount === 1 ? 'encomenda a quitar' : 'encomendas a quitar'}
                  {pendingDateFilter !== 'all' && ` • Total: R$ ${pendingPaymentsByPeriod.allTotal.toFixed(2)}`}
                </p>
                <span className={`text-[9px] font-black uppercase flex items-center gap-0.5 ${activeFilter === 'pending_payments' ? 'text-white underline' : 'text-orange-600 group-hover:translate-x-0.5 transition-transform'}`}>
                  Ver &rarr;
                </span>
              </div>
            </button>
          </div>

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
              <button onClick={() => { 
                setGoalInput(currentGoal?.goal.toString() || ''); 
                const initialGoalsList: PlatformGoal[] = [];
                if (currentGoal?.platformGoals) {
                  initialGoalsList.push(...currentGoal.platformGoals);
                } else {
                  if (currentGoal?.shopeeSalesGoal) {
                    initialGoalsList.push({
                      platformId: 'shopee',
                      platformName: 'Shopee',
                      targetValue: currentGoal.shopeeSalesGoal,
                      targetType: 'units'
                    });
                  }
                  if (currentGoal?.elo7SalesGoal) {
                    initialGoalsList.push({
                      platformId: 'elo7',
                      platformName: 'Elo7',
                      targetValue: currentGoal.elo7SalesGoal,
                      targetType: 'units'
                    });
                  }
                }
                setPlatformGoalsList(initialGoalsList);
                setIsGoalModalOpen(true); 
              }} className="text-[10px] font-black text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors">
                {currentGoal ? 'Editar Meta' : 'Definir Meta'}
              </button>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meta do Mês</p>
              {currentGoal ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-black mt-1 text-gray-800">R$ {currentGoal.goal.toFixed(2)}</p>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                      <div className={`h-2 rounded-full ${goalProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${goalProgress}%` }}></div>
                    </div>
                    <p className="text-[10px] font-bold mt-2 text-gray-400 flex justify-between">
                      <span>{goalProgress.toFixed(1)}% alcançado</span>
                      {goalProgress >= 100 && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={10}/> Batida!</span>}
                    </p>
                  </div>

                  {/* Metas por Plataforma */}
                  {platformProgressList.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 space-y-4 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                      <p className="text-[9px] font-black uppercase tracking-wider text-orange-500">Metas por Plataforma</p>
                      {platformProgressList.map((g, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-gray-700 truncate block max-w-[120px]">{g.platformName}</span>
                            <span className="text-[10px] font-black text-orange-600">
                              {g.targetType === 'money'
                                ? `R$ ${g.actualValue.toFixed(0)} / R$ ${g.targetValue.toFixed(0)}`
                                : `${g.actualValue} / ${g.targetValue} un.`}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${g.progressPercent >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} 
                              style={{ width: `${g.progressPercent}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[8px] font-bold text-gray-400">
                            <span>{g.progressPercent.toFixed(1)}% alcançado</span>
                            {g.progressPercent >= 100 && (
                              <span className="text-green-500 flex items-center gap-0.5 font-extrabold">
                                <CheckCircle2 size={8} /> Batida!
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm font-bold mt-2 text-gray-400">Nenhuma meta definida para este mês.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Criador de Legendas por IA */}
      <AICaptionGenerator companyData={companyData} products={products} projects={projects} />

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
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-pink-50 animate-slideUp">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className={`p-4 text-white rounded-3xl shadow-xl ${activeFilter === 'pending' ? 'bg-purple-600' : activeFilter === 'receivable' ? 'bg-emerald-600' : activeFilter === 'pending_payments' ? 'bg-orange-500 shadow-orange-200' : activeFilter === 'quotes_pending' ? 'bg-blue-500' : 'bg-gray-900'}`}>
                    {activeFilter === 'today' ? <CalendarCheck size={28} /> : activeFilter === 'pending' ? <Scale size={28} /> : activeFilter === 'receivable' ? <TrendingUp size={28} /> : activeFilter === 'pending_payments' ? <Clock size={28} /> : activeFilter === 'quotes_pending' ? <Calculator size={28} /> : <ShoppingBag size={28} />}
                 </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                      {activeFilter === 'today' ? 'Vencimentos de Hoje' : activeFilter === 'pending' ? 'Contas a Pagar (Boletos)' : activeFilter === 'receivable' ? 'Contas a Receber' : activeFilter === 'pending_payments' ? 'Pagamentos Pendentes a Receber' : activeFilter === 'quotes_pending' ? 'Projetos Aguardando Aprovação' : 'Projetos em Produção'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                      {activeFilter === 'pending_payments' 
                        ? `${pendingPaymentsByPeriod.activeLabel} • Total: R$ ${pendingPaymentsByPeriod.currentTotal.toFixed(2)} (${pendingPaymentsByPeriod.currentCount} ${pendingPaymentsByPeriod.currentCount === 1 ? 'encomenda' : 'encomendas'})`
                        : `${filteredData.items.length} ${filteredData.items.length === 1 ? 'item identificado' : 'itens identificados'}`
                      }
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

           {/* Barra de Filtros por Semana e Data para Pagamentos Pendentes */}
           {activeFilter === 'pending_payments' && (
             <div className="mb-8 p-6 bg-orange-50/60 rounded-[2.5rem] border border-orange-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
               <div className="flex flex-wrap items-center gap-2">
                 <span className="text-[11px] font-black uppercase tracking-wider text-orange-800 mr-2 flex items-center gap-1.5">
                   <Calendar size={15} /> Ver por Semana:
                 </span>
                 
                 <button
                   type="button"
                   onClick={() => setPendingDateFilter('this_week')}
                   className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 ${
                     pendingDateFilter === 'this_week'
                       ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                       : 'bg-white text-gray-700 hover:bg-orange-100 border border-orange-200/70'
                   }`}
                 >
                   <span>Esta Semana</span>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] ${pendingDateFilter === 'this_week' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700 font-bold'}`}>
                     R$ {pendingPaymentsByPeriod.thisWeekTotal.toFixed(2)}
                   </span>
                 </button>

                 <button
                   type="button"
                   onClick={() => setPendingDateFilter('next_week')}
                   className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 ${
                     pendingDateFilter === 'next_week'
                       ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                       : 'bg-white text-gray-700 hover:bg-orange-100 border border-orange-200/70'
                   }`}
                 >
                   <span>Próxima Semana</span>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] ${pendingDateFilter === 'next_week' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700 font-bold'}`}>
                     R$ {pendingPaymentsByPeriod.nextWeekTotal.toFixed(2)}
                   </span>
                 </button>

                 <button
                   type="button"
                   onClick={() => setPendingDateFilter('this_month')}
                   className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 ${
                     pendingDateFilter === 'this_month'
                       ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                       : 'bg-white text-gray-700 hover:bg-orange-100 border border-orange-200/70'
                   }`}
                 >
                   <span>Este Mês</span>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] ${pendingDateFilter === 'this_month' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700 font-bold'}`}>
                     R$ {pendingPaymentsByPeriod.thisMonthTotal.toFixed(2)}
                   </span>
                 </button>

                 <button
                   type="button"
                   onClick={() => setPendingDateFilter('all')}
                   className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 ${
                     pendingDateFilter === 'all'
                       ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                       : 'bg-white text-gray-700 hover:bg-orange-100 border border-orange-200/70'
                   }`}
                 >
                   <span>Todas as Datas</span>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] ${pendingDateFilter === 'all' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700 font-bold'}`}>
                     R$ {pendingPaymentsByPeriod.allTotal.toFixed(2)}
                   </span>
                 </button>
               </div>

               {/* Opção de Puxar por Data (De / Até) */}
               <div className="flex flex-wrap items-center gap-3 pt-3 xl:pt-0 border-t xl:border-t-0 border-orange-200/60">
                 <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                   <Filter size={12} /> Puxar por Data:
                 </span>
                 <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-orange-200/80 shadow-sm">
                   <span className="text-[10px] font-black uppercase text-gray-400">De</span>
                   <input 
                     type="date" 
                     value={pendingStartDate}
                     onChange={(e) => {
                       setPendingStartDate(e.target.value);
                       setPendingDateFilter('custom');
                     }}
                     className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                   />
                 </div>

                 <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-orange-200/80 shadow-sm">
                   <span className="text-[10px] font-black uppercase text-gray-400">Até</span>
                   <input 
                     type="date" 
                     value={pendingEndDate}
                     onChange={(e) => {
                       setPendingEndDate(e.target.value);
                       setPendingDateFilter('custom');
                     }}
                     className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                   />
                 </div>

                 {(pendingStartDate || pendingEndDate || pendingDateFilter === 'custom') && (
                   <button
                     type="button"
                     onClick={() => {
                       setPendingStartDate('');
                       setPendingEndDate('');
                       setPendingDateFilter('this_week');
                     }}
                     className="text-[10px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-800 underline px-2 py-1"
                   >
                     Limpar
                   </button>
                 )}
               </div>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {filteredData.type === 'pending_payments' ? (
                <>
                  {(filteredData.items.length === 0 && (!filteredData.extraTransactions || filteredData.extraTransactions.length === 0)) ? (
                    <div className="col-span-full py-16 text-center flex flex-col items-center gap-3 bg-orange-50/40 rounded-[2.5rem] border border-dashed border-orange-200 p-8">
                      <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl">
                        <Calendar size={32} />
                      </div>
                      <h4 className="text-base font-black text-gray-800">Nenhum pagamento pendente para este período</h4>
                      <p className="text-xs text-gray-500 max-w-md">
                        Não encontramos encomendas ou lançamentos com vencimento ou entrega prevista para {pendingPaymentsByPeriod.activeLabel.toLowerCase()}.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        {pendingDateFilter !== 'this_week' && pendingPaymentsByPeriod.thisWeekTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => setPendingDateFilter('this_week')}
                            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-sm"
                          >
                            Ver Esta Semana (R$ {pendingPaymentsByPeriod.thisWeekTotal.toFixed(2)})
                          </button>
                        )}
                        {pendingDateFilter !== 'next_week' && pendingPaymentsByPeriod.nextWeekTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => setPendingDateFilter('next_week')}
                            className="px-4 py-2 bg-white text-orange-600 border border-orange-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-50 transition-all"
                          >
                            Ver Próxima Semana (R$ {pendingPaymentsByPeriod.nextWeekTotal.toFixed(2)})
                          </button>
                        )}
                        {pendingDateFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setPendingDateFilter('all')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-200 transition-all"
                          >
                            Ver Todas as Datas (R$ {pendingPaymentsByPeriod.allTotal.toFixed(2)})
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {(filteredData.items as Project[]).map(project => {
                        const breakdown = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
                        const customer = customers.find(c => c.id === project.customerId);
                        const pendingAmount = breakdown.remainingBalance > 0 ? breakdown.remainingBalance : (project.status === 'pending_payment' ? breakdown.finalPrice : 0);
                        const cleanPhone = customer?.phone ? customer.phone.replace(/\D/g, '') : '';
                        const isThisWeek = project.deliveryDate >= dateRanges.thisWeek.start && project.deliveryDate <= dateRanges.thisWeek.end;
                        const isNextWeek = project.deliveryDate >= dateRanges.nextWeek.start && project.deliveryDate <= dateRanges.nextWeek.end;
                        const isPast = project.deliveryDate < todayStr;

                        return (
                          <div key={project.id} className="p-8 rounded-[2.5rem] border border-orange-100 hover:shadow-2xl transition-all group flex flex-col justify-between bg-orange-50/20 hover:bg-white">
                             <div>
                               <div className="flex justify-between items-start mb-4">
                                  <div className="flex flex-col gap-1.5">
                                     {project.status === 'pending_payment' ? (
                                       <span className="px-2.5 py-1 bg-orange-500 text-white text-[8px] font-black uppercase rounded-md flex items-center gap-1 w-fit shadow-sm">
                                         <Clock size={10}/> Pagamento Pendente
                                       </span>
                                     ) : (
                                       <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[8px] font-black uppercase rounded-md flex items-center gap-1 w-fit">
                                         <Clock size={10}/> Saldo Restante
                                       </span>
                                     )}
                                     <h4 className="font-black text-gray-800 text-lg group-hover:text-orange-600 transition-colors leading-tight">{project.theme}</h4>
                                     <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 italic">
                                       <Clock size={10} /> {customer?.name || 'Cliente Avulso'}
                                     </p>
                                  </div>
                                  <div className="text-right">
                                     <span className="text-[9px] font-black text-gray-400 uppercase block">Pendente</span>
                                     <p className="text-xl font-black text-orange-600">R$ {pendingAmount.toFixed(2)}</p>
                                  </div>
                               </div>

                               <div className="bg-white/90 p-3.5 rounded-2xl border border-orange-100/70 grid grid-cols-2 gap-2 text-center my-4">
                                 <div>
                                   <p className="text-[8px] font-black text-gray-400 uppercase">Valor Total</p>
                                   <p className="text-xs font-black text-gray-700">R$ {breakdown.finalPrice.toFixed(2)}</p>
                                 </div>
                                 <div>
                                   <p className="text-[8px] font-black text-emerald-600 uppercase">Sinal Pago</p>
                                   <p className="text-xs font-black text-emerald-600">R$ {breakdown.downPayment.toFixed(2)}</p>
                                 </div>
                               </div>
                             </div>
                             
                             <div className="space-y-3 pt-4 border-t border-orange-100 mt-2">
                                <div className="flex justify-between items-center text-[10px]">
                                   <span className="font-black text-gray-400 uppercase">Entrega:</span>
                                   <div className="flex items-center gap-1.5">
                                      {isThisWeek && (
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md font-extrabold text-[8px] uppercase">Esta Semana</span>
                                      )}
                                      {isNextWeek && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-extrabold text-[8px] uppercase">Próx. Semana</span>
                                      )}
                                      {isPast && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-md font-extrabold text-[8px] uppercase">Atrasado</span>
                                      )}
                                      <span className="font-black text-gray-700">{new Date(project.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                   </div>
                                </div>

                                <div className="flex items-center gap-2">
                                   {cleanPhone && (
                                     <button 
                                       onClick={() => {
                                         const msg = encodeURIComponent(
                                           `Olá ${customer?.name || ''}! Tudo bem?\nPassando para avisar sobre sua encomenda *${project.theme}* no nosso ateliê.\n\n` +
                                           `• Valor total: R$ ${breakdown.finalPrice.toFixed(2)}\n` +
                                           (breakdown.downPayment > 0 ? `• Sinal já pago: R$ ${breakdown.downPayment.toFixed(2)}\n` : '') +
                                           `• *Saldo pendente a acertar: R$ ${pendingAmount.toFixed(2)}*\n\n` +
                                           `Qualquer dúvida ou para envio do comprovante Pix, fico à disposição!`
                                         );
                                         window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                                       }}
                                       className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider"
                                       title="Avisar cliente no WhatsApp"
                                     >
                                       <MessageSquare size={14} /> Cobrar
                                     </button>
                                   )}
                                   <button 
                                     onClick={() => {
                                       if (confirm(`Registrar quitação do pagamento pendente de R$ ${pendingAmount.toFixed(2)} para o pedido "${project.theme}"?`)) {
                                         const newTx: Transaction = {
                                           id: `paid_pending_${Date.now()}_${project.id}`,
                                           projectId: project.id,
                                           description: `Quitação: ${project.theme}${project.quoteNumber ? ` (#${project.quoteNumber})` : ''}`,
                                           amount: pendingAmount,
                                           type: 'income',
                                           category: 'Venda',
                                           paymentMethod: 'Pix',
                                           date: new Date().toISOString().split('T')[0],
                                           customerId: project.customerId,
                                           status: 'paid'
                                         };
                                         setTransactions(prev => [newTx, ...prev]);

                                         if (setProjects) {
                                           setProjects(prev => prev.map(p => 
                                             p.id === project.id 
                                               ? { ...p, status: p.status === 'pending_payment' ? 'completed' : p.status, paidAt: new Date().toISOString() } 
                                               : p
                                           ));
                                         }
                                         alert('Pagamento registrado com sucesso!');
                                       }
                                     }}
                                     className="flex-1 py-2.5 bg-gray-900 hover:bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5"
                                   >
                                     <CheckCircle2 size={14} /> Dar Baixa
                                   </button>
                                </div>
                             </div>
                          </div>
                        );
                      })}

                      {(filteredData.extraTransactions || []).map(transaction => {
                        const isTxThisWeek = transaction.date >= dateRanges.thisWeek.start && transaction.date <= dateRanges.thisWeek.end;
                        const isTxNextWeek = transaction.date >= dateRanges.nextWeek.start && transaction.date <= dateRanges.nextWeek.end;

                        return (
                          <div key={transaction.id} className="p-8 rounded-[2.5rem] border border-orange-100 hover:shadow-2xl transition-all group flex flex-col justify-between bg-orange-50/20 hover:bg-white">
                            <div>
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex flex-col gap-2">
                                  <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded-md w-fit bg-orange-100 text-orange-700">Lançamento Pendente</span>
                                  <h4 className="font-black text-gray-800 text-lg group-hover:text-orange-600 transition-colors leading-tight">{transaction.description}</h4>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 italic">{transaction.category}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-black text-orange-600">
                                    + R$ {transaction.amount.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 pt-6 border-t border-orange-100 mt-6">
                              <div className="flex-1">
                                <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1 text-orange-400">Data Esperada</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {isTxThisWeek && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md font-black text-[8px] uppercase">Esta Semana</span>
                                  )}
                                  {isTxNextWeek && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-black text-[8px] uppercase">Próx. Semana</span>
                                  )}
                                  <p className="text-xs font-black leading-none text-gray-700">
                                    {new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  if (confirm(`Marcar este lançamento como RECEBIDO?`)) {
                                    setTransactions(prev => prev.map(t => 
                                      t.id === transaction.id ? { ...t, status: 'paid' } : t
                                    ));
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-sm"
                              >
                                <CheckCircle2 size={14} /> Receber
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              ) : filteredData.type === 'project' ? (
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
        <div className="lg:col-span-6 xl:col-span-7 bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-pink-50">
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
                    <div className={`p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border transition-all flex flex-col gap-6 relative overflow-hidden bg-pink-50/30 border-pink-100 shadow-xl scale-[1.02]`}>
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
        <div className="lg:col-span-6 xl:col-span-5 bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-yellow-50">
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
        <div className="lg:col-span-12 bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-pink-50">
            <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <TrendingUp className="text-blue-500" /> Fluxo do Ateliê
                </h3>
                <span className="text-[10px] font-black bg-pink-50 text-pink-500 px-4 py-2 rounded-full uppercase tracking-widest">
                    Últimas Movimentações
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
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
        <div className="fixed inset-0 bg-transparent z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-transparent" 
            onClick={() => setIsGoalModalOpen(false)}
          ></div>
          <div className="bg-white rounded-[3rem] p-8 max-w-2xl w-full shadow-2xl relative my-4 z-10 animate-scaleIn">
            <button onClick={() => setIsGoalModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Meta do <span className="text-blue-500">Mês</span></h3>
            <p className="text-sm font-bold text-gray-400 mb-6">Defina seus objetivos para {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.</p>
            
            <div className="space-y-6">
              {/* Meta Financeira */}
              <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Wallet2 size={16} /> Faturamento
                </h4>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Valor da Meta (R$)</label>
                  <input 
                    type="number" 
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-gray-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: 5000.00"
                  />
                </div>
              </div>

              {/* Metas de Vendas por Plataforma */}
              <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100">
                <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Store size={16} /> Vendas por Plataforma
                </h4>

                {/* List of currently added platform goals */}
                {platformGoalsList.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Metas Cadastradas para o Mês:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {platformGoalsList.map((g, index) => (
                        <div key={index} className="flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100 shadow-sm animate-fadeIn">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-gray-700 truncate">{g.platformName}</p>
                            <p className="text-[10px] text-orange-600 font-bold">
                              {g.targetType === 'money' ? `Meta: R$ ${g.targetValue.toFixed(2)}` : `Meta: ${g.targetValue} un.`}
                            </p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemovePlatformGoal(index)}
                            className="p-1 px-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-4">Nenhuma meta por plataforma cadastrada para este mês ainda.</p>
                )}

                {/* Form to add a new platform goal */}
                <div className="bg-white p-4 rounded-2xl border border-orange-100/50 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Adicionar Meta por Plataforma</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Selecione a Plataforma</label>
                      <select
                        value={newPlatformId}
                        onChange={(e) => {
                          setNewPlatformId(e.target.value);
                          if (e.target.value !== 'custom') {
                            setNewPlatformCustomName('');
                          }
                        }}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-700 focus:outline-none"
                      >
                        <option value="">-- Selecione --</option>
                        {platforms.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        <option value="custom">Outra (Personalizada)...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Tipo de Meta</label>
                      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setNewPlatformType('units')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newPlatformType === 'units' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                          Unidades (un)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlatformType('money')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newPlatformType === 'money' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                          Faturamento (R$)
                        </button>
                      </div>
                    </div>
                  </div>

                  {newPlatformId === 'custom' && (
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Nome da Plataforma Personalizada</label>
                      <input
                        type="text"
                        value={newPlatformCustomName}
                        onChange={(e) => setNewPlatformCustomName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-700 focus:outline-none placeholder-gray-300"
                        placeholder="Ex: Mercado Livre, Site Próprio, WhatsApp..."
                      />
                    </div>
                  )}

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        {newPlatformType === 'money' ? 'Valor Restante/Meta (R$)' : 'Quantidade de Meta (Un.)'}
                      </label>
                      <input
                        type="number"
                        value={newPlatformValue}
                        onChange={(e) => setNewPlatformValue(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-700 focus:outline-none"
                        placeholder={newPlatformType === 'money' ? 'Ex: 1500.00' : 'Ex: 50'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPlatformGoal}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl flex items-center justify-center font-black transition-colors shadow-md shadow-orange-500/20"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-50">
                <button 
                  onClick={handleSaveGoal}
                  className="flex-1 bg-blue-500 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                >
                  Salvar Metas
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
