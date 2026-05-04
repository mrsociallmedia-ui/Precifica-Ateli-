
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Sparkles, Plus, Trash2, Edit3, Package, DollarSign, Clock, Layers, ChevronRight, X, Printer, Info, Ruler, Search, ArrowRightLeft, TrendingUp, Tag, PlusCircle, CheckCircle2, FileText, Copy, LayoutGrid, FileStack, Repeat, FileText as FileIcon, Layers3, Share2, ExternalLink, QrCode, MessageSquare,
  ShoppingCart, ShoppingBag, Minus, RefreshCw, MessageCircle, Wand2, Eye, EyeOff
} from 'lucide-react';
import { Product, Material, CompanyData, Platform, ProjectItem } from '../types';
import { calculateProjectBreakdown } from '../utils';
import { GoogleGenAI } from "@google/genai";

declare const html2canvas: any;

interface ProductsProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  materials: Material[];
  companyData: CompanyData;
  platforms: Platform[];
  productCategories: string[];
  setProductCategories: React.Dispatch<React.SetStateAction<string[]>>;
  currentUser: string;
}

export const Products: React.FC<ProductsProps> = ({ 
  products, setProducts, materials, companyData, platforms, productCategories, setProductCategories, currentUser
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Estados do Carrinho (Preview)
  const [cart, setCart] = useState<{product: Product, quantity: number, price: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductPreview, setSelectedProductPreview] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAIDescription, setIsGeneratingAIDescription] = useState(false);
  const orderSummaryRef = useRef<HTMLDivElement>(null);

  const generateAIDescription = async () => {
    if (!newProduct.name) {
      alert("Por favor, digite o nome da peça primeiro.");
      return;
    }

    setIsGeneratingAIDescription(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.trim() === "") {
        throw new Error('A chave da API (GEMINI_API_KEY) não foi detectada.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Gere uma descrição curta, criativa e profissional para um produto artesanal de ateliê.
        Nome do Produto: ${newProduct.name}
        Categoria: ${newProduct.category}
        A descrição deve ser atraente para clientes, destacando o cuidado artesanal e a exclusividade. 
        Máximo de 3 parágrafos curtos. Use emojis se apropriado.`,
      });

      if (response.text) {
        setNewProduct(prev => ({ ...prev, description: response.text }));
      }
    } catch (error) {
      console.error("Erro ao gerar descrição com IA:", error);
      alert("Houve um erro ao gerar a descrição. Tente novamente.");
    } finally {
      setIsGeneratingAIDescription(false);
    }
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
      const canvas = await html2canvas(orderSummaryRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const imageData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `pedido-preview.png`;
      link.href = imageData;
      link.click();

      const phone = companyData.phone.replace(/\D/g, '');
      let message = `*NOVO PEDIDO (PREVIEW)*\n\n`;
      cart.forEach(item => {
        message += `• ${item.quantity}x *${item.product.name}* - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
      });
      message += `\n*TOTAL: R$ ${cartTotal.toFixed(2)}*`;
      
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error("Erro ao finalizar pedido:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', category: productCategories[0] || 'Geral', description: '', minutesToMake: 60, materials: [],
    profitMargin: companyData.defaultProfitMargin, marketPrice: 0, image: '', images: [], packagingCost: 0, minOrderQuantity: 1,
    showInCatalog: true
  });
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultipleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewProduct(prev => ({ 
            ...prev, 
            images: [...(prev.images || []), reader.result as string] 
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };
  
  const [selectedMatId, setSelectedMatId] = useState('');
  const [usageValue, setUsageValue] = useState(1);
  const [usageType, setUsageType] = useState<'single' | 'multiple_per_unit' | 'multiple_units' | 'standard'>('standard');
  const [printingCost, setPrintingCost] = useState(0);
  const [inputUnitType, setInputUnitType] = useState<'m' | 'cm'>('m');

  const selectedMaterial = useMemo(() => materials.find(m => m.id === selectedMatId), [selectedMatId, materials]);

  const isSheetMaterial = useMemo(() => {
    if (!selectedMaterial) return false;
    const u = selectedMaterial.unit.toLowerCase();
    const n = selectedMaterial.name.toLowerCase();
    return u.includes('folha') || u.includes('polasseal') || u.includes('adesivo') || n.includes('polasseal') || n.includes('papel');
  }, [selectedMaterial]);

  useEffect(() => {
    if (selectedMaterial) {
      setPrintingCost(0); // Reset printing cost on new selection
      if (isSheetMaterial) {
        if (selectedMaterial.defaultPiecesPerUnit && selectedMaterial.defaultPiecesPerUnit > 1) {
          setUsageType('multiple_per_unit');
          setUsageValue(selectedMaterial.defaultPiecesPerUnit);
        } else {
          setUsageType('single');
          setUsageValue(1);
        }
      } else {
        setUsageType('standard');
        setUsageValue(1);
      }
      
      if (selectedMaterial.unit === 'cm') setInputUnitType('cm');
      else setInputUnitType('m');
    }
  }, [selectedMaterial, isSheetMaterial]);

  const handleOpenAdd = () => {
    setEditingProductId(null);
    setNewProduct({
      name: '', category: productCategories[0] || 'Geral', description: '', minutesToMake: 60, materials: [],
      profitMargin: companyData.defaultProfitMargin, marketPrice: 0, image: '', images: [], packagingCost: 0, minOrderQuantity: 1
    });
    setShowForm(true);
  };

  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);

  const handleEditMaterial = (index: number) => {
    const mat = newProduct.materials![index];
    setSelectedMatId(mat.materialId);
    setUsageType(mat.usageType || 'standard');
    setUsageValue(mat.usageValue || mat.quantity || 1);
    setPrintingCost(mat.printingCost || 0);
    setEditingMaterialIndex(index);
  };

  const addMaterialToProduct = () => {
    if (!selectedMatId) return;

    let finalQuantity = (usageType === 'standard' || usageType === 'single') ? usageValue : 1;
    
    if (selectedMaterial?.unit === 'metro' && inputUnitType === 'cm' && usageType === 'standard') {
        finalQuantity = usageValue / 100;
    }

    const matItem: ProjectItem = {
      materialId: selectedMatId,
      quantity: finalQuantity,
      usageType: usageType === 'standard' ? undefined : usageType,
      usageValue: (usageType === 'multiple_per_unit' || usageType === 'multiple_units') ? usageValue : undefined,
      printingCost: printingCost || 0
    };

    if (editingMaterialIndex !== null) {
      const updatedMaterials = [...(newProduct.materials || [])];
      updatedMaterials[editingMaterialIndex] = matItem;
      setNewProduct({ ...newProduct, materials: updatedMaterials });
      setEditingMaterialIndex(null);
    } else {
      setNewProduct({ ...newProduct, materials: [...(newProduct.materials || []), matItem] });
    }

    setSelectedMatId('');
    setUsageValue(1);
    setPrintingCost(0);
    setUsageType('standard');
    setInputUnitType('m');
  };

  const removeMaterialFromProduct = (index: number) => {
    setNewProduct({ ...newProduct, materials: (newProduct.materials || []).filter((_, i) => i !== index) });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;

    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? { ...p, ...newProduct as Product } : p));
    } else {
      const product: Product = {
        id: Date.now().toString(),
        name: newProduct.name!,
        description: newProduct.description || '',
        image: newProduct.image || '',
        images: newProduct.images || [],
        category: newProduct.category || 'Geral',
        minutesToMake: Number(newProduct.minutesToMake) || 0,
        materials: newProduct.materials || [],
        profitMargin: Number(newProduct.profitMargin) || 30,
        marketPrice: Number(newProduct.marketPrice) || 0,
        packagingCost: Number(newProduct.packagingCost) || 0,
        minOrderQuantity: Number(newProduct.minOrderQuantity) || 1,
        showInCatalog: newProduct.showInCatalog !== false
      };
      setProducts(prev => [product, ...prev]);
    }
    setShowForm(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Deseja realmente excluir este produto do catálogo?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAddCategory = () => {
    const name = prompt("Digite o nome da nova categoria:");
    if (name) {
      const trimmedName = name.trim();
      if (trimmedName && !productCategories.includes(trimmedName)) {
        setProductCategories(prev => [...prev, trimmedName]);
        setNewProduct(prev => ({ ...prev, category: trimmedName }));
      } else if (productCategories.includes(trimmedName)) {
        alert("Esta categoria já existe.");
      }
    }
  };

  const handleEditCategory = (oldName: string) => {
    if (oldName === 'Geral') return alert("A categoria 'Geral' não pode ser editada.");
    const newName = prompt("Digite o novo nome para a categoria:", oldName);
    if (newName) {
      const trimmedName = newName.trim();
      if (trimmedName && trimmedName !== oldName) {
        if (productCategories.includes(trimmedName)) {
          return alert("Já existe uma categoria com este nome.");
        }
        setProductCategories(prev => prev.map(c => c === oldName ? trimmedName : c));
        setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmedName } : p));
        if (newProduct.category === oldName) {
          setNewProduct(prev => ({ ...prev, category: trimmedName }));
        }
      }
    }
  };

  const handleDeleteCategory = (name: string) => {
    if (name === 'Geral') return alert("A categoria 'Geral' não pode ser excluída.");
    if (confirm(`Deseja excluir a categoria "${name}"? Os produtos desta categoria serão movidos para "Geral".`)) {
      setProductCategories(prev => prev.filter(c => c !== name));
      setProducts(prev => prev.map(p => p.category === name ? { ...p, category: 'Geral' } : p));
      if (newProduct.category === name) {
        setNewProduct(prev => ({ ...prev, category: 'Geral' }));
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPreview = useMemo(() => {
    if (!showForm) return null;
    const mockProject = {
      items: [{ 
        productId: 'preview', 
        name: newProduct.name || 'Preview', 
        quantity: 1, 
        hoursToMake: (newProduct.minutesToMake || 0) / 60, 
        materials: newProduct.materials || [], 
        profitMargin: newProduct.profitMargin || 30,
        manualBaseCost: newProduct.manualBaseCost
      }],
      platformId: platforms[0]?.id || '',
      excedente: companyData.defaultExcedente
    };
    return calculateProjectBreakdown(mockProject as any, materials, platforms, companyData);
  }, [newProduct, materials, platforms, companyData, showForm]);

  const isLengthMaterial = selectedMaterial?.unit === 'metro';

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Catálogo de <span className="text-pink-500">Produtos</span></h2>
          <p className="text-gray-400 font-medium">Cadastre suas peças com cálculos precisos de folhas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowShareModal(true)} 
            className="bg-white border border-gray-100 text-gray-600 hover:text-pink-500 font-black px-6 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-sm active:scale-95"
            title="Gerar Catálogo Online"
          >
            <Share2 size={20} /> <span className="hidden sm:inline">Catálogo Online</span>
          </button>
          <button onClick={handleOpenAdd} className="bg-pink-500 hover:bg-pink-600 text-white font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95">
            <Plus size={20} /> Cadastrar Nova Peça
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input type="text" placeholder="Buscar no catálogo..." className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-pink-400 transition-all font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredProducts.map(p => {
          const mockProject = { items: [{ productId: p.id, name: p.name, quantity: 1, hoursToMake: p.minutesToMake / 60, materials: p.materials, profitMargin: p.profitMargin }], platformId: platforms[0]?.id || '', excedente: companyData.defaultExcedente };
          const breakdown = calculateProjectBreakdown(mockProject as any, materials, platforms, companyData);
          return (
            <div key={p.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col overflow-hidden">
              <div className="aspect-video bg-gray-50 relative overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <Package size={48} />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="text-[10px] font-black text-pink-500 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-pink-50">{p.category}</span>
                  {p.showInCatalog === false && (
                    <span className="text-[10px] font-black text-gray-400 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-gray-100 flex items-center gap-1">
                      <EyeOff size={10} /> Oculto
                    </span>
                  )}
                </div>
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h3 className="text-xl font-black text-gray-800">{p.name}</h3>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => { setEditingProductId(p.id); setNewProduct({...p}); setShowForm(true); }} className="p-2 text-pink-400 hover:bg-pink-50 rounded-xl transition-all"><Edit3 size={20} /></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                   </div>
                </div>
                <div className="pt-6 border-t border-gray-50 flex items-center justify-between mt-auto">
                  <div>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                       {p.marketPrice > 0 ? 'Preço Definido' : 'Preço Sugerido'}
                    </p>
                    <p className="text-2xl font-black text-gray-800">
                       R$ {(p.marketPrice > 0 ? p.marketPrice : breakdown.finalPrice).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Lucro</p>
                    <p className="text-sm font-black text-gray-700">{p.profitMargin}%</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-[90vw] h-[90vh] rounded-[3rem] p-10 shadow-2xl relative overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500"><X size={28} /></button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
              <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl">{editingProductId ? <Edit3 size={28} /> : <Plus size={28} />}</div>
              {editingProductId ? 'Editar Peça' : 'Nova Peça'}
            </h3>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-7 space-y-8">
                  <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto do Produto</label>
                           <div className="relative group/photo aspect-video bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:border-pink-300 transition-all cursor-pointer">
                              {newProduct.image ? (
                                <>
                                  <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white text-[10px] font-black uppercase">Trocar Foto</p>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center p-4">
                                   <Package size={32} className="text-gray-200 mx-auto mb-2" />
                                   <p className="text-[9px] font-black text-gray-400 uppercase">Clique para enviar</p>
                                </div>
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={handleImageUpload}
                              />
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Peça</label>
                              <input type="text" required className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label>
                                <div className="flex gap-2">
                                  <button 
                                    type="button"
                                    onClick={handleAddCategory}
                                    className="text-[9px] font-black text-pink-500 uppercase tracking-widest hover:text-pink-600 flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Nova
                                  </button>
                                  {newProduct.category && newProduct.category !== 'Geral' && (
                                    <>
                                      <button 
                                        type="button"
                                        onClick={() => handleEditCategory(newProduct.category!)}
                                        className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 flex items-center gap-1"
                                      >
                                        <Edit3 size={10} /> Editar
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteCategory(newProduct.category!)}
                                        className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 flex items-center gap-1"
                                      >
                                        <Trash2 size={10} /> Excluir
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <select className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                                {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo de Produção (Min)</label>
                           <input type="number" required className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" value={newProduct.minutesToMake} onChange={e => setNewProduct({...newProduct, minutesToMake: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem (%)</label>
                           <input type="number" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-green-600" value={newProduct.profitMargin} onChange={e => setNewProduct({...newProduct, profitMargin: parseFloat(e.target.value) || 0})} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Embalagem de Envio</label>
                           <div className="relative">
                              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                              <input 
                                type="number" 
                                step="0.01" 
                                className="w-full p-4 pl-10 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700 text-sm" 
                                placeholder="digite o valor unitário da sua embalagem..." 
                                value={newProduct.packagingCost || ''} 
                                onChange={e => setNewProduct({...newProduct, packagingCost: parseFloat(e.target.value) || 0})} 
                              />
                           </div>
                           <p className="text-[9px] text-gray-400 font-bold italic px-1">Qual é o valor unitário da sua embalagem?</p>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido Mínimo</label>
                           <div className="relative">
                              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                              <input 
                                type="number" 
                                className="w-full p-4 pl-10 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700 text-sm" 
                                placeholder="digite a quantidade de peças para compor o seu pedido mínimo..." 
                                value={newProduct.minOrderQuantity || ''} 
                                onChange={e => setNewProduct({...newProduct, minOrderQuantity: parseInt(e.target.value) || 1})} 
                              />
                           </div>
                           <p className="text-[9px] text-gray-400 font-bold italic px-1">Qual será o seu pedido mínimo para essa Peça?</p>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Produto</label>
                          <button 
                            type="button"
                            onClick={generateAIDescription}
                            disabled={isGeneratingAIDescription || !newProduct.name}
                            className="flex items-center gap-1.5 text-[9px] font-black text-pink-500 uppercase tracking-widest hover:text-pink-600 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingAIDescription ? (
                              <>
                                <RefreshCw size={10} className="animate-spin" />
                                Criando...
                              </>
                            ) : (
                              <>
                                <Wand2 size={10} />
                                Criar com IA
                              </>
                            )}
                          </button>
                        </div>
                        <textarea 
                          className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-medium text-gray-700 text-sm min-h-[100px] resize-none" 
                          placeholder="Descreva os detalhes da peça, materiais especiais, acabamentos..."
                          value={newProduct.description} 
                          onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                        />
                     </div>

                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fotos Adicionais</label>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                         {(newProduct.images || []).map((img, idx) => (
                           <div key={idx} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group/img">
                             <img src={img} alt={`Extra ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             <button 
                               type="button"
                               onClick={() => removeImage(idx)}
                               className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                             >
                               <Trash2 size={12} />
                             </button>
                           </div>
                         ))}
                         <div className="relative aspect-square bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-pink-300 transition-all cursor-pointer">
                           <Plus size={20} className="text-gray-300" />
                           <p className="text-[8px] font-black text-gray-400 uppercase mt-1">Adicionar</p>
                           <input 
                             type="file" 
                             multiple
                             accept="image/*" 
                             className="absolute inset-0 opacity-0 cursor-pointer" 
                             onChange={handleMultipleImagesUpload}
                           />
                         </div>
                       </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço de Venda (Opcional)</label>
                        <div className="relative">
                           <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                           <input 
                             type="number" 
                             step="0.01" 
                             className="w-full p-4 pl-12 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700 focus:ring-2 focus:ring-pink-400 transition-all" 
                             placeholder={`Sugerido: R$ ${currentPreview?.finalPrice.toFixed(2)}`}
                             value={newProduct.marketPrice || ''} 
                             onChange={e => setNewProduct({...newProduct, marketPrice: parseFloat(e.target.value) || 0})} 
                           />
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold italic px-1">
                           Se definido, este valor será usado como preço fixo no catálogo.
                        </p>
                     </div>

                     <div className="pt-4 border-t border-gray-100">
                        <button 
                          type="button"
                          onClick={() => setNewProduct({...newProduct, showInCatalog: !newProduct.showInCatalog})}
                          className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${newProduct.showInCatalog !== false ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                        >
                           <div className="flex items-center gap-3">
                              {newProduct.showInCatalog !== false ? <Eye size={20} /> : <EyeOff size={20} />}
                              <div className="text-left">
                                 <p className="text-xs font-black uppercase tracking-widest">Exibir no Catálogo Online</p>
                                 <p className="text-[9px] font-bold opacity-70">Controla se esta peça aparece para seus clientes.</p>
                              </div>
                           </div>
                           <div className={`w-10 h-6 rounded-full relative transition-all ${newProduct.showInCatalog !== false ? 'bg-pink-500' : 'bg-gray-300'}`}>
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newProduct.showInCatalog !== false ? 'right-1' : 'left-1'}`} />
                           </div>
                        </button>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Package size={14} className="text-yellow-500" /> Seleção de Materiais</h4>
                     <div className="flex flex-col gap-6 p-8 bg-yellow-50/50 rounded-3xl border border-yellow-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Material</label>
                              <select className="w-full p-4 bg-white border border-yellow-100 rounded-2xl outline-none font-bold text-gray-700 text-sm" value={selectedMatId} onChange={e => setSelectedMatId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                              </select>
                           </div>
                           
                           {/* Controle de Quantidade para Materiais Padrão ou Fita */}
                           {!isSheetMaterial && (
                             <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Quantidade Usada</label>
                                  {isLengthMaterial && (
                                    <div className="flex bg-white rounded-lg border border-yellow-100 p-0.5 mb-1">
                                        <button type="button" onClick={() => setInputUnitType('m')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${inputUnitType === 'm' ? 'bg-yellow-400 text-white' : 'text-gray-400'}`}>m</button>
                                        <button type="button" onClick={() => setInputUnitType('cm')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${inputUnitType === 'cm' ? 'bg-yellow-400 text-white' : 'text-gray-400'}`}>cm</button>
                                    </div>
                                  )}
                                </div>
                                <div className="relative">
                                    <input type="number" step="0.01" className="w-full p-4 bg-white border border-yellow-100 rounded-2xl outline-none font-black text-gray-700 text-sm" value={usageValue} onChange={e => setUsageValue(parseFloat(e.target.value) || 0)} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-yellow-600 uppercase">{isLengthMaterial ? inputUnitType : selectedMaterial?.unit}</span>
                                </div>
                             </div>
                           )}
                            {isSheetMaterial && (
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Printer size={10} /> Custo de Impressão (R$)
                                 </label>
                                 <div className="relative">
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      className="w-full p-4 bg-white border border-yellow-100 rounded-2xl outline-none font-black text-gray-700 text-sm" 
                                      placeholder="0,00"
                                      value={printingCost || ''} 
                                      onChange={e => setPrintingCost(parseFloat(e.target.value) || 0)} 
                                    />
                                 </div>
                              </div>
                            )}
                     </div>

                     {/* Lógica Específica para Folhas / Polasseal / Adesivos */}
                        {isSheetMaterial && (
                          <div className="space-y-4 animate-fadeIn">
                             <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Como você usa este material?</label>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => { setUsageType('single'); setUsageValue(1); }}
                                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${usageType === 'single' ? 'bg-yellow-400 border-yellow-400 shadow-md text-yellow-900' : 'bg-white border-yellow-100 text-gray-400 hover:border-yellow-200'}`}
                                >
                                   <FileIcon size={20} />
                                   <span className="text-[9px] font-black uppercase">Uma folha apenas</span>
                                </button>
                                
                                <button 
                                  type="button" 
                                  onClick={() => { setUsageType('multiple_per_unit'); setUsageValue(selectedMaterial?.defaultPiecesPerUnit || 4); }}
                                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${usageType === 'multiple_per_unit' ? 'bg-yellow-400 border-yellow-400 shadow-md text-yellow-900' : 'bg-white border-yellow-100 text-gray-400 hover:border-yellow-200'}`}
                                >
                                   <LayoutGrid size={20} />
                                   <span className="text-[9px] font-black uppercase text-center">Cabe mais de uma peça na folha</span>
                                </button>

                                <button 
                                  type="button" 
                                  onClick={() => { setUsageType('multiple_units'); setUsageValue(2); }}
                                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${usageType === 'multiple_units' ? 'bg-yellow-400 border-yellow-400 shadow-md text-yellow-900' : 'bg-white border-yellow-100 text-gray-400 hover:border-yellow-200'}`}
                                >
                                   <Layers3 size={20} />
                                   <span className="text-[9px] font-black uppercase text-center">Usa mais de uma folha por peça</span>
                                </button>
                             </div>

                             {usageType === 'multiple_per_unit' && (
                               <div className="bg-white p-4 rounded-2xl border border-yellow-100 animate-fadeIn">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantas peças você tira de 1 folha?</label>
                                  <div className="flex items-center gap-3 mt-1">
                                    <input type="number" className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-gray-700" value={usageValue} onChange={e => setUsageValue(parseInt(e.target.value) || 1)} />
                                    <span className="text-[10px] font-black text-yellow-600 uppercase">Peças</span>
                                  </div>
                               </div>
                             )}

                             {usageType === 'multiple_units' && (
                               <div className="bg-white p-4 rounded-2xl border border-yellow-100 animate-fadeIn">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantas folhas usa para cada peça?</label>
                                  <div className="flex items-center gap-3 mt-1">
                                    <input type="number" className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-gray-700" value={usageValue} onChange={e => setUsageValue(parseInt(e.target.value) || 1)} />
                                    <span className="text-[10px] font-black text-yellow-600 uppercase">Folhas</span>
                                  </div>
                               </div>
                             )}
                          </div>
                        )}

                         <button type="button" onClick={addMaterialToProduct} className="w-full py-4 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-xs uppercase hover:bg-yellow-500 transition-all shadow-md active:scale-95">
                           {editingMaterialIndex !== null ? 'Atualizar Material' : 'Adicionar Material à Peça'}
                         </button>
                         {editingMaterialIndex !== null && (
                           <button type="button" onClick={() => { setEditingMaterialIndex(null); setSelectedMatId(''); setUsageValue(1); setPrintingCost(0); setUsageType('standard'); }} className="w-full py-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors">Cancelar Edição</button>
                         )}
                     </div>

                     <div className="space-y-3">
                        {newProduct.materials?.map((mat, index) => {
                          const mInfo = materials.find(m => m.id === mat.materialId);
                          return (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg text-yellow-500 shadow-sm">
                                    {mat.usageType === 'multiple_per_unit' ? <LayoutGrid size={16} /> : mat.usageType === 'multiple_units' ? <Layers3 size={16} /> : <FileIcon size={16} />}
                                  </div>
                                  <div>
                                     <p className="text-xs font-black text-gray-700">{mInfo?.name}</p>
                                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                       {mat.usageType === 'multiple_per_unit' ? `Rendimento: 1/${mat.usageValue} ${mInfo?.unit}` : 
                                        mat.usageType === 'multiple_units' ? `Consumo: ${mat.usageValue} ${mInfo?.unit}s` : 
                                        `${mat.quantity} ${mInfo?.unit}`}
                                       {mat.printingCost && mat.printingCost > 0 ? ` • Impressão: R$ ${mat.printingCost.toFixed(2)}` : ''}
                                     </p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2">
                                 <button type="button" onClick={() => handleEditMaterial(index)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit3 size={16} /></button>
                                 <button type="button" onClick={() => removeMaterialFromProduct(index)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-5">
                  <div className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl text-center space-y-6">
                     <div>
                        <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-4">Valor de Venda</p>
                        <h2 className="text-6xl font-black mb-2">R$ {(newProduct.marketPrice || currentPreview?.finalPrice || 0).toFixed(2)}</h2>
                        {newProduct.marketPrice ? (
                           <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Preço Fixo Definido</p>
                        ) : (
                           <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Cálculo Sugerido</p>
                        )}
                     </div>
                     <div className="bg-white/10 p-6 rounded-[2rem] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-60">
                           <span>Mão de Obra</span>
                           <span className="text-white">R$ {currentPreview?.laborCosts.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-60">
                           <span>Materiais</span>
                           <span className="text-white">R$ {currentPreview?.variableCosts.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs font-black">
                           <span className="text-green-400">Lucro Líquido</span>
                           <span className="text-green-400">R$ {currentPreview?.profit.toFixed(2)}</span>
                        </div>
                     </div>
                     <button type="submit" className="w-full py-6 mt-4 bg-pink-500 hover:bg-pink-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Salvar Peça no Catálogo</button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-[90vw] h-[90vh] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col">
            <button onClick={() => setShowShareModal(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500 z-10"><X size={28} /></button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                  <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl"><Share2 size={28} /></div>
                  Catálogo Online
                </h3>
                <p className="text-gray-400 font-medium mt-2">Esta é a visão que seus clientes terão do seu catálogo.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const baseUrl = window.location.origin + window.location.pathname;
                    const catalogUrl = `${baseUrl}?catalog=${encodeURIComponent(currentUser)}`;
                    navigator.clipboard.writeText(catalogUrl);
                    alert('Link do seu catálogo online copiado!\n\nEnvie para seus clientes: ' + catalogUrl);
                  }}
                  className="bg-pink-50 text-pink-600 font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-pink-100 transition-all"
                >
                  <Copy size={18} /> Copiar Link
                </button>
                <button 
                  onClick={() => {
                    const baseUrl = window.location.origin + window.location.pathname;
                    const catalogUrl = `${baseUrl}?catalog=${encodeURIComponent(currentUser)}`;
                    window.open(catalogUrl, '_blank');
                  }}
                  className="bg-gray-900 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-gray-800 transition-all"
                >
                  <ExternalLink size={18} /> Ver Online
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100">
                {/* Header do Catálogo Público */}
                <div className="text-center mb-16">
                  <div className="w-24 h-24 bg-white rounded-full mx-auto mb-6 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                    {companyData.logo ? (
                      <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package size={40} className="text-pink-300" />
                    )}
                  </div>
                  <h2 className="text-4xl font-black text-gray-800 mb-2">{companyData.name || 'Meu Ateliê'}</h2>
                  <p className="text-gray-400 font-medium max-w-md mx-auto">Confira nossas peças exclusivas e faça seu orçamento pelo WhatsApp.</p>
                </div>

                {/* Grid de Produtos Público */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map(p => {
                    const initialQty = p.minOrderQuantity || 1;
                    const mockProject = { 
                      items: [{ 
                        productId: p.id, 
                        name: p.name, 
                        quantity: initialQty, 
                        hoursToMake: p.minutesToMake / 60, 
                        materials: p.materials, 
                        profitMargin: p.profitMargin,
                        packagingCost: p.packagingCost
                      }], 
                      platformId: platforms[0]?.id || '', 
                      excedente: companyData.defaultExcedente 
                    };
                    const breakdown = calculateProjectBreakdown(mockProject as any, materials, platforms, companyData);
                    const price = p.marketPrice > 0 ? p.marketPrice : (breakdown.finalPrice / initialQty);
                    
                    return (
                      <div 
                        key={p.id} 
                        className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => {
                          setSelectedProductPreview(p);
                          setActiveImageIdx(0);
                        }}
                      >
                        <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
                           {p.image ? (
                             <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                           ) : (
                             <Package size={60} className="text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                           )}
                           <div className="absolute top-4 right-4">
                              <span className="text-[9px] font-black text-pink-500 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-pink-50">
                                {p.category}
                              </span>
                           </div>
                           {p.minOrderQuantity && p.minOrderQuantity > 1 && (
                             <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">
                                Pedido Mín: {p.minOrderQuantity} un
                             </div>
                           )}
                        </div>
                        <div className="p-8">
                          <h4 className="text-lg font-black text-gray-800 mb-2">{p.name}</h4>
                          <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-6">{p.description || 'Peça personalizada feita com carinho para o seu evento.'}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">A partir de</span>
                              <span className="text-2xl font-black text-gray-800">R$ {price.toFixed(2)}</span>
                            </div>
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => {
                                  const message = `Olá! Tenho interesse no produto: *${p.name}* do seu catálogo.`;
                                  window.open(`https://wa.me/${companyData.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                className="bg-green-500 text-white p-3 rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                              >
                                <MessageSquare size={18} />
                              </button>
                              <button 
                                onClick={() => addToCart(p, price)}
                                className="bg-pink-500 text-white p-3 rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-100"
                              >
                                <ShoppingCart size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-20 text-center border-t border-gray-100 pt-10">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Catálogo Online Gerado por Precifica Ateliê</p>
                </div>
              </div>
            </div>

            {/* BOTÃO FLUTUANTE DO CARRINHO (PREVIEW) */}
            {cart.length > 0 && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="absolute bottom-12 right-12 bg-pink-600 text-white p-6 rounded-full shadow-2xl z-40 animate-bounce hover:scale-110 transition-all flex items-center gap-3"
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

            {/* MODAL DE DETALHES DO PRODUTO (PREVIEW) */}
            {selectedProductPreview && (
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scaleIn relative">
                  <button 
                    onClick={() => setSelectedProductPreview(null)} 
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 z-10 p-2"
                  >
                    <X size={28} />
                  </button>

                  {/* GALERIA DE IMAGENS */}
                  <div className="w-full md:w-1/2 bg-gray-50 relative aspect-square md:aspect-auto">
                    <div className="w-full h-full">
                      {selectedProductPreview.images && selectedProductPreview.images.length > 0 ? (
                        <img 
                          src={selectedProductPreview.images[activeImageIdx]} 
                          alt={selectedProductPreview.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : selectedProductPreview.image ? (
                        <img 
                          src={selectedProductPreview.image} 
                          alt={selectedProductPreview.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <Package size={80} />
                        </div>
                      )}
                    </div>

                    {/* MINIATURAS */}
                    {selectedProductPreview.images && selectedProductPreview.images.length > 1 && (
                      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4">
                        {selectedProductPreview.images.map((img, idx) => (
                          <button 
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIdx(idx);
                            }}
                            className={`w-12 h-12 rounded-xl border-2 overflow-hidden transition-all ${activeImageIdx === idx ? 'border-pink-500 scale-110 shadow-lg' : 'border-white/50 hover:border-white'}`}
                          >
                            <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* INFORMAÇÕES */}
                  <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                      <span className="text-[10px] font-black text-pink-500 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-widest border border-pink-100">
                        {selectedProductPreview.category}
                      </span>
                      <h2 className="text-3xl font-black text-gray-800 mt-4 leading-tight">{selectedProductPreview.name}</h2>
                    </div>

                    <div className="flex-1 space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Descrição</h4>
                        <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                          {selectedProductPreview.description || 'Este produto é feito sob encomenda com materiais de alta qualidade. Entre em contato para personalizar cores e detalhes.'}
                        </p>
                      </div>

                      {selectedProductPreview.minOrderQuantity && selectedProductPreview.minOrderQuantity > 1 && (
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                          <Info size={18} className="text-yellow-600" />
                          <p className="text-xs font-bold text-yellow-700">Pedido mínimo de {selectedProductPreview.minOrderQuantity} unidades.</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor Unitário</p>
                          <p className="text-4xl font-black text-gray-800">
                            R$ {(selectedProductPreview.marketPrice > 0 ? selectedProductPreview.marketPrice : calculateProjectBreakdown({ 
                              items: [{ productId: selectedProductPreview.id, name: selectedProductPreview.name, quantity: 1, hoursToMake: selectedProductPreview.minutesToMake / 60, materials: selectedProductPreview.materials, profitMargin: selectedProductPreview.profitMargin }], 
                              platformId: platforms[0]?.id || '', 
                              excedente: companyData.defaultExcedente 
                            } as any, materials, platforms, companyData).finalPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={() => {
                            const message = `Olá! Tenho interesse no produto: *${selectedProductPreview.name}* do seu catálogo.`;
                            window.open(`https://wa.me/${companyData.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="py-5 bg-green-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-600 transition-all active:scale-95"
                        >
                          <MessageCircle size={24} />
                          <span>Falar no WhatsApp</span>
                        </button>
                        <button 
                          onClick={() => {
                            const price = selectedProductPreview.marketPrice > 0 ? selectedProductPreview.marketPrice : calculateProjectBreakdown({ 
                              items: [{ productId: selectedProductPreview.id, name: selectedProductPreview.name, quantity: 1, hoursToMake: selectedProductPreview.minutesToMake / 60, materials: selectedProductPreview.materials, profitMargin: selectedProductPreview.profitMargin }], 
                              platformId: platforms[0]?.id || '', 
                              excedente: companyData.defaultExcedente 
                            } as any, materials, platforms, companyData).finalPrice;
                            addToCart(selectedProductPreview, price);
                            setSelectedProductPreview(null);
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

            {/* MODAL DO CARRINHO (PREVIEW) */}
            {isCartOpen && (
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex items-center justify-end animate-fadeIn">
                <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slideInRight">
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

            {/* TEMPLATE OCULTO PARA GERAÇÃO DA IMAGEM DO PEDIDO (PREVIEW) */}
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
                        <span className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center font-black text-sm">{item.quantity}x</span>
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
        </div>
      )}
    </div>
  );
};
