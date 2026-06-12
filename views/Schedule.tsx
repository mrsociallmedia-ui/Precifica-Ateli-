
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Trash2, Gift, MousePointer2, PlayCircle, CheckCircle, AlertTriangle, X, Hash, DollarSign, Edit3, ChevronDown, ChevronUp, MessageCircle, RefreshCw, LayoutGrid, List, ExternalLink, Printer } from 'lucide-react';
import { Project, Customer, Material, Platform, CompanyData, Transaction } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface ScheduleProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
  currentUser: string;
  onEditProject: (project: Project) => void;
}

export const Schedule: React.FC<ScheduleProps> = ({ 
  projects, setProjects, transactions, setTransactions, customers, materials, platforms, companyData, currentUser, onEditProject
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);
  const [showBoletosModal, setShowBoletosModal] = useState(false);
  const [minimizedProjects, setMinimizedProjects] = useState<Set<string>>(new Set());
  const [paymentModal, setPaymentModal] = useState<{ 
    isOpen: boolean; 
    projectId: string; 
    amount: number; 
    maxAmount: number; 
    theme: string;
    paymentMethod: string;
    date: string;
    isExchange?: boolean;
  } | null>(null);

  const [paymentModalWidth, setPaymentModalWidth] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('payment_modal_width') as 'sm' | 'md' | 'lg') || 'sm';
  });

  const handleSetModalWidth = (size: 'sm' | 'md' | 'lg') => {
    setPaymentModalWidth(size);
    localStorage.setItem('payment_modal_width', size);
  };

  const toggleMinimize = (projectId: string) => {
    setMinimizedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleOpenPaymentModal = (project: Project) => {
    const breakdown = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
    if (breakdown.remainingBalance <= 0) {
      alert('Este pedido já está totalmente pago!');
      return;
    }
    setPaymentModal({
      isOpen: true,
      projectId: project.id,
      amount: breakdown.remainingBalance,
      maxAmount: breakdown.remainingBalance,
      theme: project.theme,
      paymentMethod: 'Pix',
      date: new Date().toISOString().split('T')[0],
      isExchange: project.isExchange || false
    });
  };

  const handleConfirmPayment = () => {
    if (!paymentModal || paymentModal.amount <= 0) return;

    const newTransaction: Transaction = {
      id: `payment_${Date.now()}_${paymentModal.projectId}`,
      description: `Pagamento: ${paymentModal.theme}`,
      amount: paymentModal.amount,
      type: paymentModal.isExchange ? 'expense' : 'income',
      category: paymentModal.isExchange ? 'Permuta' : 'Venda',
      paymentMethod: paymentModal.paymentMethod,
      date: paymentModal.date,
      isExchange: !!paymentModal.isExchange,
      customerId: projects.find(p => p.id === paymentModal.projectId)?.customerId
    };

    setTransactions(prev => [newTransaction, ...prev]);
    
    const isFullyPaid = Math.abs(paymentModal.amount - paymentModal.maxAmount) < 0.01;

    if (isFullyPaid) {
       const project = projects.find(p => p.id === paymentModal.projectId);
       const paidDate = new Date().toISOString();
       
       if (project) {
           setProjects(prev => prev.map(p => {
               if (p.id === paymentModal.projectId) {
                   return {
                       ...p,
                       paidAt: paidDate
                   };
               }
               return p;
           }));
       }
    }
    
    alert('Pagamento registrado com sucesso!');
    setPaymentModal(null);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja realmente excluir esta pendênica financeira?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      alert('Pendência excluída com sucesso!');
    }
  };

  const updateStatus = (id: string, newStatus: Project['status']) => {
    const projectToUpdate = projects.find(p => p.id === id);
    let paidAt = projectToUpdate?.paidAt;
    
    // Se o status mudar para 'completed', gera automaticamente a transação do SALDO RESTANTE
    if (projectToUpdate && newStatus === 'completed' && projectToUpdate.status !== 'completed') {
      const breakdown = calculateProjectBreakdown(projectToUpdate, materials, platforms, companyData, transactions);
      
      if (breakdown.remainingBalance > 0) {
        const newTransaction: Transaction = {
          id: `auto_final_${Date.now()}_${id}`,
          description: `Saldo Final: ${projectToUpdate.theme}${projectToUpdate.quoteNumber ? ` (#${projectToUpdate.quoteNumber})` : ''}`,
          amount: breakdown.remainingBalance, // Agora lança apenas o que falta (venda - sinal)
          type: projectToUpdate.isExchange ? 'expense' : 'income',
          category: projectToUpdate.isExchange ? 'Permuta' : 'Venda',
          paymentMethod: 'Pix',
          date: new Date().toISOString().split('T')[0],
          isExchange: !!projectToUpdate.isExchange,
          customerId: projectToUpdate.customerId
        };
  
        setTransactions(prev => [newTransaction, ...prev]);
        paidAt = new Date().toISOString();
      } else if (!paidAt) {
        // Se já estava pago mas não tinha data, assume hoje ao finalizar
        paidAt = new Date().toISOString();
      }
    }

    setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus, paidAt: paidAt || p.paidAt } : p));
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Cliente Avulso';

  const statusLabels = {
    pending: 'Aguardando',
    approved: 'Aprovado',
    in_progress: 'Produzindo',
    pending_payment: 'Pag. Pendente',
    completed: 'Finalizado',
    delayed: 'Atrasado',
  };

  const statusColors = {
    pending: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    approved: 'border-blue-200 bg-blue-50 text-blue-700',
    in_progress: 'border-purple-200 bg-purple-50 text-purple-700',
    pending_payment: 'border-orange-200 bg-orange-50 text-orange-700',
    completed: 'border-green-200 bg-green-50 text-green-700',
    delayed: 'border-red-200 bg-red-50 text-red-700',
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  // Helper to get current week start (Monday) and end (Sunday) dates
  const getCurrentWeekRange = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const [printStartDate, setPrintStartDate] = useState<string>(() => {
    const { start } = getCurrentWeekRange();
    return start;
  });
  const [printEndDate, setPrintEndDate] = useState<string>(() => {
    const { end } = getCurrentWeekRange();
    return end;
  });
  const [filterPrintByDate, setFilterPrintByDate] = useState<boolean>(true);

  const monthlyBirthdays = useMemo(() => {
    return customers.filter(c => {
      if (!c.birthDate) return false;
      const [_, month] = c.birthDate.split('-').map(Number);
      return month === currentMonth;
    }).sort((a, b) => {
      const dayA = parseInt(a.birthDate.split('-')[2]);
      const dayB = parseInt(b.birthDate.split('-')[2]);
      return dayA - dayB;
    });
  }, [customers, currentMonth]);

  const upcomingBoletos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return transactions.filter(t => {
      if (t.status !== 'pending') return false;
      
      const dueDate = new Date(t.date + 'T12:00:00');
      // Filtra boletos vencidos ou que vencem nos próximos 7 dias
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays <= 7;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const handleCopyTrackingLink = (project: Project) => {
    const url = `${window.location.origin}${window.location.pathname}?track=${project.id}&u=${encodeURIComponent(currentUser || '')}`;
    navigator.clipboard.writeText(url);
    alert('✅ Link de acompanhamento copiado com sucesso!');
  };

  const handleShareWhatsApp = (project: Project) => {
    const url = `${window.location.origin}${window.location.pathname}?track=${project.id}&u=${encodeURIComponent(currentUser || '')}`;
    const customer = customers.find(c => c.id === project.customerId);
    const message = encodeURIComponent(`Olá ${customer?.name || ''}! Preparei um link especial para você acompanhar a produção do seu pedido: ${url}`);
    
    if (customer?.phone) {
      window.open(`https://wa.me/55${customer.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado! (Cliente sem telefone cadastrado)');
    }
  };

  const handlePrintApproved = () => {
    let approvedProjects = projects.filter(p => p.status === 'approved');
    
    if (filterPrintByDate && printStartDate && printEndDate) {
      approvedProjects = approvedProjects.filter(project => {
        if (!project.deliveryDate) return false;
        return project.deliveryDate >= printStartDate && project.deliveryDate <= printEndDate;
      });
    }

    if (approvedProjects.length === 0) {
      if (filterPrintByDate && printStartDate && printEndDate) {
        const startFormatted = new Date(printStartDate + 'T12:00:00').toLocaleDateString('pt-BR');
        const endFormatted = new Date(printEndDate + 'T12:00:00').toLocaleDateString('pt-BR');
        alert(`Não há pedidos aprovados com entrega no período selecionado (${startFormatted} a ${endFormatted})!`);
      } else {
        alert('Não há pedidos aprovados para imprimir no momento!');
      }
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, ative a exibição de pop-ups neste navegador para imprimir.');
      return;
    }

    const rows = approvedProjects.map(project => {
      const { finalPrice, remainingBalance } = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
      const customer = customers.find(c => c.id === project.customerId);
      const customerName = customer?.name || 'Cliente Avulso';
      const customerPhone = customer?.phone || '';
      const formattedDeliveryDate = project.deliveryDate ? new Date(project.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A combinar';
      
      const cakeDetails = project.isCakeTopper && (project.celebrantName || project.celebrantAge || project.cakeSize)
        ? `<div class="cake-badge">🎂 ${project.celebrantName || ''} ${project.celebrantAge ? `(${project.celebrantAge} anos)` : ''} ${project.cakeSize ? `• Bolo: ${project.cakeSize}` : ''}</div>`
        : '';

      const itemsList = project.items?.map(item => `
        <div class="item-line">
          <span class="item-qty">${item.quantity}x</span>
          <span class="item-name">${item.name}</span>
        </div>
      `).join('') || '<span style="color: #a0aec0; font-size: 10px;">Sem itens</span>';

      const obsHtml = project.observations 
        ? `<div class="observation-text"><strong>Obs:</strong> ${project.observations}</div>` 
        : '';

      const balanceStatus = remainingBalance > 0 
        ? `<span class="balance-text balance-pending">Falta R$ ${remainingBalance.toFixed(2)}</span>` 
        : `<span class="balance-text balance-paid">Pago</span>`;

      return `
        <tr>
          <td>
            <span class="quote-num">#${project.quoteNumber || 'S/N'}</span>
          </td>
          <td>
            <div class="client-name">${customerName}</div>
            ${customerPhone ? `<span class="client-phone">${customerPhone}</span>` : ''}
          </td>
          <td>
            <div class="theme-title">${project.theme}</div>
            <span class="${project.deliveryDate ? 'delivery-date' : 'delivery-normal'}">Entrega: ${formattedDeliveryDate}</span>
            ${cakeDetails}
            ${obsHtml}
          </td>
          <td>
            ${itemsList}
          </td>
          <td style="text-align: right;">
            <div class="price-text">R$ ${finalPrice.toFixed(2)}</div>
            ${balanceStatus}
            ${project.isExchange ? '<span class="exchange-badge">Permuta</span>' : ''}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Resumo de Pedidos Aprovados - Cronograma</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 15px; margin: 0; color: #1a202c; background: #fff; line-height: 1.25; font-size: 11px; }
            
            .header-main { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #edf2f7; padding-bottom: 8px; margin-bottom: 12px; }
            .company-name { font-size: 16px; font-weight: 900; color: #2d3748; text-transform: uppercase; margin: 0; }
            .report-title { font-size: 12px; font-weight: 700; color: #3b82f6; text-transform: uppercase; margin: 0; }
            .report-date { font-size: 8px; color: #718096; margin-top: 2px; text-align: right; }

            .summary-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .summary-table th { font-size: 9px; font-weight: 900; color: #4a5568; padding: 6px 8px; border-bottom: 2px solid #cbd5e0; text-transform: uppercase; background: #f7fafc; text-align: left; }
            .summary-table td { padding: 6px 8px; border-bottom: 1px solid #edf2f7; vertical-align: top; font-size: 10.5px; line-height: 1.35; }

            .quote-num { font-weight: 800; color: #2b6cb0; font-family: monospace; font-size: 11px; background: #ebf8ff; padding: 2px 5px; border-radius: 4px; display: inline-block; }
            .client-name { font-weight: 700; color: #2d3748; }
            .client-phone { font-size: 9px; color: #718096; display: block; margin-top: 1px; }
            .theme-title { font-weight: 700; color: #1a202c; font-size: 11px; }
            .delivery-date { font-size: 9.5px; font-weight: 800; color: #e53e3e; margin-top: 2px; display: block; }
            .delivery-normal { font-size: 9px; color: #4a5568; margin-top: 2px; display: block; }

            .cake-badge { background: #fffaf0; border: 1px solid #feebc8; border-radius: 4px; padding: 2px 5px; font-size: 9px; color: #c05621; margin-top: 3px; display: inline-block; font-weight: 600; }
            .item-line { display: flex; align-items: center; gap: 4px; font-size: 9.5px; margin-bottom: 2px; }
            .item-qty { font-weight: 800; color: #2d3748; background: #edf2f7; padding: 0px 4px; border-radius: 3px; min-width: 16px; text-align: center; font-size: 9px; }
            .item-name { color: #4a5568; }

            .price-text { font-weight: 700; color: #2d3748; font-size: 11px; }
            .balance-text { font-size: 9px; font-weight: 700; display: block; margin-top: 1px; }
            .balance-pending { color: #dd6b20; }
            .balance-paid { color: #38a169; }
            .exchange-badge { font-size: 8px; font-weight: 800; background: #fdf2f8; color: #db2777; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; border: 1px solid #fbcfe8; display: inline-block; margin-top: 3px; }

            .observation-text { font-size: 8.5px; color: #718096; margin-top: 4px; line-height: 1.25; font-style: italic; border-left: 2px solid #cbd5e0; padding-left: 5px; max-width: 260px; }

            @media print {
              body { padding: 0; }
              .summary-table th { background: #f7fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header-main">
            <div>
              <h1 class="company-name">${companyData.name || 'Precifica Ateliê'}</h1>
              <div class="report-title">Resumo de Produção - Pedidos Aprovados</div>
              ${filterPrintByDate && printStartDate && printEndDate ? `
                <div style="font-size: 10px; color: #4a5568; margin-top: 4px; font-weight: 600;">
                  Período de Entrega: ${new Date(printStartDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(printEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
              ` : `
                <div style="font-size: 10px; color: #4a5568; margin-top: 4px; font-weight: 600;">
                  Todos os pedidos sem filtro de período
                </div>
              `}
            </div>
            <div class="report-date">
              Gerado em ${new Date().toLocaleString('pt-BR')}<br>
              Total de Pedidos: <strong>${approvedProjects.length}</strong>
            </div>
          </div>
          
          <table class="summary-table">
            <thead>
              <tr>
                <th style="width: 10%;">ID/Pedido</th>
                <th style="width: 22%;">Cliente</th>
                <th style="width: 33%;">Tema / Detalhes</th>
                <th style="width: 22%;">Itens de Produção</th>
                <th style="width: 13%; text-align: right;">Valores</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Cronograma <span className="text-blue-500">& Produção</span></h2>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <p className="text-gray-400 font-medium">Acompanhe seus prazos e etapas do pedido.</p>
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
               <button 
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Vista Kanban"
               >
                  <LayoutGrid size={16} />
               </button>
               <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Vista em Lista"
               >
                  <List size={16} />
               </button>
            </div>
            {projects.filter(p => p.status === 'approved').length > 0 && (
               <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200/60 p-2.5 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2">
                     <CalendarIcon size={14} className="text-slate-500" />
                     <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Mapear Produção:</span>
                  </div>
                  
                  {/* Toggle para usar ou não o filtro */}
                  <button
                     onClick={() => setFilterPrintByDate(!filterPrintByDate)}
                     className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${filterPrintByDate ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}
                  >
                     {filterPrintByDate ? "Filtrar por Período" : "Todos Aprovados"}
                  </button>

                  {filterPrintByDate && (
                     <>
                        <div className="flex items-center gap-1.5">
                           <input 
                              type="date" 
                              value={printStartDate} 
                              onChange={(e) => setPrintStartDate(e.target.value)} 
                              className="bg-white border border-gray-200 rounded-lg p-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 font-sans"
                           />
                           <span className="text-gray-400 text-[10px] font-bold">até</span>
                           <input 
                              type="date" 
                              value={printEndDate} 
                              onChange={(e) => setPrintEndDate(e.target.value)} 
                              className="bg-white border border-gray-200 rounded-lg p-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 font-sans"
                           />
                        </div>

                        {/* Quick Selection Buttons */}
                        <div className="flex gap-1">
                           <button
                              type="button"
                              onClick={() => {
                                 const { start, end } = getCurrentWeekRange();
                                 setPrintStartDate(start);
                                 setPrintEndDate(end);
                                 setFilterPrintByDate(true);
                              }}
                              className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                           >
                              Esta Semana
                           </button>
                           <button
                              type="button"
                              onClick={() => {
                                 const today = new Date();
                                 const currentDay = today.getDay();
                                 const distanceToNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
                                 
                                 const nextMonday = new Date(today);
                                 nextMonday.setDate(today.getDate() + distanceToNextMonday);
                                 nextMonday.setHours(0,0,0,0);
                                 
                                 const nextSunday = new Date(nextMonday);
                                 nextSunday.setDate(nextMonday.getDate() + 6);
                                 nextSunday.setHours(23,59,59,999);
                                 
                                 setPrintStartDate(nextMonday.toISOString().split('T')[0]);
                                 setPrintEndDate(nextSunday.toISOString().split('T')[0]);
                                 setFilterPrintByDate(true);
                              }}
                              className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                           >
                              Próx. Semana
                           </button>
                        </div>
                     </>
                  )}

                  <button 
                     onClick={handlePrintApproved}
                     className="py-1.5 px-3.5 bg-blue-500 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                     title="Imprimir Pedidos Aprovados Selecionados"
                  >
                     <Printer size={12} className="stroke-[3px]" /> Imprimir
                  </button>
               </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Widget de Boletos Vencendo */}
          <button 
            onClick={() => upcomingBoletos.length > 0 && setShowBoletosModal(true)}
            className={`bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex items-center gap-6 min-w-[280px] shadow-sm transition-all text-left ${upcomingBoletos.length > 0 ? 'hover:shadow-md hover:scale-105' : 'cursor-default opacity-80'}`}
          >
             <div className={`p-4 bg-orange-500 text-white rounded-2xl shadow-lg ${upcomingBoletos.length > 0 ? 'animate-pulse' : ''}`}>
                <AlertTriangle size={24} />
             </div>
             <div>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Boletos / Pendentes</p>
                {upcomingBoletos.length > 0 ? (
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      {upcomingBoletos.length} {upcomingBoletos.length === 1 ? 'pendência encontrada' : 'pendências encontradas'}
                    </p>
                    <p className="text-[10px] font-black text-orange-500 uppercase mt-0.5">Clique para ver prazos</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-gray-400">Tudo em dia! ✅</p>
                )}
             </div>
          </button>

          {/* Widget de Aniversariantes Inteligente */}
          <button 
            onClick={() => monthlyBirthdays.length > 0 && setShowBirthdaysModal(true)}
            className={`bg-pink-50 p-6 rounded-[2rem] border border-pink-100 flex items-center gap-6 min-w-[280px] shadow-sm transition-all text-left ${monthlyBirthdays.length > 0 ? 'hover:shadow-md hover:scale-105' : 'cursor-default opacity-80'}`}
          >
           <div className={`p-4 bg-pink-500 text-white rounded-2xl shadow-lg ${monthlyBirthdays.length > 0 ? 'animate-bounce' : ''}`}>
              <Gift size={24} />
           </div>
           <div>
              <p className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em]">Aniversariantes de {currentMonthName}</p>
              {monthlyBirthdays.length > 0 ? (
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {monthlyBirthdays[0].name} (Dia {monthlyBirthdays[0].birthDate.split('-')[2]})
                  </p>
                  {monthlyBirthdays.length > 1 && (
                    <p className="text-[10px] font-black text-pink-500 uppercase mt-0.5">+ {monthlyBirthdays.length - 1} outros (Ver Todos)</p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-400">Ninguém este mês🎈</p>
              )}
           </div>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 xl:grid xl:grid-cols-5 xl:overflow-visible">
          {(['pending', 'approved', 'in_progress', 'pending_payment', 'completed'] as const).map(status => (
            <div key={status} className="flex flex-col gap-6 min-w-[280px] flex-shrink-0 xl:min-w-0">
              <div className={`flex items-center justify-between px-6 py-4 rounded-3xl border ${statusColors[status]} shadow-sm`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-black uppercase text-[10px] tracking-[0.15em]">{statusLabels[status]}</h3>
                  {status === 'approved' && projects.filter(p => p.status === 'approved').length > 0 && (
                    <button
                      onClick={handlePrintApproved}
                      className="p-1 px-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 shadow-xs border border-blue-200"
                      title="Imprimir todos os pedidos aprovados"
                    >
                      <Printer size={10} className="stroke-[3px]" />
                      <span className="text-[8px] font-black uppercase tracking-wider">Imprimir</span>
                    </button>
                  )}
                </div>
                <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                  {projects.filter(p => p.status === status).length}
                </span>
              </div>
              
              <div className="space-y-6 min-h-[400px]">
                {projects.filter(p => p.status === status).map(project => {
                  const { finalPrice, remainingBalance } = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
                  const isMinimized = minimizedProjects.has(project.id);
                  
                  return (
                    <div key={project.id} className={`bg-white rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col ${isMinimized ? 'p-4' : 'p-6'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {project.quoteNumber && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                               <Hash size={8} /> {project.quoteNumber}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => toggleMinimize(project.id)}
                          className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                        >
                          {isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                      <h4 className="font-black text-gray-800 text-base mb-1 truncate">{project.theme}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] text-pink-500 font-black uppercase tracking-widest truncate">{getCustomerName(project.customerId)}</p>
                        {project.isExchange && (
                          <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-[8px] font-black uppercase rounded-md flex items-center gap-1">
                            <RefreshCw size={8} /> Permuta
                          </span>
                        )}
                      </div>
                      
                      {!isMinimized && (
                        <>
                          {project.isCakeTopper && (
                            <div className="flex flex-col gap-2 mb-2">
                              {(project.celebrantName || project.celebrantAge) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-lg uppercase tracking-widest flex items-center gap-1">
                                    🎂 {project.celebrantName} {project.celebrantAge && `(${project.celebrantAge})`}
                                  </span>
                                </div>
                              )}
                              {project.cakeSize && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg uppercase tracking-widest flex items-center gap-1">
                                    📏 Bolo: {project.cakeSize}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
  
                      {project.observations && (
                        <p className="text-[10px] text-gray-400 font-medium mb-2 line-clamp-2 italic bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                          {project.observations}
                        </p>
                      )}
  
                      <div className="mb-4 flex flex-wrap gap-1">
                        {project.items?.map((item, idx) => (
                          <span key={idx} className="text-[8px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md border border-blue-100/50">
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 mb-6">
                        <div className="bg-gray-50/50 p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-500">
                          <Clock size={12} className="text-blue-400" /> {project.items?.reduce((acc, i) => acc + (i.hoursToMake * i.quantity), 0).toFixed(1)}h prod.
                        </div>
                        <div className="bg-gray-50/50 p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-500">
                          <CalendarIcon size={12} className="text-gray-400" /> 
                          <span className="text-[9px] uppercase tracking-widest text-gray-400">Pedido:</span>
                          {project.orderDate ? new Date(project.orderDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : new Date(project.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="bg-gray-50/50 p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-500">
                          <CalendarIcon size={12} className="text-pink-400" /> 
                          <span className="text-[9px] uppercase tracking-widest text-gray-400">Entrega:</span>
                          {project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A combinar'}
                        </div>
                      </div>
                      </>
                      )}
  
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-dashed border-gray-100">
                         <span className="text-[9px] font-black text-gray-300 uppercase">Valor Total</span>
                         <span className="text-sm font-black text-blue-600">R$ {finalPrice.toFixed(2)}</span>
                      </div>
  
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-gray-100">
                         <span className="text-[9px] font-black text-gray-300 uppercase">
                           {remainingBalance > 0 ? 'A Receber' : 'Status Pagamento'}
                         </span>
                         {remainingBalance > 0 ? (
                           <span className="text-sm font-black text-red-500">
                             R$ {remainingBalance.toFixed(2)}
                           </span>
                         ) : (
                           <div className="text-right leading-tight">
                             <span className="text-sm font-black text-green-500 block">PAGO</span>
                             {project.paidAt && (
                               <span className="text-[9px] font-bold text-gray-400 uppercase block">
                                 em {new Date(project.paidAt).toLocaleDateString('pt-BR')}
                               </span>
                             )}
                           </div>
                         )}
                      </div>
  
                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={() => handleCopyTrackingLink(project)}
                          className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                          title="Copiar Link"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => handleShareWhatsApp(project)}
                          className="p-3 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-2xl transition-all"
                          title="Enviar via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button 
                          onClick={() => onEditProject(project)}
                          className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                          title="Editar Pedido"
                        >
                          <Edit3 size={14} />
                        </button>
                        {remainingBalance > 0 && (
                          <button 
                            onClick={() => handleOpenPaymentModal(project)}
                            className="p-3 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-2xl transition-all"
                            title="Receber Pagamento"
                          >
                            <DollarSign size={14} />
                          </button>
                        )}
                        {status !== 'completed' && (
                          <button 
                            onClick={() => {
                              const next: Record<string, Project['status']> = {
                                pending: 'approved',
                                approved: 'in_progress',
                                in_progress: 'pending_payment',
                                pending_payment: 'completed'
                              };
                              updateStatus(project.id, next[status]);
                            }}
                            className="flex-1 py-3 bg-blue-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-1"
                          >
                            Avançar
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if(confirm('Excluir este pedido?')) {
                               setProjects(projects.filter(p => p.id !== project.id));
                            }
                          }}
                          className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                       <th className="px-8 py-6">Status</th>
                       <th className="px-8 py-6">Pedido / Tema</th>
                       <th className="px-8 py-6">Cliente</th>
                       <th className="px-8 py-6">Data Entrega</th>
                       <th className="px-8 py-6 text-right">Valor Total</th>
                       <th className="px-8 py-6 text-right">A Receber</th>
                       <th className="px-8 py-6 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {projects.sort((a, b) => {
                       if (!a.deliveryDate) return 1;
                       if (!b.deliveryDate) return -1;
                       return a.deliveryDate.localeCompare(b.deliveryDate);
                    }).map(project => {
                       const { finalPrice, remainingBalance } = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
                       return (
                          <tr key={project.id} className="hover:bg-gray-50/50 transition-colors group">
                             <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm ${statusColors[project.status]}`}>
                                   {statusLabels[project.status]}
                                </span>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex flex-col">
                                   <div className="flex items-center gap-2">
                                      <span className="font-black text-gray-800">{project.theme}</span>
                                      {project.quoteNumber && <span className="text-[8px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">#{project.quoteNumber}</span>}
                                   </div>
                                   <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                      {project.items?.length || 0} itens • {project.items?.reduce((acc, i) => acc + (i.hoursToMake * i.quantity), 0).toFixed(1)}h
                                   </span>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{getCustomerName(project.customerId)}</span>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                   <CalendarIcon size={14} className="text-pink-400" />
                                   <span className="text-[10px] font-bold text-gray-600">
                                      {project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A combinar'}
                                   </span>
                                </div>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <span className="text-sm font-black text-gray-800">R$ {finalPrice.toFixed(2)}</span>
                             </td>
                             <td className="px-8 py-5 text-right font-black">
                                {remainingBalance > 0 ? (
                                   <span className="text-red-500 text-sm">R$ {remainingBalance.toFixed(2)}</span>
                                ) : (
                                   <span className="text-green-500 text-[10px] uppercase">PAGO</span>
                                )}
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex items-center justify-end gap-2">
                                   <button 
                                      onClick={() => handleCopyTrackingLink(project)}
                                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Copiar Link"
                                   >
                                      <ExternalLink size={14} />
                                   </button>
                                   <button 
                                      onClick={() => handleShareWhatsApp(project)}
                                      className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"
                                      title="Enviar via WhatsApp"
                                   >
                                      <MessageCircle size={14} />
                                   </button>
                                   <button 
                                      onClick={() => onEditProject(project)}
                                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                   >
                                      <Edit3 size={14} />
                                   </button>
                                   <button 
                                      onClick={() => {
                                         if(confirm('Excluir este pedido?')) {
                                            setProjects(projects.filter(p => p.id !== project.id));
                                         }
                                      }}
                                      className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Modal Boletos */}
      {showBoletosModal && (
        <div className="fixed inset-0 bg-black/10 z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" 
            onClick={() => setShowBoletosModal(false)}
          ></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10 animate-scaleIn my-4">
            <div className="bg-orange-500 p-8 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">Pendência Financeiras</h3>
                <p className="text-orange-100 font-bold text-xs uppercase tracking-widest">Próximos 7 dias ou Vencidos</p>
              </div>
              <button onClick={() => setShowBoletosModal(false)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {upcomingBoletos.length > 0 ? upcomingBoletos.map(t => {
                const isOverdue = new Date(t.date + 'T12:00:00') < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div key={t.id} className={`flex items-center justify-between p-5 rounded-2xl border ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isOverdue ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                          {isOverdue ? 'Vencido' : 'Pendente'}
                        </span>
                        <span className="text-[10px] font-black text-gray-400">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="font-black text-gray-800 leading-tight">{t.description}</p>
                      {t.customerId && (
                        <p className="text-[9px] font-bold text-pink-500 uppercase mt-1">{getCustomerName(t.customerId)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-4 shrink-0">
                      <div className="text-right">
                        <p className="text-base font-black text-gray-800">R$ {t.amount.toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">{t.paymentMethod}</p>
                        {isOverdue && (
                          <p className="text-[8px] font-black text-red-500 uppercase mt-1">Vencido em {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleDeleteTransaction(t.id)} 
                        className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                        title="Excluir pendência"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-bold">Nenhum boleto vencendo em breve! ✨</p>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-gray-100 bg-white">
               <button onClick={() => setShowBoletosModal(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aniversariantes */}
      {showBirthdaysModal && (
        <div className="fixed inset-0 bg-black/10 z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" 
            onClick={() => setShowBirthdaysModal(false)}
          ></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10 animate-scaleIn my-4">
            <div className="bg-pink-500 p-8 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">Aniversariantes</h3>
                <p className="text-pink-100 font-bold text-xs uppercase tracking-widest">{currentMonthName}</p>
              </div>
              <button onClick={() => setShowBirthdaysModal(false)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {monthlyBirthdays.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-black">
                         {c.birthDate.split('-')[2]}
                      </div>
                      <div>
                         <p className="font-black text-gray-800">{c.name}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase">{c.phone}</p>
                      </div>
                   </div>
                   {c.phone && (
                     <button 
                       onClick={() => {
                         const cleanPhone = c.phone.replace(/\D/g, '');
                         const message = encodeURIComponent(`Olá ${c.name}! Nós do ${companyData.name} passamos para te desejar um feliz aniversário! Muita saúde, paz e alegria no seu dia! 🎈🎂`);
                         window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                       }}
                       className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                       title="Enviar Mensagem de Aniversário"
                     >
                       <MessageCircle size={14} /> Mensagem
                     </button>
                   )}
                </div>
              ))}
            </div>
            <div className="p-8 border-t border-gray-100 bg-white">
               <button onClick={() => setShowBirthdaysModal(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {paymentModal && paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black/10 z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" 
            onClick={() => setPaymentModal(null)}
          ></div>
          <div className={`bg-white w-full ${
            paymentModalWidth === 'sm' ? 'max-w-[320px]' : paymentModalWidth === 'lg' ? 'max-w-[420px]' : 'max-w-[360px]'
          } rounded-[2.2rem] shadow-2xl relative overflow-hidden z-10 flex flex-col animate-scaleIn my-4`}>
            <div className="bg-green-500 p-6 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black">Receber Pagamento</h3>
                <p className="text-green-100 font-bold text-[9px] uppercase tracking-widest truncate max-w-[190px]">{paymentModal.theme}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Data do Recebimento</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700 text-xs"
                    value={paymentModal.date}
                    onChange={(e) => setPaymentModal({ ...paymentModal, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Meio de Pagamento</label>
                  <select 
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700 text-xs"
                    value={paymentModal.paymentMethod}
                    onChange={(e) => setPaymentModal({ ...paymentModal, paymentMethod: e.target.value })}
                  >
                    {['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <input 
                  type="checkbox" 
                  id="modalIsExchange"
                  className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                  checked={paymentModal.isExchange || false}
                  onChange={e => setPaymentModal({...paymentModal, isExchange: e.target.checked})}
                />
                <label htmlFor="modalIsExchange" className="text-[9px] font-black text-gray-500 uppercase tracking-widest cursor-pointer flex-1">
                  Este recebimento é uma <span className="text-pink-500">Permuta</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor a Receber</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-black text-sm">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-base text-gray-700 focus:ring-2 focus:ring-green-200 transition-all"
                    value={paymentModal.amount}
                    onChange={(e) => setPaymentModal({ ...paymentModal, amount: parseFloat(e.target.value) || 0 })}
                    max={paymentModal.maxAmount}
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-bold text-right">Máximo Pendente: R$ {paymentModal.maxAmount.toFixed(2)}</p>
              </div>
              
              <button 
                onClick={handleConfirmPayment}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 text-xs"
              >
                <CheckCircle2 size={16} /> Confirmar Recebimento
              </button>


            </div>
          </div>
        </div>
      )}
    </div>
  );
};
