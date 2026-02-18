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
  File,
  Mail,
  Phone,
  Signature,
  Zap
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
  ProjectItemEntry,
  Transaction
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
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({ 
  materials, 
  customers, 
  platforms, 
  companyData, 
  projects,
  products,
  setProjects,
  setTransactions
}) => {
  // Lógica para gerar número sequencial simples (1, 2, 3, 4...)
  const generateAutoQuoteNumber = () => {
    if (!projects || projects.length === 0) return '1';
    
    const nums = projects
      .map(p => {
        const onlyNums = p.quoteNumber?.replace(/\D/g, '') || '0';
        return parseInt(onlyNums);
      })
      .filter(n => !isNaN(n));
      
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return (max + 1).toString();
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

  // Efeito para preencher o número inicial
  useEffect(() => {
    if (!currentProject.id && (!currentProject.quoteNumber || currentProject.quoteNumber === '')) {
      setCurrentProject(prev => ({ ...prev, quoteNumber: generateAutoQuoteNumber() }));
    }
  }, [currentProject.id, projects]);

  const breakdown = useMemo(() => {
    return calculateProjectBreakdown(currentProject, materials, platforms, companyData);
  }, [currentProject, materials, companyData, platforms]);

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
    const oldProject = projects.find(p => p.id === projectId);

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
      quoteNumber: currentProject.quoteNumber || generateAutoQuoteNumber(),
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

    if (newProj.status === 'completed' && (!oldProject || oldProject.status !== 'completed')) {
      const projBreakdown = calculateProjectBreakdown(newProj, materials, platforms, companyData);
      const newTransaction: Transaction = {
        id: `auto_calc_${Date.now()}_${newProj.id}`,
        description: `Venda: ${newProj.theme}${newProj.quoteNumber ? ` (Nº ${newProj.quoteNumber})` : ''}`,
        amount: projBreakdown.finalPrice,
        type: 'income',
        category: 'Venda',
        paymentMethod: 'Pix',
        date: new Date().toISOString().split('T')[0]
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }
    
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
    if (!dateStr) return 'A combinar';
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
    if (currentProject.quoteNumber) message += `🔖 *Nº Orçamento:* #${currentProject.quoteNumber}\n`;
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
    message += `\n📅 *Entrega:* ${dateFormatted}\n`;
    
    message += `\n💰 *VALOR TOTAL:* R$ ${breakdown.finalPrice.toFixed(2)}`;
    
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
      if ((document as any).fonts) {
        await (document as any).fonts.ready;
      }

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '794px'; 
      container.style.background = 'white';
      container.style.color = '#111827';
      container.style.fontFamily = "'Quicksand', sans-serif";

      const primaryColor = '#ec4899'; 

      container.innerHTML = `
        <div style="padding: 50px; border-top: 15px solid ${primaryColor}; position: relative;">
          <div style="position: absolute; top: 100px; right: -50px; width: 300px; height: 300px; background: ${primaryColor}; opacity: 0.03; border-radius: 50%; pointer-events: none;"></div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; position: relative; z-index: 1;">
            <div style="flex: 1.5;">
              ${companyData.logo ? 
                `<img src="${companyData.logo}" style="max-height: 90px; max-width: 280px; object-fit: contain; margin-bottom: 15px;" />` : 
                `<div style="height: 50px; width: 50px; background: ${primaryColor}; border-radius: 12px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: 900; font-size: 24px;">${companyData.name.charAt(0)}</span></div>`
              }
              <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: ${primaryColor}; letter-spacing: -1px; line-height: 1.1;">${companyData.name}</h1>
            </div>
            <div style="text-align: right; flex: 1;">
              <h2 style="margin: 0; font-size: 12px; font-weight: 900; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 10px;">Proposta Comercial</h2>
              <div style="background: #fdf2f8; padding: 20px; border-radius: 25px; border: 1px solid #fce7f3; display: inline-block; min-width: 180px;">
                <p style="margin: 0; font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Orçamento Nº</p>
                <p style="margin: 0; font-size: 32px; font-weight: 900; color: #1f2937; line-height: 1;">#${proj.quoteNumber || '1'}</p>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 50px;">
            <div style="background: #fafafa; padding: 25px; border-radius: 25px; border: 1px solid #f3f4f6;">
              <p style="margin: 0 0 10px 0; font-size: 10px; color: #9ca3af; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Dados do Cliente</p>
              <p style="margin: 0; font-weight: 800; color: #111827; font-size: 18px;">${customer?.name || 'Cliente Avulso'}</p>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #4b5563; font-weight: 600;">${customer?.phone || 'Telefone não informado'}</p>
            </div>
            <div style="background: #f0f9ff; padding: 25px; border-radius: 25px; border: 1px solid #e0f2fe;">
              <p style="margin: 0 0 10px 0; font-size: 10px; color: #0ea5e9; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Resumo do Pedido</p>
              <p style="margin: 0; font-weight: 800; color: #111827; font-size: 18px;">${proj.theme}</p>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #4b5563; font-weight: 600;">Data de Entrega: <span style="color: #0ea5e9;">${formatDisplayDate(proj.deliveryDate)}</span></p>
            </div>
          </div>
          <div style="margin-bottom: 50px; border-radius: 25px; overflow: hidden; border: 1px solid #f3f4f6; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <thead>
                <tr style="background: #111827; color: white;">
                  <th style="padding: 20px 25px; text-align: left; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Descrição do Produto</th>
                  <th style="padding: 20px 25px; text-align: center; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Qtd</th>
                  <th style="padding: 20px 25px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Vlr. Unitário</th>
                  <th style="padding: 20px 25px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${proj.items!.map((item, idx) => `
                  <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 18px 25px; border-bottom: 1px solid #f3f4f6;">
                      <div style="font-weight: 700; color: #374151; font-size: 14px;">${item.name}</div>
                    </td>
                    <td style="padding: 18px 25px; text-align: center; font-weight: 700; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
                    <td style="padding: 18px 25px; text-align: right; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">R$ ${item.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td style="padding: 18px 25px; text-align: right; font-weight: 900; color: #111827; font-size: 14px; border-bottom: 1px solid #f3f4f6;">R$ ${((item.unitPrice || 0) * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 330px; background: #111827; border-radius: 25px; padding: 30px; color: white;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7;">Total Geral</span>
                <span style="font-weight: 900; font-size: 28px;">R$ ${calcBreakdown.finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await (window as any).html2canvas(container, { scale: 2, backgroundColor: '#ffffff', windowWidth: 794 });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${proj.quoteNumber || '1'}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.theme?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.celebrantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      if (statusFilter === 'ongoing') return matchesSearch && p.status !== 'completed';
      if (statusFilter === 'completed') return matchesSearch && p.status === 'completed';
      return matchesSearch;
    }).sort((a, b) => parseInt(b.quoteNumber || '0') - parseInt(a.quoteNumber || '0'));
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
              <input type="text" placeholder="Buscar orçamento..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-pink-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                           <span className="bg-pink-50 text-pink-500 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                              #{proj.quoteNumber}
                           </span>
                        )}
                      </div>
                      <h3 className="font-black text-gray-800 text-lg group-hover:text-pink-600 transition-colors truncate">{proj.theme}</h3>
                   </div>
                   <div className="flex items-center gap-1">
                     <button onClick={() => handleGeneratePDF(proj)} className="p-2.5 text-blue-400 hover:bg-blue-50 rounded-xl transition-all"><FileDown size={20} /></button>
                     <button onClick={() => setProjects(prev => prev.filter(p => p.id !== proj.id))} className="p-2.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                   </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                   <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Valor Total</p>
                      <p className="text-xl font-black text-gray-800">R$ {histBreakdown.finalPrice.toFixed(2)}</p>
                   </div>
                   <button onClick={() => { setCurrentProject({...proj}); document.getElementById('calc-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="p-3 bg-pink-50 text-pink-500 rounded-2xl hover:bg-pink-600 hover:text-white transition-all shadow-sm"><Edit3 size={18} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div id="calc-form" className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start border-t border-gray-100 pt-12">
        <div className="xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl shadow-sm"><Calculator size={28} /></div>
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">{currentProject.id ? 'Editando Orçamento' : 'Novo Orçamento'}</h2>
                <p className="text-gray-400 font-medium text-sm">Monte o pedido e visualize os lucros em tempo real.</p>
              </div>
            </div>
            <button onClick={resetForm} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all shadow-sm"><RefreshCcw size={16} /> Limpar Tudo</button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-gray-700" value={currentProject.customerId} onChange={e => setCurrentProject({...currentProject, customerId: e.target.value})}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tema / Título</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: Safari Baby" value={currentProject.theme} onChange={e => setCurrentProject({...currentProject, theme: e.target.value})} />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Hash size={12} className="text-blue-500" /> Nº Orçamento</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-gray-700" 
                      placeholder="Nº" 
                      value={currentProject.quoteNumber} 
                      onChange={e => setCurrentProject({...currentProject, quoteNumber: e.target.value})} 
                    />
                    {!currentProject.id && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest border border-blue-100">
                        <Zap size={8} /> Auto
                      </div>
                    )}
                  </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-pink-50/30 p-6 rounded-[2rem] border border-pink-100/50">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><User size={12} className="text-pink-500" /> Nome do Aniversariante</label>
                  <input type="text" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: João" value={currentProject.celebrantName} onChange={e => setCurrentProject({...currentProject, celebrantName: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Cake size={12} className="text-pink-500" /> Idade</label>
                  <input type="text" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: 2 anos" value={currentProject.celebrantAge} onChange={e => setCurrentProject({...currentProject, celebrantAge: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <CalendarDays size={14} className="text-pink-500" /> Data do Pedido
                  </label>
                  <div className="relative">
                    <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input 
                      type="date" 
                      className="w-full p-4 pr-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600 focus:ring-2 focus:ring-pink-200" 
                      value={currentProject.orderDate} 
                      onChange={e => setCurrentProject({...currentProject, orderDate: e.target.value})} 
                    />
                  </div>
                </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Calendar size={14} className="text-pink-500" /> Data de Entrega
                  </label>
                  <div className="relative">
                    <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input 
                      type="date" 
                      className="w-full p-4 pr-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600 focus:ring-2 focus:ring-pink-200" 
                      value={currentProject.deliveryDate} 
                      onChange={e => setCurrentProject({...currentProject, deliveryDate: e.target.value})} 
                    />
                  </div>
                </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
               <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2"><Package size={18} className="text-yellow-500" /> Itens do Pedido</h3>
               <button onClick={() => setShowCatalog(!showCatalog)} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"><PlusCircle size={14} /> Adicionar do Catálogo</button>
            </div>
            {showCatalog && (
              <div className="bg-yellow-50/50 p-6 rounded-3xl border border-yellow-100 animate-fadeIn space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {products.map(p => (
                     <button key={p.id} onClick={() => addItemFromCatalog(p)} className="w-full text-left p-4 bg-white border border-yellow-100 rounded-2xl hover:bg-yellow-100 transition-all flex items-center justify-between group">
                        <div>
                           <span className="font-black text-gray-700 text-sm">{p.name}</span>
                           <p className="text-[9px] text-gray-400 font-bold uppercase">Preço: R$ {p.marketPrice > 0 ? p.marketPrice.toFixed(2) : 'Sob consulta'}</p>
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
                       <p className="font-black text-gray-700 text-sm">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pç. Unitário</label>
                          <input type="number" step="0.01" className="w-24 p-2 bg-white border border-gray-200 rounded-xl outline-none font-black text-gray-700 text-xs" value={item.unitPrice || 0} onChange={e => updateItemPrice(index, parseFloat(e.target.value) || 0)} />
                       </div>
                       <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Qtd</label>
                          <input type="number" className="w-16 p-2 bg-white border border-gray-200 rounded-xl outline-none font-black text-gray-700 text-xs" value={item.quantity} onChange={e => updateItemQuantity(index, parseInt(e.target.value) || 1)} />
                       </div>
                       <button onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 sticky top-8 space-y-6">
          <div className="bg-white rounded-[3rem] shadow-xl border border-pink-100 overflow-hidden">
            <div className="bg-pink-600 p-10 text-white text-center">
              <h3 className="text-xs font-black opacity-70 uppercase tracking-[0.2em] mb-2">Total do Orçamento</h3>
              <p className="text-5xl font-black">R$ {breakdown.finalPrice.toFixed(2)}</p>
            </div>
            <div className="p-10 space-y-4">
              <button onClick={handleSaveProject} className="w-full py-5 bg-pink-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"><Save size={20} /> Salvar Orçamento</button>
              <button onClick={() => handleGeneratePDF()} disabled={isGeneratingPdf} className="w-full py-5 bg-blue-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50">
                {/* Fixed: Replaced RefreshCw with imported RefreshCcw */}
                {isGeneratingPdf ? <RefreshCcw className="animate-spin" /> : <File size={20} />} Gerar PDF
              </button>
              <button onClick={handleWhatsAppShare} className="w-full py-5 bg-green-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"><MessageCircle size={20} /> Enviar Zap</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};