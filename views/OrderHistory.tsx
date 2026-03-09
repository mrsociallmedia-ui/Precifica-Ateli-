
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
  ShoppingBag,
  Download
} from 'lucide-react';
import { Project, Customer, Material, Platform, CompanyData, Transaction } from '../types';
import { calculateProjectBreakdown } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderHistoryProps {
  projects: Project[];
  customers: Customer[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
  transactions: Transaction[];
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ 
  projects, customers, materials, platforms, companyData, transactions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Initialize with URL params or current week (Monday to Friday)
  const [startDate, setStartDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const start = params.get('start_date');
    if (start) return start;

    const curr = new Date();
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const end = params.get('end_date');
    if (end) return end;

    const curr = new Date();
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const friday = new Date(curr.setDate(diff + 4));
    return friday.toISOString().split('T')[0];
  });

  const [dateFilterType, setDateFilterType] = useState<'delivery' | 'created'>('delivery');
  
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
      
      let dateToCompare = p.deliveryDate;
      if (dateFilterType === 'created') {
        const timestamp = p.id.startsWith('quote_') ? parseInt(p.id.split('_')[1]) : parseInt(p.id);
        dateToCompare = new Date(timestamp).toISOString().split('T')[0];
      }

      const matchesDate = (!startDate || dateToCompare >= startDate) && (!endDate || dateToCompare <= endDate);

      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
  }, [projects, searchTerm, statusFilter, customers, startDate, endDate, dateFilterType]);

  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const completed = filteredProjects.filter(p => p.status === 'completed').length;
    const inProgress = filteredProjects.filter(p => p.status !== 'completed').length;
    const totalRevenue = filteredProjects.reduce((acc, p) => {
      const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      return acc + finalPrice;
    }, 0);

    return { total, completed, inProgress, totalRevenue };
  }, [filteredProjects, materials, platforms, companyData]);

  const handleExportReport = () => {
    if (filteredProjects.length === 0) {
      alert('Nenhum pedido para exportar neste período.');
      return;
    }

    const doc = new jsPDF();
    
    // Configurações de fonte e cores
    doc.setFont('helvetica');
    const primaryColor: [number, number, number] = [236, 72, 153]; // pink-500
    const textColor: [number, number, number] = [55, 65, 81]; // gray-700
    
    // Cabeçalho do Relatório
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text('Relatório de Pedidos', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
    
    if (startDate || endDate) {
      const periodText = `Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'}`;
      doc.text(periodText, 14, 36);
    }

    // Dados da Empresa (Alinhado à direita)
    let textRightX = 196;
    
    if (companyData.logo) {
      try {
        doc.addImage(companyData.logo, 172, 12, 24, 24);
        textRightX = 168; // Move o texto para a esquerda da logo
      } catch (e) {
        console.error('Erro ao adicionar logo no PDF', e);
      }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(companyData.name || 'Minha Empresa', textRightX, 22, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (companyData.phone) {
      doc.text(`Tel: ${companyData.phone}`, textRightX, 28, { align: 'right' });
    }
    if (companyData.email) {
      doc.text(companyData.email, textRightX, 34, { align: 'right' });
    }
    
    // Resumo Financeiro
    doc.setFillColor(249, 250, 251); // gray-50
    doc.rect(14, 42, 182, 20, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Pedidos: ${stats.total}`, 20, 50);
    doc.text(`Volume Total: R$ ${stats.totalRevenue.toFixed(2)}`, 100, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${stats.completed} concluídos | ${stats.inProgress} em andamento`, 20, 56);

    // Tabela de Pedidos
    const tableColumn = ['Data', 'Cliente', 'Tema', 'Status', 'Valor (R$)'];
    const tableRows = filteredProjects.map(p => {
      const customerName = getCustomerName(p.customerId);
      const { finalPrice } = calculateProjectBreakdown(p, materials, platforms, companyData, transactions);
      const status = statusLabels[p.status] || p.status;
      
      const timestamp = p.id.startsWith('quote_') ? parseInt(p.id.split('_')[1]) : parseInt(p.id);
      const createdDate = new Date(timestamp).toLocaleDateString('pt-BR');
      
      return [
        createdDate,
        customerName,
        p.theme,
        status,
        finalPrice.toFixed(2)
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 4,
        textColor: [55, 65, 81],
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // gray-50
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Data
        1: { cellWidth: 45 }, // Cliente
        2: { cellWidth: 'auto' }, // Tema
        3: { cellWidth: 30 }, // Status
        4: { cellWidth: 25, halign: 'right' }, // Valor
      },
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(
        `Página ${i} de ${pageCount} - Gerado por Calculiê`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio_pedidos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateReceipt = (project: Project, finalPrice: number) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === project.customerId);
    
    // Configurações de fonte e cores
    doc.setFont('helvetica');
    const primaryColor: [number, number, number] = [236, 72, 153]; // pink-500
    const textColor: [number, number, number] = [55, 65, 81]; // gray-700
    
    // Cabeçalho do Recibo
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text('RECIBO', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Nº do Pedido: ${project.quoteNumber || project.id.slice(-6).toUpperCase()}`, 14, 30);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

    // Dados da Empresa (Alinhado à direita)
    let textRightX = 196;
    
    if (companyData.logo) {
      try {
        doc.addImage(companyData.logo, 'PNG', 172, 12, 24, 24);
        textRightX = 168;
      } catch (e) {
        console.error('Erro ao adicionar logo no PDF', e);
      }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(companyData.name || 'Minha Empresa', textRightX, 22, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (companyData.cnpj) {
      doc.text(`CNPJ: ${companyData.cnpj}`, textRightX, 28, { align: 'right' });
    }
    if (companyData.phone) {
      doc.text(`Tel: ${companyData.phone}`, textRightX, 34, { align: 'right' });
    }
    if (companyData.email) {
      doc.text(companyData.email, textRightX, 40, { align: 'right' });
    }

    // Dados do Cliente
    doc.setFillColor(249, 250, 251);
    doc.rect(14, 48, 182, 30, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recebemos de:', 20, 56);
    
    doc.setFont('helvetica', 'normal');
    doc.text(customer?.name || 'Cliente não identificado', 20, 64);
    if (customer?.phone) {
      doc.text(`Telefone: ${customer.phone}`, 20, 72);
    }

    // Valor Extenso (simplificado)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`A importância de: R$ ${finalPrice.toFixed(2)}`, 14, 90);

    // Detalhes do Pedido
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Referente a: ${project.theme}`, 14, 100);
    if (project.description) {
      const splitDescription = doc.splitTextToSize(`Descrição: ${project.description}`, 180);
      doc.text(splitDescription, 14, 108);
    }

    // Assinatura
    doc.setDrawColor(200, 200, 200);
    doc.line(60, 160, 150, 160);
    doc.setFontSize(10);
    doc.text(companyData.name || 'Assinatura', 105, 168, { align: 'center' });

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento não possui valor fiscal.', 105, 280, { align: 'center' });

    doc.save(`recibo_${project.quoteNumber || project.id.slice(-6)}.pdf`);
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Histórico de <span className="text-pink-500">Pedidos</span></h2>
          <p className="text-gray-400 font-medium">Consulte todos os orçamentos e pedidos realizados.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
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
           <button 
             onClick={handleExportReport}
             className="bg-gray-900 text-white px-6 py-4 rounded-3xl font-bold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
           >
             <FileText size={20} />
             Gerar Relatório
           </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-4">
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
            <select 
              className="bg-transparent py-4 outline-none font-black text-[10px] uppercase tracking-widest text-gray-500 mr-2 border-r border-gray-200 pr-2"
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as 'delivery' | 'created')}
            >
              <option value="delivery">Data de Entrega</option>
              <option value="created">Data do Pedido</option>
            </select>
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

        <div className="flex flex-wrap gap-2 px-4">
          <button 
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today);
              setEndDate(today);
            }}
            className="px-4 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-100 transition-all"
          >
            Hoje
          </button>
          <button 
            onClick={() => {
              const curr = new Date();
              const day = curr.getDay();
              const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
              const monday = new Date(curr.setDate(diff)).toISOString().split('T')[0];
              const friday = new Date(curr.setDate(diff + 4)).toISOString().split('T')[0];
              setStartDate(monday);
              setEndDate(friday);
            }}
            className="px-4 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-100 transition-all"
          >
            Esta Semana
          </button>
          <button 
            onClick={() => {
              const date = new Date();
              const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
              const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
              setStartDate(firstDay);
              setEndDate(lastDay);
            }}
            className="px-4 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-100 transition-all"
          >
            Este Mês
          </button>
          <button 
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="px-4 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-100 transition-all"
          >
            Todo o Período
          </button>
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
                <th className="px-8 py-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.map(project => {
                const { finalPrice } = calculateProjectBreakdown(project, materials, platforms, companyData, transactions);
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
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Criado em {project.orderDate ? new Date(project.orderDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : new Date(project.createdAt).toLocaleDateString('pt-BR')}
                          </p>
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
                        <span className="text-xs font-bold text-gray-600">
                          {project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A combinar'}
                        </span>
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
                    <td className="px-8 py-6 text-center">
                      <button
                        onClick={() => generateReceipt(project, finalPrice)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                        title="Gerar Recibo PDF"
                      >
                        <Download size={12} />
                        Recibo
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
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
