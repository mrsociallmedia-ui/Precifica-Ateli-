
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Trash2, Gift, MousePointer2, PlayCircle, CheckCircle, AlertTriangle, X, Hash, DollarSign } from 'lucide-react';
import { Project, Customer, Material, Platform, CompanyData, Transaction } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface ScheduleProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
}

export const Schedule: React.FC<ScheduleProps> = ({ 
  projects, setProjects, setTransactions, customers, materials, platforms, companyData 
}) => {
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);

  const updateStatus = (id: string, newStatus: Project['status']) => {
    const projectToUpdate = projects.find(p => p.id === id);
    
    // Se o status mudar para 'completed', gera automaticamente a transação do SALDO RESTANTE
    if (projectToUpdate && newStatus === 'completed' && projectToUpdate.status !== 'completed') {
      const breakdown = calculateProjectBreakdown(projectToUpdate, materials, platforms, companyData);
      
      const newTransaction: Transaction = {
        id: `auto_final_${Date.now()}_${id}`,
        description: `Saldo Final: ${projectToUpdate.theme}${projectToUpdate.quoteNumber ? ` (#${projectToUpdate.quoteNumber})` : ''}`,
        amount: breakdown.remainingBalance, // Agora lança apenas o que falta (venda - sinal)
        type: 'income',
        category: 'Venda',
        paymentMethod: 'Pix',
        date: new Date().toISOString().split('T')[0]
      };

      setTransactions(prev => [newTransaction, ...prev]);
    }

    setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Cliente Avulso';

  const statusLabels = {
    pending: 'Aguardando',
    approved: 'Aprovado',
    in_progress: 'Produzindo',
    pending_payment: 'Pag. Pendente',
    completed: 'Finalizado',
  };

  const statusColors = {
    pending: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    approved: 'border-blue-200 bg-blue-50 text-blue-700',
    in_progress: 'border-purple-200 bg-purple-50 text-purple-700',
    pending_payment: 'border-orange-200 bg-orange-50 text-orange-700',
    completed: 'border-green-200 bg-green-50 text-green-700',
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

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

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Cronograma <span className="text-blue-500">& Produção</span></h2>
          <p className="text-gray-400 font-medium">Acompanhe seus prazos e etapas do pedido.</p>
        </div>
        
        {/* Widget de Aniversariantes Inteligente */}
        <button 
          onClick={() => monthlyBirthdays.length > 0 && setShowBirthdaysModal(true)}
          className={`bg-pink-50 p-6 rounded-[2rem] border border-pink-100 flex items-center gap-6 min-w-[300px] shadow-sm transition-all text-left ${monthlyBirthdays.length > 0 ? 'hover:shadow-md hover:scale-105' : 'cursor-default opacity-80'}`}
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

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 xl:grid xl:grid-cols-5 xl:overflow-visible">
        {(['pending', 'approved', 'in_progress', 'pending_payment', 'completed'] as const).map(status => (
          <div key={status} className="flex flex-col gap-6 min-w-[280px] flex-shrink-0 xl:min-w-0">
            <div className={`flex items-center justify-between px-6 py-4 rounded-3xl border ${statusColors[status]} shadow-sm`}>
              <h3 className="font-black uppercase text-[10px] tracking-[0.15em]">{statusLabels[status]}</h3>
              <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                {projects.filter(p => p.status === status).length}
              </span>
            </div>
            
            <div className="space-y-6 min-h-[400px]">
              {projects.filter(p => p.status === status).map(project => {
                const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData);
                return (
                  <div key={project.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      {project.quoteNumber && (
                        <span className="flex items-center gap-0.5 text-[8px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                           <Hash size={8} /> {project.quoteNumber}
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-gray-800 text-base mb-1 truncate">{project.theme}</h4>
                    <p className="text-[10px] text-pink-500 font-black uppercase tracking-widest mb-4 truncate">{getCustomerName(project.customerId)}</p>
                    
                    <div className="grid grid-cols-1 gap-2 mb-6">
                      <div className="bg-gray-50/50 p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <Clock size={12} className="text-blue-400" /> {project.items?.reduce((acc, i) => acc + (i.hoursToMake * i.quantity), 0).toFixed(1)}h prod.
                      </div>
                      <div className="bg-gray-50/50 p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <CalendarIcon size={12} className="text-pink-400" /> {new Date(project.deliveryDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-gray-100">
                       <span className="text-[9px] font-black text-gray-300 uppercase">Valor</span>
                       <span className="text-base font-black text-blue-600">R$ {finalPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2 mt-auto">
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

      {/* Modal Aniversariantes */}
      {showBirthdaysModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden">
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
                </div>
              ))}
            </div>
            <div className="p-8 border-t border-gray-100 bg-white">
               <button onClick={() => setShowBirthdaysModal(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
