import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  ExternalLink, 
  MessageCircle, 
  ShoppingCart, 
  Info, 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Eye,
  ShieldCheck,
  MapPin,
  Sparkles,
  Send,
  Copy,
  Check,
  Clock,
  Home,
  Truck,
  ChevronLeft,
  ChevronRight,
  Phone,
  Instagram,
  AlertCircle,
  Share2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Product, CompanyData, Material, Platform } from '../types';
import { calculateProjectBreakdown } from '../utils';

declare const html2canvas: any;

interface PublicCatalogProps {
  userEmail: string;
  onOrderCreated?: (newProject: any, newTransaction: any, newCustomer?: any) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({ userEmail, onOrderCreated }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [modalQty, setModalQty] = useState(1);
  const [addedItemFeedback, setAddedItemFeedback] = useState<string | null>(null);
  
  // Estados do Carrinho & Checkout Automatizado
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartStep, setCartStep] = useState<'items' | 'checkout' | 'success'>('items');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState('');
  const [lastOrderMessage, setLastOrderMessage] = useState('');

  // Dados do Formulário do Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [orderObservations, setOrderObservations] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  const orderSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Tentar buscar dados públicos no Supabase
        const { data, error } = await supabase
          .from('user_data')
          .select('app_state')
          .eq('user_email', userEmail.toLowerCase())
          .maybeSingle();

        if (data?.app_state) {
          const s = data.app_state;
          setProducts(s.craft_products || []);
          setCompanyData(s.craft_company || null);
          setMaterials(s.craft_materials || []);
          setPlatforms(s.craft_platforms || []);
        } else {
          // 2. Fallback de localStorage estritamente isolado por artesão
          const userKey = userEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          const localCompany = localStorage.getItem(`${userKey}_craft_company`);
          const localProducts = localStorage.getItem(`${userKey}_craft_products`);
          const localMaterials = localStorage.getItem(`${userKey}_craft_materials`);
          const localPlatforms = localStorage.getItem(`${userKey}_craft_platforms`);

          if (localCompany) {
            try { setCompanyData(JSON.parse(localCompany)); } catch (e) {}
          }
          if (localProducts) {
            try { setProducts(JSON.parse(localProducts)); } catch (e) {}
          }
          if (localMaterials) {
            try { setMaterials(JSON.parse(localMaterials)); } catch (e) {}
          }
          if (localPlatforms) {
            try { setPlatforms(JSON.parse(localPlatforms)); } catch (e) {}
          }
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo público:", err);
        // Fallback secundário isolado por artesão
        const userKey = userEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const localCompany = localStorage.getItem(`${userKey}_craft_company`);
        const localProducts = localStorage.getItem(`${userKey}_craft_products`);
        if (localCompany) {
          try { setCompanyData(JSON.parse(localCompany)); } catch (e) {}
        }
        if (localProducts) {
          try { setProducts(JSON.parse(localProducts)); } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchData();
  }, [userEmail]);

  // Atualiza quantidade mínima ao selecionar produto no modal
  useEffect(() => {
    if (selectedProduct) {
      setModalQty(selectedProduct.minOrderQuantity || 1);
    }
  }, [selectedProduct]);

  // Formatação automática de telefone (99) 99999-9999
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setCustomerPhone(formatted);
    if (formErrors.phone) {
      setFormErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const getProductPrice = (p: Product): number => {
    if (p.marketPrice && p.marketPrice > 0) return p.marketPrice;
    if (companyData) {
      try {
        const mockProject = { 
          items: [{ 
            productId: p.id, 
            name: p.name, 
            quantity: 1, 
            hoursToMake: (p.minutesToMake || 0) / 60, 
            materials: p.materials || [], 
            profitMargin: p.profitMargin || 30, 
            packagingCost: p.packagingCost || 0, 
            minOrderQuantity: p.minOrderQuantity || 1 
          }], 
          platformId: platforms[0]?.id || '', 
          excedente: companyData.defaultExcedente || 10 
        };
        const breakdown = calculateProjectBreakdown(mockProject as any, materials || [], platforms || [], companyData);
        if (breakdown.finalPrice && breakdown.finalPrice > 0) {
          return breakdown.finalPrice;
        }
      } catch (e) {
        // Silently fallback
      }
    }
    return p.marketPrice || 0;
  };

  const visibleProducts = products.filter(p => p.showInCatalog !== false);
  const categories = ['Todas', ...Array.from(new Set(visibleProducts.map(p => p.category).filter(Boolean)))];

  const filteredProducts = visibleProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsAppContact = (productName: string, price: number) => {
    const phone = companyData?.phone?.replace(/\D/g, '') || '';
    if (!phone) {
      alert('O ateliê não possui número de WhatsApp cadastrado no momento.');
      return;
    }
    const message = encodeURIComponent(`Olá! Vi o produto *${productName}* (R$ ${price.toFixed(2)}) no seu catálogo online da *${companyData?.name || 'loja'}* e gostaria de mais informações.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const addToCart = (product: Product, price: number, qtyToAdd?: number) => {
    const min = product.minOrderQuantity || 1;
    const addAmount = qtyToAdd !== undefined ? qtyToAdd : min;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + addAmount } 
            : item
        );
      }
      return [...prev, { product, quantity: addAmount, price }];
    });

    // Feedback visual
    setAddedItemFeedback(product.id);
    setTimeout(() => {
      setAddedItemFeedback(null);
    }, 1500);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const min = item.product.minOrderQuantity || 1;
        const newQty = Math.max(min, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Validação do checkout
  const validateForm = () => {
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!customerName.trim()) {
      errors.name = 'Por favor, informe seu nome completo.';
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errors.phone = 'Informe um número de WhatsApp válido com DDD.';
    }
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      errors.address = 'Informe o endereço de entrega completo.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Passo 2: Envia o pedido via WhatsApp, salva no Cronograma & Financeiro e finaliza com sucesso
  const handleFinishAndSendOrder = async () => {
    if (!validateForm()) return;
    if (cart.length === 0) return;

    const phone = companyData?.phone?.replace(/\D/g, '') || '';
    if (!phone) {
      alert('Número de WhatsApp do ateliê não encontrado. Entre em contato diretamente.');
      return;
    }

    setIsProcessingOrder(true);
    const orderNum = completedOrderNumber || `#PED-${Math.floor(1000 + Math.random() * 9000)}`;
    setCompletedOrderNumber(orderNum);

    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-BR');
    const horaStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let deliveryDetails = '';
    if (deliveryType === 'pickup') {
      deliveryDetails = '• *Modalidade:* 🏬 Retirada no Ateliê';
    } else {
      deliveryDetails = `• *Modalidade:* 🚚 Entrega / Envio\n• *Endereço:* ${deliveryAddress}${deliveryNeighborhood ? `, Bairro ${deliveryNeighborhood}` : ''}${deliveryCity ? ` - ${deliveryCity}` : ''}`;
    }

    let itemsText = '';
    cart.forEach((item, idx) => {
      const sub = (item.price * item.quantity).toFixed(2);
      itemsText += `${idx + 1}. *${item.product.name}*\n   ↳ ${item.quantity}x de R$ ${item.price.toFixed(2)} = *R$ ${sub}*\n`;
    });

    const message = 
`🛍️ *NOVO PEDIDO ONLINE • ${orderNum}*
━━━━━━━━━━━━━━━━━━━━━━━━
🏪 *Ateliê:* ${companyData?.name || 'Ateliê'}
📅 *Data:* ${dataStr} às ${horaStr}

👤 *DADOS DO CLIENTE*
• *Nome:* ${customerName.trim()}
• *WhatsApp:* ${customerPhone.trim()}${customerEmail ? `\n• *E-mail:* ${customerEmail.trim()}` : ''}

📦 *ITENS DO PEDIDO*
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 *VALOR TOTAL: R$ ${cartTotal.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━━━━━

🚚 *ENTREGA / RETIRADA*
${deliveryDetails}

📝 *DETALHES / PERSONALIZAÇÃO*
• ${orderObservations.trim() || 'Sem observações adicionais informadas no pedido.'}

━━━━━━━━━━━━━━━━━━━━━━━━
✨ _Olá! Gostaria de confirmar meu pedido feito pelo seu Catálogo Online. Segue o resumo acima para combinarmos os detalhes e pagamento!_`;

    setLastOrderMessage(message);

    // AUTOMATIZAÇÃO: Inserir pedido no Cronograma e lançar receita no Financeiro (Compra pelo Catálogo)
    try {
      const orderPayload = {
        userEmail,
        orderNum,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deliveryType,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryNeighborhood: deliveryNeighborhood.trim() || undefined,
        deliveryCity: deliveryCity.trim() || undefined,
        paymentMethod: 'A combinar',
        cartTotal,
        items: cart.map(i => ({
          product: i.product,
          quantity: i.quantity,
          price: i.price
        })),
        orderObservations: orderObservations.trim() || undefined
      };

      // 1. Enviar para a API de automação integrada
      const apiPromise = fetch('/api/catalog/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      }).then(r => r.ok ? r.json() : null).catch(err => {
        console.warn("Aviso ao submeter pedido via API:", err);
        return null;
      });

      // 2. Criar objetos localmente para resposta instantânea e redundância offline
      const userKey = userEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = now.toISOString().split('T')[0];
      const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const projId = `proj_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const txId = `tx_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const custId = `cust_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

      const itemsSummary = cart.map(i => `${i.quantity}x ${i.product.name}`).join(', ');

      const localProject = {
        id: projId,
        name: `Pedido Catálogo: ${customerName.trim()}`,
        customerId: custId,
        description: itemsSummary,
        observations: orderObservations.trim() || '',
        notes: `Origem: Catálogo Online • Pedido ${orderNum}\nModalidade: ${deliveryType === 'pickup' ? 'Retirada no Ateliê' : (deliveryAddress || 'Entrega')}\nPagamento: A combinar via WhatsApp`,
        items: cart.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          hoursToMake: ((i.product.minutesToMake || 60) / 60),
          materials: i.product.materials || [],
          profitMargin: i.product.profitMargin || 30,
          unitPrice: i.price,
          manualBaseCost: i.product.manualBaseCost || 0,
          packagingCost: i.product.packagingCost || 0,
          minOrderQuantity: i.product.minOrderQuantity || 1
        })),
        platformId: '',
        excedente: 0,
        status: 'pending' as const,
        createdAt: now.toISOString(),
        dueDate: dueDate,
        orderDate: dateStr,
        deliveryDate: dueDate,
        theme: orderObservations.trim() ? orderObservations.trim().slice(0, 40) : 'Catálogo Online',
        celebrantName: customerName.trim(),
        celebrantAge: '',
        quoteNumber: orderNum,
        paymentMethod: 'A combinar',
        hoursToMake: cart.reduce((acc, i) => acc + (((i.product.minutesToMake || 60) / 60) * i.quantity), 0),
        materials: [],
        profitMargin: 30,
        quantity: cart.reduce((acc, i) => acc + i.quantity, 0),
        downPayment: cartTotal
      };

      const localTransaction = {
        id: txId,
        description: `Compra pelo Catálogo - ${customerName.trim()} (${orderNum})`,
        amount: cartTotal,
        type: 'income' as const,
        category: 'Compra pelo Catálogo',
        paymentMethod: 'A combinar',
        date: dateStr,
        status: 'pending' as const,
        projectId: projId,
        customerId: custId
      };

      const localCustomer = {
        id: custId,
        name: customerName.trim(),
        birthDate: '',
        phone: customerPhone.trim(),
        address: deliveryAddress.trim(),
        neighborhood: deliveryNeighborhood.trim(),
        zipCode: ''
      };

      try {
        const projectsKey = `${userKey}_craft_projects`;
        const existingProjects = JSON.parse(localStorage.getItem(projectsKey) || '[]');
        if (!existingProjects.some((p: any) => p.quoteNumber === orderNum || p.id === projId)) {
          existingProjects.unshift(localProject);
          localStorage.setItem(projectsKey, JSON.stringify(existingProjects));
        }

        const transKey = `${userKey}_craft_transactions`;
        const existingTrans = JSON.parse(localStorage.getItem(transKey) || '[]');
        if (!existingTrans.some((t: any) => t.id === txId)) {
          existingTrans.unshift(localTransaction);
          localStorage.setItem(transKey, JSON.stringify(existingTrans));
        }

        const custKey = `${userKey}_craft_customers`;
        const existingCusts = JSON.parse(localStorage.getItem(custKey) || '[]');
        if (!existingCusts.some((c: any) => c.phone && c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''))) {
          existingCusts.push(localCustomer);
          localStorage.setItem(custKey, JSON.stringify(existingCusts));
        }

        const catKey = `${userKey}_craft_trans_categories`;
        const existingCats = JSON.parse(localStorage.getItem(catKey) || '[]');
        if (Array.isArray(existingCats) && !existingCats.includes('Compra pelo Catálogo')) {
          existingCats.push('Compra pelo Catálogo');
          localStorage.setItem(catKey, JSON.stringify(existingCats));
        }
      } catch (cacheErr) {
        console.warn("Aviso ao sincronizar cache local de pedido:", cacheErr);
      }

      if (onOrderCreated) {
        onOrderCreated(localProject, localTransaction, localCustomer);
      }

      apiPromise.then(res => {
        if (res?.project && onOrderCreated) {
          onOrderCreated(res.project, res.transaction, res.customerId ? { ...localCustomer, id: res.customerId } : undefined);
        }
      });
    } catch (autoErr) {
      console.warn("Aviso na automação do pedido:", autoErr);
    }

    // Salvar pedido no histórico local
    try {
      const existingOrders = JSON.parse(localStorage.getItem('my_online_orders') || '[]');
      existingOrders.unshift({
        orderNum,
        date: new Date().toISOString(),
        customerName,
        customerPhone,
        total: cartTotal,
        items: cart.map(i => ({ name: i.product.name, qty: i.quantity, price: i.price })),
        deliveryType,
        paymentMethod: 'A combinar'
      });
      localStorage.setItem('my_online_orders', JSON.stringify(existingOrders.slice(0, 20)));
    } catch (e) {}

    // Tentar gerar imagem de resumo para download em segundo plano
    try {
      if (orderSummaryRef.current && typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(orderSummaryRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        });
        const imageData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `comprovante-pedido-${orderNum.replace('#', '')}.png`;
        link.href = imageData;
        link.click();
      }
    } catch (e) {
      console.warn("Não foi possível gerar a imagem automática:", e);
    }

    // Disparar abertura do WhatsApp
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setIsProcessingOrder(false);
    setCartStep('success');
  };

  const handleProcessOrder = handleFinishAndSendOrder;

  const copyCatalogLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const resetCartAfterSuccess = () => {
    setCart([]);
    setCartStep('items');
    setIsCartOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setDeliveryAddress('');
    setOrderObservations('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag size={20} className="text-pink-500" />
          </div>
        </div>
        <p className="text-pink-500 font-black text-xs uppercase tracking-widest">Carregando Catálogo Oficial...</p>
      </div>
    );
  }

  if (!companyData && !loading) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-pink-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Package size={44} className="text-pink-400" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">Catálogo não encontrado</h2>
        <p className="text-gray-400 max-w-xs text-sm">O ateliê solicitado ainda não configurou seu catálogo online ou o link está incorreto.</p>
      </div>
    );
  }

  const companyLogo = companyData?.logo || '/images/papelietes_calcula_logo.png';

  return (
    <div className="min-h-screen bg-[#fffcf5] font-['Quicksand'] text-[#4b5563]">
      {/* BARRA SUPERIOR ELEGANTE COM LOGO DA EMPRESA */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100/70 sticky top-0 z-30 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo e Nome da Empresa */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center shadow-md shadow-pink-100/50 p-1 border-2 border-pink-100 shrink-0 overflow-hidden group">
              <img 
                src={companyLogo} 
                alt={companyData?.name || 'Logo Ateliê'} 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-gray-800 tracking-tight leading-none">
                  {companyData?.name || 'Meu Ateliê'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black text-pink-600 bg-pink-50 border border-pink-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-pink-500" /> Oficial
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Pedidos Abertos
                </span>
                {companyData?.city && (
                  <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-gray-400">
                    <MapPin size={11} className="text-pink-400" /> {companyData.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações da Barra Superior */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Link Compartilhar */}
            <button
              onClick={copyCatalogLink}
              className="p-2.5 sm:px-3.5 sm:py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold border border-gray-100"
              title="Copiar Link do Catálogo"
            >
              {linkCopied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
              <span className="hidden md:inline">{linkCopied ? 'Link Copiado!' : 'Compartilhar'}</span>
            </button>

            {/* Contato WhatsApp */}
            {companyData?.phone && (
              <button 
                onClick={() => window.open(`https://wa.me/${companyData.phone?.replace(/\D/g, '')}`, '_blank')}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl transition-all flex items-center gap-2 font-black text-xs border border-emerald-200/60 shadow-sm"
                title="Falar no WhatsApp"
              >
                <MessageCircle size={17} className="text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            {/* BOTÃO DO CARRINHO (ROSA) */}
            <button 
              onClick={() => {
                setCartStep('items');
                setIsCartOpen(true);
              }}
              className="bg-pink-500 hover:bg-pink-600 active:scale-95 text-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl transition-all shadow-lg shadow-pink-200/70 flex items-center gap-2.5 relative"
            >
              <div className="relative">
                <ShoppingCart size={18} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-white text-pink-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-pink-500 shadow-sm animate-scaleIn">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-black text-xs uppercase tracking-wider">
                {cartTotal > 0 ? `R$ ${cartTotal.toFixed(2)}` : 'Carrinho'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* VITRINE / HERO PROFISSIONAL COM LOGO DESTACADA */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pink-100/60 via-pink-50/40 to-[#fffcf5] border-b border-pink-100/60 py-12 md:py-16">
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 right-10 w-72 h-72 bg-pink-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-rose-200/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
          {/* Logo da Empresa em Destaque no Hero */}
          <div className="relative mb-6">
            <div className="w-28 h-28 md:w-36 md:h-36 bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl shadow-pink-200/80 p-3 border-4 border-white ring-4 ring-pink-100 flex items-center justify-center overflow-hidden">
              <img 
                src={companyLogo} 
                alt={companyData?.name || 'Logo Ateliê'} 
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="absolute -bottom-2.5 bg-pink-500 text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md flex items-center gap-1 border-2 border-white">
              <Sparkles size={11} /> Catálogo Oficial
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-800 tracking-tight max-w-3xl leading-tight mb-3">
            {companyData?.name || 'Nosso Ateliê Personalizado'}
          </h2>

          <p className="text-gray-500 font-medium max-w-xl text-base md:text-lg mb-8 leading-relaxed">
            {companyData?.catalogSubtitle || 'Peças artesanais e papelaria personalizada produzidas com amor, dedicação e exclusividade para o seu momento especial.'}
          </p>

          {/* Selos de Confiança e Atendimento */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mb-10 text-xs font-bold text-gray-600">
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-100 shadow-sm">
              <MessageCircle size={15} className="text-emerald-500" />
              <span>Atendimento via WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-100 shadow-sm">
              <Truck size={15} className="text-pink-500" />
              <span>Retirada & Envio</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-100 shadow-sm">
              <Sparkles size={15} className="text-pink-500" />
              <span>Personalizados com Amor</span>
            </div>
            {companyData?.instagram && (
              <a 
                href={`https://instagram.com/${companyData.instagram.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-100 shadow-sm hover:text-pink-600 transition-colors"
              >
                <Instagram size={15} className="text-pink-500" />
                <span>{companyData.instagram.startsWith('@') ? companyData.instagram : `@${companyData.instagram}`}</span>
              </a>
            )}
          </div>

          {/* BARRA DE PESQUISA REFINADA */}
          <div className="w-full max-w-2xl relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-pink-400" size={22} />
            <input 
              type="text" 
              placeholder="Buscar por topo de bolo, lembrancinhas, kits..." 
              className="w-full pl-16 pr-12 py-4 sm:py-5 bg-white border-2 border-pink-100 focus:border-pink-300 rounded-[2rem] shadow-xl shadow-pink-100/30 outline-none transition-all font-bold text-gray-700 placeholder-gray-400 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL DO CATÁLOGO */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {/* BARRA DE CONTROLE: CATEGORIAS & MODO DE EXIBIÇÃO */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-gray-100 mb-10">
          {/* Filtros de Categoria em Chips */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map(cat => {
              const count = cat === 'Todas' 
                ? visibleProducts.length 
                : visibleProducts.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-2 ${
                    selectedCategory === cat 
                      ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100' 
                      : 'bg-white text-gray-600 border-gray-200/80 hover:border-pink-200 hover:bg-pink-50/50'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Visualização e Contador */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <p className="text-xs font-bold text-gray-400">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Modo Grade"
              >
                <LayoutGrid size={17} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Modo Lista"
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* LISTAGEM DE PRODUTOS */}
        {filteredProducts.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {filteredProducts.map(p => {
                const finalPrice = getProductPrice(p);
                const isJustAdded = addedItemFeedback === p.id;
                const imagesCount = [p.image, ...(p.images || [])].filter(Boolean).length;

                return (
                  <div 
                    key={p.id} 
                    className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col cursor-pointer border border-pink-100/70 overflow-hidden"
                    onClick={() => {
                      setSelectedProduct(p);
                      setActiveImageIdx(0);
                    }}
                  >
                    {/* Imagem do Produto */}
                    <div className="aspect-square bg-pink-50/40 relative overflow-hidden">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-pink-200">
                          <Package size={56} />
                        </div>
                      )}

                      {/* Tag de Categoria */}
                      <div className="absolute top-3.5 left-3.5">
                        <span className="text-[10px] font-black text-pink-600 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-pink-100">
                          {p.category}
                        </span>
                      </div>

                      {/* Indicador de Quantidade Mínima */}
                      {p.minOrderQuantity && p.minOrderQuantity > 1 && (
                        <div className="absolute bottom-3 left-3 bg-gray-900/80 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          Mín. {p.minOrderQuantity} un
                        </div>
                      )}

                      {/* Quantidade de Fotos */}
                      {imagesCount > 1 && (
                        <div className="absolute top-3.5 right-3.5 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {imagesCount} fotos
                        </div>
                      )}

                      {/* Botões de Ação Rápida no Hover */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                            setActiveImageIdx(0);
                          }}
                          className="w-11 h-11 bg-white text-gray-700 hover:text-pink-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                          title="Ver Detalhes do Produto"
                        >
                          <Eye size={19} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppContact(p.name, finalPrice);
                          }}
                          className="w-11 h-11 bg-emerald-500 text-white hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                          title="Tirar Dúvida no WhatsApp"
                        >
                          <MessageCircle size={19} />
                        </button>
                      </div>
                    </div>

                    {/* Dados e Preço */}
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-gray-800 mb-1.5 line-clamp-1 group-hover:text-pink-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-4 flex-1">
                        {p.description || 'Produto artesanal personalizado feito com materiais de alta qualidade sob encomenda.'}
                      </p>

                      <div className="flex items-baseline justify-between mb-4 pt-2 border-t border-gray-50">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">A partir de</p>
                          <p className="text-2xl font-black text-gray-800">
                            R$ {finalPrice.toFixed(2)}
                          </p>
                        </div>
                        {p.minOrderQuantity && p.minOrderQuantity > 1 && (
                          <span className="text-[10px] text-gray-400 font-bold">
                            R$ {(finalPrice * p.minOrderQuantity).toFixed(2)} ({p.minOrderQuantity} un)
                          </span>
                        )}
                      </div>

                      {/* BOTÃO ADICIONAR AO CARRINHO: ALTERADO DE PRETO PARA ROSA */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p, finalPrice);
                        }}
                        className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                          isJustAdded
                            ? 'bg-emerald-500 text-white shadow-emerald-200'
                            : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200/80 hover:shadow-pink-300'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check size={16} className="animate-scaleIn" />
                            <span>Adicionado!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            <span>Adicionar ao Carrinho</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Modo Lista */
            <div className="space-y-4">
              {filteredProducts.map(p => {
                const finalPrice = getProductPrice(p);
                const isJustAdded = addedItemFeedback === p.id;

                return (
                  <div 
                    key={p.id}
                    className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-100/70 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-6 cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(p);
                      setActiveImageIdx(0);
                    }}
                  >
                    <div className="w-full sm:w-36 h-36 bg-pink-50/40 rounded-2xl overflow-hidden shrink-0 relative">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-pink-200"><Package size={40} /></div>
                      )}
                      <span className="absolute top-2 left-2 text-[9px] font-black text-pink-600 bg-white/95 px-2.5 py-0.5 rounded-full uppercase">
                        {p.category}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{p.name}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3 max-w-xl">
                        {p.description || 'Produto artesanal personalizado feito com carinho.'}
                      </p>
                      {p.minOrderQuantity && p.minOrderQuantity > 1 && (
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">
                          Pedido Mínimo: {p.minOrderQuantity} unidades
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
                      <div className="text-center sm:text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Unitário</span>
                        <span className="text-2xl font-black text-gray-800">R$ {finalPrice.toFixed(2)}</span>
                      </div>

                      {/* BOTÃO ADICIONAR AO CARRINHO (ROSA) */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p, finalPrice);
                        }}
                        className={`py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                          isJustAdded
                            ? 'bg-emerald-500 text-white'
                            : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200/80'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check size={16} />
                            <span>Adicionado!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            <span>Adicionar ao Carrinho</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-pink-300">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-1">Nenhum produto encontrado</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
              Não encontramos nenhum item para o termo buscado ou filtro selecionado.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); }}
              className="bg-pink-50 text-pink-600 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-pink-100 transition-colors"
            >
              Ver todos os produtos
            </button>
          </div>
        )}
      </main>

      {/* RODAPÉ PROFISSIONAL */}
      <footer className="bg-white border-t border-pink-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm p-1 border border-pink-100 shrink-0">
              <img 
                src={companyLogo} 
                alt={companyData?.name || 'Logo'} 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="text-left">
              <h4 className="font-black text-gray-800 text-base">{companyData?.name || 'Nosso Ateliê'}</h4>
              <p className="text-xs text-gray-400 font-medium">Catálogo Oficial de Produtos Personalizados</p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs font-bold text-gray-600 flex items-center justify-center md:justify-end gap-2">
              <ShieldCheck size={16} className="text-emerald-500" /> Compra segura com atendimento humano no WhatsApp
            </p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">
              Desenvolvido para {companyData?.name || 'Ateliê'} • Papelietes Calcula
            </p>
          </div>
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE DO CARRINHO (ROSA) */}
      {cart.length > 0 && !isCartOpen && (
        <button 
          onClick={() => {
            setCartStep('items');
            setIsCartOpen(true);
          }}
          className="fixed bottom-6 right-6 bg-pink-500 hover:bg-pink-600 text-white p-4 sm:px-6 sm:py-4 rounded-full shadow-2xl shadow-pink-300/80 z-40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 animate-bounce"
        >
          <div className="relative">
            <ShoppingBag size={24} />
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              {cartItemCount}
            </span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-wider text-pink-100 leading-none">Ver Pedido</p>
            <p className="text-sm font-black leading-none mt-1">R$ {cartTotal.toFixed(2)}</p>
          </div>
        </button>
      )}

      {/* MODAL DE DETALHES COMPLETOS DO PRODUTO */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fadeIn flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedProduct(null)}
          ></div>
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 animate-scaleIn border border-pink-100">
            {/* Fechar Modal */}
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-20 bg-white/90 p-2.5 rounded-full shadow-sm"
            >
              <X size={20} />
            </button>

            {/* Galeria de Fotos */}
            <div className="w-full md:w-1/2 bg-pink-50/30 flex flex-col justify-between p-6 border-b md:border-b-0 md:border-r border-pink-100/60">
              {(() => {
                const allImages = [selectedProduct.image, ...(selectedProduct.images || [])].filter(Boolean) as string[];
                return (
                  <>
                    <div className="w-full aspect-square bg-white rounded-3xl overflow-hidden shadow-sm flex items-center justify-center relative p-2">
                      {allImages.length > 0 ? (
                        <img 
                          src={allImages[activeImageIdx] || allImages[0]} 
                          alt={selectedProduct.name} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex items-center justify-center text-pink-200">
                          <Package size={72} />
                        </div>
                      )}
                    </div>

                    {/* Miniaturas se houver mais de uma */}
                    {allImages.length > 1 && (
                      <div className="flex gap-2.5 overflow-x-auto pt-4 no-scrollbar justify-center">
                        {allImages.map((img, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setActiveImageIdx(idx)}
                            className={`w-14 h-14 rounded-xl border-2 overflow-hidden transition-all shrink-0 bg-white ${
                              activeImageIdx === idx ? 'border-pink-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Informações e Botão Rosa */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between bg-white overflow-y-auto custom-scrollbar">
              <div>
                <span className="text-[10px] font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider border border-pink-100">
                  {selectedProduct.category}
                </span>
                <h3 className="text-2xl font-black text-gray-800 mt-3 mb-2 leading-tight">
                  {selectedProduct.name}
                </h3>

                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                  {selectedProduct.description || 'Peça produzida artesanalmente com materiais de alta qualidade e acabamento impecável. Ideal para tornar sua comemoração inesquecível.'}
                </p>

                {selectedProduct.minOrderQuantity && selectedProduct.minOrderQuantity > 1 && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 rounded-2xl border border-amber-100 mb-6 text-amber-800">
                    <Info size={16} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-bold">
                      Este produto possui quantidade mínima de <strong>{selectedProduct.minOrderQuantity} unidades</strong>.
                    </p>
                  </div>
                )}

                {/* Seletor de Quantidade */}
                <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Quantidade:</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        const min = selectedProduct.minOrderQuantity || 1;
                        setModalQty(prev => Math.max(min, prev - 1));
                      }}
                      className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-pink-600 font-black shadow-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-black text-gray-800">{modalQty}</span>
                    <button 
                      onClick={() => setModalQty(prev => prev + 1)}
                      className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-pink-600 font-black shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Preço e Ações */}
              <div className="pt-4 border-t border-gray-100">
                {(() => {
                  const unitPrice = getProductPrice(selectedProduct);
                  const totalPrice = unitPrice * modalQty;
                  return (
                    <>
                      <div className="flex items-baseline justify-between mb-5">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Subtotal</span>
                          <span className="text-3xl font-black text-gray-900">R$ {totalPrice.toFixed(2)}</span>
                        </div>
                        {modalQty > 1 && (
                          <span className="text-xs text-gray-400 font-bold">R$ {unitPrice.toFixed(2)} / un</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Botão WhatsApp */}
                        <button 
                          onClick={() => handleWhatsAppContact(selectedProduct.name, unitPrice)}
                          className="py-3.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all"
                        >
                          <MessageCircle size={17} className="text-emerald-600" />
                          <span>Dúvida no WhatsApp</span>
                        </button>

                        {/* BOTÃO ADICIONAR AO CARRINHO (ROSA) */}
                        <button 
                          onClick={() => {
                            addToCart(selectedProduct, unitPrice, modalQty);
                            setSelectedProduct(null);
                          }}
                          className="py-3.5 px-4 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-200/80 transition-all"
                        >
                          <ShoppingCart size={17} />
                          <span>Adicionar ao Carrinho</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DO CARRINHO & CHECKOUT AUTOMATIZADO */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-end animate-fadeIn">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsCartOpen(false)}
          ></div>
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col z-10 animate-slideInRight relative overflow-hidden">
            {/* Header do Carrinho */}
            <div className="p-6 border-b border-pink-100 flex items-center justify-between bg-pink-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-pink-200">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 leading-none">
                    {cartStep === 'items' && 'Seu Carrinho de Compras'}
                    {cartStep === 'checkout' && 'Dados de Entrega & Contato'}
                    {cartStep === 'success' && 'Pedido Enviado com Sucesso!'}
                  </h3>
                  <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mt-1">
                    {cartStep === 'items' && `${cartItemCount} itens adicionados`}
                    {cartStep === 'checkout' && 'Passo 2 de 2 • Seus Dados'}
                    {cartStep === 'success' && 'Tudo pronto!'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {/* PASSO 1: ITENS DO CARRINHO */}
            {cartStep === 'items' && (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-4 text-pink-300">
                        <ShoppingBag size={32} />
                      </div>
                      <h4 className="text-base font-black text-gray-800 mb-1">Seu carrinho está vazio</h4>
                      <p className="text-xs text-gray-400 max-w-xs mb-6">
                        Explore nosso catálogo e clique no botão rosa "Adicionar ao Carrinho" para incluir suas peças favoritas.
                      </p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="bg-pink-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-pink-200 hover:bg-pink-600 transition-colors"
                      >
                        Continuar Comprando
                      </button>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex gap-4 items-center bg-gray-50/80 p-4 rounded-2xl border border-gray-100 hover:border-pink-100 transition-colors">
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shadow-sm shrink-0 border border-gray-100">
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-pink-300"><Package size={24} /></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-800 truncate text-xs sm:text-sm">{item.product.name}</h4>
                          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mt-0.5">
                            R$ {item.price.toFixed(2)} / un
                          </p>

                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center bg-white rounded-xl border border-gray-200 p-0.5">
                              <button 
                                onClick={() => updateQuantity(item.product.id, -1)} 
                                className="p-1 text-gray-400 hover:text-pink-600 transition-colors"
                                title="Diminuir quantidade"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-7 text-center text-xs font-black text-gray-700">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, 1)} 
                                className="p-1 text-gray-400 hover:text-pink-600 transition-colors"
                                title="Aumentar quantidade"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.product.id)} 
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                              title="Remover item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-gray-400">Total</p>
                          <p className="text-sm font-black text-gray-800">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-6 bg-pink-50/40 border-t border-pink-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Subtotal dos Itens</span>
                      <span className="text-2xl font-black text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                    </div>

                    {/* BOTÃO PARA AVANÇAR PARA O CHECKOUT (ROSA) */}
                    <button 
                      onClick={() => setCartStep('checkout')}
                      className="w-full py-4 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-pink-200 transition-all"
                    >
                      <span>Avançar para Dados & Entrega</span>
                      <ArrowRight size={17} />
                    </button>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-bold py-1"
                    >
                      + Continuar Escolhendo Produtos
                    </button>
                  </div>
                )}
              </>
            )}

            {/* PASSO 2: CHECKOUT AUTOMATIZADO COM FORMULÁRIO DO CLIENTE */}
            {cartStep === 'checkout' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Botão Voltar */}
                <button 
                  onClick={() => setCartStep('items')}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-pink-600 transition-colors"
                >
                  <ChevronLeft size={16} /> Voltar aos itens
                </button>

                {/* Dados do Cliente */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Seus Dados para o Pedido
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">Seu Nome Completo *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Maria Silva"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      className={`w-full p-3.5 bg-gray-50 border rounded-2xl outline-none font-bold text-sm text-gray-800 transition-all ${
                        formErrors.name ? 'border-red-400 bg-red-50/20' : 'border-gray-200 focus:border-pink-300'
                      }`}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 font-bold">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600">Seu WhatsApp com DDD *</label>
                    <input 
                      type="tel" 
                      placeholder="(99) 99999-9999"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`w-full p-3.5 bg-gray-50 border rounded-2xl outline-none font-bold text-sm text-gray-800 transition-all ${
                        formErrors.phone ? 'border-red-400 bg-red-50/20' : 'border-gray-200 focus:border-pink-300'
                      }`}
                    />
                    {formErrors.phone && <p className="text-[10px] text-red-500 font-bold">{formErrors.phone}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600 flex items-center justify-between">
                      <span>E-mail</span>
                      <span className="text-[9px] text-gray-400 font-normal">opcional</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="seuemail@exemplo.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 focus:border-pink-300 rounded-2xl outline-none font-bold text-sm text-gray-800 transition-all"
                    />
                  </div>
                </div>

                {/* Opção de Entrega */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">2</span>
                    Forma de Entrega / Retirada
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        deliveryType === 'pickup' 
                          ? 'border-pink-500 bg-pink-50/60 shadow-sm' 
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Home size={16} className={deliveryType === 'pickup' ? 'text-pink-600' : 'text-gray-400'} />
                        <span className="text-xs font-black text-gray-800">Retirada</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">No ateliê (A combinar)</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        deliveryType === 'delivery' 
                          ? 'border-pink-500 bg-pink-50/60 shadow-sm' 
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Truck size={16} className={deliveryType === 'delivery' ? 'text-pink-600' : 'text-gray-400'} />
                        <span className="text-xs font-black text-gray-800">Entrega</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">Envio / Motoboy / Correios</span>
                    </button>
                  </div>

                  {deliveryType === 'delivery' && (
                    <div className="space-y-3 p-4 bg-pink-50/30 rounded-2xl border border-pink-100 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-600">Endereço (Rua e Número) *</label>
                        <input 
                          type="text" 
                          placeholder="Rua das Flores, 123"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-xs"
                        />
                        {formErrors.address && <p className="text-[10px] text-red-500 font-bold">{formErrors.address}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600">Bairro</label>
                          <input 
                            type="text" 
                            placeholder="Centro"
                            value={deliveryNeighborhood}
                            onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-600">Cidade / CEP</label>
                          <input 
                            type="text" 
                            placeholder="Ex: São Paulo"
                            value={deliveryCity}
                            onChange={(e) => setDeliveryCity(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-xs"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">
                        * O frete será calculado e confirmado pelo ateliê no WhatsApp.
                      </p>
                    </div>
                  )}
                </div>

                {/* Personalização / Observações */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">3</span>
                    Detalhes da Personalização (Opcional)
                  </h4>
                  <textarea 
                    placeholder="Ex: Nome: Maria Eduarda, Idade: 5 anos, Tema: Jardim Encantado, Cores: Rosa e Dourado, Data da Festa: 25/10..."
                    value={orderObservations}
                    onChange={(e) => setOrderObservations(e.target.value)}
                    rows={3}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 focus:border-pink-300 rounded-2xl outline-none font-medium text-xs text-gray-700 placeholder-gray-400"
                  />
                </div>

                {/* Resumo e Botão para Enviar Pedido via WhatsApp */}
                <div className="p-5 bg-gradient-to-br from-pink-50 to-pink-100/40 rounded-3xl border border-pink-100 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                    <span>Quantidade Total:</span>
                    <span>{cartItemCount} itens</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-gray-800">
                    <span>Total do Pedido:</span>
                    <span className="text-2xl text-pink-600">R$ {cartTotal.toFixed(2)}</span>
                  </div>

                  {/* BOTÃO DIRETO PARA ENVIAR PEDIDO AO WHATSAPP */}
                  <button 
                    onClick={handleFinishAndSendOrder}
                    disabled={isProcessingOrder}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessingOrder ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        <span>Enviando Pedido...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Enviar Pedido via WhatsApp</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-gray-500 text-center font-medium">
                    💬 Ao clicar, seu pedido será salvo e enviado diretamente ao WhatsApp do ateliê para combinarem os detalhes e o pagamento.
                  </p>
                </div>
              </div>
            )}

            {/* PASSO 3: SUCESSO DO PEDIDO AUTOMATIZADO APÓS ENVIO AO WHATSAPP */}
            {cartStep === 'success' && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center custom-scrollbar animate-scaleIn">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                  <CheckCircle2 size={42} />
                </div>

                <span className="text-[10px] font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                  Pedido {completedOrderNumber}
                </span>

                <h3 className="text-2xl font-black text-gray-800 mb-2">
                  Pedido Enviado com Sucesso! 🎉
                </h3>

                <p className="text-xs text-gray-500 max-w-xs mb-8">
                  Seu pedido foi registrado e enviado para o WhatsApp de <strong>{companyData?.name}</strong>.
                </p>

                {/* Botões de Ação e Reabertura do WhatsApp */}
                <div className="w-full space-y-4 mb-8">
                  <button 
                    onClick={() => {
                      const phone = companyData?.phone?.replace(/\D/g, '') || '';
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lastOrderMessage)}`, '_blank');
                    }}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer"
                  >
                    <MessageCircle size={18} />
                    <span>Abrir WhatsApp com o Pedido</span>
                  </button>
                </div>

                <button 
                  onClick={resetCartAfterSuccess}
                  className="text-xs font-black text-pink-600 hover:text-pink-700 underline cursor-pointer"
                >
                  Fazer outro pedido / Continuar no Catálogo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEMPLATE OCULTO PARA GERAÇÃO DO RESUMO DO PEDIDO EM IMAGEM */}
      <div className="fixed left-[-9999px] top-[-9999px]">
        <div ref={orderSummaryRef} className="w-[620px] bg-white p-10 font-['Quicksand'] border-8 border-pink-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-pink-200 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl border-2 border-pink-200 flex items-center justify-center p-1 overflow-hidden">
                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-800 leading-none">{companyData?.name || 'Ateliê'}</h3>
                <p className="text-[11px] font-black text-pink-500 uppercase tracking-widest mt-1">Comprovante de Pedido Online</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-full">{completedOrderNumber || '#PED-ONLINE'}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Dados do Cliente */}
          {customerName && (
            <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100 text-xs">
              <p className="font-bold text-gray-700"><strong>Cliente:</strong> {customerName}</p>
              <p className="font-bold text-gray-700 mt-0.5"><strong>WhatsApp:</strong> {customerPhone}</p>
              <p className="font-bold text-gray-700 mt-0.5">
                <strong>Entrega:</strong> {deliveryType === 'pickup' ? 'Retirada no Ateliê' : `Entrega: ${deliveryAddress}`}
              </p>
            </div>
          )}

          {/* Itens */}
          <div className="space-y-3 mb-8">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center text-xs font-black">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-gray-800">{item.product.name}</span>
                </div>
                <span className="font-black text-gray-800">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-pink-50 p-6 rounded-2xl flex justify-between items-center border border-pink-200">
            <span className="text-xs font-black uppercase tracking-wider text-pink-700">Total do Pedido</span>
            <span className="text-3xl font-black text-pink-600">R$ {cartTotal.toFixed(2)}</span>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Obrigado pela preferência! • Produzido com amor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
