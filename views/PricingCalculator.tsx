import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Trash2, 
  Plus, 
  Save, 
  DollarSign, 
  Clock, 
  PieChart, 
  Store,
  Info,
  Package,
  Search,
  Tag,
  Calendar,
  Sparkles,
  Cake,
  MessageCircle,
  FileText,
  TrendingUp,
  Download,
  SearchCheck,
  Hash,
  Users,
  X,
  PlusCircle,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Printer,
  Table as TableIcon,
  Layers,
  Receipt,
  Circle,
  Square,
  CalendarDays,
  StickyNote,
  User,
  PartyPopper,
  Edit3,
  RefreshCcw,
  Star,
  ArrowRight,
  Truck,
  Percent,
  Wallet,
  Ruler,
  File
} from 'lucide-react';
import { 
  Material, 
  Customer, 
  Platform, 
  CompanyData, 
  Project, 
  ProjectItem, 
  PricingBreakdown,
  Product,
  ProjectItemEntry
} from '../types';
import { calculateProjectBreakdown } from '../utils';

interface PricingCalculatorProps {
  materials: Material[];
  customers: Customer[];
  platforms: Platform[];
  companyData: CompanyData;
  projects: Project[];
  products: Product[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({ 
  materials, 
  customers, 
  platforms, 
  companyData, 
  projects,
  products,
  setProjects 
}) => {
  const generateAutoQuoteNumber = () => {
    // Gera um número sequencial simples baseado no total de projetos
    return (projects.length + 1).toString();
  };

  const initialProjectState: Partial<Project> = {
    theme: '',
    celebrantName: '',
    celebrantAge: '',
    quoteNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    customerId: '',
    description: '',
    notes: '',
    items: [],
    platformId: platforms.find(p => p.feePercentage === 0)?.id || platforms[0]?.id || '',
    excedente: companyData.defaultExcedente,
    status: 'pending',
    isCakeTopper: false,
    cakeShape: 'round',
    cakeSize: '',
    shipping: 0,
    discountPercentage: 0,
    discountAmount: 0,
    downPayment: 0,
  };

  const [currentProject, setCurrentProject] = useState<Partial<Project>>(initialProjectState);
  const [showCatalog, setShowCatalog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('ongoing');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Gera número automático apenas se for um novo orçamento e o campo estiver vazio
  useEffect(() => {
    if (!currentProject.id && !currentProject.quoteNumber) {
      setCurrentProject(prev => ({ ...prev, quoteNumber: generateAutoQuoteNumber() }));
    }
  }, [currentProject.id, projects.length]);

  const breakdown = useMemo(() => {
    return calculateProjectBreakdown(currentProject, materials, platforms, companyData);
  }, [currentProject, materials, companyData, platforms]);

  const pieceValueBase = breakdown.basePieceValue;

  const resetForm = () => {
    setCurrentProject({
      ...initialProjectState,
      quoteNumber: generateAutoQuoteNumber()
    });
    setShowCatalog(false);
    const formEl = document.getElementById('calc-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const addItemFromCatalog = (product: Product) => {
    let priceToUse = product.marketPrice;

    if (!priceToUse || priceToUse <= 0) {
      const mockProj = {
        items: [{
          name: product.name,
          quantity: 1,
          hoursToMake: (product.minutesToMake || 0) / 60,
          materials: product.materials,
          profitMargin: product.profitMargin || companyData.defaultProfitMargin
        }],
        platformId: platforms.find(p => p.feePercentage === 0)?.id || platforms[0]?.id || '',
        excedente: companyData.defaultExcedente
      };
      const breakdownResult = calculateProjectBreakdown(mockProj as any, materials, platforms, companyData);
      priceToUse = breakdownResult.finalPrice;
    }

    const newItem: ProjectItemEntry = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      hoursToMake: (product.minutesToMake || 0) / 60,
      materials: [...product.materials],
      profitMargin: product.profitMargin || companyData.defaultProfitMargin,
      unitPrice: priceToUse
    };

    setCurrentProject({
      ...currentProject,
      items: [...(currentProject.items || []), newItem]
    });
    setShowCatalog(false);
  };

  const removeItem = (index: number) => {
    setCurrentProject({
      ...currentProject,
      items: (currentProject.items || []).filter((_, i) => i !== index)
    });
  };

  const updateItemQuantity = (index: number, qty: number) => {
    const newItems = [...(currentProject.items || [])];
    newItems[index] = { ...newItems[index], quantity: Math.max(1, qty) };
    setCurrentProject({ ...currentProject, items: newItems });
  };

  const updateItemPrice = (index: number, price: number) => {
    const newItems = [...(currentProject.items || [])];
    newItems[index] = { ...newItems[index], unitPrice: price };
    setCurrentProject({ ...currentProject, items: newItems });
  };

  const handleSaveProject = () => {
    if (!currentProject.theme) {
      alert('Por favor, informe o Tema ou Título do orçamento!');
      return;
    }
    if (!currentProject.items || currentProject.items.length === 0) {
      alert('Adicione pelo menos um item ao orçamento!');
      return;
    }

    const isEdit = !!currentProject.id;
    const projectId = currentProject.id || Date.now().toString();

    const newProj: Project = {
      id: projectId,
      name: `${currentProject.theme} - ${currentProject.celebrantName || 'S/N'}`,
      customerId: currentProject.customerId || '',
      description: currentProject.description || '',
      notes: currentProject.notes || '',
      items: currentProject.items!,
      platformId: currentProject.platformId || '',
      excedente: currentProject.excedente || companyData.defaultExcedente,
      status: currentProject.status || 'pending',
      createdAt: currentProject.createdAt || new Date().toISOString(),
      dueDate: currentProject.deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      orderDate: currentProject.orderDate || new Date().toISOString().split('T')[0],
      deliveryDate: currentProject.deliveryDate || '',
      theme: currentProject.theme || '',
      celebrantName: currentProject.celebrantName || '',
      celebrantAge: currentProject.celebrantAge || '',
      quoteNumber: currentProject.quoteNumber || '',
      isCakeTopper: !!currentProject.isCakeTopper,
      cakeShape: currentProject.cakeShape,
      cakeSize: currentProject.cakeSize,
      shipping: currentProject.shipping || 0,
      discountPercentage: currentProject.discountPercentage || 0,
      discountAmount: currentProject.discountAmount || 0,
      downPayment: currentProject.downPayment || 0,
      hoursToMake: currentProject.items!.reduce((acc, i) => acc + (i.hoursToMake * i.quantity), 0),
      materials: currentProject.items!.flatMap(i => i.materials),
      profitMargin: currentProject.items![0]?.profitMargin || 30,
      quantity: currentProject.items!.reduce((acc, i) => acc + i.quantity, 0)
    };
    
    if (isEdit) {
      setProjects(prev => prev.map(p => p.id === projectId ? newProj : p));
      alert('Orçamento atualizado com sucesso!');
    } else {
      setProjects(prev => [newProj, ...prev]);
      alert('Orçamento salvo com sucesso!');
    }
    
    resetForm();
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'Não inf.';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const handleWhatsAppShare = () => {
    if (!currentProject.theme || !currentProject.items?.length) {
      alert('Preencha os dados e adicione itens antes de enviar!');
      return;
    }

    const customer = customers.find(c => c.id === currentProject.customerId);
    const dateFormatted = formatDisplayDate(currentProject.deliveryDate);

    let message = `*Olá! Segue o Orçamento: ${companyData.name}*\n\n`;
    if (currentProject.quoteNumber) message += `🔖 *Nº Orçamento:* ${currentProject.quoteNumber}\n`;
    message += `📝 *Pedido:* ${currentProject.theme}\n`;
    
    message += `\n*Itens:*\n`;
    currentProject.items!.forEach(item => {
      message += `- ${item.quantity}x ${item.name} (R$ ${item.unitPrice?.toFixed(2) || 'Cálculo Auto'})\n`;
    });

    if (currentProject.isCakeTopper) {
      message += `\n🎂 *Topo de Bolo:* ${currentProject.cakeShape === 'round' ? 'Redondo' : 'Quadrado'} - ${currentProject.cakeSize || 'Tam. não inf.'}`;
    }

    if (currentProject.celebrantName) message += `\n👤 *Nome:* ${currentProject.celebrantName}`;
    if (currentProject.celebrantAge) message += `\n🎂 *Idade:* ${currentProject.celebrantAge}`;
    message += `\n📅 *Entrega:* ${dateFormatted === 'Não inf.' ? 'A combinar' : dateFormatted}\n`;
    
    if (breakdown.totalDiscount > 0) message += `\n📉 *Desconto:* R$ ${breakdown.totalDiscount.toFixed(2)}`;
    if (breakdown.shipping > 0) message += `\n🚚 *Frete:* R$ ${breakdown.shipping.toFixed(2)}`;
    
    message += `\n💰 *VALOR TOTAL:* R$ ${breakdown.finalPrice.toFixed(2)}`;
    
    if (breakdown.downPayment > 0) {
      message += `\n💳 *Sinal:* R$ ${breakdown.downPayment.toFixed(2)}`;
      message += `\n⏳ *Restante:* R$ ${breakdown.remainingBalance.toFixed(2)}`;
    }

    if (currentProject.notes) message += `\n\n📌 *Obs:* ${currentProject.notes}`;
    
    const phone = customer?.phone?.replace(/\D/g, '') || '';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleGeneratePDF = async (proj: Partial<Project> = currentProject) => {
    if (!proj.theme || !proj.items?.length) {
      alert('Selecione ou crie um orçamento com itens primeiro!');
      return;
    }

    const calcBreakdown = calculateProjectBreakdown(proj, materials, platforms, companyData);
    const customer = customers.find(c => c.id === proj.customerId);
    
    setIsGeneratingPdf(true);

    try {
      const container = document.createElement('div');
      container.style.padding = '40px';
      container.style.width = '794px'; 
      container.style.background = 'white';
      container.style.color = '#333';
      container.style.fontFamily = 'Quicksand, sans-serif';

      container.innerHTML = `
        <div style="border: 2px solid #ec4899; border-radius: 20px; padding: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fce7f3; padding-bottom: 20px; margin-bottom: 20px;">
            <div>
              <h1 style="color: #ec4899; margin: 0; font-size: 28px; font-weight: 900;">${companyData.name}</h1>
              <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Orçamento de Artesanato</p>
            </div>
            <div style="text-align: right;">
              ${proj.quoteNumber ? `<p style="margin: 0; font-weight: 900; color: #4b5563;">Nº #${proj.quoteNumber}</p>` : ''}
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="background: #fdf2f8; padding: 15px; border-radius: 15px;">
              <p style="margin: 0 0 5px 0; font-size: 10px; color: #ec4899; font-weight: 900; text-transform: uppercase;">Cliente</p>
              <p style="margin: 0; font-weight: 700; color: #374151;">${customer?.name || 'Cliente Avulso'}</p>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #6b7280;">${customer?.phone || ''}</p>
            </div>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 15px;">
              <p style="margin: 0 0 5px 0; font-size: 10px; color: #0ea5e9; font-weight: 900; text-transform: uppercase;">Pedido / Tema</p>
              <p style="margin: 0; font-weight: 700; color: #374151;">${proj.theme}</p>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #6b7280;">Entrega: ${formatDisplayDate(proj.deliveryDate)}</p>
            </div>
          </div>

          ${proj.celebrantName ? `
          <div style="margin-bottom: 20px; padding: 10px 15px; background: #fafafa; border-radius: 10px; display: flex; gap: 20px;">
             <div><span style="font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase;">Aniversariante:</span> <span style="font-weight: 700;">${proj.celebrantName}</span></div>
             ${proj.celebrantAge ? `<div><span style="font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase;">Idade:</span> <span style="font-weight: 700;">${proj.celebrantAge}</span></div>` : ''}
          </div>` : ''}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f9fafb; border-bottom: 2px solid #f3f4f6;">
                <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 900; color: #9ca3af; text-transform: uppercase;">Item</th>
                <th style="padding: 12px; text-align: center; font-size: 11px; font-weight: 900; color: #9ca3af; text-transform: uppercase;">Qtd</th>
                <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 900; color: #9ca3af; text-transform: uppercase;">Unitário</th>
                <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 900; color: #9ca3af; text-transform: uppercase;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${proj.items!.map(item => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px; font-weight: 700; color: #4b5563;">${item.name}</td>
                  <td style="padding: 12px; text-align: center; color: #6b7280;">${item.quantity}</td>
                  <td style="padding: 12px; text-align: right; color: #6b7280;">R$ ${item.unitPrice?.toFixed(2) || '0.00'}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 700; color: #111827;">R$ ${((item.unitPrice || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 300px;">
              <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #6b7280; font-size: 14px;">
                <span>Subtotal Itens:</span>
                <span>R$ ${calcBreakdown.basePieceValue.toFixed(2)}</span>
              </div>
              ${calcBreakdown.shipping > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #6b7280; font-size: 14px;">
                <span>Frete:</span>
                <span>+ R$ ${calcBreakdown.shipping.toFixed(2)}</span>
              </div>` : ''}
              ${calcBreakdown.totalDiscount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #ef4444; font-size: 14px;">
                <span>Descontos:</span>
                <span>- R$ ${calcBreakdown.totalDiscount.toFixed(2)}</span>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #f3f4f6; margin-top: 10px;">
                <span style="font-weight: 900; color: #111827; font-size: 18px;">TOTAL:</span>
                <span style="font-weight: 900; color: #ec4899; font-size: 22px;">R$ ${calcBreakdown.finalPrice.toFixed(2)}</span>
              </div>
              ${calcBreakdown.downPayment > 0 ? `
              <div style="background: #f0fdf4; padding: 10px; border-radius: 10px; margin-top: 10px;">
                 <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #166534;">
                    <span>Sinal Pago:</span>
                    <span>R$ ${calcBreakdown.downPayment.toFixed(2)}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #166534; margin-top: 5px;">
                    <span>Restante:</span>
                    <span>R$ ${calcBreakdown.remainingBalance.toFixed(2)}</span>
                 </div>
              </div>` : ''}
            </div>
          </div>

          ${proj.notes ? `
          <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; pt-20">
            <p style="font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px;">Observações</p>
            <p style="font-size: 12px; color: #4b5563; white-space: pre-wrap; line-height: 1.5;">${proj.notes}</p>
          </div>` : ''}

          <div style="margin-top: 60px; text-align: center; color: #9ca3af; font-size: 11px;">
            <p>Obrigado pela preferência!</p>
            <p style="font-weight: 700; margin-top: 5px; color: #4b5563;">${companyData.name} | ${companyData.phone || ''}</p>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await (window as any).html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${proj.quoteNumber || 'SemNum'}_${proj.theme?.replace(/\s+/g, '_')}.pdf`);
      
      document.body.removeChild(container);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Houve um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.theme?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.celebrantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === 'ongoing') {
        return matchesSearch && p.status !== 'completed';
      }
      if (statusFilter === 'completed') {
        return matchesSearch && p.status === 'completed';
      }
      return matchesSearch;
    });
  }, [projects, searchTerm, statusFilter]);

  const statusLabels: Record<string, string> = {
    pending: 'Aguardando',
    approved: 'Aprovado',
    delayed: 'Atrasado',
    in_progress: 'Produzindo',
    completed: 'Finalizado'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    approved: 'bg-pink-50 text-pink-700 border-pink-100',
    delayed: 'bg-red-50 text-red-700 border-red-100',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
    completed: 'bg-green-50 text-green-700 border-green-100'
  };

  return (
    <div className="space-y-12 pb-24">
      {/* 1. Lista de Pedidos / Orçamentos */}
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
             <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
               <Tag size={28} className="text-pink-500" /> Histórico de Orçamentos
             </h2>
             <p className="text-sm text-gray-400 font-medium">Gerencie seus orçamentos salvos e pedidos ativos.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
               <button onClick={() => setStatusFilter('ongoing')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'ongoing' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Ativos</button>
               <button onClick={() => setStatusFilter('completed')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'completed' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Finalizados</button>
               <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Todos</button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por tema, cliente ou nº..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-pink-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHistory.map(proj => {
            const histBreakdown = calculateProjectBreakdown(proj, materials, platforms, companyData);
            const customer = customers.find(c => c.id === proj.customerId);
            return (
              <div key={proj.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${statusColors[proj.status] || 'bg-gray-50'}`}>
                           {statusLabels[proj.status] || proj.status}
                        </span>
                        {proj.quoteNumber && (
                           <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                              #{proj.quoteNumber}
                           </span>
                        )}
                      </div>
                      <h3 className="font-black text-gray-800 text-lg group-hover:text-pink-600 transition-colors truncate">{proj.theme}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                        {proj.items?.length || 0} Itens • {proj.items?.reduce((a, i) => a + i.quantity, 0) || 0} pçs
                      </p>
                   </div>
                   <div className="flex items-center gap-1">
                     <button 
                        onClick={() => handleGeneratePDF(proj)}
                        title="Baixar Orçamento em PDF"
                        className="p-2.5 text-blue-400 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <FileDown size={20} />
                      </button>
                     <button 
                        onClick={(e) => {
                           e.stopPropagation();
                           if(confirm(`Excluir permanentemente o orçamento "${proj.theme}"?`)) {
                              setProjects(prev => prev.filter(p => p.id !== proj.id));
                           }
                        }}
                        className="p-2.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                </div>

                <div className="space-y-2 mb-4">
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                      <Users size={12} className="text-pink-400" /> {customer ? customer.name : 'Cliente Avulso'}
                   </div>
                   {proj.celebrantName && (
                     <div className="flex items-center gap-2 text-[10px] text-pink-500 font-black uppercase">
                        <PartyPopper size={12} /> {proj.celebrantName} {proj.celebrantAge ? `(${proj.celebrantAge})` : ''}
                     </div>
                   )}
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                      <Calendar size={12} className="text-pink-400" /> Entrega: {proj.deliveryDate ? formatDisplayDate(proj.deliveryDate) : 'A combinar'}
                   </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                   <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Preço Final</p>
                      <p className="text-xl font-black text-gray-800">R$ {histBreakdown.finalPrice.toFixed(2)}</p>
                   </div>
                   <button 
                    onClick={() => {
                        setCurrentProject({...proj});
                        const el = document.getElementById('calc-form');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-3 bg-pink-50 text-pink-500 rounded-2xl hover:bg-pink-600 hover:text-white transition-all shadow-sm"
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Formulário de Novo Orçamento */}
      <div id="calc-form" className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start border-t border-gray-100 pt-12">
        <div className="xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl shadow-sm">
                <Calculator size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                  {currentProject.id ? 'Editando Orçamento' : 'Novo Orçamento'}
                </h2>
                <p className="text-gray-400 font-medium text-sm">Monte o pedido e visualize os lucros em tempo real.</p>
              </div>
            </div>
            {currentProject.id && (
              <button 
                onClick={resetForm}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all shadow-sm"
              >
                <RefreshCcw size={16} /> Limpar Tudo
              </button>
            )}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
               <Users size={20} className="text-pink-400" />
               <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">1. Informações do Pedido</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-gray-700" value={currentProject.customerId} onChange={e => setCurrentProject({...currentProject, customerId: e.target.value})}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Store size={12} className="text-yellow-500" /> Canal de Venda</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-pink-600"
                  value={currentProject.platformId}
                  onChange={e => setCurrentProject({...currentProject, platformId: e.target.value})}
                >
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name} ({p.feePercentage}%)</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tema / Título</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: Safari Baby" value={currentProject.theme} onChange={e => setCurrentProject({...currentProject, theme: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-pink-50/30 p-6 rounded-[2rem] border border-pink-100/50">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <User size={12} className="text-pink-500" /> Nome do Aniversariante
                  </label>
                  <input type="text" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: João" value={currentProject.celebrantName} onChange={e => setCurrentProject({...currentProject, celebrantName: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Cake size={12} className="text-pink-500" /> Idade
                  </label>
                  <input type="text" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: 2 anos" value={currentProject.celebrantAge} onChange={e => setCurrentProject({...currentProject, celebrantAge: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Hash size={12} className="text-blue-500" /> Nº Orçamento
                  </label>
                  <input type="text" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: 2024-001" value={currentProject.quoteNumber} onChange={e => setCurrentProject({...currentProject, quoteNumber: e.target.value})} />
               </div>
            </div>

            <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-100/50 space-y-4">
              <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   id="isCakeTopper"
                   className="w-5 h-5 accent-blue-500"
                   checked={currentProject.isCakeTopper} 
                   onChange={e => setCurrentProject({...currentProject, isCakeTopper: e.target.checked})} 
                 />
                 <label htmlFor="isCakeTopper" className="text-xs font-black text-gray-600 uppercase tracking-widest cursor-pointer">O Pedido é um Topo de Bolo?</label>
              </div>
              
              {currentProject.isCakeTopper && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Formato do Bolo</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentProject({...currentProject, cakeShape: 'round'})}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentProject.cakeShape === 'round' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-white bg-white text-gray-400'}`}
                      >
                        <Circle size={14} /> Redondo
                      </button>
                      <button 
                        onClick={() => setCurrentProject({...currentProject, cakeShape: 'square'})}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentProject.cakeShape === 'square' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-white bg-white text-gray-400'}`}
                      >
                        <Square size={14} /> Quadrado
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      <Ruler size={12} className="text-blue-500" /> Tamanho do Bolo (cm/kg)
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" 
                      placeholder="Ex: 20cm ou 2kg" 
                      value={currentProject.cakeSize} 
                      onChange={e => setCurrentProject({...currentProject, cakeSize: e.target.value})} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <CalendarDays size={12} className="text-pink-500" /> Data do Pedido
                  </label>
                  <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600" value={currentProject.orderDate} onChange={e => setCurrentProject({...currentProject, orderDate: e.target.value})} />
                </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Calendar size={12} className="text-pink-500" /> Data de Entrega
                  </label>
                  <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600" value={currentProject.deliveryDate} onChange={e => setCurrentProject({...currentProject, deliveryDate: e.target.value})} />
                </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <StickyNote size={12} className="text-pink-500" /> Observações Internas
              </label>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-gray-700 h-24 resize-none" 
                placeholder="Ex: Cliente pediu embalagem extra..." 
                value={currentProject.notes} 
                onChange={e => setCurrentProject({...currentProject, notes: e.target.value})} 
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-green-50 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
               <Wallet size={20} className="text-green-500" />
               <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">2. Frete, Descontos e Pagamento</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Truck size={12} className="text-blue-400" /> Frete (R$)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" 
                  value={currentProject.shipping} 
                  onChange={e => setCurrentProject({...currentProject, shipping: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Percent size={12} className="text-red-400" /> Desconto (%)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-red-600" 
                  value={currentProject.discountPercentage} 
                  onChange={e => setCurrentProject({...currentProject, discountPercentage: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <DollarSign size={12} className="text-red-400" /> Desconto (R$)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-red-600" 
                  value={currentProject.discountAmount} 
                  onChange={e => setCurrentProject({...currentProject, discountAmount: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Wallet size={12} className="text-green-500" /> Sinal / Entrada
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-green-600" 
                  value={currentProject.downPayment} 
                  onChange={e => setCurrentProject({...currentProject, downPayment: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
               <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
                 <Package size={18} className="text-yellow-500" /> 3. Itens e Preços de Venda
               </h3>
               <button onClick={() => setShowCatalog(!showCatalog)} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2">
                 <PlusCircle size={14} /> Adicionar do Catálogo
               </button>
            </div>

            {showCatalog && (
              <div className="bg-yellow-50/50 p-6 rounded-3xl border border-yellow-100 animate-fadeIn space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {products.map(p => (
                     <button key={p.id} onClick={() => addItemFromCatalog(p)} className="w-full text-left p-4 bg-white border border-yellow-100 rounded-2xl hover:bg-yellow-100 transition-all flex items-center justify-between group">
                        <div className="flex flex-col">
                           <span className="font-black text-gray-700 text-sm">{p.name}</span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Preço Base: R$ {p.marketPrice > 0 ? p.marketPrice.toFixed(2) : 'Cálculo Auto'}</span>
                        </div>
                        <Plus size={16} className="text-yellow-500" />
                     </button>
                   ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
               {currentProject.items?.map((item, index) => (
                 <div key={index} className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50/50 p-5 rounded-2xl border border-gray-100 gap-4">
                    <div className="flex items-center gap-4 flex-1">
                       <span className="font-black text-gray-400 text-xs">{index + 1}</span>
                       <div className="flex flex-col">
                          <p className="font-black text-gray-700 text-sm">{item.name}</p>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Preço Final desejado:</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-wrap">
                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Unitário (Venda)</label>
                          <div className="relative">
                             <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                             <input 
                                type="number" 
                                step="0.01" 
                                className="w-28 pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-xl outline-none font-black text-gray-700 text-sm focus:ring-2 focus:ring-green-400"
                                value={item.unitPrice || 0}
                                onChange={e => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                             />
                          </div>
                       </div>

                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantidade</label>
                          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200">
                             <button onClick={() => updateItemQuantity(index, item.quantity - 1)} className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-pink-500">-</button>
                             <span className="font-black text-gray-700 text-xs w-6 text-center">{item.quantity}</span>
                             <button onClick={() => updateItemQuantity(index, item.quantity + 1)} className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-pink-500">+</button>
                          </div>
                       </div>

                       <button onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500 self-end mb-1"><Trash2 size={18} /></button>
                    </div>
                 </div>
               ))}
               {(!currentProject.items || currentProject.items.length === 0) && <p className="text-center py-8 text-gray-400 text-xs italic">Selecione produtos do catálogo para compor o orçamento.</p>}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
             <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <TableIcon size={20} className="text-pink-500" />
                <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">4. Composição Detalhada do Preço</h3>
             </div>

             <div className="overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm">
                <table className="w-full text-left text-sm">
                   <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <th className="px-6 py-5">Componente</th>
                         <th className="px-6 py-5 text-right">Valor</th>
                         <th className="px-6 py-5 text-right">%</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      <tr className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-700"><Package size={14} className="text-yellow-500" /> Materiais</td>
                        <td className="px-6 py-4 text-right font-black text-gray-700">R$ {breakdown.variableCosts.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">{((breakdown.variableCosts / pieceValueBase) * 100 || 0).toFixed(1)}%</td>
                      </tr>
                      <tr className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-700"><Clock size={14} className="text-pink-500" /> Mão de Obra</td>
                        <td className="px-6 py-4 text-right font-black text-gray-700">R$ {breakdown.laborCosts.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">{((breakdown.laborCosts / pieceValueBase) * 100 || 0).toFixed(1)}%</td>
                      </tr>
                      <tr className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-700"><Receipt size={14} className="text-red-400" /> Despesas Fixas</td>
                        <td className="px-6 py-4 text-right font-black text-gray-700">R$ {breakdown.fixedCosts.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">{((breakdown.fixedCosts / pieceValueBase) * 100 || 0).toFixed(1)}%</td>
                      </tr>
                      <tr className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-700"><Layers size={14} className="text-gray-400" /> Despesas Variáveis</td>
                        <td className="px-6 py-4 text-right font-black text-gray-700">R$ {breakdown.excedente.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">{((breakdown.excedente / pieceValueBase) * 100 || 0).toFixed(1)}%</td>
                      </tr>
                      <tr className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-700"><TrendingUp size={14} className="text-green-500" /> Lucro Líquido</td>
                        <td className="px-6 py-4 text-right font-black text-gray-700">R$ {breakdown.profit.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">{((breakdown.profit / pieceValueBase) * 100 || 0).toFixed(1)}%</td>
                      </tr>
                      {/* Linha de Subtotal: Valor da Peça */}
                      <tr className="bg-pink-50/50 border-t-2 border-pink-100">
                        <td className="px-6 py-4 flex items-center gap-3 font-black text-pink-600 uppercase text-[10px] tracking-widest"><Sparkles size={14} /> Valor da Peça (Subtotal)</td>
                        <td className="px-6 py-4 text-right font-black text-pink-700">R$ {pieceValueBase.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] font-black text-pink-400">100.0%</td>
                      </tr>
                      
                      {/* Seção de Ajustes Finais */}
                      {breakdown.totalDiscount > 0 && (
                        <tr className="bg-red-50/30">
                          <td className="px-6 py-4 flex items-center gap-3 font-black text-red-500 uppercase text-[10px] tracking-widest"><Percent size={14} /> Descontos Aplicados</td>
                          <td className="px-6 py-4 text-right font-black text-red-600">- R$ {breakdown.totalDiscount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-black text-red-400">-{((breakdown.totalDiscount / pieceValueBase) * 100).toFixed(1)}%</td>
                        </tr>
                      )}
                      {breakdown.platformFees > 0 && (
                        <tr className="bg-purple-50/50 italic">
                          <td className="px-6 py-4 flex items-center gap-3 font-black text-purple-600 uppercase text-[10px] tracking-widest"><Store size={14} /> Taxas de Plataforma</td>
                          <td className="px-6 py-4 text-right font-black text-purple-700">R$ {breakdown.platformFees.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-black text-purple-400">{((breakdown.platformFees / breakdown.finalPrice) * 100 || 0).toFixed(1)}%</td>
                        </tr>
                      )}
                      {breakdown.shipping > 0 && (
                        <tr className="bg-blue-50/30">
                          <td className="px-6 py-4 flex items-center gap-3 font-black text-blue-500 uppercase text-[10px] tracking-widest"><Truck size={14} /> Valor do Frete</td>
                          <td className="px-6 py-4 text-right font-black text-blue-700">R$ {breakdown.shipping.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-black text-blue-400">{((breakdown.shipping / breakdown.finalPrice) * 100 || 0).toFixed(1)}%</td>
                        </tr>
                      )}
                   </tbody>
                   <tfoot>
                      <tr className="bg-pink-600 text-white font-black">
                         <td className="px-6 py-6 flex items-center gap-2 text-sm uppercase tracking-widest">Preço Final <ArrowRight size={16} /></td>
                         <td className="px-6 py-6 text-right text-3xl" colSpan={2}>R$ {breakdown.finalPrice.toFixed(2)}</td>
                      </tr>
                      {breakdown.downPayment > 0 && (
                        <>
                          <tr className="bg-green-50 text-green-700 font-bold border-t border-green-100">
                             <td className="px-6 py-4 text-[10px] uppercase tracking-widest">Sinal Recebido</td>
                             <td className="px-6 py-4 text-right text-lg" colSpan={2}>R$ {breakdown.downPayment.toFixed(2)}</td>
                          </tr>
                          <tr className="bg-yellow-50 text-yellow-700 font-black border-t border-yellow-100">
                             <td className="px-6 py-4 text-[10px] uppercase tracking-widest">Saldo Restante a Receber</td>
                             <td className="px-6 py-4 text-right text-xl" colSpan={2}>R$ {breakdown.remainingBalance.toFixed(2)}</td>
                          </tr>
                        </>
                      )}
                   </tfoot>
                </table>
             </div>
          </div>
        </div>

        <div className="xl:col-span-4 sticky top-8 space-y-6">
          <div className="bg-white rounded-[3rem] shadow-xl border border-pink-100 overflow-hidden">
            <div className="bg-pink-600 p-10 text-white text-center relative">
              <h3 className="text-xs font-black opacity-70 uppercase tracking-[0.2em] mb-2">Preço Final</h3>
              <p className="text-5xl font-black">R$ {breakdown.finalPrice.toFixed(2)}</p>
              {breakdown.remainingBalance > 0 && breakdown.downPayment > 0 && (
                <div className="mt-4 bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase tracking-widest mb-1">Restante a Receber</p>
                   <p className="text-xl font-black">R$ {breakdown.remainingBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <button 
                  onClick={handleSaveProject} 
                  className="w-full py-5 bg-pink-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg shadow-pink-100 transition-all active:scale-95"
                >
                  <Save size={20} /> {currentProject.id ? 'Salvar Alterações' : 'Salvar Orçamento'}
                </button>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => handleGeneratePDF()}
                    disabled={isGeneratingPdf}
                    className="py-5 bg-blue-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingPdf ? <RefreshCcw className="animate-spin" size={20} /> : <File size={20} />}
                    {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF do Orçamento'}
                  </button>
                  <button onClick={handleWhatsAppShare} className="py-5 bg-green-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
                    <MessageCircle size={20} /> Enviar Orçamento por Zap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};