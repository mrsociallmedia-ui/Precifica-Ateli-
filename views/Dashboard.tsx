
import React, { useMemo } from 'react';
import { ShoppingBag, Users, Layers, TrendingUp, Wallet, CheckCircle2, DollarSign, Heart, Clock, AlertTriangle, Wallet2, CalendarDays, AlertCircle, BarChart3, Star } from 'lucide-react';
import { Project, Customer, Material, CompanyData, Platform, Transaction } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface DashboardProps {
  projects: Project[];
  customers: Customer[];
  materials: Material[];
  companyData: CompanyData;
  platforms: Platform[];
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, customers, materials, companyData, platforms, transactions }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const statsCalculations = useMemo(() => {
    let totalOrçado = 0;
    let totalFaturadoProjetos = 0;
    let totalAReceber = 0;
    const productSales: Record<string, { quantity: number; revenue: number }> = {};

    projects.forEach(project => {
      const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData);
      totalOrçado += finalPrice;
      
      const isCompleted = project.status === 'completed';
      
      if (isCompleted) {
        totalFaturadoProjetos += finalPrice;
      } else {
        totalAReceber += finalPrice;
      }

      // Calcular saída por produto (apenas de projetos aprovados, produzindo ou finalizados)
      if (project.status !== 'pending') {
        (project.items || []).forEach(item => {
          if (!productSales[item.name]) {
            productSales[item.name] = { quantity: 0, revenue: 0 };
          }
          productSales[item.name].quantity += item.quantity;
          
          // Estimativa de receita por item proporcional ao preço final do projeto
          const totalItemsInProject = project.items.reduce((acc, i) => acc + i.quantity, 0);
          const itemPriceShare = (item.quantity / totalItemsInProject) * finalPrice;
          productSales[item.name].revenue += itemPriceShare;
        });
      }
    });

    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const actualBalance = income - expense;

    // Vencimentos de hoje (Projetos e Despesas)
    const projectsDueToday = projects.filter(p => p.deliveryDate === todayStr && p.status !== 'completed');
    const expensesToday = transactions.filter(t => t.date === todayStr && t.type === 'expense');

    // Rank de produtos por quantidade
    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const maxQuantity = topProducts.length > 0 ? topProducts[0].quantity : 1;

    return { 
      totalOrçado, 
      totalFaturadoProjetos, 
      totalAReceber, 
      actualBalance, 
      projectsDueToday, 
      expensesToday, 
      topProducts,
      maxQuantity
    };
  }, [projects, materials, platforms, companyData, transactions, todayStr]);

  const delayedCount = projects.filter(p => p.status === 'delayed').length;
  const dueTodayCount = statsCalculations.projectsDueToday.length + statsCalculations.expensesToday.length;

  const stats = [
    { label: 'Saldo em Caixa', value: `R$ ${statsCalculations.actualBalance.toFixed(2)}`, icon: Wallet2, color: 'bg-green-100 text-green-600', sub: 'Dinheiro real hoje' },
    { label: 'Vencendo Hoje', value: dueTodayCount, icon: CalendarDays, color: 'bg-pink-100 text-pink-600', sub: 'Compromissos do dia' },
    { label: 'Atrasados', value: delayedCount, icon: AlertTriangle, color: 'bg-red-100 text-red-600', sub: 'Atenção necessária' },
    { label: 'Projetos Ativos', value: projects.filter(p => p.status !== 'completed').length, icon: ShoppingBag, color: 'bg-yellow-100 text-yellow-600', sub: 'Total em andamento' },
  ];

  const recentCompleted = projects
    .filter(p => p.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex flex-col gap-1">
        <h2 className="text-4xl font-black text-gray-800 tracking-tight">Olá, <span className="text-pink-500">{companyData.name}</span>!</h2>
        <p className="text-gray-400 font-medium">Seu faturamento e pedidos em um só lugar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-xl transition-all cursor-default group">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} shadow-sm group-hover:rotate-6 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stat.sub}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-gray-800 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Compromissos do Dia */}
        <div className="lg:col-span-12">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <CalendarDays className="text-pink-500" /> Compromissos e Vencimentos de Hoje
                    </h3>
                    <span className="text-[10px] font-black bg-pink-50 text-pink-500 px-3 py-1 rounded-full uppercase tracking-widest">
                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-2">Entregas de Pedidos</h4>
                        {statsCalculations.projectsDueToday.length > 0 ? (
                            statsCalculations.projectsDueToday.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl text-blue-500 shadow-sm"><ShoppingBag size={16} /></div>
                                        <div>
                                            <p className="text-sm font-black text-gray-700">{p.theme}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{p.celebrantName || 'S/N'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-blue-600">HOJE</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 italic py-4">Nenhuma entrega para hoje.</p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-2">Contas / Despesas Registradas</h4>
                        {statsCalculations.expensesToday.length > 0 ? (
                            statsCalculations.expensesToday.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl text-red-500 shadow-sm"><AlertCircle size={16} /></div>
                                        <div>
                                            <p className="text-sm font-black text-gray-700">{t.description}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{t.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-red-600">R$ {t.amount.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 italic py-4">Nenhuma despesa registrada para hoje.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Produtos que mais saem */}
        <div className="lg:col-span-12">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-50">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <BarChart3 className="text-yellow-500" /> Produtos Mais Vendidos
                </h3>
                <span className="text-[10px] font-black text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full uppercase tracking-widest">Volume de Vendas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                 {statsCalculations.topProducts.map((prod, idx) => (
                   <div key={idx} className="space-y-2">
                     <div className="flex justify-between items-end">
                       <span className="font-black text-gray-700 text-sm flex items-center gap-2">
                         <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white font-black ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-blue-400' : 'bg-pink-400'}`}>
                           {idx + 1}
                         </div>
                         {prod.name}
                       </span>
                       <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{prod.quantity} pçs</span>
                     </div>
                     <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-blue-400' : 'bg-pink-300'}`}
                         style={{ width: `${(prod.quantity / statsCalculations.maxQuantity) * 100}%` }}
                       ></div>
                     </div>
                   </div>
                 ))}
                 {statsCalculations.topProducts.length === 0 && (
                   <p className="text-sm text-gray-400 italic py-10 text-center">Nenhum dado de venda para exibir ainda.</p>
                 )}
               </div>

               <div className="bg-blue-50/30 rounded-[2rem] p-8 border border-blue-50 flex flex-col justify-center items-center text-center">
                  <div className="p-4 bg-blue-500 text-white rounded-[1.5rem] shadow-lg mb-4">
                    <Star size={32} />
                  </div>
                  <h4 className="text-lg font-black text-gray-800 mb-2">Destaque de Saída</h4>
                  {statsCalculations.topProducts.length > 0 ? (
                    <>
                      <p className="text-gray-500 text-sm font-medium px-4">
                        Seu produto campeão de vendas é o <span className="text-blue-600 font-black">"{statsCalculations.topProducts[0].name}"</span>.
                      </p>
                      <div className="mt-6 flex gap-4">
                         <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100">
                           <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Total Vendido</p>
                           <p className="text-xl font-black text-gray-800">{statsCalculations.topProducts[0].quantity} un.</p>
                         </div>
                         <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100">
                           <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Receita Est.</p>
                           <p className="text-xl font-black text-blue-600">R$ {statsCalculations.topProducts[0].revenue.toFixed(2)}</p>
                         </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs font-medium italic">Acompanhe aqui o crescimento do seu ateliê!</p>
                  )}
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-blue-500" /> Projetos Recentes Finalizados
            </h3>
            <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">Ver todos</button>
          </div>
          
          <div className="space-y-4">
            {recentCompleted.map(project => {
              const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData);
              return (
                <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-blue-50 rounded-2xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 font-black shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      {project.theme.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-700">{project.theme}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{project.celebrantName || 'S/N'} • {new Date(project.deliveryDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-800">R$ {finalPrice.toFixed(2)}</p>
                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Finalizado</p>
                  </div>
                </div>
              );
            })}
            {recentCompleted.length === 0 && (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                   <DollarSign className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium italic">Nenhum projeto finalizado recentemente.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className={`${delayedCount > 0 ? 'bg-red-500' : 'bg-pink-500'} p-8 rounded-[2.5rem] text-white shadow-lg relative overflow-hidden group transition-colors duration-500`}>
            <div className="relative z-10">
              <h4 className="text-lg font-black uppercase tracking-wider opacity-60">{delayedCount > 0 ? 'Atenção: Atrasados' : 'Próxima Entrega'}</h4>
              {projects.filter(p => p.status !== 'completed').sort((a,b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())[0] ? (
                <div className="mt-4">
                  <p className="text-3xl font-black truncate">{projects.filter(p => p.status !== 'completed').sort((a,b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())[0].theme}</p>
                  <p className="text-sm font-bold opacity-80 mt-1 flex items-center gap-2">
                    <Clock size={16} /> 
                    {new Date(projects.filter(p => p.status !== 'completed').sort((a,b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())[0].deliveryDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ) : (
                <p className="mt-4 font-bold">Tudo em dia por aqui! ✨</p>
              )}
            </div>
            {delayedCount > 0 ? <AlertTriangle className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12 group-hover:scale-110 transition-transform" /> : <Heart className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12 group-hover:scale-110 transition-transform" />}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-100">
            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
              <Star className="text-yellow-500" /> Dica de Gestão
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-2xl border-l-4 border-green-500">
                <p className="font-bold text-green-800 text-sm">Controle de Caixa</p>
                <p className="text-xs mt-1 text-green-600">Lembre-se de cadastrar cada venda e compra de material no novo módulo Financeiro.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-500">
                <p className="font-bold text-blue-800 text-sm">Cronograma</p>
                <p className="text-xs mt-1 text-blue-600">Ao finalizar um pedido, lance o recebimento no Financeiro para manter seu saldo atualizado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};