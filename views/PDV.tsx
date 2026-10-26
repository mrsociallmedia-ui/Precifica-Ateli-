import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Store, 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Printer, 
  Share2, 
  Sparkles, 
  X, 
  RefreshCw, 
  ArrowRight, 
  Tag, 
  Layers, 
  Clock, 
  Check, 
  Copy, 
  Percent, 
  Receipt, 
  Phone, 
  Calendar,
  Banknote,
  RotateCcw,
  Zap,
  PackageCheck,
  Send,
  HelpCircle,
  FileText,
  Tags
} from 'lucide-react';
import { Product, Customer, Material, CompanyData, Project, Transaction, Platform, ProductVariation } from '../types';
import { generatePixCopiaECola, buildWhatsAppLink } from '../utils';

export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  variationName?: string;
  unitPrice: number;
  quantity: number;
  category?: string;
  image?: string;
  materials?: { materialId: string; quantity: number }[];
  isCustom?: boolean;
}

interface PDVProps {
  products: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  materials: Material[];
  setMaterials?: React.Dispatch<React.SetStateAction<Material[]>>;
  customers: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  companyData: CompanyData;
  platforms?: Platform[];
  paymentMethods?: string[];
}

export const PDV: React.FC<PDVProps> = ({
  products,
  setProducts,
  materials,
  setMaterials,
  customers,
  setCustomers,
  projects,
  setProjects,
  transactions,
  setTransactions,
  companyData,
  paymentMethods = ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito']
}) => {
  // Estado do Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('balcao');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Desconto e Taxas
  const [discountType, setDiscountType] = useState<'money' | 'percent'>('money');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0); // Acréscimo ou entrega

  // Leitor de Código de Barras
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeScanFeedback, setBarcodeScanFeedback] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Modal de Variações do Produto
  const [variationModalProduct, setVariationModalProduct] = useState<Product | null>(null);

  // Modal de Item Avulso Rápido
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);
  const [customItemQty, setCustomItemQty] = useState<number>(1);

  // Modal de Novo Cliente Rápido
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Modal de Pagamento / Fechamento de Caixa
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Dinheiro');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [saleNotes, setSaleNotes] = useState('');
  const [deductStock, setDeductStock] = useState(true);
  const [recordFinance, setRecordFinance] = useState(true);
  const [copiedPix, setCopiedPix] = useState(false);

  // Modal de Venda Concluída com Recibo
  const [completedSale, setCompletedSale] = useState<{
    saleId: string;
    quoteNumber: string;
    date: string;
    customerName: string;
    customerPhone: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    additional: number;
    total: number;
    paymentMethod: string;
    cashGiven?: number;
    change?: number;
    installments?: number;
    notes?: string;
  } | null>(null);

  // Referência do comprovante térmico para impressão
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Extrair categorias existentes de produtos
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  // Filtragem dos produtos do catálogo
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = searchTerm === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cálculos do Carrinho
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * (discountValue || 0)) / 100;
    }
    return Math.min(subtotal, Math.max(0, discountValue || 0));
  }, [subtotal, discountType, discountValue]);

  const total = useMemo(() => {
    const rawTotal = subtotal - discountAmount + (additionalFee || 0);
    return Math.max(0, rawTotal);
  }, [subtotal, discountAmount, additionalFee]);

  // Troco em dinheiro
  const changeAmount = useMemo(() => {
    if (selectedPaymentMethod === 'Dinheiro' && cashGiven > total) {
      return cashGiven - total;
    }
    return 0;
  }, [selectedPaymentMethod, cashGiven, total]);

  // Atalhos de Teclado (F2 para finalizar, Esc para fechar modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0 && !showPaymentModal && !completedSale) {
          handleOpenPaymentModal();
        }
      } else if (e.key === 'Escape') {
        if (showPaymentModal) setShowPaymentModal(false);
        if (showCustomItemModal) setShowCustomItemModal(false);
        if (showNewCustomerModal) setShowNewCustomerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, completedSale]);

  // Vendas de hoje no PDV
  const todaySalesStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayProjects = projects.filter(p => {
      const isPDV = (p.quoteNumber && p.quoteNumber.startsWith('#PDV-')) || 
                    (p.name && p.name.includes('PDV')) ||
                    (p.notes && p.notes.includes('PDV'));
      const pDate = (p.createdAt || p.orderDate || '').split('T')[0];
      return isPDV && pDate === today;
    });

    const totalMoney = todayProjects.reduce((acc, p) => {
      const pTotal = p.items && p.items.length > 0 
        ? p.items.reduce((s, it) => s + ((it.unitPrice || 0) * it.quantity), 0) - (p.discountAmount || 0) + (p.shipping || 0)
        : (Number(p.downPayment) || 0);
      return acc + pTotal;
    }, 0);

    return {
      count: todayProjects.length,
      total: totalMoney
    };
  }, [projects]);

  // Gerador de número de venda PDV
  const generatePDVNumber = () => {
    const nums: number[] = [];
    projects.forEach(p => {
      const q = String(p.quoteNumber || '');
      const numOnly = q.replace(/\D/g, '');
      const parsed = parseInt(numOnly, 10);
      if (!isNaN(parsed) && parsed > 0) nums.push(parsed);
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const nextNum = max < 283 ? 283 : max + 1;
    return `#PDV-${nextNum}`;
  };

  // Helper para obter o estoque disponível real (Produto x Variação)
  const getAvailableStock = (product: Product, variationName?: string): number => {
    if (product.trackStock === false) return Infinity;

    if (variationName && product.variations && product.variations.length > 0) {
      const foundVar = product.variations.find(v => v.name.toLowerCase() === variationName.toLowerCase());
      if (foundVar && foundVar.stockQuantity !== undefined) {
        return Number(foundVar.stockQuantity) || 0;
      }
    }

    if (product.variations && product.variations.length > 0 && !variationName) {
      return product.variations.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0);
    }

    return Number(product.stockQuantity) || 0;
  };

  // Handler para Bipar / Ler Código de Barras
  const handleBarcodeScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = barcodeInput.trim();
    if (!cleanCode) return;

    let foundProduct: Product | undefined = undefined;
    let foundVariation: ProductVariation | undefined = undefined;

    // Busca primeiro nas variações por SKU ou ID
    for (const p of products) {
      if (p.variations && p.variations.length > 0) {
        const matchedVar = p.variations.find(v => 
          (v.sku && v.sku.trim().toLowerCase() === cleanCode.toLowerCase()) ||
          v.id === cleanCode
        );
        if (matchedVar) {
          foundProduct = p;
          foundVariation = matchedVar;
          break;
        }
      }
      if (p.id === cleanCode || p.name.toLowerCase() === cleanCode.toLowerCase()) {
        foundProduct = p;
        break;
      }
    }

    if (foundProduct) {
      const displayName = foundVariation ? `${foundProduct.name} (${foundVariation.name})` : foundProduct.name;
      const availableStock = getAvailableStock(foundProduct, foundVariation?.name);
      const existingInCart = cart.find(item => 
        item.productId === foundProduct!.id && item.variationName === foundVariation?.name
      );
      const currentQty = existingInCart ? existingInCart.quantity : 0;

      if (foundProduct.trackStock !== false && availableStock <= 0) {
        setBarcodeScanFeedback({
          type: 'error',
          message: `❌ "${displayName}" está ESGOTADO(A) (Estoque: 0) e não pode ser vendido!`
        });
        setTimeout(() => setBarcodeScanFeedback(null), 4000);
      } else if (foundProduct.trackStock !== false && currentQty + 1 > availableStock) {
        setBarcodeScanFeedback({
          type: 'warning',
          message: `⚠️ Estoque limite atingido (${availableStock} un) para "${displayName}".`
        });
        setTimeout(() => setBarcodeScanFeedback(null), 4000);
      } else {
        handleAddToCart(foundProduct, foundVariation);
        setBarcodeScanFeedback({
          type: 'success',
          message: `✅ "${displayName}" adicionado ao carrinho!`
        });
        setTimeout(() => setBarcodeScanFeedback(null), 3000);
      }
      setBarcodeInput('');
    } else {
      setBarcodeScanFeedback({
        type: 'error',
        message: `⚠️ Código de barras "${cleanCode}" não foi encontrado!`
      });
      setTimeout(() => setBarcodeScanFeedback(null), 4000);
    }
  };

  // Manipulação de Carrinho
  const handleAddToCart = (product: Product, variation?: ProductVariation) => {
    const variationName = variation ? variation.name : undefined;
    const priceAdj = variation?.priceAdjustment || 0;
    const finalUnitPrice = (product.marketPrice || 0) + priceAdj;
    const displayName = variation ? `${product.name} (${variation.name})` : product.name;

    // Trava de Estoque Zerado / Insuficiente
    const availableStock = getAvailableStock(product, variationName);
    const existingInCart = cart.find(item => 
      item.productId === product.id && item.variationName === variationName
    );
    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;

    if (product.trackStock !== false) {
      if (availableStock <= 0) {
        alert(`❌ VENDA NÃO PERMITIDA!\n\nO item "${displayName}" está com ESTOQUE ZERADO (0 un em estoque).`);
        return;
      }
      if (currentQtyInCart + 1 > availableStock) {
        alert(`⚠️ ESTOQUE INSUFICIENTE!\n\nVocê já adicionou ${currentQtyInCart} un no carrinho e restam apenas ${availableStock} un no estoque de "${displayName}".`);
        return;
      }
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.productId === product.id && item.variationName === variationName
      );
      if (existingIdx !== -1) {
        return prev.map((item, idx) => 
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId: product.id,
          name: displayName,
          variationName: variationName,
          unitPrice: finalUnitPrice,
          quantity: 1,
          category: product.category,
          image: product.image || (product.images && product.images[0]),
          materials: (product.materials || []).map(m => ({ materialId: m.materialId, quantity: m.quantity })),
          isCustom: false
        }
      ];
    });
  };

  const handleProductCardClick = (product: Product) => {
    if (product.variations && product.variations.length > 0) {
      setVariationModalProduct(product);
    } else {
      handleAddToCart(product);
    }
  };

  const handleSelectVariation = (product: Product, variation?: ProductVariation) => {
    handleAddToCart(product, variation);
    setVariationModalProduct(null);
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const item = cart.find(i => i.id === itemId);
    if (item && item.productId) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && prod.trackStock !== false) {
        const availableStock = getAvailableStock(prod, item.variationName);
        if (newQty > availableStock) {
          alert(`⚠️ ESTOQUE INSUFICIENTE!\n\nRestam apenas ${availableStock} unidades no estoque para "${item.name}".`);
          return;
        }
      }
    }

    setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQty } : item));
  };

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.id === itemId ? { ...item, unitPrice: Math.max(0, newPrice) } : item));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Deseja realmente limpar todos os itens deste atendimento?')) {
      setCart([]);
      setDiscountValue(0);
      setAdditionalFee(0);
      setSelectedCustomerId('balcao');
    }
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      alert('Informe o nome da peça ou serviço avulso.');
      return;
    }
    if (customItemPrice <= 0) {
      alert('Informe um valor unitário válido.');
      return;
    }

    setCart(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        name: customItemName.trim(),
        unitPrice: customItemPrice,
        quantity: customItemQty > 0 ? customItemQty : 1,
        category: 'Personalizado / Avulso',
        isCustom: true
      }
    ]);

    setCustomItemName('');
    setCustomItemPrice(0);
    setCustomItemQty(1);
    setShowCustomItemModal(false);
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Digite o nome do cliente.');
      return;
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      birthDate: '',
      address: '',
      neighborhood: '',
      zipCode: ''
    };

    if (setCustomers) {
      setCustomers(prev => [newCustomer, ...prev]);
    }
    setSelectedCustomerId(newCustomer.id);
    setNewCustName('');
    setNewCustPhone('');
    setShowNewCustomerModal(false);
  };

  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      alert('Adicione pelo menos um item ao carrinho para vender.');
      return;
    }
    setCashGiven(total);
    setShowPaymentModal(true);
  };

  // Gerar Pix Copia e Cola dinâmico se a empresa tiver chave configurada
  const pixPayload = useMemo(() => {
    if (!companyData.pixKey) return '';
    return generatePixCopiaECola({
      pixKey: companyData.pixKey,
      merchantName: companyData.pixBeneficiaryName || companyData.name || 'ATELIE',
      merchantCity: companyData.city || 'BRASIL',
      amount: total,
      transactionId: `PDV${Date.now().toString().slice(-6)}`
    });
  }, [companyData, total]);

  const handleCopyPix = () => {
    const textToCopy = pixPayload || companyData.pixKey || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Finalizar a venda
  const handleFinalizeSale = () => {
    if (cart.length === 0) return;

    const currentCustomer = selectedCustomerId === 'balcao'
      ? { id: 'balcao', name: 'Cliente Balcão (Avulso)', phone: '' }
      : customers.find(c => c.id === selectedCustomerId) || { id: 'balcao', name: 'Cliente Balcão', phone: '' };

    if (selectedPaymentMethod === 'A Prazo / Fiado' && selectedCustomerId === 'balcao') {
      alert('Para vender A Prazo / Fiado, selecione ou cadastre um cliente específico.');
      return;
    }

    const todayIso = new Date().toISOString();
    const todayDateOnly = todayIso.split('T')[0];
    const quoteNumber = generatePDVNumber();
    const saleId = `pdv_${Date.now()}`;

    // 1. Criar Projeto / Pedido para Histórico
    const newProject: Project = {
      id: saleId,
      name: `Venda PDV - ${currentCustomer.name}`,
      customerId: currentCustomer.id,
      quoteNumber: quoteNumber,
      description: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
      notes: saleNotes ? `[PDV] ${saleNotes}` : '[PDV] Venda realizada na Frente de Caixa / Balcão',
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        hoursToMake: 0,
        materials: (item.materials || []).map(m => ({
          materialId: m.materialId,
          quantity: m.quantity
        })),
        profitMargin: 30,
        unitPrice: item.unitPrice
      })),
      platformId: 'direct',
      excedente: 0,
      status: 'completed',
      createdAt: todayIso,
      orderDate: todayDateOnly,
      dueDate: selectedPaymentMethod === 'A Prazo / Fiado' ? dueDate : todayDateOnly,
      deliveryDate: todayDateOnly,
      theme: 'Pronta Entrega / Balcão',
      celebrantName: currentCustomer.name,
      celebrantAge: '',
      discountAmount: discountAmount,
      discountPercentage: discountType === 'percent' ? discountValue : 0,
      shipping: additionalFee,
      downPayment: total,
      paymentMethod: selectedPaymentMethod,
      installments: selectedPaymentMethod === 'Cartão de Crédito' ? installmentsCount : 1,
      paidAt: selectedPaymentMethod !== 'A Prazo / Fiado' ? todayIso : undefined,
      hoursToMake: 0,
      materials: [],
      profitMargin: 30,
      quantity: cart.reduce((s, i) => s + i.quantity, 0)
    };

    setProjects(prev => [newProject, ...prev]);

    // 2. Registrar no Financeiro se marcado
    if (recordFinance) {
      const newTransaction: Transaction = {
        id: `trans_${Date.now()}`,
        description: `Venda ${quoteNumber} - ${currentCustomer.name}`,
        amount: total,
        type: 'income',
        category: 'Venda',
        paymentMethod: selectedPaymentMethod,
        date: todayDateOnly,
        status: selectedPaymentMethod === 'A Prazo / Fiado' ? 'pending' : 'paid',
        customerId: currentCustomer.id !== 'balcao' ? currentCustomer.id : undefined,
        projectId: saleId
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }

    // 3. Dar baixa no estoque de peças prontas e variações se solicitado
    if (deductStock) {
      if (setProducts) {
        setProducts(prevProducts => {
          return prevProducts.map(prod => {
            const cartItemsForProd = cart.filter(ci => ci.productId === prod.id);
            if (cartItemsForProd.length === 0) return prod;

            let updatedProd = { ...prod };

            if (updatedProd.variations && updatedProd.variations.length > 0) {
              const updatedVariations = updatedProd.variations.map(v => {
                const varCartItems = cartItemsForProd.filter(ci => ci.variationName === v.name);
                const totalVarDeducted = varCartItems.reduce((sum, item) => sum + item.quantity, 0);
                if (totalVarDeducted > 0) {
                  const currentVarStock = Number(v.stockQuantity) || 0;
                  return { ...v, stockQuantity: Math.max(0, currentVarStock - totalVarDeducted) };
                }
                return v;
              });

              updatedProd.variations = updatedVariations;

              // Soma do estoque atualizado de todas as variações
              const sumVarStock = updatedVariations.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0);
              updatedProd.stockQuantity = sumVarStock;
            } else {
              const totalProdQty = cartItemsForProd.reduce((sum, item) => sum + item.quantity, 0);
              const currentStock = Number(prod.stockQuantity) || 0;
              updatedProd.stockQuantity = Math.max(0, currentStock - totalProdQty);
            }

            return updatedProd;
          });
        });
      }

      if (setMaterials) {
        setMaterials(prevMaterials => {
          const updated = [...prevMaterials];
          cart.forEach(cartItem => {
            if (cartItem.materials && cartItem.materials.length > 0) {
              cartItem.materials.forEach(matRef => {
                const mIdx = updated.findIndex(m => m.id === matRef.materialId);
                if (mIdx !== -1) {
                  const totalUsed = (matRef.quantity || 1) * cartItem.quantity;
                  const newQty = Math.max(0, (updated[mIdx].quantity || 0) - totalUsed);
                  updated[mIdx] = { ...updated[mIdx], quantity: newQty };
                }
              });
            }
          });
          return updated;
        });
      }
    }

    // 4. Preparar resumo do comprovante e abrir modal de sucesso
    setCompletedSale({
      saleId,
      quoteNumber,
      date: new Date().toLocaleString('pt-BR'),
      customerName: currentCustomer.name,
      customerPhone: currentCustomer.phone || '',
      items: [...cart],
      subtotal,
      discount: discountAmount,
      additional: additionalFee,
      total,
      paymentMethod: selectedPaymentMethod,
      cashGiven: selectedPaymentMethod === 'Dinheiro' ? cashGiven : undefined,
      change: selectedPaymentMethod === 'Dinheiro' ? changeAmount : undefined,
      installments: selectedPaymentMethod === 'Cartão de Crédito' ? installmentsCount : undefined,
      notes: saleNotes
    });

    // Fechar modal de pagamento e limpar o carrinho
    setShowPaymentModal(false);
    setCart([]);
    setDiscountValue(0);
    setAdditionalFee(0);
    setSaleNotes('');
    setSelectedCustomerId('balcao');
  };

  // Impressão do Cupom
  const handlePrintReceipt = () => {
    window.print();
  };

  // Compartilhar Comprovante no WhatsApp
  const handleShareReceiptWhatsApp = () => {
    if (!completedSale) return;
    const itemsList = completedSale.items
      .map(i => `• ${i.quantity}x ${i.name} - R$ ${(i.unitPrice * i.quantity).toFixed(2)}`)
      .join('\n');

    const msg = `🛍️ *COMPROVANTE DE COMPRA - ${companyData.name || 'Ateliê'}*\n` +
      `--------------------------------\n` +
      `🧾 *Pedido:* ${completedSale.quoteNumber}\n` +
      `📅 *Data:* ${completedSale.date}\n` +
      `👤 *Cliente:* ${completedSale.customerName}\n\n` +
      `🛒 *Itens:*\n${itemsList}\n\n` +
      `💵 *Subtotal:* R$ ${completedSale.subtotal.toFixed(2)}\n` +
      (completedSale.discount > 0 ? `🏷️ *Desconto:* -R$ ${completedSale.discount.toFixed(2)}\n` : '') +
      (completedSale.additional > 0 ? `➕ *Acréscimo/Entrega:* +R$ ${completedSale.additional.toFixed(2)}\n` : '') +
      `✨ *TOTAL PAGO:* R$ ${completedSale.total.toFixed(2)}\n` +
      `💳 *Forma de Pagamento:* ${completedSale.paymentMethod}\n` +
      (completedSale.change && completedSale.change > 0 ? `🪙 *Troco:* R$ ${completedSale.change.toFixed(2)}\n` : '') +
      `--------------------------------\n` +
      `Muito obrigado pela preferência e carinho! 💕`;

    const url = buildWhatsAppLink(completedSale.customerPhone, msg);
    window.open(url, '_blank');
  };

  const selectedCustomerObj = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 animate-fadeIn font-['Quicksand']">
      {/* Top Header & Métricas Rápidas do Caixa */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-pink-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-100 shrink-0">
            <Store size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
                PDV — Frente de Caixa
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                Balcão & Vendas Rápidas
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Atendimento ágil, emissão de comprovantes e controle automático de estoque e caixa.
            </p>
          </div>
        </div>

        {/* Resumo do Caixa de Hoje */}
        <div className="flex items-center gap-3 bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-3 shrink-0">
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
            <Banknote size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 block">
              Vendido Hoje (PDV)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-xl font-black text-emerald-900">
                R$ {todaySalesStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                ({todaySalesStats.count} {todaySalesStats.count === 1 ? 'venda' : 'vendas'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Esquerda (Catálogo/Busca) & Direita (Carrinho/Checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Produtos & Lançamento Rápido (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Leitor de Código de Barras / SKU */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100 space-y-3">
            <form onSubmit={handleBarcodeScan} className="flex items-center gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" size={18} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Leitor de Código de Barras / Bipar SKU (Aperte Enter)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-purple-50/50 border border-purple-200 rounded-xl text-xs font-bold text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-mono"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 p-1"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <QrCode size={16} />
                <span>Bipar</span>
              </button>
            </form>

            {barcodeScanFeedback && (
              <div className={`p-2.5 rounded-xl text-xs font-black flex items-center gap-2 animate-fadeIn ${
                barcodeScanFeedback.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                barcodeScanFeedback.type === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                <span>{barcodeScanFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Barra de Busca + Botão Item Avulso */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar peça ou produto por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowCustomItemModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
            >
              <Zap size={16} />
              + Item Avulso
            </button>
          </div>

          {/* Categorias (Pills) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-pink-50'
              }`}
            >
              Todas ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-pink-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de Produtos Disponíveis */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-pink-100 text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-pink-50 rounded-2xl flex items-center justify-center text-pink-400">
                <Store size={32} />
              </div>
              <h3 className="text-base font-black text-gray-800">
                {searchTerm ? 'Nenhum item encontrado com esta busca' : 'Nenhuma peça cadastrada para venda'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Você pode cadastrar novas peças no menu <strong>Precificação</strong> ou lançar vendas avulsas clicando em <strong>+ Item Avulso</strong> acima.
              </p>
              <button
                onClick={() => setShowCustomItemModal(true)}
                className="mt-3 px-4 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-all shadow-xs"
              >
                Lançar Item Avulso Rápido
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredProducts.map(product => {
                const img = product.image || (product.images && product.images[0]);
                const inCartItem = cart.find(i => i.productId === product.id);
                const availStock = getAvailableStock(product);
                const isOutOfStock = product.trackStock !== false && availStock <= 0;
                const isLowStock = product.trackStock !== false && availStock > 0 && availStock <= (product.minStockAlert || 2);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductCardClick(product)}
                    className={`bg-white rounded-2xl p-3 border transition-all flex flex-col justify-between group relative ${
                      isOutOfStock
                        ? 'border-red-200 bg-red-50/20 opacity-80 cursor-pointer'
                        : 'cursor-pointer hover:shadow-md hover:border-pink-300'
                    } ${
                      inCartItem ? 'border-pink-300 ring-2 ring-pink-100' : 'border-pink-100/70'
                    }`}
                  >
                    {inCartItem && (
                      <span className="absolute top-2 right-2 w-6 h-6 bg-pink-500 text-white rounded-full text-[11px] font-black flex items-center justify-center shadow-xs z-10 animate-scaleIn">
                        {inCartItem.quantity}
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="w-full h-28 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 relative">
                        {img ? (
                          <img
                            src={img}
                            alt={product.name}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
                          />
                        ) : (
                          <div className="text-pink-300 flex flex-col items-center gap-1">
                            <Sparkles size={24} />
                            <span className="text-[9px] font-bold text-gray-400">Ateliê</span>
                          </div>
                        )}

                        {isOutOfStock && (
                          <span className="absolute inset-0 bg-red-950/60 backdrop-blur-2xs flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest p-1 text-center">
                            ESGOTADO
                          </span>
                        )}

                        {product.isKit && !isOutOfStock && (
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase">
                            Kit
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block truncate">
                          {product.category || 'Geral'}
                        </span>
                        <h4 className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight group-hover:text-pink-600 transition-colors">
                          {product.name}
                        </h4>
                        {product.variations && product.variations.length > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-pink-700 bg-pink-50 border border-pink-200/60 px-1.5 py-0.5 rounded-md">
                            <Tags size={9} className="text-pink-500" />
                            {product.variations.length} {product.variations.length === 1 ? 'variação' : 'variações'}
                          </span>
                        )}
                        {product.trackStock !== false && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700 border border-red-200 font-extrabold'
                                : isLowStock
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 font-extrabold animate-pulse'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {isOutOfStock ? '❌ 0 em estoque (Esgotado)' : isLowStock ? `⚠️ Estoque Baixo (${availStock} un)` : `${availStock} un em estoque`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-black text-gray-900">
                        R$ {(product.marketPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={isOutOfStock}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90 ${
                          isOutOfStock
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-pink-50 text-pink-600 group-hover:bg-pink-500 group-hover:text-white'
                        }`}
                        title={isOutOfStock ? 'Produto Esgotado' : 'Adicionar ao carrinho'}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel Direito: Carrinho de Compras & Fechamento (5 colunas) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-pink-100 shadow-sm space-y-4 sticky top-4">
          {/* Topo do Carrinho */}
          <div className="flex items-center justify-between pb-3 border-b border-pink-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-800">Atendimento / Carrinho</h3>
                <span className="text-[10px] font-bold text-gray-400">
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'} no pedido
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-gray-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors"
                title="Limpar itens do carrinho"
              >
                <Trash2 size={13} />
                Limpar
              </button>
            )}
          </div>

          {/* Seleção do Cliente */}
          <div className="space-y-1.5 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-pink-500" />
                Cliente do Atendimento:
              </span>
              <button
                onClick={() => setShowNewCustomerModal(true)}
                className="text-pink-600 hover:text-pink-700 font-black flex items-center gap-0.5 text-[10px]"
              >
                <UserPlus size={12} />
                + Novo
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="balcao">👤 Cliente Balcão (Avulso / Não identificado)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
            {selectedCustomerObj && selectedCustomerObj.phone && (
              <span className="text-[10px] text-gray-400 font-semibold block px-1">
                WhatsApp: {selectedCustomerObj.phone}
              </span>
            )}
          </div>

          {/* Lista de Itens do Carrinho */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar min-h-[140px]">
            {cart.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-gray-400">
                <ShoppingCart size={32} className="text-gray-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-gray-600">O carrinho está vazio</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Clique nas peças ao lado ou lance um item avulso para iniciar a venda.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50/80 rounded-2xl p-2.5 border border-gray-100 flex items-center justify-between gap-3 group hover:border-pink-200 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-gray-800 truncate" title={item.name}>
                      {item.name}
                    </h5>
                    {item.variationName && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-pink-700 bg-pink-100/80 px-2 py-0.5 rounded-md mt-0.5">
                        <Tags size={10} className="text-pink-500" />
                        Variação: {item.variationName}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700"
                        title="Editar valor unitário deste item"
                      />
                      <span className="text-[10px] font-bold text-gray-400">cada</span>
                    </div>
                  </div>

                  {/* Controles de Quantidade */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-white px-1.5 py-1 rounded-xl border border-gray-200">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 flex items-center justify-center transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                      className="w-8 text-center text-xs font-black text-gray-800 focus:outline-none"
                    />
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 flex items-center justify-center transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Subtotal do item */}
                  <div className="text-right shrink-0 min-w-[70px]">
                    <span className="text-xs font-black text-gray-900 block">
                      R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-0.5 mt-0.5 inline-block"
                      title="Excluir item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ajustes de Desconto e Acréscimo */}
          {cart.length > 0 && (
            <div className="pt-2 border-t border-pink-50 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Desconto */}
                <div className="bg-gray-50/70 p-2 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-gray-500">Desconto:</span>
                    <div className="flex items-center gap-1 bg-white rounded p-0.5 border border-gray-200">
                      <button
                        onClick={() => setDiscountType('money')}
                        className={`px-1 text-[9px] font-black rounded ${discountType === 'money' ? 'bg-pink-500 text-white' : 'text-gray-500'}`}
                      >
                        R$
                      </button>
                      <button
                        onClick={() => setDiscountType('percent')}
                        className={`px-1 text-[9px] font-black rounded ${discountType === 'percent' ? 'bg-pink-500 text-white' : 'text-gray-500'}`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step={discountType === 'money' ? '0.50' : '1'}
                    value={discountValue || ''}
                    placeholder="0"
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-800"
                  />
                </div>

                {/* Acréscimo / Entrega */}
                <div className="bg-gray-50/70 p-2 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500 block mb-1">Acréscimo/Taxa (R$):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={additionalFee || ''}
                    placeholder="0,00"
                    onChange={(e) => setAdditionalFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Desconto:</span>
                    <span>- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {additionalFee > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Acréscimo/Entrega:</span>
                    <span>+ R$ {additionalFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Grande Bloco de Total */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 block">
                    TOTAL A PAGAR
                  </span>
                  <span className="text-2xl font-black">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-100 font-bold block">
                    {cart.reduce((s, i) => s + i.quantity, 0)} itens
                  </span>
                </div>
              </div>

              {/* Botão Principal de Cobrança */}
              <button
                onClick={handleOpenPaymentModal}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 size={20} />
                PAGAR / FINALIZAR VENDA (F2)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Escolha de Variação de Produto */}
      {variationModalProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-pink-100 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-pink-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-xl">
                  <Tags size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-800 leading-tight">
                    Escolha o Tema / Variação
                  </h3>
                  <p className="text-xs text-gray-500 font-bold truncate max-w-[240px]">
                    {variationModalProduct.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVariationModalProduct(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-medium">
              Selecione a variação desejada para adicionar ao pedido:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto custom-scrollbar p-0.5">
              <button
                type="button"
                onClick={() => handleSelectVariation(variationModalProduct)}
                className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02]"
              >
                <span className="text-xs font-black text-gray-700">Modelo Padrão</span>
                <span className="text-[10px] text-gray-400 font-bold mt-1">Sem variação específica</span>
              </button>

              {variationModalProduct.variations?.map(v => {
                const varStock = v.stockQuantity ?? variationModalProduct.stockQuantity ?? 0;
                const isOutOfStock = variationModalProduct.trackStock !== false && varStock <= 0;
                const isLowStock = variationModalProduct.trackStock !== false && varStock > 0 && varStock <= (variationModalProduct.minStockAlert || 2);

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariation(variationModalProduct, v)}
                    disabled={isOutOfStock}
                    className={`p-3.5 border rounded-2xl text-left transition-all flex flex-col justify-between group/v ${
                      isOutOfStock
                        ? 'bg-red-50/60 border-red-200 opacity-70 cursor-not-allowed'
                        : isLowStock
                          ? 'bg-amber-50/70 hover:bg-amber-100/90 border-amber-300 cursor-pointer hover:scale-[1.02]'
                          : 'bg-pink-50/70 hover:bg-pink-100/90 border-pink-200 cursor-pointer hover:scale-[1.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-gray-800">
                        {v.name}
                      </span>
                      {v.sku && (
                        <span className="text-[8px] font-mono font-bold text-gray-400 bg-white/80 px-1 rounded">
                          {v.sku}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100/60">
                      <span className="text-[10px] font-bold text-pink-600">
                        {v.priceAdjustment && v.priceAdjustment > 0
                          ? `+R$ ${v.priceAdjustment.toFixed(2)}`
                          : 'Mesmo valor'}
                      </span>

                      {variationModalProduct.trackStock !== false && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-red-500 text-white'
                            : isLowStock
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isOutOfStock ? 'ESGOTADO (0 un)' : `${varStock} un em estoque`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setVariationModalProduct(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Item Avulso Rápido */}
      {showCustomItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-pink-100 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-pink-50">
              <div className="flex items-center gap-2 text-pink-600 font-black text-base">
                <Zap size={20} />
                <h3>Lançar Item Avulso / Personalizado</h3>
              </div>
              <button
                onClick={() => setShowCustomItemModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Nome do Item / Serviço: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Topo de Bolo Personalizado, Caneca Safari, etc."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Preço Unitário (R$): *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.10"
                    required
                    placeholder="0,00"
                    value={customItemPrice || ''}
                    onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Quantidade:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  Inserir no Carrinho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Cliente Rápido */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-pink-100 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-pink-50">
              <div className="flex items-center gap-2 text-pink-600 font-black text-base">
                <UserPlus size={20} />
                <h3>Cadastrar Cliente Rápido</h3>
              </div>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Nome Completo / Apelido: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Clara Silva"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  WhatsApp / Telefone:
                </label>
                <input
                  type="tel"
                  placeholder="Ex: (11) 98765-4321"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Formas de Pagamento & Conclusão */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-pink-100 shadow-2xl space-y-6 my-6 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Banknote size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-800">Finalizar Venda no Caixa</h3>
                  <span className="text-xs text-gray-500 font-semibold">
                    Selecione a forma de pagamento e confirme os valores.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Destaque do Valor Total */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  Valor a Cobrar
                </span>
                <span className="text-2xl font-black text-gray-900">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
                {selectedCustomerObj ? selectedCustomerObj.name : 'Cliente Balcão'}
              </span>
            </div>

            {/* Formas de Pagamento */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
                Forma de Pagamento:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Dinheiro', icon: Banknote, label: 'Dinheiro' },
                  { id: 'Pix', icon: QrCode, label: 'Pix' },
                  { id: 'Cartão de Débito', icon: CreditCard, label: 'Débito' },
                  { id: 'Cartão de Crédito', icon: CreditCard, label: 'Crédito' },
                  { id: 'A Prazo / Fiado', icon: Calendar, label: 'A Prazo / Fiado' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod(method.id);
                      if (method.id === 'Dinheiro') setCashGiven(total);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                      selectedPaymentMethod === method.id
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <method.icon size={18} className={selectedPaymentMethod === method.id ? 'text-emerald-600' : 'text-gray-400'} />
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuração Dinâmica por Método de Pagamento */}
            {selectedPaymentMethod === 'Dinheiro' && (
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900">
                    Valor Recebido em Dinheiro (R$):
                  </label>
                  <button
                    type="button"
                    onClick={() => setCashGiven(total)}
                    className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-50"
                  >
                    Valor Exato
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={cashGiven || ''}
                    onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-200 rounded-xl text-base font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Botões Rápidos de Cédulas */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashGiven(prev => (prev || 0) + val)}
                      className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      +R$ {val}
                    </button>
                  ))}
                </div>

                {/* Cálculo do Troco */}
                <div className="bg-white rounded-xl p-3 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Troco a Devolver:</span>
                  <span className={`text-lg font-black ${changeAmount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    R$ {changeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'Pix' && (
              <div className="bg-teal-50/60 rounded-2xl p-4 border border-teal-100 space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Code Real ou Gerado */}
                  <div className="w-32 h-32 bg-white rounded-xl border border-teal-200 p-2 flex items-center justify-center shrink-0 shadow-xs">
                    {companyData.pixQrCode ? (
                      <img src={companyData.pixQrCode} alt="QR Code Pix" className="w-full h-full object-contain" />
                    ) : pixPayload ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`}
                        alt="QR Code Pix"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-2 text-gray-400">
                        <QrCode size={36} className="mx-auto mb-1 text-teal-400" />
                        <span className="text-[9px] font-bold block">Configure a chave Pix nas Configurações</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <p className="font-bold text-gray-800">
                      Chave Pix: <span className="font-mono text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200 inline-block">{companyData.pixKey || 'Chave não cadastrada'}</span>
                    </p>
                    {companyData.pixBeneficiaryName && (
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Beneficiário: {companyData.pixBeneficiaryName}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="w-full sm:w-auto px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                      {copiedPix ? 'Copiado para Área de Transferência!' : 'Copiar Pix Copia e Cola'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'Cartão de Crédito' && (
              <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-100 space-y-2">
                <label className="text-xs font-bold text-purple-900 block">
                  Número de Parcelas:
                </label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <option key={num} value={num}>
                      {num}x de R$ {(total / num).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {num === 1 ? ' (À vista)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedPaymentMethod === 'A Prazo / Fiado' && (
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 space-y-2">
                <label className="text-xs font-bold text-amber-900 block">
                  Data de Vencimento do Pagamento:
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-gray-800"
                />
                <span className="text-[10px] text-amber-700 font-semibold block">
                  * A venda será lançada com status &quot;Pendente&quot; no Financeiro e Histórico.
                </span>
              </div>
            )}

            {/* Observações da Venda */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Observações do Pedido (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Embalagem para presente, laço rosa, etc."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
              />
            </div>

            {/* Checkboxes de Integração */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={recordFinance}
                  onChange={(e) => setRecordFinance(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-400 border-gray-300"
                />
                <span>Lançar como entrada no Financeiro</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={deductStock}
                  onChange={(e) => setDeductStock(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-400 border-gray-300"
                />
                <span>Dar baixa automática no estoque das peças prontas e materiais</span>
              </label>
            </div>

            {/* Botão de Confirmação */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Confirmar e Emitir Comprovante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Comprovante de Venda Concluída */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-pink-100 shadow-2xl space-y-6 my-6 animate-scaleIn">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                Venda Realizada com Sucesso!
              </h3>
              <p className="text-xs text-gray-500 font-semibold">
                Pedido {completedSale.quoteNumber} registrado no ateliê.
              </p>
            </div>

            {/* Prévia do Cupom Térmico (Visível na tela e formatado para impressão) */}
            <div 
              ref={receiptPrintRef}
              className="bg-white p-5 rounded-2xl border border-dashed border-gray-300 text-gray-800 font-mono text-xs space-y-3 shadow-inner"
            >
              <div className="text-center border-b border-dashed border-gray-300 pb-2">
                <h4 className="font-bold text-sm uppercase">{companyData.name || 'ATELIÊ & PAPELARIA'}</h4>
                {companyData.cnpj && <p className="text-[10px] text-gray-500">CNPJ: {companyData.cnpj}</p>}
                {companyData.phone && <p className="text-[10px] text-gray-500">WhatsApp: {companyData.phone}</p>}
                <p className="text-[10px] text-gray-500 mt-1">CUPOM NÃO FISCAL</p>
              </div>

              <div className="flex justify-between text-[11px] border-b border-dashed border-gray-300 pb-2">
                <span>Ref: <strong>{completedSale.quoteNumber}</strong></span>
                <span>{completedSale.date}</span>
              </div>

              <div>
                <p className="text-[11px] font-bold mb-1">Cliente: {completedSale.customerName}</p>
                <div className="space-y-1">
                  {completedSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate pr-2">{it.quantity}x {it.name}</span>
                      <span className="shrink-0 font-bold">
                        R$ {(it.unitPrice * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto:</span>
                    <span>-R$ {completedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                {completedSale.additional > 0 && (
                  <div className="flex justify-between">
                    <span>Acréscimo:</span>
                    <span>+R$ {completedSale.additional.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-1 text-gray-900">
                  <span>TOTAL:</span>
                  <span>R$ {completedSale.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 text-[10px] text-gray-600 space-y-0.5">
                <p>Pagamento: <strong>{completedSale.paymentMethod}</strong></p>
                {completedSale.change !== undefined && completedSale.change > 0 && (
                  <p>Troco: <strong>R$ {completedSale.change.toFixed(2)}</strong></p>
                )}
                {completedSale.notes && (
                  <p className="mt-1 italic">Obs: {completedSale.notes}</p>
                )}
              </div>

              <div className="text-center pt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-400">
                Obrigado pelo carinho e preferência! Volte sempre! 💕
              </div>
            </div>

            {/* Ações Imediatas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Printer size={16} />
                Imprimir Cupom
              </button>

              <button
                type="button"
                onClick={handleShareReceiptWhatsApp}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Send size={16} />
                Enviar WhatsApp
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCompletedSale(null)}
              className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-pink-100 flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Iniciar Nova Venda
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
