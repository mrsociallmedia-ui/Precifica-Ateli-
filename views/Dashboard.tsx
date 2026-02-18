
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
  AlertTriangle
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
}

type DashboardFilter = 'all' | 'today' | 'active' | 'delayed';

export const Dashboard: React.FC<DashboardProps> = ({ projects, customers, materials, companyData, platforms, transactions, products }) => {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');
  const todayStr = new Date().toISOString().split('T')[0];

  const statsCalculations = useMemo(() => {
    let totalOrçado = 0;
    projects.forEach(project => {
      const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData);
      totalOrçado += finalPrice;
    });

    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const actualBalance = income - expense;

    const dueToday = projects.filter(p => p.deliveryDate === todayStr && p.status !== 'completed');
    const active = projects.filter(p => p.status !== 'completed');
    
    // Lógica para Projetos Atrasados: Data menor que hoje e status não finalizado
    const delayed = projects.filter(p => p.deliveryDate < todayStr && p.status !== 'completed');

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
      delayed,
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

  const filteredProjects = useMemo(() => {
    switch (activeFilter) {
      case 'today': return statsCalculations.dueToday;
      case 'active': return statsCalculations.active;
      case 'delayed': return statsCalculations.delayed;
      default: return [];
    }
  }, [activeFilter, statsCalculations]);

  const stats = [
    { id: 'all', label: 'Saldo em Caixa', value: `R$ ${statsCalculations.actualBalance.toFixed(2)}`, icon: Wallet2, color: 'bg-green-100 text-green-600', sub: 'Dinheiro real hoje', clickable: false },
    { id: 'today', label: 'Vencendo Hoje', value: statsCalculations.dueToday.length, icon: CalendarDays, color: 'bg-pink-100 text-pink-600', sub: 'Entregas do dia', clickable: true },
    { id: 'delayed', label: 'Atrasados', value: statsCalculations.delayed.length, icon: AlertTriangle, color: 'bg-red-100 text-red-600', sub: 'Prazo vencido', clickable: true },
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
            onClick={() => setActiveFilter('delayed')}
            className={`p-8 rounded-[3rem] border transition-all flex flex-col justify-between text-left group min-h-[220px] ${activeFilter === 'delayed' ? 'bg-red-500 text-white border-red-500' : 'bg-white border-red-50 hover:shadow-xl'}`}
          >
            <div className={`p-4 rounded-2xl shadow-sm w-fit ${activeFilter === 'delayed' ? 'bg-white/10' : 'bg-red-100 text-red-500'}`}>
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'delayed' ? 'text-white/60' : 'text-gray-400'}`}>Projetos Atrasados</p>
              <p className="text-3xl font-black mt-1">{statsCalculations.delayed.length}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'delayed' ? 'text-white/40' : 'text-gray-300'}`}>Atenção redobrada!</p>
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
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'active' ? 'text-white/60' : 'text-gray-400'}`}>Projetos Ativos</p>
              <p className="text-3xl font-black mt-1">{statsCalculations.active.length}</p>
              <p className={`text-[10px] font-bold mt-2 ${activeFilter === 'active' ? 'text-white/40' : 'text-gray-300'}`}>Em produção no ateliê</p>
            </div>
          </button>
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
                 <div className={`p-4 text-white rounded-3xl shadow-xl ${activeFilter === 'delayed' ? 'bg-red-600' : 'bg-gray-900'}`}>
                    {activeFilter === 'today' ? <CalendarCheck size={28} /> : activeFilter === 'delayed' ? <AlertTriangle size={28} /> : <ShoppingBag size={28} />}
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                      {activeFilter === 'today' ? 'Vencimentos de Hoje' : activeFilter === 'delayed' ? 'Projetos Atrasados' : 'Projetos em Produção'}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                      {filteredProjects.length} {filteredProjects.length === 1 ? 'item identificado' : 'itens identificados'}
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
              {filteredProjects.map(project => {
                 const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData);
                 const customer = customers.find(c => c.id === project.customerId);
                 const isDelayed = project.deliveryDate < todayStr;
                 return (
                   <div key={project.id} className={`p-8 rounded-[2.5rem] border hover:shadow-2xl transition-all group flex flex-col justify-between ${isDelayed && activeFilter === 'delayed' ? 'bg-red-50/30 border-red-100' : 'bg-gray-50/50 border-gray-100 hover:bg-white'}`}>
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
                            <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${isDelayed ? 'text-red-400' : 'text-gray-300'}`}>Prazo de Entrega</p>
                            <p className={`text-xs font-black leading-none ${isDelayed ? 'text-red-600' : 'text-gray-700'}`}>
                               {new Date(project.deliveryDate).toLocaleDateString('pt-BR')}
                            </p>
                         </div>
                         <button className={`p-3 rounded-2xl shadow-sm transition-all group-hover:scale-110 ${isDelayed ? 'bg-red-500 text-white' : 'bg-white text-gray-300 hover:bg-pink-500 hover:text-white'}`}>
                            <ArrowRightCircle size={20} />
                         </button>
                      </div>
                   </div>
                 );
              })}
              {filteredProjects.length === 0 && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-4 flex items-center gap-2">
                       <ArrowRight size={12} /> Próximas Entregas
                    </h4>
                    {projects.filter(p => p.status !== 'completed').slice(0, 4).map(p => (
                        <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border ${p.deliveryDate < todayStr ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'} hover:bg-white transition-all cursor-default`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 bg-white rounded-xl shadow-sm ${p.deliveryDate < todayStr ? 'text-red-500' : 'text-blue-500'}`}><ShoppingBag size={14} /></div>
                                <div className="max-w-[120px]">
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
                </div>

                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-4 flex items-center gap-2">
                       <ArrowRight size={12} /> Caixa Recente
                    </h4>
                    {transactions.slice(0, 4).map(t => (
                        <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl border ${t.type === 'income' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} hover:bg-white transition-all cursor-default`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 bg-white rounded-xl shadow-sm ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                  <Wallet2 size={14} />
                                </div>
                                <div className="max-w-[120px]">
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
    </div>
  );
};
