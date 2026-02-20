
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  History,
  ArrowUpDown,
  Hash,
  ShoppingBag
} from 'lucide-react';
import { Project, Customer, Material, Platform, CompanyData } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface OrderHistoryProps {
  projects: Project[];
  customers: Customer[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ 
  projects, customers, materials, platforms, companyData 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Cliente Avulso';

  const statusLabels: Record<string, string> = {
    pending: 'Aguardando',
    approved: 'Aprovado',
    in_progress: 'Produzindo',
    pending_payment: 'Pag. Pendente',
    completed: 'Finalizado',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    pending_payment: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const customerName = getCustomerName(p.customerId).toLowerCase();
      const theme = p.theme.toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = theme.includes(search) || customerName.includes(search);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesDate = (!startDate || p.deliveryDate >= startDate) && (!endDate || p.deliveryDate <= endDate);
      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
  }, [projects, searchTerm, statusFilter, customers, startDate, endDate]);

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const inProgress = projects.filter(p => p.status !== 'completed').length;
    const totalRevenue = projects.reduce((acc, p) => {
      const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData);
      return acc + finalPrice;
    }, 0);

    return { total, completed, inProgress, totalRevenue };
  }, [projects, materials, platforms, companyData]);

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Histórico de <span className="text-pink-500">Pedidos</span></h2>
          <p className="text-gray-400 font-medium">Consulte todos os orçamentos e pedidos realizados.</p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-white p-4 px-6 rounded-3xl border border-pink-50 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-pink-100 text-pink-600 rounded-xl">
                 <ShoppingBag size={20} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total de Pedidos</p>
                 <p className="text-lg font-black text-gray-800 leading-none">{stats.total}</p>
              </div>
           </div>
           <div className="bg-white p-4 px-6 rounded-3xl border border-green-50 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                 <DollarSign size={20} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Volume Total</p>
                 <p className="text-lg font-black text-gray-800 leading-none">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por tema ou cliente..." 
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-pink-200 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-4 rounded-2xl border border-transparent">
          <Calendar className="text-gray-400" size={18} />
          <input 
            type="date" 
            className="bg-transparent py-4 outline-none font-black text-[10px] uppercase tracking-widest text-gray-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-300">-</span>
          <input 
            type="date" 
            className="bg-transparent py-4 outline-none font-black text-[10px] uppercase tracking-widest text-gray-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-4 rounded-2xl border border-transparent">
          <Filter className="text-gray-400" size={18} />
          <select 
            className="bg-transparent py-4 outline-none font-black text-[10px] uppercase tracking-widest text-gray-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Aguardando</option>
            <option value="approved">Aprovado</option>
            <option value="in_progress">Produzindo</option>
            <option value="pending_payment">Pag. Pendente</option>
            <option value="completed">Finalizado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-6">Pedido / Tema</th>
                <th className="px-8 py-6">Cliente</th>
                <th className="px-8 py-6">Data Entrega</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.map(project => {
                const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData);
                return (
                  <tr key={project.id} className="hover:bg-gray-50/50 transition-colors group cursor-default">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-100 text-gray-400 rounded-2xl group-hover:bg-pink-100 group-hover:text-pink-500 transition-colors">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {project.quoteNumber && (
                              <span className="text-[8px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-widest">#{project.quoteNumber}</span>
                            )}
                            <p className="font-black text-gray-800 text-sm">{project.theme}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Criado em {new Date(project.id.startsWith('quote_') ? parseInt(project.id.split('_')[1]) : parseInt(project.id)).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-300" />
                        <span className="text-xs font-bold text-gray-600">{getCustomerName(project.customerId)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-300" />
                        <span className="text-xs font-bold text-gray-600">{new Date(project.deliveryDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-sm font-black text-gray-800">R$ {finalPrice.toFixed(2)}</p>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-gray-50 text-gray-200 rounded-full">
                        <History size={48} />
                      </div>
                      <p className="text-gray-400 font-black uppercase text-xs tracking-widest italic">Nenhum pedido encontrado no histórico.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
