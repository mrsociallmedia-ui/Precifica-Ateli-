
import React, { useState, useMemo, useRef } from 'react';
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
  Receipt
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
  const [currentProject, setCurrentProject] = useState<Partial<Project>>({
    theme: '',
    celebrantName: '',
    celebrantAge: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    customerId: '',
    description: '',
    notes: '',
    items: [],
    platformId: platforms[0]?.id || '',
    excedente: companyData.defaultExcedente,
    status: 'pending',
    isCakeTopper: false,
    cakeShape: 'round',
    cakeSize: '',
  });

  const [showCatalog, setShowCatalog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('ongoing');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const breakdown = useMemo(() => {
    return calculateProjectBreakdown(currentProject, materials, platforms, companyData);
  }, [currentProject, materials, companyData, platforms]);

  const addItemFromCatalog = (product: Product) => {
    const newItem: ProjectItemEntry = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      hoursToMake: (product.minutesToMake || 0) / 60,
      materials: [...product.materials],
      profitMargin: product.profitMargin || companyData.defaultProfitMargin
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

  const handleSaveProject = () => {
    if (!currentProject.theme) {
      alert('Por favor, informe o Tema ou Título do orçamento!');
      return;
    }
    if (!currentProject.items || currentProject.items.length === 0) {
      alert('Adicione pelo menos um item ao orçamento!');
      return;
    }

    const newProj: Project = {
      id: Date.now().toString(),
      name: `${currentProject.theme} - ${currentProject.celebrantName || 'S/N'}`,
      customerId: currentProject.customerId || '',
      description: currentProject.description || '',
      notes: currentProject.notes || '',
      items: currentProject.items,
      platformId: currentProject.platformId || '',
      excedente: currentProject.excedente || companyData.defaultExcedente,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: currentProject.deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      orderDate: currentProject.orderDate || '',
      deliveryDate: currentProject.deliveryDate || '',
      theme: currentProject.theme || '',
      celebrantName: currentProject.celebrantName || '',
      celebrantAge: currentProject.celebrantAge || '',
      isCakeTopper: !!currentProject.isCakeTopper,
      cakeShape: currentProject.cakeShape,
      cakeSize: currentProject.cakeSize,
      hoursToMake: currentProject.items.reduce((acc, i) => acc + (i.hoursToMake * i.quantity), 0),
      materials: currentProject.items.flatMap(i => i.materials),
      profitMargin: currentProject.items[0]?.profitMargin || 30,
      quantity: currentProject.items.reduce((acc, i) => acc + i.quantity, 0)
    };
    
    setProjects([newProj, ...projects]);
    alert('Orçamento salvo com sucesso!');
  };

  const handleGeneratePDF = async () => {
    if (!currentProject.theme || !currentProject.items?.length) {
      alert('Preencha os dados e adicione itens antes de gerar o PDF!');
      return;
    }

    setIsGeneratingPDF(true);
    const customer = customers.find(c => c.id === currentProject.customerId);
    
    const template = document.createElement('div');
    template.id = 'pdf-template';
    template.style.padding = '40px';
    template.style.width = '794px'; 
    template.style.minHeight = '1123px'; 
    template.style.background = 'white';

    const itemsHtml = (currentProject.items || []).map(item => {
      const totalUnits = (currentProject.items || []).reduce((acc, i) => acc + i.quantity, 0);
      const unitPrice = breakdown.finalPrice / totalUnits;
      
      return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 15px 0;">
            <p style="font-weight: 800; margin: 0; font-size: 14px; color: #1f2937;">${item.name}</p>
          </td>
          <td style="padding: 15px 0; text-align: center; font-weight: 600; color: #4b5563;">${item.quantity}</td>
          <td style="padding: 15px 0; text-align: right; font-weight: 800; color: #1f2937;">R$ ${(breakdown.finalPrice * (item.quantity / totalUnits) / item.quantity).toFixed(2)}</td>
          <td style="padding: 15px 0; text-align: right; font-weight: 800; color: #2563eb;">R$ ${(breakdown.finalPrice * (item.quantity / totalUnits)).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    template.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 4px solid #fbcfe8; padding-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${companyData.logo ? `<img src="${companyData.logo}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 20px;" />` : `<div style="width: 80px; height: 80px; background: #fbcfe8; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #ec4899;">LOGO</div>`}
          <div>
            <h1 style="font-size: 24px; font-weight: 900; color: #1f2937; margin: 0;">${companyData.name}</h1>
            <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ec4899; margin: 2px 0;">Artesanato Criativo & Papelaria de Luxo</p>
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; font-weight: 600; color: #6b7280;">
          <p style="margin: 2px 0;">${companyData.email || ''}</p>
          <p style="margin: 2px 0;">${companyData.phone || ''}</p>
          <p style="margin: 2px 0;">${companyData.cnpj ? `CNPJ: ${companyData.cnpj}` : ''}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div style="background: #fdf2f8; padding: 25px; border-radius: 30px; border: 1px solid #fbcfe8;">
          <h2 style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #ec4899; margin-bottom: 10px; letter-spacing: 0.1em;">Dados do Cliente</h2>
          <p style="font-weight: 800; font-size: 16px; margin: 5px 0; color: #1f2937;">${customer?.name || 'Cliente Avulso'}</p>
          <p style="font-size: 12px; color: #4b5563; margin: 2px 0;">${customer?.phone || ''}</p>
        </div>
        <div style="background: #eff6ff; padding: 25px; border-radius: 30px; border: 1px solid #bfdbfe;">
          <h2 style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #2563eb; margin-bottom: 10px; letter-spacing: 0.1em;">Detalhes do Pedido</h2>
          <p style="font-weight: 800; font-size: 16px; margin: 5px 0; color: #1f2937;">${currentProject.theme}</p>
          <p style="font-size: 12px; color: #4b5563; margin: 2px 0;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="font-size: 12px; font-weight: 800; color: #2563eb; margin: 2px 0;">Entrega: ${currentProject.deliveryDate ? new Date(currentProject.deliveryDate).toLocaleDateString('pt-BR') : 'A combinar'}</p>
        </div>
      </div>

      ${currentProject.isCakeTopper ? `
      <div style="border: 2px dashed #fbcfe8; padding: 20px; border-radius: 20px; margin-bottom: 30px; background: #fffafb;">
        <h3 style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #ec4899; margin-bottom: 10px;">Especificações de Topo de Bolo</h3>
        <p style="font-size: 12px; font-weight: 700; color: #4b5563;">Formato: ${currentProject.cakeShape === 'round' ? 'Redondo' : 'Quadrado'} • Tamanho: ${currentProject.cakeSize || 'Não informado'}</p>
      </div>
      ` : ''}

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; color: #9ca3af; font-size: 10px; font-weight: 900; text-transform: uppercase;">
            <th style="text-align: left; padding-bottom: 10px;">Item / Descrição</th>
            <th style="text-align: center; padding-bottom: 10px;">Qtd</th>
            <th style="text-align: right; padding-bottom: 10px;">Unitário</th>
            <th style="text-align: right; padding-bottom: 10px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
        <div style="width: 60%; color: #6b7280; font-size: 11px;">
          <h4 style="font-weight: 900; text-transform: uppercase; color: #1f2937; margin-bottom: 10px;">Observações:</h4>
          <p style="line-height: 1.6;">${currentProject.notes || 'Nenhuma observação adicional.'}</p>
          <div style="margin-top: 20px; padding: 15px; background: #fefce8; border-radius: 15px; color: #854d0e; font-weight: 700;">
            Validade do orçamento: 7 dias úteis a partir desta data.
          </div>
        </div>
        <div style="text-align: right; width: 35%;">
          <p style="font-size: 12px; font-weight: 900; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px;">Valor Total do Investimento</p>
          <p style="font-size: 42px; font-weight: 900; color: #2563eb; margin: 0;">R$ ${breakdown.finalPrice.toFixed(2)}</p>
          <div style="height: 4px; background: #bfdbfe; width: 100px; margin-left: auto; margin-top: 10px; border-radius: 10px;"></div>
        </div>
      </div>

      <div style="margin-top: 80px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
         <p style="font-size: 14px; font-weight: 800; color: #ec4899;">Obrigado pela preferência! ✨</p>
         <p style="font-size: 9px; color: #9ca3af; margin-top: 5px;">Gerado por Precifica Ateliê - Gestão para Artesanato</p>
      </div>
    `;

    document.getElementById('pdf-container')?.appendChild(template);

    try {
      const canvas = await (window as any).html2canvas(template, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${currentProject.theme?.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      
      alert('PDF gerado com sucesso! Agora você pode enviá-lo pelo WhatsApp.');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um erro ao gerar o PDF. Verifique se as imagens estão acessíveis.');
    } finally {
      document.getElementById('pdf-container')?.removeChild(template);
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!currentProject.theme || !currentProject.items?.length) {
      alert('Preencha os dados e adicione itens antes de enviar!');
      return;
    }

    const customer = customers.find(c => c.id === currentProject.customerId);
    const dateFormatted = currentProject.deliveryDate 
      ? new Date(currentProject.deliveryDate).toLocaleDateString('pt-BR') 
      : 'A combinar';

    let message = `*Olá! Segue o Orçamento: ${companyData.name}*\n\n`;
    message += `📝 *Pedido:* ${currentProject.theme}\n`;
    
    message += `\n*Itens:*\n`;
    currentProject.items.forEach(item => {
      message += `- ${item.quantity}x ${item.name}\n`;
    });

    if (currentProject.celebrantName) message += `\n👤 *Nome:* ${currentProject.celebrantName}`;
    if (currentProject.celebrantAge) message += `\n🎂 *Idade:* ${currentProject.celebrantAge}`;
    message += `\n📅 *Entrega:* ${dateFormatted}\n`;
    
    message += `\n💰 *VALOR TOTAL:* R$ ${breakdown.finalPrice.toFixed(2)}`;
    message += `\n\n_Acabei de te enviar o orçamento detalhado em PDF também!_`;
    
    const phone = customer?.phone?.replace(/\D/g, '') || '';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const filteredHistory = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.theme?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.celebrantName?.toLowerCase().includes(searchTerm.toLowerCase());
      
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
    approved: 'bg-blue-50 text-blue-700 border-blue-100',
    delayed: 'bg-red-50 text-red-700 border-red-100',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
    completed: 'bg-green-50 text-green-700 border-green-100'
  };

  const tableRows = [
    { label: 'Materiais', value: breakdown.variableCosts, icon: Package, color: 'text-yellow-500', barColor: 'bg-yellow-400' },
    { label: 'Mão de Obra', value: breakdown.laborCosts, icon: Clock, color: 'text-blue-500', barColor: 'bg-blue-400' },
    { label: 'Despesas Fixas', value: breakdown.fixedCosts, icon: Receipt, color: 'text-red-400', barColor: 'bg-red-400' },
    { label: 'Despesas Variáveis', value: breakdown.excedente, icon: Layers, color: 'text-gray-400', barColor: 'bg-gray-400' },
    { label: 'Canais de Venda', value: breakdown.platformFees, icon: Store, color: 'text-purple-500', barColor: 'bg-purple-400' },
    { label: 'Lucro Líquido', value: breakdown.profit, icon: TrendingUp, color: 'text-green-500', barColor: 'bg-green-500' },
  ];

  return (
    <div className="space-y-12 pb-24">
      {/* 1. Lista de Pedidos */}
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
             <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
               <Tag size={28} className="text-blue-500" /> Lista de Pedidos
             </h2>
             <p className="text-sm text-gray-400 font-medium">Veja seus orçamentos salvos e gerencie os pedidos em andamento.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
               <button 
                 onClick={() => setStatusFilter('ongoing')}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'ongoing' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 Em Andamento
               </button>
               <button 
                 onClick={() => setStatusFilter('completed')}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'completed' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 Finalizados
               </button>
               <button 
                 onClick={() => setStatusFilter('all')}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 Todos
               </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text" 
                placeholder="Buscar pedido..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
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
                      </div>
                      <h3 className="font-black text-gray-800 text-lg group-hover:text-blue-600 transition-colors truncate">{proj.theme}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                        {proj.items?.length || 0} Itens • {proj.items?.reduce((a, i) => a + i.quantity, 0) || 0} pçs
                      </p>
                   </div>
                   <button 
                    onClick={() => {
                       if(confirm('Deseja excluir este orçamento permanentemente?')) {
                          setProjects(projects.filter(p => p.id !== proj.id));
                       }
                    }}
                    className="p-2 text-gray-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-2 mb-8">
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                      <Users size={12} className="text-pink-400" /> {customer ? customer.name : 'Cliente Avulso'}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                      <Calendar size={12} className="text-blue-400" /> {proj.deliveryDate ? new Date(proj.deliveryDate).toLocaleDateString('pt-BR') : 'A combinar'}
                   </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                   <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Valor Final</p>
                      <p className="text-xl font-black text-gray-800">R$ {histBreakdown.finalPrice.toFixed(2)}</p>
                   </div>
                   <button 
                     onClick={() => {
                        setCurrentProject({...proj});
                        window.scrollTo({ top: 500, behavior: 'smooth' });
                     }}
                     className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                     title="Carregar Orçamento para Edição"
                   >
                     <ChevronRight size={20} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Formulário de Novo Orçamento */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start border-t border-gray-100 pt-12">
        <div className="xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                <Calculator size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Montar Orçamento</h2>
                <p className="text-gray-400 font-medium text-sm">Combine produtos e visualize os custos detalhadamente.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-50 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-4">
               <Users size={20} className="text-pink-400" />
               <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">1. Dados do Cliente & Título</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Título / Tema</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: Batizado Lucas" value={currentProject.theme} onChange={e => setCurrentProject({...currentProject, theme: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-gray-700" value={currentProject.customerId} onChange={e => setCurrentProject({...currentProject, customerId: e.target.value})}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Data de Entrega</label>
                  <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600" value={currentProject.deliveryDate} onChange={e => setCurrentProject({...currentProject, deliveryDate: e.target.value})} />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                   <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                      <Clock size={16} className="text-yellow-500" />
                      <p className="text-[10px] font-bold text-yellow-700 leading-tight">Lembre-se: O cálculo do valor por hora utiliza os dados de custos fixos e salários das configurações.</p>
                   </div>
                </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
               <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
                 <Package size={18} className="text-yellow-500" /> 2. Itens do Pedido
               </h3>
               <button onClick={() => setShowCatalog(!showCatalog)} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2">
                 <PlusCircle size={14} /> Catálogo
               </button>
            </div>

            {showCatalog && (
              <div className="bg-yellow-50/50 p-6 rounded-3xl border border-yellow-100 animate-fadeIn space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {products.map(p => (
                     <button key={p.id} onClick={() => addItemFromCatalog(p)} className="w-full text-left p-4 bg-white border border-yellow-100 rounded-2xl hover:bg-yellow-100 transition-all flex items-center justify-between group">
                        <div><p className="font-black text-gray-700">{p.name}</p></div>
                        <Plus size={16} className="text-yellow-500" />
                     </button>
                   ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
               {currentProject.items?.map((item, index) => (
                 <div key={index} className="flex items-center justify-between bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                       <span className="font-black text-gray-400">{index + 1}</span>
                       <p className="font-black text-gray-700">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-3">
                          <button onClick={() => updateItemQuantity(index, item.quantity - 1)} className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500">-</button>
                          <span className="font-black text-gray-700">{item.quantity}</span>
                          <button onClick={() => updateItemQuantity(index, item.quantity + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500">+</button>
                       </div>
                       <button onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                 </div>
               ))}
               {currentProject.items?.length === 0 && <p className="text-center py-8 text-gray-400 text-xs italic">Nenhum item adicionado ainda.</p>}
            </div>
          </div>

          {/* TABELA DE DETALHAMENTO DA PRECIFICAÇÃO REFINADA */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
             <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <TableIcon size={20} className="text-blue-500" />
                <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">3. Composição Detalhada do Preço</h3>
             </div>

             <div className="overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm">
                <table className="w-full text-left text-sm">
                   <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <th className="px-6 py-5">Componente de Custo</th>
                         <th className="px-6 py-5">Participação Visual</th>
                         <th className="px-6 py-5 text-right">Valor Bruto</th>
                         <th className="px-6 py-5 text-right">Percentual</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {tableRows.map((row, idx) => {
                         const percentage = breakdown.finalPrice > 0 ? (row.value / breakdown.finalPrice) * 100 : 0;
                         return (
                           <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-700">
                                 <row.icon size={14} className={row.color} /> {row.label}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="w-full max-w-[120px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-1000 ${row.barColor}`} 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-gray-700">R$ {row.value.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right text-[10px] font-black text-gray-400">
                                 {percentage.toFixed(1)}%
                              </td>
                           </tr>
                         );
                      })}
                   </tbody>
                   <tfoot>
                      <tr className="bg-blue-600 text-white font-black">
                         <td className="px-6 py-6" colSpan={2}>PREÇO FINAL SUGERIDO</td>
                         <td className="px-6 py-6 text-right text-3xl" colSpan={2}>R$ {breakdown.finalPrice.toFixed(2)}</td>
                      </tr>
                   </tfoot>
                </table>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-start">
                   <div className="p-2 bg-blue-500 text-white rounded-lg shrink-0"><Info size={16} /></div>
                   <p className="text-[10px] text-blue-800 leading-relaxed font-bold">
                      <span className="uppercase block mb-1">Cálculo por Markup</span>
                      O sistema garante que as taxas do canal de venda incidam sobre o preço final de venda, protegendo seu lucro.
                   </p>
                </div>
                <div className="p-5 bg-green-50 rounded-2xl border border-green-100 flex gap-4 items-start">
                   <div className="p-2 bg-green-500 text-white rounded-lg shrink-0"><TrendingUp size={16} /></div>
                   <p className="text-[10px] text-green-800 leading-relaxed font-bold">
                      <span className="uppercase block mb-1">Lucro Garantido</span>
                      O valor de "Lucro Líquido" é o que sobra livre no seu bolso após pagar materiais, seu salário (mão de obra) e taxas.
                   </p>
                </div>
             </div>
          </div>
        </div>

        <div className="xl:col-span-4 sticky top-8 space-y-6">
          <div className="bg-white rounded-[3rem] shadow-xl border border-pink-100 overflow-hidden">
            <div className="bg-blue-600 p-10 text-white text-center relative">
              <h3 className="text-xs font-black opacity-70 uppercase tracking-[0.2em] mb-2">Valor Total</h3>
              <p className="text-5xl font-black">R$ {breakdown.finalPrice.toFixed(2)}</p>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Store size={14} className="text-yellow-500" /> Canal de Venda</span>
                  <select 
                    className="bg-gray-50 px-3 py-1 rounded-lg font-black text-blue-600 outline-none text-right text-xs"
                    value={currentProject.platformId}
                    onChange={e => setCurrentProject({...currentProject, platformId: e.target.value})}
                  >
                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Custos Totais</span>
                    <span className="font-bold text-gray-700">R$ {(breakdown.variableCosts + breakdown.laborCosts + breakdown.fixedCosts + breakdown.excedente).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Lucro do Projeto</span>
                    <span className="font-black text-green-500">R$ {breakdown.profit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={handleSaveProject} className="w-full py-5 bg-blue-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95">
                  <Save size={20} /> Salvar Orçamento
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleGeneratePDF} disabled={isGeneratingPDF} className="py-5 bg-gray-50 text-gray-500 font-black rounded-[1.5rem] flex flex-col items-center justify-center gap-1 shadow-sm transition-all active:scale-95">
                    <FileDown size={20} />
                    <span className="text-[10px] uppercase tracking-widest">PDF Cliente</span>
                  </button>
                  <button onClick={handleWhatsAppShare} className="py-5 bg-green-500 text-white font-black rounded-[1.5rem] flex flex-col items-center justify-center gap-1 shadow-lg shadow-green-100 transition-all active:scale-95">
                    <MessageCircle size={20} />
                    <span className="text-[10px] uppercase tracking-widest">Enviar Zap</span>
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
