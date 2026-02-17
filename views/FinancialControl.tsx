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
  ShoppingBag
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

  // Cálculos aprimorados para o Fechamento de Caixa (Detalhamento de Lucro e Mão de Obra)
  const closureStats = useMemo(() => {
    const filtered = transactions.filter(t => t.date === closureDate);
    const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    const byMethod: Record<string, number> = {};
    filtered.forEach(t => {
      const val = t.type === 'income' ? t.amount : -t.amount;
      byMethod[t.paymentMethod] = (byMethod[t.paymentMethod] || 0) + val;
    });

    const byCategory: Record<string, number> = {};
    filtered.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    // Detalhamento de Mão de Obra e Lucro dos projetos finalizados nesta data
    let laborAccumulated = 0;
    let profitAccumulated = 0;
    const completedProjectsOnDate = projects.filter(p => p.deliveryDate === closureDate && p.status === 'completed');
    
    completedProjectsOnDate.forEach(p => {
      const breakdown = calculateProjectBreakdown(p, materials, platforms, companyData);
      laborAccumulated += breakdown.laborCosts;
      profitAccumulated += breakdown.profit;
    });

    return { 
      income, 
      expense, 
      balance: income - expense, 
      count: filtered.length, 
      byMethod, 
      byCategory,
      laborAccumulated,
      profitAccumulated,
      completedCount: completedProjectsOnDate.length,
      completedProjects: completedProjectsOnDate
    };
  }, [transactions, closureDate, projects, materials, platforms, companyData]);

  const addCategory = () => {
    const name = prompt('Nome da nova categoria (Tipo de entrada/saída):');
    if (name && !categories.includes(name)) {
      setCategories([...categories, name]);
      setNewTransaction(prev => ({ ...prev, category: name }));
    }
  };

  const addPaymentMethod = () => {
    const name = prompt('Nome do novo método de pagamento (Ex: PicPay, Cartão Nu):');
    if (name && !paymentMethods.includes(name)) {
      setPaymentMethods([...paymentMethods, name]);
      setNewTransaction(prev => ({ ...prev, paymentMethod: name }));
    }
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      description: newTransaction.description!,
      amount: Number(newTransaction.amount),
      type: newTransaction.type as 'income' | 'expense',
      category: newTransaction.category || 'Geral',
      paymentMethod: newTransaction.paymentMethod || 'Dinheiro',
      date: newTransaction.date || new Date().toISOString().split('T')[0]
    };

    setTransactions([transaction, ...transactions]);
    setNewTransaction({ 
      description: '', 
      amount: 0, 
      type: 'income', 
      category: 'Venda', 
      paymentMethod: 'Pix',
      date: new Date().toISOString().split('T')[0] 
    });
    setShowForm(false);
  };

  const deleteTransaction = (id: string) => {
    if (confirm('Deseja excluir este registro financeiro?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Controle <span className="text-green-500">Financeiro</span></h2>
          <p className="text-gray-400 font-medium">Gestão de entradas, saídas e saúde do ateliê.</p>
        </div>
        <div className="flex gap-3">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-green-50 flex flex-col gap-4 group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl group-hover:scale-110 transition-transform"><ArrowUpCircle size={32} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Entradas</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Receitas</p>
            <p className="text-3xl font-black text-green-600 mt-1">R$ {totals.income.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-50 flex flex-col gap-4 group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl group-hover:scale-110 transition-transform"><ArrowDownCircle size={32} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Saídas</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Despesas</p>
            <p className="text-3xl font-black text-red-600 mt-1">R$ {totals.expense.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-green-500 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col gap-4 group relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="p-3 bg-white/20 rounded-2xl"><Wallet2 size={32} /></div>
            <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo em Caixa</span>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Saldo Atual</p>
            <p className="text-4xl font-black mt-1">R$ {totals.balance.toFixed(2)}</p>
          </div>
          <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2"><Tag size={24} className="text-blue-500" /> Movimentações</h3>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input type="text" placeholder="Buscar lançamento..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Data</th>
                  <th className="px-8 py-5">Descrição / Categoria</th>
                  <th className="px-8 py-5">Pagamento</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5"><span className="text-xs font-bold text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</span></td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">{t.description}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.category}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <CreditCard size={12} className="text-gray-300" />
                        {t.paymentMethod}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`font-black text-base ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => deleteTransaction(t.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-medium italic">Nenhuma movimentação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE FECHAMENTO DE CAIXA */}
      {showClosure && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setShowClosure(false)} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all">
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-sm"><ClipboardCheck size={32} /></div>
                <div>
                  <h3 className="text-2xl font-black">Fechamento de Caixa</h3>
                  <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Resumo de Valor e Lucratividade</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data para Fechamento</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input 
                    type="date" 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-700 outline-none focus:ring-2 focus:ring-blue-400" 
                    value={closureDate} 
                    onChange={e => setClosureDate(e.target.value)} 
                  />
                </div>
              </div>

              {/* Seção Principal de Saldo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-green-50 rounded-2xl border border-green-100 text-center">
                  <p className="text-[9px] font-black text-green-600 uppercase mb-1">Entradas</p>
                  <p className="text-lg font-black text-gray-800">R$ {closureStats.income.toFixed(2)}</p>
                </div>
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100 text-center">
                  <p className="text-[9px] font-black text-red-600 uppercase mb-1">Saídas</p>
                  <p className="text-lg font-black text-gray-800">R$ {closureStats.expense.toFixed(2)}</p>
                </div>
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                  <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Saldo Líquido</p>
                  <p className={`text-lg font-black ${closureStats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {closureStats.balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* NOVO: Detalhamento de Mão de Obra e Lucro */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Sparkles size={14} className="text-pink-500" /> Rendimento Agregado (Projetos Finalizados)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-pink-50/50 p-6 rounded-[2rem] border border-pink-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl text-pink-500 shadow-sm"><Clock size={24} /></div>
                      <div>
                         <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest leading-none mb-1">Mão de Obra (Salário)</p>
                         <p className="text-2xl font-black text-gray-800 leading-none">R$ {closureStats.laborAccumulated.toFixed(2)}</p>
                      </div>
                   </div>
                   <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl text-green-600 shadow-sm"><Zap size={24} /></div>
                      <div>
                         <p className="text-[9px] font-black text-green-400 uppercase tracking-widest leading-none mb-1">Lucro Líquido Real</p>
                         <p className="text-2xl font-black text-gray-800 leading-none">R$ {closureStats.profitAccumulated.toFixed(2)}</p>
                      </div>
                   </div>
                </div>
                {closureStats.completedCount > 0 ? (
                  <p className="text-[10px] font-bold text-gray-400 italic text-center">
                    Cálculo baseado em {closureStats.completedCount} projeto(s) finalizado(s) nesta data.
                  </p>
                ) : (
                  <p className="text-[10px] text-center text-gray-300 italic">Nenhum projeto foi marcado como "Finalizado" com entrega nesta data.</p>
                )}
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <CreditCard size={14} className="text-blue-500" /> Saldo por Método de Pagamento
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.entries(closureStats.byMethod) as [string, number][]).map(([method, amount]) => (
                       <div key={method} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-600">{method}</span>
                          <span className={`text-sm font-black ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {amount >= 0 ? '+' : ''} R$ {amount.toFixed(2)}
                          </span>
                       </div>
                    ))}
                    {Object.keys(closureStats.byMethod).length === 0 && (
                      <p className="col-span-2 text-center py-4 text-xs text-gray-400 italic">Sem movimentações nesta data.</p>
                    )}
                 </div>
              </div>

              {closureStats.completedProjects.length > 0 && (
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                     <ShoppingBag size={14} className="text-blue-500" /> Projetos Entregues no Dia
                   </h4>
                   <div className="space-y-2">
                      {closureStats.completedProjects.map(p => (
                        <div key={p.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                           <span className="text-xs font-bold text-gray-700">{p.theme}</span>
                           <span className="text-[10px] font-black text-blue-500 bg-white px-2 py-0.5 rounded-lg border border-blue-50 shadow-sm">FINALIZADO</span>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <PieChart size={14} className="text-purple-500" /> Volume por Categoria
                 </h4>
                 <div className="space-y-2">
                    {(Object.entries(closureStats.byCategory) as [string, number][]).map(([cat, amount]) => (
                       <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                             <span className="text-gray-700">{cat}</span>
                             <span className="text-gray-400">R$ {amount.toFixed(2)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(amount / (closureStats.income + closureStats.expense || 1)) * 100}%` }}></div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
               <button onClick={() => window.print()} className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                 <Printer size={16} /> Imprimir
               </button>
               <button onClick={() => setShowClosure(false)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2">
                 <CheckCircle2 size={16} /> Confirmar Fechamento
               </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
            <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500 transition-colors"><X size={24} /></button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3"><div className="p-3 bg-green-50 text-green-600 rounded-2xl"><DollarSign size={24} /></div>Novo Lançamento</h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setNewTransaction({...newTransaction, type: 'income'})} className={`py-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${newTransaction.type === 'income' ? 'border-green-500 bg-green-50 text-green-600 shadow-sm' : 'border-gray-50 text-gray-400'}`}><ArrowUpCircle size={16} /> Entrada</button>
                <button type="button" onClick={() => setNewTransaction({...newTransaction, type: 'expense'})} className={`py-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${newTransaction.type === 'expense' ? 'border-red-500 bg-red-50 text-red-600 shadow-sm' : 'border-gray-50 text-gray-400'}`}><ArrowDownCircle size={16} /> Saída</button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição do Lançamento</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none font-bold" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} placeholder="Ex: Venda Topo de Bolo Shaker" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                  <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none font-black text-green-600" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none font-bold text-gray-600" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                  <div className="flex gap-2">
                    <select className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none font-bold text-gray-700" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button type="button" onClick={addCategory} className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all shadow-sm"><PlusCircle size={20} /></button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                  <div className="flex gap-2">
                    <select className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-400 outline-none font-bold text-gray-700" value={newTransaction.paymentMethod} onChange={e => setNewTransaction({...newTransaction, paymentMethod: e.target.value})}>
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button type="button" onClick={addPaymentMethod} className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl hover:bg-yellow-100 transition-all shadow-sm"><PlusCircle size={20} /></button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-8 py-5 border-2 border-gray-50 text-gray-400 rounded-3xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 px-8 py-5 bg-green-500 text-white font-black rounded-3xl hover:bg-green-600 transition-all shadow-lg">Confirmar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};