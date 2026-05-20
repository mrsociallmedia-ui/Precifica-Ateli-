
import React, { useState, useMemo } from 'react';
import { 
  Wallet2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Trash2, 
  Edit3,
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
  RefreshCw,
  Sparkles,
  Zap,
  ShoppingBag,
  ArrowRight,
  Info,
  ArrowDownUp,
  BarChart3,
  Scale,
  Users,
  FileText,
  History as HistoryIcon
} from 'lucide-react';
import { Transaction, Project, Material, Platform, CompanyData, CashClosure, Customer } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface FinancialControlProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  closures: CashClosure[];
  setClosures: React.Dispatch<React.SetStateAction<CashClosure[]>>;
  projects: Project[];
  customers: Customer[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  paymentMethods: string[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<string[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export const FinancialControl: React.FC<FinancialControlProps> = ({ 
  transactions, setTransactions, closures, setClosures, projects, customers, materials, platforms, companyData, categories, setCategories, paymentMethods, setPaymentMethods, setCustomers
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showClosure, setShowClosure] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [closureType, setClosureType] = useState<'daily' | 'monthly' | 'custom'>('daily');
  const [activeTab, setActiveTab] = useState<'history' | 'pending'>('history');
  const [pendingSubFilter, setPendingSubFilter] = useState<'all' | 'income' | 'expense'>('expense');
  const [searchTerm, setSearchTerm] = useState('');
  const [closureDate, setClosureDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [closureStartDate, setClosureStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [closureEndDate, setClosureEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [closureNotes, setClosureNotes] = useState('');
  const [realBalance, setRealBalance] = useState<number | ''>('');
  
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState<number | ''>('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    description: '',
    amount: 0,
    type: 'income',
    category: 'Venda',
    paymentMethod: 'Pix',
    date: new Date().toISOString().split('T')[0],
    status: 'paid',
    customerId: ''
  });

  const [installments, setInstallments] = useState(1);
  const [installmentAmount, setInstallmentAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const handlePartialPayment = (t: Transaction) => {
    setSelectedTransaction(t);
    setPartialAmount('');
    setShowPartialModal(true);
  };

  const handlePartialPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction || !partialAmount || Number(partialAmount) <= 0) return;

    const amount = Number(partialAmount);
    if (amount > selectedTransaction.amount) {
      alert('O valor do pagamento parcial não pode ser maior que o valor pendente.');
      return;
    }

    const remainingAmount = selectedTransaction.amount - amount;

    // Create the paid portion
    const paidTransaction: Transaction = {
      id: `partial_${Date.now()}_${selectedTransaction.id}`,
      description: `${selectedTransaction.description} (Parcial)`,
      amount: amount,
      type: selectedTransaction.type,
      category: selectedTransaction.category,
      paymentMethod: selectedTransaction.paymentMethod,
      date: new Date().toISOString().split('T')[0],
      status: 'paid'
    };

    let updatedTransactions = [...transactions, paidTransaction];

    if (remainingAmount > 0) {
      // Update existing pending transaction with remaining amount
      updatedTransactions = updatedTransactions.map(item =>
        item.id === selectedTransaction.id ? { ...item, amount: remainingAmount } : item
      );
    } else {
      // Mark as fully paid if remaining is 0
      updatedTransactions = updatedTransactions.map(item =>
        item.id === selectedTransaction.id ? { ...item, status: 'paid' } : item
      );
    }

    setTransactions(updatedTransactions);
    setShowPartialModal(false);
    setSelectedTransaction(null);
    setPartialAmount('');
    alert('Pagamento parcial registrado com sucesso!');
  };

  const totals = useMemo(() => {
    const openTransactions = transactions.filter(t => !t.closed);
    const paidTransactions = openTransactions.filter(t => t.status !== 'pending');
    const pendingTransactions = openTransactions.filter(t => t.status === 'pending');

    const income = paidTransactions.filter(t => t.type === 'income' && !t.isExchange).reduce((acc, t) => acc + t.amount, 0);
    const expense = paidTransactions.filter(t => t.type === 'expense' && !t.isExchange).reduce((acc, t) => acc + t.amount, 0);
    
    const pendingIncomeOnly = pendingTransactions.filter(t => t.type === 'income');
    const pendingExpenseOnly = pendingTransactions.filter(t => t.type === 'expense');

    // Calculate dynamic barter offsets for Contas a Pagar and Receber
    // Step 1: Base Barter Balance for each customer (PAID only)
    const customerBarterCredits: Record<string, number> = {};
    transactions.filter(t => t.isExchange && t.customerId && t.status === 'paid').forEach(t => {
      if (!customerBarterCredits[t.customerId!]) customerBarterCredits[t.customerId!] = 0;
      customerBarterCredits[t.customerId!] += (t.type === 'income' ? t.amount : -t.amount);
    });

    // Clone credits to use for offsets
    const creditsForExpenses = { ...customerBarterCredits };
    const debitsForIncome = { ...customerBarterCredits }; // Income is offset if balance is negative (artisanship debt)

    // Calculate Effective Pending Expense (Contas a Pagar)
    const effectivePendingExpense = pendingExpenseOnly.reduce((acc, t) => {
      if (t.isExchange && t.customerId && creditsForExpenses[t.customerId] > 0) {
        const offset = Math.min(t.amount, creditsForExpenses[t.customerId]);
        creditsForExpenses[t.customerId] -= offset;
        return acc + (t.amount - offset);
      }
      return acc + t.amount;
    }, 0);

    // Calculate Effective Pending Income (Receivables)
    const effectivePendingIncome = pendingIncomeOnly.reduce((acc, t) => {
      if (t.isExchange && t.customerId && debitsForIncome[t.customerId] < 0) {
        const artisanDebt = Math.abs(debitsForIncome[t.customerId]);
        const offset = Math.min(t.amount, artisanDebt);
        debitsForIncome[t.customerId] += offset;
        return acc + (t.amount - offset);
      }
      return acc + t.amount;
    }, 0);

    // Calculate total receivables from projects (excluding exchanges)
    const projectReceivables = projects.reduce((acc, p) => {
      if (p.status === 'completed' || p.isExchange) return acc;
      const breakdown = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      return acc + breakdown.remainingBalance;
    }, 0);

    return { 
      income, 
      expense, 
      balance: income - expense, 
      receivables: projectReceivables + effectivePendingIncome,
      toPay: effectivePendingExpense
    };
  }, [transactions, projects, materials, platforms, companyData]);

  const barterBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Transactions
    transactions.filter(t => t.isExchange && t.customerId).forEach(t => {
      if (!balances[t.customerId!]) balances[t.customerId!] = 0;
      if (t.type === 'income') {
        balances[t.customerId!] += t.amount;
      } else {
        balances[t.customerId!] -= t.amount;
      }
    });

    // Projects (Exchanges)
    projects.filter(p => p.isExchange && p.customerId).forEach(p => {
      if (!balances[p.customerId]) balances[p.customerId] = 0;
      const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      // A project is an expense for the barter pool (artisan giving work)
      balances[p.customerId] -= finalPrice;
    });

    return Object.entries(balances).map(([id, balance]) => ({
      customerId: id,
      customerName: customers.find(c => c.id === id)?.name || 'Desconhecido',
      balance
    })).filter(b => b.balance !== 0);
  }, [transactions, projects, customers, materials, platforms, companyData]);

  // Cálculos de Fechamento de Caixa com Mão de Obra e Lucro Real
  const closureStats = useMemo(() => {
    const filtered = transactions.filter(t => {
      if (closureType === 'daily') {
        return t.date === closureDate;
      } else if (closureType === 'monthly') {
        // Monthly closure: check if year and month match
        const [year, month] = closureDate.split('-');
        const [tYear, tMonth] = t.date.split('-');
        return year === tYear && month === tMonth;
      } else {
        // Custom period closure
        return t.date >= closureStartDate && t.date <= closureEndDate;
      }
    });
    const income = filtered.filter(t => t.type === 'income' && !t.isExchange).reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense' && !t.isExchange).reduce((acc, t) => acc + t.amount, 0);
    
    let laborAccumulated = 0;
    let profitAccumulated = 0;
    let totalSales = 0;
    const salesBreakdownList: Array<{ name: string, amount: number, labor: number, profit: number }> = [];

    filtered.forEach(t => {
      if (t.type === 'income' && t.category === 'Venda' && !t.isExchange) {
        totalSales += t.amount;
        // Tenta encontrar o projeto associado pelo ID da transação
        const parts = t.id.split('_');
        const projectId = parts[parts.length - 1];
        const project = projects.find(p => p.id === projectId);
        
        if (project) {
          const breakdown = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
          
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
      totalSales,
      salesBreakdownList
    };
  }, [transactions, closureType, closureDate, closureStartDate, closureEndDate, projects, materials, platforms, companyData]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount) return;

    if (editingTransactionId) {
      const isEx = newTransaction.category === 'Permuta' || newTransaction.isExchange;
      const updatedTransactions = transactions.map(t => 
        t.id === editingTransactionId 
          ? { 
              ...t, 
              ...newTransaction as Transaction, 
              type: isEx ? 'income' : (newTransaction.type as 'income' | 'expense'),
              isExchange: isEx 
            } 
          : t
      );
      setTransactions(updatedTransactions);
      setEditingTransactionId(null);
    } else {
      const isEx = newTransaction.category === 'Permuta' || newTransaction.isExchange || false;
      const numInstallments = installments > 0 ? installments : 1;
      const generatedTransactions: Transaction[] = [];

      for (let i = 0; i < numInstallments; i++) {
        const transactionDate = new Date((newTransaction.date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
        
        if (i > 0) {
          if (frequency === 'weekly') {
            transactionDate.setDate(transactionDate.getDate() + (i * 7));
          } else if (frequency === 'monthly') {
            transactionDate.setMonth(transactionDate.getMonth() + i);
          } else if (frequency === 'yearly') {
            transactionDate.setFullYear(transactionDate.getFullYear() + i);
          }
        }

        const transaction: Transaction = {
          id: i === 0 ? `manual_${Date.now()}` : `manual_${Date.now()}_${i}`,
          description: numInstallments > 1 
            ? `${newTransaction.description!} (${i + 1}/${numInstallments})` 
            : newTransaction.description!,
          amount: installments > 1 ? Number(installmentAmount) : Number(newTransaction.amount),
          type: isEx ? 'income' : (newTransaction.type as 'income' | 'expense'),
          category: newTransaction.category || 'Geral',
          paymentMethod: isEx ? 'Permuta' : (newTransaction.paymentMethod || 'Dinheiro'),
          date: transactionDate.toISOString().split('T')[0],
          status: newTransaction.status as 'pending' | 'paid' || 'paid',
          isExchange: isEx,
          customerId: newTransaction.customerId
        };
        generatedTransactions.push(transaction);

        // LÓGICA DE CRÉDITO PARA PERMUTA (Apenas para o montante total ou para cada parcela?)
        // Se for permuta e parcelado, geralmente o crédito total é dado no início ou conforme as parcelas vencem.
        // Mas a lógica atual aplica o crédito no momento do cadastro.
        // Vou aplicar o crédito para cada transação gerada se for permuta.
        if (isEx && transaction.customerId) {
          setCustomers(prev => prev.map(c => 
            c.id === transaction.customerId 
              ? { ...c, creditBalance: (c.creditBalance || 0) + transaction.amount }
              : c
          ));
        }
      }

      setTransactions([...generatedTransactions, ...transactions]);
    }

    setShowForm(false);
    setNewTransaction({ 
      description: '', amount: 0, type: 'income', category: 'Venda', paymentMethod: 'Pix', 
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      customerId: ''
    });
    setInstallments(1);
    setInstallmentAmount('');
    setFrequency('monthly');
  };

  const handlePrintClosure = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const periodText = closureType === 'daily' 
      ? `Dia: ${new Date(closureDate + 'T00:00:00').toLocaleDateString('pt-BR')}` 
      : closureType === 'monthly' 
        ? `Mês: ${closureDate.substring(0, 7)}` 
        : `Período: ${new Date(closureStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(closureEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Fechamento de Caixa - ${companyData.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { padding: 20px; border: 1px solid #eee; border-radius: 10px; }
            .stat-label { font-size: 12px; color: #999; text-transform: uppercase; font-weight: bold; }
            .stat-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; font-size: 12px; color: #999; text-transform: uppercase; padding: 10px; border-bottom: 2px solid #eee; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .observations { background: #f9f9f9; padding: 20px; border-radius: 10px; font-style: italic; font-size: 14px; white-space: pre-wrap; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Relatório de Fechamento de Caixa</h1>
            <div class="subtitle">${companyData.name} | ${periodText}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total de Vendas</div>
              <div class="stat-value">R$ ${closureStats.totalSales.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Saldo do Período</div>
              <div class="stat-value">R$ ${closureStats.balance.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Movimentações</div>
              <div class="stat-value">${closureStats.count}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Mão de Obra (Salário)</div>
              <div class="stat-value">R$ ${closureStats.laborAccumulated.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Lucro Real (Empresa)</div>
              <div class="stat-value">R$ ${closureStats.profitAccumulated.toFixed(2)}</div>
            </div>
          </div>

          <div class="section-title">Detalhamento de Vendas</div>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Recebido</th>
                <th>Mão de Obra</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              ${closureStats.salesBreakdownList.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>R$ ${item.amount.toFixed(2)}</td>
                  <td>R$ ${item.labor.toFixed(2)}</td>
                  <td>R$ ${item.profit.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${closureNotes ? `
            <div class="section-title">Observações</div>
            <div class="observations">${closureNotes}</div>
          ` : ''}

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCloseCash = () => {
    if (realBalance === '') {
      alert('Por favor, informe o saldo real em caixa!');
      return;
    }

    if (!confirm('Deseja realmente fechar o caixa para este período? As movimentações serão arquivadas.')) return;

    const filtered = transactions.filter(t => {
      if (t.closed) return false;
      if (closureType === 'daily') return t.date === closureDate;
      if (closureType === 'monthly') {
        const [year, month] = closureDate.split('-');
        const [tYear, tMonth] = t.date.split('-');
        return year === tYear && month === tMonth;
      }
      return t.date >= closureStartDate && t.date <= closureEndDate;
    });

    if (filtered.length === 0) {
      alert('Não há movimentações abertas para fechar neste período!');
      return;
    }

    const newClosure: CashClosure = {
      id: `closure_${Date.now()}`,
      date: closureDate,
      type: closureType,
      startDate: closureType === 'custom' ? closureStartDate : closureDate,
      endDate: closureType === 'custom' ? closureEndDate : closureDate,
      systemBalance: closureStats.balance,
      realBalance: Number(realBalance),
      difference: Number(realBalance) - closureStats.balance,
      laborAccumulated: closureStats.laborAccumulated,
      profitAccumulated: closureStats.profitAccumulated,
      totalSales: closureStats.totalSales,
      notes: closureNotes,
      closedAt: new Date().toISOString()
    };

    // Mark transactions as closed
    const updatedTransactions = transactions.map(t => {
      if (filtered.some(ft => ft.id === t.id)) {
        return { ...t, closed: true };
      }
      return t;
    });

    // Create a carry-over transaction for the next period
    const carryOverTransaction: Transaction = {
      id: `carryover_${Date.now()}`,
      description: `Saldo Anterior (${closureType === 'daily' ? 'Dia' : closureType === 'monthly' ? 'Mês' : 'Período'} Anterior)`,
      amount: Number(realBalance),
      type: 'income',
      category: 'Saldo Inicial',
      paymentMethod: 'Saldo em Caixa',
      date: new Date().toISOString().split('T')[0],
      closed: false
    };

    setTransactions([carryOverTransaction, ...updatedTransactions]);
    setClosures([newClosure, ...closures]);
    setShowClosure(false);
    setRealBalance('');
    setClosureNotes('');
    alert('Caixa fechado com sucesso! O saldo real foi transportado para o novo período.');
  };

  const handleReopenCash = () => {
    if (closures.length === 0) {
      alert('Não há fechamentos para reabrir!');
      return;
    }

    if (!confirm('Deseja reabrir o último fechamento? As movimentações voltarão para o fluxo ativo.')) return;

    const lastClosure = closures[0];
    
    // Unmark transactions that were closed in the last closure's period
    const updatedTransactions = transactions.map(t => {
      if (!t.closed) return t;
      
      let shouldReopen = false;
      if (lastClosure.type === 'daily') {
        shouldReopen = t.date === lastClosure.date;
      } else if (lastClosure.type === 'monthly') {
        const [year, month] = lastClosure.date.split('-');
        const [tYear, tMonth] = t.date.split('-');
        shouldReopen = year === tYear && month === tMonth;
      } else {
        shouldReopen = t.date >= lastClosure.startDate && t.date <= lastClosure.endDate;
      }

      if (shouldReopen) {
        return { ...t, closed: false };
      }
      return t;
    });

    setTransactions(updatedTransactions);
    setClosures(closures.slice(1));
    alert('Caixa reaberto com sucesso!');
  };

  const handlePrintBarterReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const summaryContent = barterBalances.map(item => `
      <tr>
        <td>${item.customerName}</td>
        <td class="${item.balance >= 0 ? 'text-green' : 'text-red'}" style="text-align: right">
          R$ ${Math.abs(item.balance).toFixed(2)} ${item.balance >= 0 ? '(CRÉDITO)' : '(DÉBITO)'}
        </td>
      </tr>
    `).join('');

    const totalBalance = barterBalances.reduce((acc, item) => acc + item.balance, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Resumo Geral de Permutas - ${companyData.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a202c; }
            .header { border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; color: #d53f8c; }
            .subtitle { color: #718096; font-size: 11px; margin-top: 5px; font-weight: 700; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; font-size: 10px; color: #718096; text-transform: uppercase; padding: 12px; border-bottom: 2px solid #edf2f7; letter-spacing: 1px; }
            td { padding: 12px; border-bottom: 1px solid #f7fafc; font-size: 12px; color: #2d3748; }
            .text-green { color: #38a169; font-weight: bold; }
            .text-red { color: #e53e3e; font-weight: bold; }
            .footer { margin-top: 60px; display: flex; justify-content: flex-end; }
            .total-box { background: #f7fafc; padding: 20px 30px; border-radius: 16px; border: 1px solid #edf2f7; display: inline-block; }
            .total-label { font-size: 10px; font-weight: 900; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .total-value { font-size: 20px; font-weight: 900; color: #2d3748; }
            @media print { 
              body { padding: 0; }
              .header { border-bottom-color: #333; }
              .total-box { border-color: #333; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Resumo Geral de Saldos de Permuta</h1>
              <div class="subtitle">${companyData.name}</div>
            </div>
            <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th style="text-align: right">SALDO ATUAL</th>
              </tr>
            </thead>
            <tbody>
              ${summaryContent || '<tr><td colspan="2" style="text-align:center; padding: 40px; color: #a0aec0; font-weight: bold;">Nenhum saldo de permuta registrado.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div class="total-box">
              <div class="total-label">SALDO LÍQUIDO GERAL (RESERVA DE CRÉDITO)</div>
              <div class="total-value ${totalBalance >= 0 ? 'text-green' : 'text-red'}">
                R$ ${Math.abs(totalBalance).toFixed(2)} ${totalBalance >= 0 ? '(FAVORÁVEL)' : '(DEVEDOR)'}
              </div>
            </div>
          </div>

          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDetailedBarterReport = (targetCustomerId?: string, isCreditReport: boolean = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barterCustomers = targetCustomerId ? [targetCustomerId] : barterBalances.map(b => b.customerId);
    
    if (barterCustomers.length === 0) {
      alert('Selecione um cliente com movimentação de permuta.');
      return;
    }
    
    const content = barterCustomers.map(customerId => {
      const customer = customers.find(c => c.id === customerId);
      const customerName = customer?.name || 'Desconhecido';
      
      const customerPaidTransactions = transactions.filter(t => t.isExchange && t.customerId === customerId && t.status === 'paid');
      const customerPendingTransactions = transactions.filter(t => t.isExchange && t.customerId === customerId && t.status === 'pending');
      
      const customerProjects = projects.filter(p => p.isExchange && p.customerId === customerId);
      const customerCompletedProjects = customerProjects.filter(p => p.status === 'completed');
      const customerPendingProjects = customerProjects.filter(p => p.status !== 'completed');

      // Totals
      const totalBarterIncome = customerPaidTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      
      const totalBarterUtilizedTransactions = customerPaidTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalBarterUtilizedProjects = customerProjects.reduce((sum, p) => {
        const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
        return sum + finalPrice;
      }, 0);

      const totalBarterUtilized = totalBarterUtilizedTransactions + totalBarterUtilizedProjects;
      const currentBalance = totalBarterIncome - totalBarterUtilized;
      
      return `
        <div class="report-page">
          <div class="report-header">
            <div class="company-info">
              <div class="company-name">${companyData.name}</div>
              <div class="company-details">
                ${companyData.cnpj ? `<span>CNPJ: ${companyData.cnpj}</span><br>` : ''}
                ${companyData.email ? `<span>Email: ${companyData.email}</span><br>` : ''}
                ${companyData.phone ? `<span>Whats: ${companyData.phone}</span>` : ''}
              </div>
            </div>
            <div class="report-meta">
              <div class="report-title">${isCreditReport ? 'RELATÓRIO DE CRÉDITO COM ATELIÊ' : 'RELATÓRIO DE PERMUTA'}</div>
              <div class="report-date">Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
            </div>
          </div>

          <div class="customer-info-box">
            <div class="info-label">DADOS DO CLIENTE / PARCEIRO</div>
            <div class="info-content">
              <strong>${customerName}</strong><br>
              ${customer?.phone ? `Telefone: ${customer.phone}<br>` : ''}
              ${customer?.address ? `Endereço: ${customer.address}${customer.neighborhood ? `, ${customer.neighborhood}` : ''}<br>` : ''}
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">VALOR TOTAL DE CRÉDITO (CADASTRADO)</div>
              <div class="stat-value">R$ ${totalBarterIncome.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">VALOR TOTAL UTILIZADO (ABATIDO)</div>
              <div class="stat-value text-red">R$ ${totalBarterUtilized.toFixed(2)}</div>
            </div>
            <div class="stat-card highlight">
              <div class="stat-label text-white/60">SALDO REMANESCENTE DISPONÍVEL</div>
              <div class="stat-value ${currentBalance >= 0 ? 'text-green' : 'text-danger'}">
                 R$ ${Math.abs(currentBalance).toFixed(2)} 
                 <small style="font-size: 10px">${currentBalance >= 0 ? '(SALDO EM CRÉDITO)' : '(DÉBITO COM ATELIÊ)'}</small>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">ITENS QUE JÁ TIVERAM BAIXA (ABATIDOS)</div>
            <table>
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>MOVIMENTAÇÃO / PRODUTO</th>
                  <th style="text-align: right">VALOR</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ...customerPaidTransactions.filter(t => t.type === 'expense').map(t => ({
                    date: t.date,
                    desc: t.description,
                    amount: t.amount
                  })),
                  ...customerCompletedProjects.map(p => ({
                    date: p.deliveryDate || p.createdAt,
                    desc: `[PEDIDO] ${p.theme}`,
                    amount: calculateProjectBreakdown(p, materials, platforms, companyData, transactions).finalPrice
                  }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => `
                  <tr>
                    <td>${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.desc}</td>
                    <td class="text-red" style="text-align: right">R$ ${item.amount.toFixed(2)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #a0aec0;">Nenhum item abatido até o momento.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DETALHAMENTO DE ENTRADAS (CRÉDITOS)</div>
            <table>
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>DESCRIÇÃO DA ENTRADA</th>
                  <th style="text-align: right">VALOR</th>
                </tr>
              </thead>
              <tbody>
                ${customerPaidTransactions.filter(t => t.type === 'income').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => `
                  <tr>
                    <td>${new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${t.description}</td>
                    <td class="text-green" style="text-align: right">R$ ${t.amount.toFixed(2)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #a0aec0;">Nenhuma entrada de crédito registrada.</td></tr>'}
              </tbody>
            </table>
          </div>

          ${!isCreditReport ? `
          <div class="section">
            <div class="section-title">LANÇAMENTOS PENDENTES (CRONOGRAMA E FINANCEIRO)</div>
            <table>
              <thead>
                <tr>
                  <th>PREVISÃO</th>
                  <th>DESCRIÇÃO / ITEM</th>
                  <th style="text-align: right">VALOR</th>
                  <th style="text-align: right">SITUAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ...customerPendingTransactions.map(t => ({
                    date: t.date,
                    desc: t.description,
                    amount: t.amount,
                    status: t.type === 'income' ? 'Aguardando Crédito' : 'Aguardando Baixa'
                  })),
                  ...customerPendingProjects.map(p => ({
                    date: p.deliveryDate || p.dueDate,
                    desc: `[PEDIDO] ${p.theme}`,
                    amount: calculateProjectBreakdown(p, materials, platforms, companyData, transactions).finalPrice,
                    status: 'Aguardando Entrega'
                  }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => `
                  <tr>
                    <td>${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.desc}</td>
                    <td style="text-align: right">R$ ${item.amount.toFixed(2)}</td>
                    <td style="text-align: right">${item.status}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #a0aec0;">Nenhum lançamento pendente.</td></tr>'}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <div class="footer-note">
            Este relatório consolida todas as trocas e serviços realizados sob regime de permuta com ${customerName}.<br>
            <strong>Saldo disponível para novos abatimentos: R$ ${currentBalance >= 0 ? currentBalance.toFixed(2) : '0.00'}</strong>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Extrato de Permuta Detalhado</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 0; margin: 0; color: #1a202c; background: #fff; line-height: 1.5; }
            .report-page { padding: 40px; page-break-after: always; position: relative; }
            .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 20px; font-weight: 900; color: #2d3748; text-transform: uppercase; }
            .company-details { font-size: 10px; color: #718096; line-height: 1.4; margin-top: 4px; }
            .report-meta { text-align: right; }
            .report-title { font-size: 14px; font-weight: 900; color: #d53f8c; letter-spacing: 1px; }
            .report-date { font-size: 9px; color: #a0aec0; margin-top: 4px; }
            
            .customer-info-box { background: #f7fafc; border: 1px solid #edf2f7; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
            .info-label { font-size: 9px; font-weight: 900; color: #a0aec0; letter-spacing: 1px; margin-bottom: 6px; }
            .info-content { font-size: 11px; }
            
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #fff; border: 1px solid #edf2f7; padding: 15px; border-radius: 12px; }
            .stat-card.highlight { background: #1a202c; color: #fff; border: none; }
            .stat-label { font-size: 8px; font-weight: 900; color: #a0aec0; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
            .text-white/60 { color: rgba(255,255,255,0.6); }
            .stat-value { font-size: 16px; font-weight: 900; }
            .text-green { color: #38a169; }
            .text-red { color: #e53e3e; }
            .text-danger { color: #feb2b2; }
            
            .section { margin-bottom: 30px; }
            .section-title { font-size: 10px; font-weight: 900; color: #4a5568; background: #edf2f7; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px; text-transform: uppercase; }
            
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 9px; font-weight: 700; color: #718096; padding: 8px 12px; border-bottom: 2px solid #edf2f7; text-transform: uppercase; }
            td { padding: 10px 12px; border-bottom: 1px solid #f7fafc; font-size: 11px; }
            
            .footer-note { font-size: 10px; color: #4a5568; text-align: center; margin-top: 40px; padding: 20px; border-top: 1px dashed #edf2f7; line-height: 1.8; }
            
            @media print {
              .report-page { padding: 30px; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Fixed missing deleteTransaction function
  const deleteTransaction = (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const filteredTransactions = useMemo(() => {
    // Shared credits for calculating effective values in the list
    const customerBarterCredits: Record<string, number> = {};
    transactions.filter(t => t.isExchange && t.customerId && t.status === 'paid').forEach(t => {
      if (!customerBarterCredits[t.customerId!]) customerBarterCredits[t.customerId!] = 0;
      customerBarterCredits[t.customerId!] += (t.type === 'income' ? t.amount : -t.amount);
    });

    const activeCreditsForCalc = { ...customerBarterCredits };

    return transactions
      .filter(t => !t.closed)
      .filter(t => {
        if (activeTab === 'history') return t.status !== 'pending';
        if (t.status !== 'pending') return false;
        if (pendingSubFilter === 'all') return true;
        return t.type === pendingSubFilter;
      })
      .filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => {
        // Calculate effective amount for display if pending and barter
        let effectiveAmount = t.amount;
        if (t.status === 'pending' && t.isExchange && t.customerId) {
          const balance = activeCreditsForCalc[t.customerId] || 0;
          if (t.type === 'expense' && balance > 0) {
            const offset = Math.min(t.amount, balance);
            effectiveAmount = t.amount - offset;
            activeCreditsForCalc[t.customerId] -= offset;
          } else if (t.type === 'income' && balance < 0) {
            const offset = Math.min(t.amount, Math.abs(balance));
            effectiveAmount = t.amount - offset;
            activeCreditsForCalc[t.customerId] += offset;
          }
        }
        return { ...t, effectiveAmount };
      });
  }, [transactions, activeTab, pendingSubFilter, searchTerm]);

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
            onClick={() => {
              setEditingTransactionId(null);
              setNewTransaction({ 
                description: '', amount: 0, type: 'income', category: 'Venda', paymentMethod: 'Pix', 
                date: new Date().toISOString().split('T')[0],
                status: 'paid',
                customerId: ''
              });
              setInstallments(1);
              setInstallmentAmount('');
              setFrequency('monthly');
              setShowForm(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white font-black px-6 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div 
          onClick={() => setActiveTab('history')}
          className={`bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col gap-4 group hover:shadow-xl transition-all cursor-pointer ${activeTab === 'history' ? 'border-blue-200 ring-2 ring-blue-50' : 'border-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm"><ArrowDownUp size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ver Histórico</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Saldo em Caixa</p>
            <p className="text-3xl font-black text-gray-900 mt-1">R$ {totals.balance.toFixed(2)}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('pending')}
          className={`bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col gap-4 group hover:shadow-xl transition-all cursor-pointer ${activeTab === 'pending' ? 'border-purple-200 ring-2 ring-purple-50' : 'border-purple-50'}`}
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-sm"><Scale size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Contas a Pagar</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Boletos/Contas</p>
            <p className="text-3xl font-black text-purple-600 mt-1">R$ {totals.toPay.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-orange-50 flex flex-col gap-4 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl shadow-sm"><Clock size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total a Receber</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pendente</p>
            <p className="text-3xl font-black text-orange-600 mt-1">R$ {totals.receivables.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-green-50 flex flex-col gap-4 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl shadow-sm"><ArrowUpCircle size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Entradas Pagas</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Faturamento</p>
            <p className="text-3xl font-black text-green-600 mt-1">R$ {totals.income.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-50 flex flex-col gap-4 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm"><ArrowDownCircle size={28} /></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Saídas Pagas</span>
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

      {/* SALDOS DE PERMUTA POR CLIENTE */}
      {barterBalances.length > 0 && (
        <div className="bg-pink-50 p-8 rounded-[2.5rem] border border-pink-100 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-500 text-white rounded-2xl shadow-lg">
                <RefreshCw size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-pink-600 tracking-tight">Saldos de Permuta</h3>
                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Controle de créditos e trocas por cliente</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {barterBalances.map(item => (
              <div key={item.customerId} className="bg-white p-6 rounded-2xl border border-pink-50 shadow-sm flex flex-col gap-2 group hover:shadow-md transition-all relative">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{item.customerName}</p>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleDetailedBarterReport(item.customerId, true)}
                      className="p-1.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Relatório de Crédito"
                    >
                      <FileText size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className={`text-2xl font-black ${item.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    R$ {Math.abs(item.balance).toFixed(2)}
                  </p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${item.balance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                    {item.balance >= 0 ? 'Crédito com Ateliê' : 'Devendo ao Ateliê'}
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 font-medium leading-tight mt-1 italic">
                  {item.balance >= 0 ? 'Saldo a favor do cliente para futuras trocas.' : 'O ateliê utilizou mais serviços do que forneceu.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LISTA DE FLUXO DE CAIXA */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <HistoryIcon size={14} /> Histórico
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Clock size={14} /> Contas a Pagar (Boletos)
            </button>
          </div>

          {activeTab === 'pending' && (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2 bg-purple-50 p-1 rounded-xl border border-purple-100">
                <button 
                  onClick={() => setPendingSubFilter('all')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${pendingSubFilter === 'all' ? 'bg-white text-purple-600 shadow-sm' : 'text-purple-400 hover:text-purple-600'}`}
                >
                  Todas
                </button>
                <button 
                  onClick={() => setPendingSubFilter('expense')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${pendingSubFilter === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-purple-400 hover:text-purple-600'}`}
                >
                  A Pagar
                </button>
                <button 
                  onClick={() => setPendingSubFilter('income')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${pendingSubFilter === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-purple-400 hover:text-purple-600'}`}
                >
                  A Receber
                </button>
              </div>
              <div className="px-6 py-2 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-100 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Total {pendingSubFilter === 'all' ? 'Pendente' : pendingSubFilter === 'expense' ? 'A Pagar' : 'A Receber'}</span>
                <span className="text-sm font-black">
                  R$ {filteredTransactions.reduce((acc, t) => acc + (t as any).effectiveAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar lançamentos..." 
              className="pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-medium w-full"
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
                        <div className="flex items-center gap-2">
                          <p className="font-black text-gray-700 text-sm">{t.description}</p>
                          {t.customerId && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black uppercase rounded-md">
                              {customers.find(c => c.id === t.customerId)?.name || 'Cliente'}
                            </span>
                          )}
                          {t.status === 'pending' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-black uppercase rounded-md">Pendente</span>
                          )}
                          {t.isExchange && (
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-[8px] font-black uppercase rounded-md flex items-center gap-1">
                              <RefreshCw size={8} /> Permuta
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{t.category}</span>
                  </td>
                  <td className="px-8 py-5 font-bold text-gray-500 text-xs">{t.paymentMethod}</td>
                  <td className={`px-8 py-5 text-right font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex flex-col items-end">
                      <span>{t.type === 'income' ? '+' : '-'} R$ {(t as any).effectiveAmount.toFixed(2)}</span>
                      {(t as any).effectiveAmount !== t.amount && (
                        <span className="text-[9px] text-gray-400 line-through opacity-60">
                          R$ {t.amount.toFixed(2)}
                        </span>
                      )}
                      {(t as any).effectiveAmount === 0 && t.status === 'pending' && t.isExchange && (
                        <span className="text-[8px] bg-green-100 text-green-600 px-1 rounded uppercase">Abatido por permuta</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => {
                              if (confirm('Marcar este lançamento como PAGO TOTAL?')) {
                                setTransactions(prev => prev.map(item => 
                                  item.id === t.id ? { ...item, status: 'paid' } : item
                                ));
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-sm"
                            title="Marcar como Pago Total"
                          >
                            <CheckCircle2 size={12} /> PAGO
                          </button>
                          <button 
                            onClick={() => handlePartialPayment(t)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-sm"
                            title="Receber Parcial"
                          >
                            <PieChart size={12} /> PARCIAL
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          setEditingTransactionId(t.id);
                          setNewTransaction({ ...t });
                          setShowForm(true);
                        }} 
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteTransaction(t.id)} 
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
        <div className="fixed inset-0 bg-black/10 z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" 
            onClick={() => { setShowClosure(false); setClosureNotes(''); }}
          ></div>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] z-10 animate-scaleIn my-4">
            <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Fechamento de Caixa</h3>
                <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">
                  Análise de Lucratividade {closureType === 'daily' ? 'Diária' : closureType === 'monthly' ? 'Mensal' : 'por Período'}
                </p>
              </div>
              <button onClick={() => { setShowClosure(false); setClosureNotes(''); }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-6 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                 <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Fechamento</label>
                       <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                          <button 
                            onClick={() => setClosureType('daily')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${closureType === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            Diário
                          </button>
                          <button 
                            onClick={() => setClosureType('monthly')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${closureType === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            Mensal
                          </button>
                          <button 
                            onClick={() => setClosureType('custom')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${closureType === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            Período
                          </button>
                       </div>
                    </div>

                    <div className="flex-[2] space-y-2">
                      {closureType === 'custom' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Início</label>
                            <input 
                              type="date" 
                              className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-gray-700" 
                              value={closureStartDate} 
                              onChange={e => setClosureStartDate(e.target.value)} 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Fim</label>
                            <input 
                              type="date" 
                              className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-gray-700" 
                              value={closureEndDate} 
                              onChange={e => setClosureEndDate(e.target.value)} 
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {closureType === 'daily' ? 'Selecionar Data' : 'Selecionar Mês/Ano'}
                          </label>
                          <input 
                            type={closureType === 'daily' ? 'date' : 'month'} 
                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-gray-700" 
                            value={closureType === 'daily' ? closureDate : closureDate.substring(0, 7)} 
                            onChange={e => {
                              if (closureType === 'daily') {
                                setClosureDate(e.target.value);
                              } else {
                                setClosureDate(`${e.target.value}-01`);
                              }
                            }} 
                          />
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Total Vendas</p>
                       <p className="text-xl font-black text-blue-600">R$ {closureStats.totalSales.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Movimentações</p>
                       <p className="text-xl font-black text-gray-800">{closureStats.count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Saldo Sistema</p>
                       <p className={`text-xl font-black ${closureStats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         R$ {closureStats.balance.toFixed(2)}
                       </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-blue-100 text-center shadow-sm">
                       <p className="text-[9px] font-black text-blue-400 uppercase">Saldo Real em Caixa</p>
                       <input 
                         type="number" 
                         step="0.01"
                         placeholder="0.00"
                         className="w-full text-center text-xl font-black text-blue-600 outline-none bg-transparent"
                         value={realBalance}
                         onChange={e => setRealBalance(e.target.value === '' ? '' : Number(e.target.value))}
                       />
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
                        <p className="text-xs text-gray-400 font-bold italic">Nenhuma venda de orçamento registrada neste período.</p>
                      </div>
                    )}
                 </div>
              </div>

              {/* OUTRAS MOVIMENTAÇÕES */}
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                   <ArrowDownUp size={16} className="text-purple-500" /> Outras Movimentações (Despesas e Diversos)
                 </h4>
                 <div className="space-y-3">
                    {transactions.filter(t => {
                       if (closureType === 'daily') return t.date === closureDate;
                       if (closureType === 'monthly') {
                          const [year, month] = closureDate.split('-');
                          const [tYear, tMonth] = t.date.split('-');
                          return year === tYear && month === tMonth;
                       }
                       return t.date >= closureStartDate && t.date <= closureEndDate;
                    }).filter(t => t.category !== 'Venda').map((t, idx) => (
                       <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                                {t.type === 'income' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                             </div>
                             <div>
                                <p className="font-black text-gray-700 text-xs">{t.description}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{t.category} • {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                             </div>
                          </div>
                          <p className={`text-xs font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                             {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                          </p>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="p-6 bg-yellow-50 rounded-[2rem] border border-yellow-100 flex items-start gap-4">
                 <Info className="text-yellow-500 shrink-0" size={20} />
                 <p className="text-xs font-medium text-yellow-700 leading-relaxed italic">
                    <strong>Como funciona este cálculo?</strong> O sistema analisa cada recebimento (Sinal ou Saldo) e aplica a porcentagem de Mão de Obra e Lucro que foi calculada lá no orçamento original. Assim, você gerencia seu caixa sabendo exatamente o que é dinheiro seu (Salário) e o que é dinheiro da empresa (Lucro Real).
                 </p>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações do Fechamento</label>
                 <textarea 
                   className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none font-medium text-gray-700 text-sm min-h-[120px] resize-none focus:bg-white focus:border-blue-100 transition-all"
                   placeholder="Digite aqui anotações importantes sobre este período..."
                   value={closureNotes}
                   onChange={e => setClosureNotes(e.target.value)}
                 />
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4">
               <button onClick={handlePrintClosure} className="flex-1 min-w-[180px] py-4 bg-gray-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                 <Printer size={16} /> Imprimir
               </button>
               <button onClick={handleCloseCash} className="flex-1 min-w-[180px] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                 <CheckCircle2 size={16} /> Efetuar Fechamento
               </button>
               {closures.length > 0 && (
                 <button onClick={handleReopenCash} className="flex-1 min-w-[180px] py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                   <RefreshCw size={16} /> Reabrir Último
                 </button>
               )}
               <button onClick={() => { setShowClosure(false); setClosureNotes(''); setRealBalance(''); }} className="flex-1 min-w-[180px] py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all">
                 Fechar Relatório
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO LANÇAMENTO */}
      {showForm && (
        <div className="fixed inset-0 bg-black/10 z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" 
            onClick={() => { setShowForm(false); setEditingTransactionId(null); }}
          ></div>
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleIn my-4">
            <div className={`absolute top-0 left-0 w-full h-2 ${newTransaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            
            <div className="p-10 pb-4 flex items-center justify-between shrink-0">
               <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${newTransaction.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                     {newTransaction.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                  </div>
                  {editingTransactionId ? 'Editar Lançamento' : (newTransaction.type === 'income' ? 'Nova Entrada' : 'Nova Saída')}
               </h3>
               <button onClick={() => { setShowForm(false); setEditingTransactionId(null); }} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X size={24} />
               </button>
            </div>

            <div className="p-10 pt-2 overflow-y-auto custom-scrollbar flex-1">
               <form onSubmit={handleAddTransaction} className="space-y-6 pb-2">
                 <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 mb-4">
                    <button type="button" onClick={() => setNewTransaction({...newTransaction, type: 'income'})} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newTransaction.type === 'income' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Entrada</button>
                    <button type="button" onClick={() => setNewTransaction({...newTransaction, type: 'expense'})} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newTransaction.type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Saída</button>
                 </div>
               
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" placeholder="Ex: Compra de Papéis, Venda Topo de Bolo..." value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} />
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular a Cliente {newTransaction.isExchange && <span className="text-pink-500">(Obrigatório na Permuta)</span>}</label>
                  <select 
                    required={newTransaction.isExchange}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700" 
                    value={newTransaction.customerId || ''} 
                    onChange={e => setNewTransaction({...newTransaction, customerId: e.target.value})}
                  >
                     <option value="">Selecione um cliente...</option>
                     {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Total (R$)</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        required 
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-blue-600" 
                        value={newTransaction.amount} 
                        onChange={e => {
                           const total = parseFloat(e.target.value) || 0;
                           setNewTransaction({...newTransaction, amount: total});
                           if (installments > 0) {
                              setInstallmentAmount(Number((total / installments).toFixed(2)));
                           }
                        }} 
                     />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                    <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                       Categoria
                       <button 
                          type="button"
                          onClick={() => {
                             const newCat = prompt('Digite o nome da nova categoria:');
                             if (newCat && newCat.trim()) {
                                const trimmed = newCat.trim();
                                if (!categories.includes(trimmed)) {
                                   setCategories([...categories, trimmed]);
                                }
                                setNewTransaction({
                                   ...newTransaction, 
                                   category: trimmed,
                                   isExchange: trimmed === 'Permuta',
                                   type: trimmed === 'Permuta' ? 'income' : newTransaction.type,
                                   paymentMethod: trimmed === 'Permuta' ? 'Permuta' : newTransaction.paymentMethod
                                });
                             }
                          }}
                          className="text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                       >
                          <PlusCircle size={10} />
                          <span className="text-[8px]">Nova</span>
                       </button>
                    </label>
                    <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700" value={newTransaction.category} onChange={e => {
                      const category = e.target.value;
                      const isEx = category === 'Permuta';
                      setNewTransaction({
                        ...newTransaction, 
                        category,
                        isExchange: isEx ? true : newTransaction.isExchange,
                        type: isEx ? 'income' : newTransaction.type,
                        paymentMethod: isEx ? 'Permuta' : newTransaction.paymentMethod
                      });
                    }}>
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

                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status do Pagamento</label>
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <button 
                          type="button" 
                          onClick={() => setNewTransaction({...newTransaction, status: 'paid'})} 
                          className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newTransaction.status !== 'pending' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Pago / Recebido
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setNewTransaction({...newTransaction, status: 'pending'})} 
                          className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newTransaction.status === 'pending' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Pendente (Boleto/Conta)
                        </button>
                      </div>
                   </div>

                   {!editingTransactionId && (
                     <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lançamento Parcelado / Recorrente</label>
                           {installments > 1 && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded-md">Ativado</span>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Qtd. Parcelas</label>
                              <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                                 <button type="button" onClick={() => {
                                    const next = Math.max(1, installments - 1);
                                    setInstallments(next);
                                    if (newTransaction.amount) {
                                       setInstallmentAmount(Number((Number(newTransaction.amount) / next).toFixed(2)));
                                    }
                                 }} className="p-3 text-gray-400 hover:bg-gray-50 transition-colors"><Trash2 size={14} /></button>
                                 <input 
                                    type="number" 
                                    className="w-full text-center font-black text-gray-700 outline-none p-2" 
                                    value={installments} 
                                    onChange={e => {
                                       const count = parseInt(e.target.value) || 1;
                                       setInstallments(count);
                                       if (newTransaction.amount) {
                                          setInstallmentAmount(Number((Number(newTransaction.amount) / count).toFixed(2)));
                                       }
                                    }} 
                                 />
                                 <button type="button" onClick={() => {
                                    const next = installments + 1;
                                    setInstallments(next);
                                    if (newTransaction.amount) {
                                       setInstallmentAmount(Number((Number(newTransaction.amount) / next).toFixed(2)));
                                    }
                                 }} className="p-3 text-gray-400 hover:bg-gray-50 transition-colors"><Plus size={14} /></button>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor da Parcela (R$)</label>
                              <input 
                                 type="number"
                                 step="0.01"
                                 className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-gray-700 text-center"
                                 value={installmentAmount}
                                 onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setInstallmentAmount(val);
                                    setNewTransaction({ ...newTransaction, amount: Number((val * installments).toFixed(2)) });
                                 }}
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Frequência</label>
                              <select 
                                 className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-gray-600 text-xs text-center"
                                 value={frequency}
                                 onChange={e => setFrequency(e.target.value as any)}
                              >
                                 <option value="weekly">Semanalmente</option>
                                 <option value="monthly">Mensalmente</option>
                                 <option value="yearly">Anualmente</option>
                              </select>
                           </div>
                        </div>
                        <p className="text-[9px] text-gray-400 italic text-center px-4">
                           {installments > 1 
                             ? `Serão gerados ${installments} lançamentos de R$ ${Number(installmentAmount).toFixed(2)} cada.`
                             : 'Para lançamentos simples, mantenha "1" parcela.'}
                        </p>
                     </div>
                   )}

                   <div className="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <input 
                        type="checkbox" 
                        id="isExchange"
                        className="w-5 h-5 rounded border-gray-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                        checked={newTransaction.isExchange || false}
                        onChange={e => {
                          const isChecked = e.target.checked;
                          setNewTransaction({
                            ...newTransaction, 
                            isExchange: isChecked,
                            type: isChecked ? 'income' : newTransaction.type,
                            category: isChecked ? 'Permuta' : (newTransaction.category === 'Permuta' ? 'Geral' : newTransaction.category),
                            paymentMethod: isChecked ? 'Permuta' : (newTransaction.paymentMethod === 'Permuta' ? 'Dinheiro' : newTransaction.paymentMethod)
                          });
                        }}
                      />
                      <label htmlFor="isExchange" className="text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer flex-1">
                        Esta movimentação é uma <span className="text-pink-500">Permuta / Troca</span>
                      </label>
                   </div>
                </div>

               <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setShowForm(false); setEditingTransactionId(null); }} className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                  <button type="submit" className={`flex-1 px-6 py-4 text-white font-black rounded-2xl transition-all shadow-lg ${newTransaction.type === 'income' ? 'bg-green-500 hover:bg-green-600 shadow-green-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'}`}>
                    {editingTransactionId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </button>
               </div>
            </form>
           </div>
          </div>
        </div>
      )}
      {/* MODAL PAGAMENTO PARCIAL */}
      {showPartialModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/10 z-[60] animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" 
            onClick={() => { setShowPartialModal(false); setSelectedTransaction(null); }}
          ></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden z-10 animate-scaleIn my-4">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-500"></div>
            <button 
              onClick={() => { setShowPartialModal(false); setSelectedTransaction(null); }} 
              className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-yellow-50 text-yellow-500">
                <PieChart size={24} />
              </div>
              Recebimento Parcial
            </h3>
            
            <form onSubmit={handlePartialPaymentSubmit} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pendente Original</p>
                <div className="flex justify-between items-end">
                  <p className="text-xl font-black text-gray-800">{selectedTransaction.description}</p>
                  <p className="text-xl font-black text-red-500">R$ {selectedTransaction.amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Recebido Agora (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="number" 
                    step="0.01" 
                    autoFocus
                    required 
                    className="w-full p-4 pl-12 bg-white border border-gray-200 rounded-2xl outline-none font-black text-blue-600 focus:ring-4 focus:ring-blue-50 transition-all"
                    placeholder="0.00"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                {partialAmount && Number(partialAmount) > 0 && (
                  <p className="text-[10px] font-bold text-gray-400 italic px-1 mt-1">
                    Restará R$ {(selectedTransaction.amount - Number(partialAmount)).toFixed(2)} pendente.
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowPartialModal(false); setSelectedTransaction(null); }}
                  className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all font-['Quicksand']"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-yellow-100 uppercase tracking-widest text-xs font-['Quicksand']"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
