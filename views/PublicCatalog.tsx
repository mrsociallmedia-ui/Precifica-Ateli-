
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
  Eye
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Product, CompanyData, Material, Platform } from '../types';
import { calculateProjectBreakdown } from '../utils';

declare const html2canvas: any;

interface PublicCatalogProps {
  userEmail: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({ userEmail }) => {
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
  
  // Estados do Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const orderSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // No Supabase real, precisaríamos que a tabela user_data permitisse leitura pública por email
        // ou usar uma Edge Function. Para este ambiente, tentamos buscar diretamente.
        const { data, error } = await supabase
          .from('user_data')
          .select('app_state')
          .eq('user_email', userEmail.toLowerCase())
          .maybeSingle();

        if (error) throw error;

        if (data?.app_state) {
          const s = data.app_state;
          setProducts(s.craft_products || []);
          setCompanyData(s.craft_company || null);
          setMaterials(s.craft_materials || []);
          setPlatforms(s.craft_platforms || []);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo público:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchData();
  }, [userEmail]);

  const visibleProducts = products.filter(p => p.showInCatalog !== false);
  const categories = ['Todas', ...Array.from(new Set(visibleProducts.map(p => p.category)))];

  const filteredProducts = visibleProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsAppContact = (productName: string, price: number) => {
    if (!companyData?.phone) return;
    const phone = companyData.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Vi o produto *${productName}* (R$ ${price.toFixed(2)}) no seu catálogo online e gostaria de saber mais informações.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const addToCart = (product: Product, price: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + (product.minOrderQuantity || 1) } 
            : item
        );
      }
      return [...prev, { product, quantity: product.minOrderQuantity || 1, price }];
    });
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

  const handleFinishOrder = async () => {
    if (!companyData?.phone || cart.length === 0) return;
    
    setIsGeneratingImage(true);
    try {
      // Gerar imagem do resumo do pedido
      const canvas = await html2canvas(orderSummaryRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const imageData = canvas.toDataURL('image/png');
      
      // Como não podemos enviar o arquivo diretamente via link wa.me,
      // vamos oferecer o download da imagem e enviar o texto detalhado.
      // Em dispositivos móveis, poderíamos tentar usar a Web Share API se suportada.
      
      const link = document.createElement('a');
      link.download = `pedido-${companyData.name || 'atelie'}.png`;
      link.href = imageData;
      link.click();

      const phone = companyData.phone.replace(/\D/g, '');
      let message = `*NOVO PEDIDO - ${companyData.name}*\n\n`;
      cart.forEach(item => {
        message += `• ${item.quantity}x *${item.product.name}* - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
      });
      message += `\n*TOTAL: R$ ${cartTotal.toFixed(2)}*\n\n_Acabei de baixar a imagem do resumo do meu pedido e vou anexar aqui._`;
      
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error("Erro ao finalizar pedido:", err);
      alert("Houve um erro ao gerar o resumo do pedido. Mas você ainda pode enviar o texto!");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Carregando Catálogo...</p>
      </div>
    );
  }

  if (!companyData && !loading) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Package size={48} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">Catálogo não encontrado</h2>
        <p className="text-gray-400 max-w-xs">O ateliê solicitado ainda não configurou seu catálogo online ou o link está incorreto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffcf5] font-['Quicksand'] text-[#4b5563]">
      {/* HEADER DO ATELIÊ */}
      <header className="bg-white border-b border-pink-50 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              {companyData?.logo ? (
                <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Package size={24} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">{companyData?.name || 'Meu Ateliê'}</h1>
              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mt-1">Loja Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {companyData?.phone && (
              <button 
                onClick={() => window.open(`https://wa.me/${companyData.phone?.replace(/\D/g, '')}`, '_blank')}
                className="bg-green-50 text-green-600 p-3 rounded-2xl hover:bg-green-100 transition-all flex items-center gap-2"
                title="Falar no WhatsApp"
              >
                <MessageCircle size={20} />
                <span className="hidden sm:inline font-black text-[10px] uppercase tracking-widest">Contato</span>
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="bg-pink-500 text-white p-3 rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 flex items-center gap-2 relative"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline font-black text-[10px] uppercase tracking-widest">Carrinho</span>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="bg-pink-50/50 border-b border-pink-100/50">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center">
          <span className="text-[10px] font-black text-pink-500 bg-pink-100 px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
            Bem-vindo(a) à nossa loja
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-6 tracking-tight max-w-2xl">
            Produtos personalizados feitos com <span className="text-pink-500">amor e dedicação</span>
          </h2>
          <p className="text-gray-500 font-medium max-w-xl text-lg mb-10">
            Explore nossa coleção exclusiva. Cada peça é única e produzida especialmente para você.
          </p>
          
          {/* BUSCA NO HERO */}
          <div className="w-full max-w-2xl relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              className="w-full pl-16 pr-6 py-5 bg-white border-2 border-transparent focus:border-pink-200 rounded-[2rem] shadow-xl shadow-pink-100/20 outline-none transition-all font-medium text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* FILTROS DE CATEGORIA */}
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-8 mb-8 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                selectedCategory === cat 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-200' 
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRID DE PRODUTOS */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(p => {
              // Cálculo de preço sugerido caso não tenha preço de mercado definido
              const mockProject = { 
                items: [{ productId: p.id, name: p.name, quantity: 1, hoursToMake: p.minutesToMake / 60, materials: p.materials, profitMargin: p.profitMargin }], 
                platformId: platforms[0]?.id || '', 
                excedente: companyData?.defaultExcedente || 10 
              };
              const breakdown = calculateProjectBreakdown(mockProject as any, materials, platforms, companyData!);
              const finalPrice = p.marketPrice > 0 ? p.marketPrice : breakdown.finalPrice;

              return (
                <div 
                  key={p.id} 
                  className="bg-white rounded-[2rem] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col cursor-pointer border border-gray-100/50"
                  onClick={() => {
                    setSelectedProduct(p);
                    setActiveImageIdx(0);
                  }}
                >
                  <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden rounded-t-[2rem]">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <Package size={64} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] font-black text-gray-800 bg-white/90 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                        {p.category}
                      </span>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                          setActiveImageIdx(0);
                        }}
                        className="w-12 h-12 bg-white text-gray-900 rounded-full flex items-center justify-center hover:bg-pink-500 hover:text-white transition-colors shadow-xl translate-y-4 group-hover:translate-y-0 duration-300"
                        title="Ver Detalhes"
                      >
                        <Eye size={20} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppContact(p.name, finalPrice);
                        }}
                        className="w-12 h-12 bg-white text-green-600 rounded-full flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors shadow-xl translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                        title="Dúvidas no WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-pink-600 transition-colors">{p.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                      {p.description || 'Peça exclusiva produzida artesanalmente.'}
                    </p>
                    <div className="flex items-end justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Por apenas</p>
                        <p className="text-2xl font-black text-gray-900">R$ {finalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p, finalPrice);
                      }}
                      className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-400">Tente buscar por outro termo ou categoria.</p>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <img src="https://cdn-icons-png.flaticon.com/512/4230/4230588.png" alt="Logo" className="w-5 h-5 filter brightness-0 invert" />
            </div>
            <span className="text-pink-600 font-black text-lg tracking-tight">Calculiê</span>
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            Tecnologia para Ateliês Criativos
          </p>
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE DO CARRINHO */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-8 bg-pink-600 text-white p-6 rounded-full shadow-2xl z-40 animate-bounce hover:scale-110 transition-all flex items-center gap-3"
        >
          <div className="relative">
            <ShoppingBag size={28} />
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          </div>
          <span className="font-black text-sm pr-2">Ver Pedido</span>
        </button>
      )}

      {/* MODAL DE DETALHES DO PRODUTO */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/10 z-50 animate-fadeIn flex items-start justify-center p-4 md:p-8 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0 bg-white/40" 
            onClick={() => setSelectedProduct(null)}
          ></div>
          <div className="bg-white w-full max-w-6xl max-h-[85vh] rounded-[2rem] shadow-2xl overflow-y-auto flex flex-col md:flex-row animate-scaleIn relative z-10 my-4">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-gray-900 z-20 bg-white/80 p-2 rounded-full shadow-sm"
            >
              <X size={24} />
            </button>

            {/* GALERIA DE IMAGENS */}
            <div className="w-full md:w-3/5 bg-gray-50 relative flex flex-col">
              {(() => {
                const allImages = [selectedProduct.image, ...(selectedProduct.images || [])].filter(Boolean) as string[];
                return (
                  <>
                    <div className="w-full flex-1 relative min-h-[40vh] md:min-h-0">
                      {allImages.length > 0 ? (
                        <img 
                          src={allImages[activeImageIdx] || allImages[0]} 
                          alt={selectedProduct.name} 
                          className="absolute inset-0 w-full h-full object-contain bg-gray-100/50"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                          <Package size={80} />
                        </div>
                      )}
                    </div>

                    {/* MINIATURAS */}
                    {allImages.length > 1 && (
                      <div className="bg-white p-4 border-t border-gray-100 flex gap-3 overflow-x-auto no-scrollbar justify-start md:justify-center">
                        {allImages.map((img, idx) => (
                          <button 
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIdx(idx);
                            }}
                            className={`w-20 h-20 rounded-xl border-2 overflow-hidden transition-all shrink-0 ${activeImageIdx === idx ? 'border-pink-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                          >
                            <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* INFORMAÇÕES */}
            <div className="w-full md:w-2/5 p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar bg-white">
              <div className="mb-8">
                <span className="text-[10px] font-black text-pink-500 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-widest border border-pink-100">
                  {selectedProduct.category}
                </span>
                <h2 className="text-3xl font-black text-gray-800 mt-4 leading-tight">{selectedProduct.name}</h2>
              </div>

              <div className="flex-1 space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Descrição</h4>
                  <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description || 'Este produto é feito sob encomenda com materiais de alta qualidade. Entre em contato para personalizar cores e detalhes.'}
                  </p>
                </div>

                {selectedProduct.minOrderQuantity && selectedProduct.minOrderQuantity > 1 && (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                    <Info size={18} className="text-yellow-600" />
                    <p className="text-xs font-bold text-yellow-700">Pedido mínimo de {selectedProduct.minOrderQuantity} unidades.</p>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor Unitário</p>
                    <p className="text-4xl font-black text-gray-800">
                      R$ {(selectedProduct.marketPrice > 0 ? selectedProduct.marketPrice : calculateProjectBreakdown({ 
                        items: [{ productId: selectedProduct.id, name: selectedProduct.name, quantity: 1, hoursToMake: selectedProduct.minutesToMake / 60, materials: selectedProduct.materials, profitMargin: selectedProduct.profitMargin }], 
                        platformId: platforms[0]?.id || '', 
                        excedente: companyData?.defaultExcedente || 10 
                      } as any, materials, platforms, companyData!).finalPrice).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const price = selectedProduct.marketPrice > 0 ? selectedProduct.marketPrice : calculateProjectBreakdown({ 
                        items: [{ productId: selectedProduct.id, name: selectedProduct.name, quantity: 1, hoursToMake: selectedProduct.minutesToMake / 60, materials: selectedProduct.materials, profitMargin: selectedProduct.profitMargin }], 
                        platformId: platforms[0]?.id || '', 
                        excedente: companyData?.defaultExcedente || 10 
                      } as any, materials, platforms, companyData!).finalPrice;
                      handleWhatsAppContact(selectedProduct.name, price);
                    }}
                    className="py-5 bg-green-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-600 transition-all active:scale-95"
                  >
                    <MessageCircle size={24} />
                    <span>Falar no WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => {
                      const price = selectedProduct.marketPrice > 0 ? selectedProduct.marketPrice : calculateProjectBreakdown({ 
                        items: [{ productId: selectedProduct.id, name: selectedProduct.name, quantity: 1, hoursToMake: selectedProduct.minutesToMake / 60, materials: selectedProduct.materials, profitMargin: selectedProduct.profitMargin }], 
                        platformId: platforms[0]?.id || '', 
                        excedente: companyData?.defaultExcedente || 10 
                      } as any, materials, platforms, companyData!).finalPrice;
                      addToCart(selectedProduct, price);
                      setSelectedProduct(null);
                    }}
                    className="py-5 bg-pink-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-pink-100 hover:bg-pink-600 transition-all active:scale-95"
                  >
                    <ShoppingCart size={24} />
                    <span>Adicionar ao Carrinho</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO CARRINHO */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-end animate-fadeIn">
          <div 
            className="absolute inset-0 bg-white/40" 
            onClick={() => setIsCartOpen(false)}
          ></div>
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col z-10 animate-slideInRight">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl"><ShoppingBag size={24} /></div>
                <h3 className="text-xl font-black text-gray-800">Seu Pedido</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-3xl border border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden shadow-sm shrink-0 border border-gray-100">
                    {item.product.image ? (
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={24} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-800 truncate text-sm">{item.product.name}</h4>
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mt-1">R$ {item.price.toFixed(2)} / un</p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center bg-white rounded-xl border border-gray-100 p-1">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-gray-400 hover:text-pink-500"><Minus size={14} /></button>
                        <span className="w-8 text-center text-xs font-black text-gray-700">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-gray-400 hover:text-pink-500"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-800">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Total do Pedido</span>
                <span className="text-3xl font-black text-gray-800">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleFinishOrder}
                disabled={isGeneratingImage}
                className="w-full py-5 bg-green-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Gerando Resumo...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} />
                    <span>Enviar Pedido pelo WhatsApp</span>
                  </>
                )}
              </button>
              <p className="text-[9px] text-gray-400 text-center font-medium italic">
                * Ao clicar, geraremos uma imagem do seu pedido para você enviar junto com a mensagem.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE OCULTO PARA GERAÇÃO DA IMAGEM DO PEDIDO */}
      <div className="fixed left-[-9999px] top-[-9999px]">
        <div ref={orderSummaryRef} className="w-[600px] bg-white p-12 font-['Quicksand']">
          <div className="flex items-center justify-between mb-12 border-b-4 border-pink-500 pb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-pink-500 rounded-3xl flex items-center justify-center shadow-lg overflow-hidden">
                {companyData?.logo ? (
                  <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package size={40} className="text-white" />
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-800">{companyData?.name || 'Meu Ateliê'}</h2>
                <p className="text-pink-500 font-black text-xs uppercase tracking-widest mt-1">Resumo do Pedido</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Data</p>
              <p className="text-sm font-black text-gray-800">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center font-black text-base shrink-0">{item.quantity}x</span>
                  <span className="font-black text-gray-800 text-lg">{item.product.name}</span>
                </div>
                <span className="font-black text-gray-800 text-lg">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-8 rounded-[2rem] flex justify-between items-center">
            <span className="text-gray-400 font-black uppercase text-xs tracking-widest">Total Geral</span>
            <span className="text-4xl font-black text-pink-600">R$ {cartTotal.toFixed(2)}</span>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Obrigado pela preferência!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
