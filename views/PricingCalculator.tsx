
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
  Zap,
  Ticket,
  AlignLeft,
  Layers3,
  MessageSquare,
  BarChart4,
  Wallet2
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

  const getLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialProjectState: Partial<Project> = {
    theme: '',
    celebrantName: '',
    celebrantAge: '',
    quoteNumber: '',
    orderDate: getLocalDate(),
    deliveryDate: '',
    customerId: '',
    platformId: platforms.find(p => p.feePercentage === 0)?.id || platforms[0]?.id || '',
    description: '',
    observations: '',
    notes: '',
    items: [],
    excedente: companyData.defaultExcedente,
    status: 'pending',
    isCakeTopper: false,
    cakeShape: 'round',
    cakeFloors: '1',
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
          profitMargin: product.profitMargin || companyData.defaultProfitMargin,
          manualBaseCost: product.manualBaseCost
        }],
        platformId: currentProject.platformId || platforms[0]?.id || '',
        excedente: companyData.defaultExcedente
      };
      const breakdownResult = calculateProjectBreakdown(mockProj as any, materials, platforms, companyData);
      priceToUse = breakdownResult.basePieceValue;
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
      observations: currentProject.observations || '',
      notes: currentProject.notes || '',
      items: currentProject.items!,
      platformId: currentProject.platformId || '',
      excedente: currentProject.excedente || companyData.defaultExcedente,
      status: currentProject.status || 'pending',
      createdAt: currentProject.createdAt || new Date().toISOString(),
      dueDate: currentProject.deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      orderDate: currentProject.orderDate || getLocalDate(),
      deliveryDate: currentProject.deliveryDate || '',
      theme: currentProject.theme || '',
      celebrantName: currentProject.celebrantName || '',
      celebrantAge: currentProject.celebrantAge || '',
      quoteNumber: currentProject.quoteNumber || generateAutoQuoteNumber(),
      isCakeTopper: !!currentProject.isCakeTopper,
      cakeShape: currentProject.cakeShape,
      cakeFloors: currentProject.cakeFloors,
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

    const projBreakdown = calculateProjectBreakdown(newProj, materials, platforms, companyData);
    const previousDownPayment = oldProject?.downPayment || 0;
    const downPaymentIncrease = newProj.downPayment! - previousDownPayment;

    // 1. LANÇAMENTO DE SINAL (Se houver valor novo de entrada)
    if (downPaymentIncrease > 0) {
      const signalTransaction: Transaction = {
        id: `signal_${Date.now()}_${newProj.id}`,
        description: `Sinal: ${newProj.theme}${newProj.quoteNumber ? ` (#${newProj.quoteNumber})` : ''}`,
        amount: downPaymentIncrease,
        type: 'income',
        category: 'Venda',
        paymentMethod: 'Pix',
        date: new Date().toISOString().split('T')[0]
      };
      setTransactions(prev => [signalTransaction, ...prev]);
    }

    // 2. LANÇAMENTO DE SALDO FINAL (Ao completar o pedido)
    if (newProj.status === 'completed' && (!oldProject || oldProject.status !== 'completed')) {
      const finalTransaction: Transaction = {
        id: `final_bal_${Date.now()}_${newProj.id}`,
        description: `Saldo Final: ${newProj.theme}${newProj.quoteNumber ? ` (#${newProj.quoteNumber})` : ''}`,
        amount: projBreakdown.remainingBalance, // Apenas o que falta pagar
        type: 'income',
        category: 'Venda',
        paymentMethod: 'Pix',
        date: new Date().toISOString().split('T')[0]
      };
      setTransactions(prev => [finalTransaction, ...prev]);
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
      message += `\n🎂 *Topo de Bolo:* ${currentProject.cakeShape === 'round' ? 'Redondo' : 'Quadrado'} - ${currentProject.cakeFloors} Andar(es) - ${currentProject.cakeSize || 'Tam. não inf.'}`;
    }

    if (currentProject.celebrantName) message += `\n👤 *Nome:* ${currentProject.celebrantName}`;
    if (currentProject.celebrantAge) message += `\n🎂 *Idade:* ${currentProject.celebrantAge}`;
    message += `\n📅 *Entrega:* ${dateFormatted}\n`;
    
    if (breakdown.totalDiscount > 0) message += `\n📉 *Desconto:* R$ ${breakdown.totalDiscount.toFixed(2)}`;
    if (breakdown.shipping > 0) message += `\n🚚 *Frete:* R$ ${breakdown.shipping.toFixed(2)}`;
    
    message += `\n💰 *VALOR TOTAL:* R$ ${breakdown.finalPrice.toFixed(2)}`;
    
    if (breakdown.downPayment > 0) {
      message += `\n💳 *Sinal:* R$ ${breakdown.downPayment.toFixed(2)}`;
      message += `\n⏳ *Falta:* R$ ${breakdown.remainingBalance.toFixed(2)}`;
    }

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
              <div style="margin-top: 10px; font-size: 11px; color: #6b7280; font-weight: 600; line-height: 1.5;">
                ${companyData.email ? `<div>${companyData.email}</div>` : ''}
                ${companyData.phone ? `<div>${companyData.phone}</div>` : ''}
                ${companyData.cnpj ? `<div>CNPJ: ${companyData.cnpj}</div>` : ''}
              </div>
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
            <div style="width: 350px;">
                <div style="padding: 10px 20px;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #6b7280; font-weight: 700;">
                        <span>Subtotal:</span>
                        <span>R$ ${calcBreakdown.basePieceValue.toFixed(2)}</span>
                    </div>
                    ${calcBreakdown.shipping > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #6b7280; font-weight: 700;"><span>Frete:</span><span>+ R$ ${calcBreakdown.shipping.toFixed(2)}</span></div>` : ''}
                    ${calcBreakdown.totalDiscount > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #ef4444; font-weight: 700;"><span>Desconto:</span><span>- R$ ${calcBreakdown.totalDiscount.toFixed(2)}</span></div>` : ''}
                </div>
                <div style="background: #111827; border-radius: 25px; padding: 30px; color: white; margin-top: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7;">Total Geral</span>
                    <span style="font-weight: 900; font-size: 28px;">R$ ${calcBreakdown.finalPrice.toFixed(2)}</span>
                  </div>
                </div>
            </div>
          </div>
          <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Orçamento válido por 7 dias</p>
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
    in_progress: 'Produzindo',
    pending_payment: 'Pag. Pendente',
    completed: 'Finalizado'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    approved: 'bg-pink-50 text-pink-700 border-pink-100',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
    pending_payment: 'bg-orange-50 text-orange-700 border-orange-100',
    completed: 'bg-green-50 text-green-700 border-green-100'
  };

  return (
    <div className="space-y-12 pb-24">
      {/* SEÇÃO NOVO ORÇAMENTO (FORMULÁRIO) - AGORA NO TOPO */}
      <div id="calc-form" className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pt-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <User size={14} className="text-pink-400" /> Cliente
                </label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-gray-700" value={currentProject.customerId} onChange={e => setCurrentProject({...currentProject, customerId: e.target.value})}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Store size={14} className="text-blue-400" /> Meio de Venda
                </label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-gray-700" value={currentProject.platformId} onChange={e => setCurrentProject({...currentProject, platformId: e.target.value})}>
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name} ({p.feePercentage}%)</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 md:col-span-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tema / Título do Pedido</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="Ex: Safari Baby para João" value={currentProject.theme} onChange={e => setCurrentProject({...currentProject, theme: e.target.value})} />
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data do Pedido</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600 focus:ring-2 focus:ring-pink-200" 
                    value={currentProject.orderDate} 
                    onChange={e => setCurrentProject({...currentProject, orderDate: e.target.value})} 
                  />
                </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Entrega</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-600 focus:ring-2 focus:ring-pink-200" 
                    value={currentProject.deliveryDate} 
                    onChange={e => setCurrentProject({...currentProject, deliveryDate: e.target.value})} 
                  />
                </div>
            </div>

            {/* SEÇÃO TOPO DE BOLO */}
            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Cake size={16} /> Detalhes do Topo de Bolo</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase">É Topo de Bolo?</span>
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-blue-500" 
                            checked={currentProject.isCakeTopper} 
                            onChange={e => setCurrentProject({...currentProject, isCakeTopper: e.target.checked})} 
                        />
                    </div>
                </div>

                {currentProject.isCakeTopper && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Formato do Bolo</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentProject({...currentProject, cakeShape: 'round'})}
                                    className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-1 transition-all ${currentProject.cakeShape === 'round' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                                >
                                    <Circle size={14} /> Redondo
                                </button>
                                <button 
                                    onClick={() => setCurrentProject({...currentProject, cakeShape: 'square'})}
                                    className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-1 transition-all ${currentProject.cakeShape === 'square' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                                >
                                    <Square size={14} /> Quadrado
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº de Andares</label>
                            <div className="flex gap-1">
                               {['1', '2', '3'].map(num => (
                                 <button
                                   key={num}
                                   type="button"
                                   onClick={() => setCurrentProject({...currentProject, cakeFloors: num})}
                                   className={`flex-1 py-3 rounded-xl border text-xs font-black transition-all ${currentProject.cakeFloors === num ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-400 border-gray-100'}`}
                                 >
                                   {num} {parseInt(num) === 1 ? 'Andar' : 'Andares'}
                                 </button>
                               ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tamanho/Medida (cm)</label>
                            <div className="relative">
                                <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input 
                                    type="text" 
                                    placeholder="Ex: 20cm"
                                    className="w-full pl-9 pr-3 py-3 bg-white border border-gray-100 rounded-xl outline-none font-bold text-gray-700 text-sm"
                                    value={currentProject.cakeSize}
                                    onChange={e => setCurrentProject({...currentProject, cakeSize: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                )}
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

            {/* CAMPO DE OBSERVAÇÕES */}
            <div className="space-y-2 pt-8 border-t border-gray-50">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <MessageSquare size={14} className="text-pink-500" /> Observações do Pedido
                </label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-600 min-h-[100px] resize-none focus:ring-4 focus:ring-pink-50 transition-all"
                  placeholder="Insira aqui observações importantes sobre o pedido, materiais específicos ou personalizações..."
                  value={currentProject.observations}
                  onChange={e => setCurrentProject({...currentProject, observations: e.target.value})}
                ></textarea>
            </div>

            {/* TABELA DE COMPOSIÇÃO FINANCEIRA DETALHADA */}
            <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                        <BarChart4 size={18} className="text-blue-500" /> Composição Financeira Detalhada
                    </h3>
                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                        Total Base Peça: R$ {breakdown.basePieceValue.toFixed(2)}
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4 text-right">Valor (R$)</th>
                                <th className="px-6 py-4 text-right">Proporção (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-bold text-gray-600">
                            <tr className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-yellow-50 text-yellow-500 rounded-xl"><Package size={14} /></div>
                                    <span>Material (Custo Variável)</span>
                                </td>
                                <td className="px-6 py-4 text-right">R$ {breakdown.variableCosts.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[10px] opacity-60">
                                    {breakdown.basePieceValue > 0 ? ((breakdown.variableCosts / breakdown.basePieceValue) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-pink-50 text-pink-500 rounded-xl"><Clock size={14} /></div>
                                    <span>Mão de Obra (Salário)</span>
                                </td>
                                <td className="px-6 py-4 text-right">R$ {breakdown.laborCosts.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[10px] opacity-60">
                                    {breakdown.basePieceValue > 0 ? ((breakdown.laborCosts / breakdown.basePieceValue) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Receipt size={14} /></div>
                                    <span>Custos Fixos (Estrutura)</span>
                                </td>
                                <td className="px-6 py-4 text-right">R$ {breakdown.fixedCosts.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[10px] opacity-60">
                                    {breakdown.basePieceValue > 0 ? ((breakdown.fixedCosts / breakdown.basePieceValue) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 text-gray-500 rounded-xl"><AlertCircle size={14} /></div>
                                    <span>Custos Variáveis / Segurança</span>
                                </td>
                                <td className="px-6 py-4 text-right">R$ {breakdown.excedente.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[10px] opacity-60">
                                    {breakdown.basePieceValue > 0 ? ((breakdown.excedente / breakdown.basePieceValue) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Store size={14} /></div>
                                    <span>Custo Meio de Venda (Taxas)</span>
                                </td>
                                <td className="px-6 py-4 text-right">R$ {breakdown.platformFees.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[10px] opacity-60">
                                    {breakdown.finalPrice > 0 ? ((breakdown.platformFees / (breakdown.finalPrice - breakdown.shipping)) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr className="bg-green-50/50">
                                <td className="px-6 py-4 flex items-center gap-3 font-black text-green-700">
                                    <div className="p-2 bg-green-500 text-white rounded-xl"><Zap size={14} /></div>
                                    <span>Lucro Líquido Real</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-green-700">R$ {breakdown.profit.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[10px] font-black text-green-500">
                                    {breakdown.basePieceValue > 0 ? ((breakdown.profit / breakdown.basePieceValue) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Info size={16} className="text-blue-400 shrink-0" />
                    <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic">
                        * O <strong>Lucro Líquido</strong> é o que sobra para sua empresa investir em novos equipamentos após você já ter recebido seu <strong>Salário</strong> (Mão de Obra) e pago todas as <strong>Taxas</strong> e <strong>Materiais</strong>.
                    </p>
                </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 sticky top-8 space-y-6">
          <div className="bg-white rounded-[3rem] shadow-xl border border-pink-100 overflow-hidden">
            <div className="p-8 space-y-6">
              {/* BLOCO DE VALORES ADICIONAIS */}
              <div className="space-y-4 pb-6 border-b border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ajustes Financeiros</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1"><Truck size={10} /> Frete (R$)</label>
                          <input 
                            type="number" step="0.01"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-gray-700 text-sm focus:ring-2 focus:ring-pink-200"
                            value={currentProject.shipping}
                            onChange={e => setCurrentProject({...currentProject, shipping: parseFloat(e.target.value) || 0})}
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1"><Percent size={10} /> Desconto (%)</label>
                          <input 
                            type="number" step="1"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-red-500 text-sm focus:ring-2 focus:ring-pink-200"
                            value={currentProject.discountPercentage}
                            onChange={e => setCurrentProject({...currentProject, discountPercentage: parseFloat(e.target.value) || 0})}
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1"><Ticket size={10} /> Desconto (R$)</label>
                          <input 
                            type="number" step="0.01"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-red-500 text-sm focus:ring-2 focus:ring-pink-200"
                            value={currentProject.discountAmount}
                            onChange={e => setCurrentProject({...currentProject, discountAmount: parseFloat(e.target.value) || 0})}
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1"><Wallet size={10} /> Sinal / Entrada (R$)</label>
                          <input 
                            type="number" step="0.01"
                            className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl outline-none font-black text-blue-600 text-sm focus:ring-2 focus:ring-blue-200"
                            value={currentProject.downPayment}
                            onChange={e => setCurrentProject({...currentProject, downPayment: parseFloat(e.target.value) || 0})}
                          />
                      </div>
                  </div>
              </div>

              {/* TOTAL DO ORÇAMENTO */}
              <div className="bg-pink-600 p-8 rounded-[2.5rem] text-white text-center shadow-lg shadow-pink-100">
                <h3 className="text-xs font-black opacity-70 uppercase tracking-[0.2em] mb-2">Total do Orçamento</h3>
                <p className="text-5xl font-black">R$ {breakdown.finalPrice.toFixed(2)}</p>
                {breakdown.downPayment > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                     <p className="text-[10px] font-black opacity-70 uppercase tracking-[0.2em]">Sinal Recebido</p>
                     <p className="text-xl font-black text-yellow-300">R$ {breakdown.downPayment.toFixed(2)}</p>
                     <p className="text-[10px] font-black opacity-70 uppercase tracking-[0.2em] mt-2">Saldo a Receber</p>
                     <p className="text-2xl font-black text-white">R$ {breakdown.remainingBalance.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* RESUMO RÁPIDO */}
              <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                      <span>Subtotal Itens:</span>
                      <span>R$ {breakdown.basePieceValue.toFixed(2)}</span>
                  </div>
                  {breakdown.totalDiscount > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold text-red-500">
                          <span>Total Desconto:</span>
                          <span>- R$ {breakdown.totalDiscount.toFixed(2)}</span>
                      </div>
                  )}
                  {breakdown.downPayment > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-blue-600 bg-blue-50 p-2 rounded-lg">
                          <span>Falta Receber:</span>
                          <span>R$ {breakdown.remainingBalance.toFixed(2)}</span>
                      </div>
                  )}
              </div>

              <div className="space-y-3 pt-4">
                <button onClick={handleSaveProject} className="w-full py-5 bg-pink-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 hover:bg-pink-700"><Save size={20} /> Salvar Orçamento</button>
                <button onClick={() => handleGeneratePDF()} disabled={isGeneratingPdf} className="w-full py-5 bg-blue-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 hover:bg-blue-600">
                  {isGeneratingPdf ? <RefreshCcw className="animate-spin" /> : <File size={20} />} Gerar PDF
                </button>
                <button onClick={handleWhatsAppShare} className="w-full py-5 bg-green-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 hover:bg-green-600"><MessageCircle size={20} /> Enviar Zap</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE ORÇAMENTOS - MOVIDO PARA BAIXO DO FORMULÁRIO */}
      <div className="space-y-8 animate-fadeIn border-t border-gray-100 pt-16">
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
                
                {/* DETALHES FINANCEIROS NO HISTÓRICO */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Truck size={8} /> Frete</span>
                      <span className="text-xs font-black text-gray-700">R$ {histBreakdown.shipping.toFixed(2)}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Wallet2 size={8} /> Entrada</span>
                      <span className="text-xs font-black text-blue-600">R$ {histBreakdown.downPayment.toFixed(2)}</span>
                   </div>
                   <div className="flex flex-col col-span-2 pt-2 border-t border-gray-200">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Falta Pagar (Restante)</span>
                      <span className="text-sm font-black text-pink-600">R$ {histBreakdown.remainingBalance.toFixed(2)}</span>
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
    </div>
  );
};
