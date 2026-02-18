
import React, { useState, useMemo } from 'react';
import { 
  Wallet2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Trash2, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Tag, 
  CreditCard,
  X,
  PlusCircle,
  ClipboardCheck,
  Calendar,
  ChevronRight,
  PieChart,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ShoppingBag,
  ArrowRight,
  Info,
  ArrowDownUp,
  BarChart3,
  Scale
} from 'lucide-react';
import { Transaction, Project, Material, Platform, CompanyData } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface FinancialControlProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  projects: Project[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  paymentMethods: string[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<string[]>>;
}

export const FinancialControl: React.FC<FinancialControlProps> = ({ 
  transactions, setTransactions, projects, materials, platforms, companyData, categories, setCategories, paymentMethods, setPaymentMethods
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showClosure, setShowClosure] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [closureDate, setClosureDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    description: '',
    amount: 0,
    type: 'income',
    category: 'Venda',
    paymentMethod: 'Pix',
    date: new Date().toISOString().split('T')[0]
  });

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Cálculos de Fechamento de Caixa com Mão de Obra e Lucro Real
  const closureStats = useMemo(() => {
    const filtered = transactions.filter(t => t.date === closureDate);
    const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    let laborAccumulated = 0;
    let profitAccumulated = 0;
    const salesBreakdownList: Array<{ name: string, amount: number, labor: number, profit: number }> = [];

    filtered.forEach(t => {
      if (t.type === 'income' && t.category === 'Venda') {
        // Tenta encontrar o projeto associado pelo ID da transação
        const parts = t.id.split('_');
        const projectId = parts[parts.length - 1];
        const project = projects.find(p => p.id === projectId);
        
        if (project) {
          const breakdown = calculateProjectBreakdown(project, materials, platforms, companyData);
          
          if (breakdown.finalPrice > 0) {
            // Proporção baseada no valor recebido na transação específica (sinal ou saldo)
            const laborPct = breakdown.laborCosts / breakdown.finalPrice;
            const profitPct = breakdown.profit / breakdown.finalPrice;
            
            const transLabor = t.amount * laborPct;
            const transProfit = t.amount * profitPct;
            
            laborAccumulated += transLabor;
            profitAccumulated += transProfit;

            salesBreakdownList.push({
              name: project.theme,
              amount: t.amount,
              labor: transLabor,
              profit: transProfit
            });
          }
        } else {
          // Venda manual sem vínculo (Margem estimada de 40% salário e 30% lucro)
          const estLabor = t.amount * 0.4;
          const estProfit = t.amount * 0.3;
          laborAccumulated += estLabor;
          profitAccumulated += estProfit;
          salesBreakdownList.push({
            name: t.description,
            amount: t.amount,
            labor: estLabor,
            profit: estProfit
          });
        }
      }
    });

    return { 
      income, 
      expense, 
      balance: income - expense, 
      count: filtered.length,
      laborAccumulated,
      profitAccumulated,
      salesBreakdownList
    };
  }, [transactions, closureDate, projects, materials, platforms, companyData]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount) return;

    const transaction: Transaction = {
      id: `manual_${Date.now()}`,
      description: newTransaction.description!,
      amount: Number(newTransaction.amount),
      type: newTransaction.type as 'income' | 'expense',
      category: newTransaction.category || 'Geral',
      paymentMethod: newTransaction.paymentMethod || 'Dinheiro',
      date: newTransaction.date || new Date().toISOString().split('T')[0]
    };

    setTransactions([transaction, ...transactions]);
    setShowForm(false);
    setNewTransaction({ 
      description: '', amount: 0, type: 'income', category: 'Venda', paymentMethod: 'Pix', 
      date: new Date().toISOString().split('T')[0] 
    });
  };

  // Fixed missing deleteTransaction function
  const deleteTransaction = (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-10 animate-fadeIn pb-24">
      {/* HEADER E AÇÕES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Fluxo de <span className="text-green-500">Caixa</span></h2>
          <p className="text-gray-400 font-medium">Gestão financeira completa do seu ateliê.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowClosure(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <ClipboardCheck size={20} />
            Fechamento de Caixa
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-black px-6 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-green-50 flex flex-col gap-4 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl shadow-sm"><ArrowUpCircle size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Entradas</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Faturamento</p>
            <p className="text-3xl font-black text-green-600 mt-1">R$ {totals.income.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-50 flex flex-col gap-4 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm"><ArrowDownCircle size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Saídas</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Despesas</p>
            <p className="text-3xl font-black text-red-600 mt-1">R$ {totals.expense.toFixed(2)}</p>
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] shadow-lg flex flex-col gap-4 group transition-all ${totals.balance >= 0 ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Wallet2 size={28} /></div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Saldo Disponível</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white/60 uppercase tracking-wider">Saldo Atual</p>
            <p className="text-3xl font-black mt-1">R$ {totals.balance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* LISTA DE FLUXO DE CAIXA */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
            <ArrowDownUp size={18} className="text-blue-500" /> Histórico de Movimentações
          </h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar lançamentos..." 
              className="pl-11 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-medium w-full md:w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Data / Descrição</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Método</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'income' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                      </div>
                      <div>
                        <p className="font-black text-gray-700 text-sm">{t.description}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{t.category}</span>
                  </td>
                  <td className="px-8 py-5 font-bold text-gray-500 text-xs">{t.paymentMethod}</td>
                  <td className={`px-8 py-5 text-right font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => deleteTransaction(t.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <DollarSign size={48} className="opacity-10" />
                      <p className="font-black uppercase text-[10px] tracking-widest">Nenhum lançamento encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FECHAMENTO DE CAIXA - COM MÃO DE OBRA E LUCRO REAL */}
      {showClosure && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Fechamento de Caixa</h3>
                <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Análise de Lucratividade Diária</p>
              </div>
              <button onClick={() => setShowClosure(false)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col md:flex-row md:items-center gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                 <div className="flex-1 space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecionar Data de Fechamento</label>
                   <input 
                     type="date" 
                     className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-gray-700" 
                     value={closureDate} 
                     onChange={e => setClosureDate(e.target.value)} 
                   />
                 </div>
                 <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center min-w-[120px]">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Movimentações</p>
                       <p className="text-xl font-black text-gray-800">{closureStats.count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center min-w-[150px]">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Saldo do Dia</p>
                       <p className={`text-xl font-black ${closureStats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         R$ {closureStats.balance.toFixed(2)}
                       </p>
                    </div>
                 </div>
              </div>

              {/* DASHBOARD DE LUCRO REAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-pink-50 p-8 rounded-[2.5rem] border border-pink-100 flex items-center gap-6 group hover:scale-[1.02] transition-all">
                    <div className="p-4 bg-pink-500 text-white rounded-[1.5rem] shadow-lg shadow-pink-100 group-hover:rotate-6 transition-transform">
                       <Clock size={32} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] mb-1">Mão de Obra (Seu Salário)</p>
                       <p className="text-3xl font-black text-pink-600">R$ {closureStats.laborAccumulated.toFixed(2)}</p>
                       <p className="text-[10px] text-pink-300 font-bold mt-1 leading-tight italic">Referente ao tempo de produção<br/>dos orçamentos recebidos hoje.</p>
                    </div>
                 </div>

                 <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 flex items-center gap-6 group hover:scale-[1.02] transition-all">
                    <div className="p-4 bg-green-500 text-white rounded-[1.5rem] shadow-lg shadow-green-100 group-hover:rotate-6 transition-transform">
                       <TrendingUp size={32} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] mb-1">Lucro Real (Empresa)</p>
                       <p className="text-3xl font-black text-green-600">R$ {closureStats.profitAccumulated.toFixed(2)}</p>
                       <p className="text-[10px] text-green-300 font-bold mt-1 leading-tight italic">O que "sobra" livre de custos<br/>e salário para o ateliê reinvestir.</p>
                    </div>
                 </div>
              </div>

              {/* LISTAGEM DE VENDAS E IMPACTO */}
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                   <BarChart3 size={16} className="text-blue-500" /> Detalhamento de Entradas de Orçamentos
                 </h4>
                 <div className="space-y-3">
                    {closureStats.salesBreakdownList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:border-blue-100 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><ShoppingBag size={18} /></div>
                            <div>
                               <p className="font-black text-gray-800 text-sm">{item.name}</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase">Recebido: R$ {item.amount.toFixed(2)}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-8">
                            <div className="text-right">
                               <p className="text-[9px] font-black text-pink-400 uppercase">Sua MO</p>
                               <p className="text-sm font-black text-pink-600">R$ {item.labor.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-green-400 uppercase">Lucro</p>
                               <p className="text-sm font-black text-green-600">R$ {item.profit.toFixed(2)}</p>
                            </div>
                         </div>
                      </div>
                    ))}
                    {closureStats.salesBreakdownList.length === 0 && (
                      <div className="py-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 font-bold italic">Nenhuma venda de orçamento registrada nesta data.</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="p-6 bg-yellow-50 rounded-[2rem] border border-yellow-100 flex items-start gap-4">
                 <Info className="text-yellow-500 shrink-0" size={20} />
                 <p className="text-xs font-medium text-yellow-700 leading-relaxed italic">
                    <strong>Como funciona este cálculo?</strong> O sistema analisa cada recebimento (Sinal ou Saldo) e aplica a porcentagem de Mão de Obra e Lucro que foi calculada lá no orçamento original. Assim, você gerencia seu caixa sabendo exatamente o que é dinheiro seu (Salário) e o que é dinheiro da empresa (Lucro Real).
                 </p>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
               <button className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                 <Printer size={16} /> Imprimir Fechamento
               </button>
               <button onClick={() => setShowClosure(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all">
                 Fechar Relatório
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO LANÇAMENTO */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${newTransaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${newTransaction.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                {newTransaction.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
              </div>
              {newTransaction.type === 'income' ? 'Nova Entrada' : 'Nova Saída'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-6">
               <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 mb-4">
                  <button type="button" onClick={() => setNewTransaction({...newTransaction, type: 'income'})} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newTransaction.type === 'income' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Entrada</button>
                  <button type="button" onClick={() => setNewTransaction({...newTransaction, type: 'expense'})} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newTransaction.type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Saída</button>
               </div>
               
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" placeholder="Ex: Compra de Papéis, Venda Topo de Bolo..." value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-blue-600" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                    <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}>
                       {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Método</label>
                    <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700" value={newTransaction.paymentMethod} onChange={e => setNewTransaction({...newTransaction, paymentMethod: e.target.value})}>
                       {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                  <button type="submit" className={`flex-1 px-6 py-4 text-white font-black rounded-2xl transition-all shadow-lg ${newTransaction.type === 'income' ? 'bg-green-500 hover:bg-green-600 shadow-green-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'}`}>Confirmar Lançamento</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
