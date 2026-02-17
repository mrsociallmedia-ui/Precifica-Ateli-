
import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Trash2, Edit3, Package, DollarSign, Clock, Layers, ChevronRight, X, Printer, Info, Ruler, Search, ArrowRightLeft, TrendingUp, Tag, PlusCircle, CheckCircle2, FileText, Copy, LayoutGrid, FileStack } from 'lucide-react';
import { Product, Material, CompanyData, Platform, ProjectItem } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface ProductsProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  materials: Material[];
  companyData: CompanyData;
  platforms: Platform[];
  productCategories: string[];
  setProductCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

export const Products: React.FC<ProductsProps> = ({ 
  products, setProducts, materials, companyData, platforms, productCategories, setProductCategories 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', 
    category: productCategories[0] || 'Geral', 
    description: '', 
    minutesToMake: 60, 
    materials: [],
    profitMargin: companyData.defaultProfitMargin,
    marketPrice: 0
  });
  
  const [selectedMatId, setSelectedMatId] = useState('');
  const [usageValue, setUsageValue] = useState(1);
  const [usageType, setUsageType] = useState<'single' | 'multiple_per_unit' | 'multiple_units' | 'standard'>('standard');
  const [printingCost, setPrintingCost] = useState(0);

  const selectedMaterial = useMemo(() => materials.find(m => m.id === selectedMatId), [selectedMatId, materials]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      categories: new Set(products.map(p => p.category)).size,
    };
  }, [products]);

  const handleOpenAdd = () => {
    setEditingProductId(null);
    setNewProduct({
      name: '', 
      category: productCategories[0] || 'Geral', 
      description: '', 
      minutesToMake: 60, 
      materials: [],
      profitMargin: companyData.defaultProfitMargin,
      marketPrice: 0
    });
    setShowForm(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({ ...product });
    setShowForm(true);
  };

  const addMaterialToProduct = () => {
    if (!selectedMatId) return;
    
    const matItem: ProjectItem = {
      materialId: selectedMatId,
      quantity: usageType === 'standard' ? usageValue : 1,
      usageType: usageType === 'standard' ? undefined : usageType,
      usageValue: usageType !== 'standard' ? usageValue : undefined,
      printingCost: printingCost || 0
    };

    setNewProduct({
      ...newProduct,
      materials: [...(newProduct.materials || []), matItem]
    });

    setSelectedMatId('');
    setUsageValue(1);
    setPrintingCost(0);
    setUsageType('standard');
  };

  const removeMaterialFromProduct = (index: number) => {
    setNewProduct({
      ...newProduct,
      materials: (newProduct.materials || []).filter((_, i) => i !== index)
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) {
      alert('Por favor, informe o nome do produto.');
      return;
    }

    if (editingProductId) {
      setProducts(prev => prev.map(p => 
        p.id === editingProductId 
          ? { ...p, ...newProduct as Product } 
          : p
      ));
    } else {
      const product: Product = {
        id: Date.now().toString(),
        name: newProduct.name!,
        description: newProduct.description || '',
        category: newProduct.category || 'Geral',
        minutesToMake: Number(newProduct.minutesToMake) || 0,
        materials: newProduct.materials || [],
        profitMargin: Number(newProduct.profitMargin) || 30,
        marketPrice: Number(newProduct.marketPrice) || 0
      };
      setProducts(prev => [product, ...prev]);
    }

    setShowForm(false);
    setEditingProductId(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('Deseja excluir este produto do catálogo?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const addCategory = () => {
    const name = prompt('Nome da nova categoria:');
    if (name && !productCategories.includes(name)) {
      setProductCategories([...productCategories, name]);
      setNewProduct(prev => ({ ...prev, category: name }));
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
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
        profitMargin: newProduct.profitMargin || 30
      }],
      platformId: platforms[0]?.id || '',
      excedente: companyData.defaultExcedente
    };
    return calculateProjectBreakdown(mockProject as any, materials, platforms, companyData);
  }, [newProduct, materials, platforms, companyData, showForm]);

  const isFolhaOptionVisible = selectedMaterial?.unit?.toLowerCase().includes('folha') || newProduct.category?.toLowerCase() === 'folha';

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Catálogo de <span className="text-pink-500">Produtos</span></h2>
          <p className="text-gray-400 font-medium">Cadastre suas peças e tenha preços automáticos.</p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="bg-pink-500 hover:bg-pink-600 text-white font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg shadow-pink-100 active:scale-95"
        >
          <Plus size={20} />
          Cadastrar Nova Peça
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
           <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl"><Sparkles size={24} /></div>
           <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total de Peças</p>
              <p className="text-2xl font-black text-gray-800 leading-none">{stats.total}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
           <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl"><Tag size={24} /></div>
           <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Categorias</p>
              <p className="text-2xl font-black text-gray-800 leading-none">{stats.categories}</p>
           </div>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input 
          type="text" 
          placeholder="Buscar no catálogo..." 
          className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-pink-400 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredProducts.map(p => {
          const mockProject = {
            items: [{
              productId: p.id,
              name: p.name,
              quantity: 1,
              hoursToMake: p.minutesToMake / 60,
              materials: p.materials,
              profitMargin: p.profitMargin
            }],
            platformId: platforms[0]?.id || '',
            excedente: companyData.defaultExcedente
          };
          const breakdown = calculateProjectBreakdown(mockProject as any, materials, platforms, companyData);

          return (
            <div key={p.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <span className="text-[10px] font-black text-pink-500 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-widest">{p.category}</span>
                    <h3 className="text-xl font-black text-gray-800 mt-2">{p.name}</h3>
                 </div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(p)} className="p-2 text-pink-400 hover:bg-pink-50 rounded-xl transition-all">
                       <Edit3 size={20} />
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                       <Trash2 size={20} />
                    </button>
                 </div>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Clock size={14} className="text-pink-500" /> {p.minutesToMake} minutos de produção
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Package size={14} className="text-pink-500" /> {p.materials.length} materiais utilizados
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                 <div>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Preço Sugerido</p>
                    <p className="text-2xl font-black text-gray-800">R$ {breakdown.finalPrice.toFixed(2)}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Margem Lucro</p>
                    <p className="text-sm font-black text-gray-700">{p.profitMargin}%</p>
                 </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300">
             <Package size={64} className="mx-auto mb-4 opacity-10" />
             <p className="font-black uppercase tracking-widest text-xs">Catálogo vazio. Comece a cadastrar suas criações!</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] p-10 shadow-2xl relative my-8 overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${editingProductId ? 'bg-pink-500' : 'bg-pink-400'}`}></div>
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-8 right-8 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={28} />
            </button>
            
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${editingProductId ? 'bg-pink-50 text-pink-500' : 'bg-pink-100 text-pink-600'}`}>
                {editingProductId ? <Edit3 size={28} /> : <Plus size={28} />}
              </div>
              {editingProductId ? 'Editar Peça' : 'Nova Peça'}
            </h3>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-7 space-y-8">
                  <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Info size={14} className="text-pink-500" /> Informações Básicas
                     </h4>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Peça</label>
                        <input 
                          type="text" required
                          className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700 focus:ring-4 focus:ring-pink-50 transition-all"
                          value={newProduct.name}
                          onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="Ex: Topo de Bolo Shaker Luxo"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                           <div className="flex gap-2">
                              <select 
                                className="flex-1 p-4 bg-white border border-gray-100 rounded-2xl outline-none font-bold text-gray-700"
                                value={newProduct.category}
                                onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                              >
                                {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                              <button type="button" onClick={addCategory} className="p-4 bg-pink-50 text-pink-500 rounded-2xl hover:bg-pink-100 transition-all">
                                <PlusCircle size={20} />
                              </button>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tempo de Produção (Minutos)</label>
                           <div className="relative">
                              <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" />
                              <input 
                                type="number" required
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700"
                                value={newProduct.minutesToMake}
                                onChange={e => setNewProduct({...newProduct, minutesToMake: parseInt(e.target.value) || 0})}
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Package size={14} className="text-yellow-500" /> Materiais Necessários
                     </h4>

                     <div className="flex flex-col gap-6 p-8 bg-yellow-50/50 rounded-3xl border border-yellow-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Material</label>
                              <select 
                                className="w-full p-4 bg-white border border-yellow-100 rounded-2xl outline-none font-bold text-gray-700 text-sm"
                                value={selectedMatId}
                                onChange={e => {
                                  setSelectedMatId(e.target.value);
                                  const mat = materials.find(m => m.id === e.target.value);
                                  if (mat?.unit?.toLowerCase().includes('folha')) {
                                    setUsageType('single');
                                  } else {
                                    setUsageType('standard');
                                  }
                                }}
                              >
                                <option value="">Selecione um material...</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                              </select>
                           </div>
                           
                           {isFolhaOptionVisible ? (
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Uso da Folha</label>
                                <select 
                                  className="w-full p-4 bg-white border border-yellow-100 rounded-2xl outline-none font-bold text-gray-700 text-sm"
                                  value={usageType}
                                  onChange={e => setUsageType(e.target.value as any)}
                                >
                                  <option value="single">Apenas uma folha</option>
                                  <option value="multiple_per_unit">Várias peças por folha</option>
                                  <option value="multiple_units">Várias folhas por peça</option>
                                  <option value="standard">Quantidade fixa (padrão)</option>
                                </select>
                             </div>
                           ) : (
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Quantidade</label>
                                <input 
                                  type="number" step="0.01"
                                  className="w-full p-4 bg-white border border-yellow-100 rounded-2xl outline-none font-black text-gray-700 text-sm"
                                  placeholder="Qtd"
                                  value={usageValue}
                                  onChange={e => setUsageValue(parseFloat(e.target.value) || 0)}
                                />
                             </div>
                           )}
                        </div>

                        {isFolhaOptionVisible && usageType !== 'standard' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">
                                   {usageType === 'multiple_per_unit' ? 'Peças por folha' : usageType === 'multiple_units' ? 'Folhas por peça' : 'Folha por peça'}
                                </label>
                                <div className="relative">
                                  {usageType === 'multiple_per_unit' ? <LayoutGrid size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /> : <FileStack size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
                                  <input 
                                    type="number" step="1"
                                    className="w-full pl-10 pr-4 py-4 bg-white border border-yellow-100 rounded-2xl outline-none font-black text-gray-700 text-sm"
                                    disabled={usageType === 'single'}
                                    value={usageType === 'single' ? 1 : usageValue}
                                    onChange={e => setUsageValue(parseFloat(e.target.value) || 1)}
                                  />
                                </div>
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest ml-1">Custo de Impressão (por folha)</label>
                                <div className="relative">
                                  <Printer size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input 
                                    type="number" step="0.01"
                                    className="w-full pl-10 pr-4 py-4 bg-white border border-yellow-100 rounded-2xl outline-none font-black text-pink-600 text-sm"
                                    placeholder="R$ 0,00"
                                    value={printingCost}
                                    onChange={e => setPrintingCost(parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                             </div>
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={addMaterialToProduct}
                          className="w-full py-4 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
                        >
                          <PlusCircle size={18} /> Adicionar Material à Peça
                        </button>
                     </div>

                     <div className="space-y-3">
                        {newProduct.materials?.map((mat, index) => {
                          const mInfo = materials.find(m => m.id === mat.materialId);
                          return (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-slideUp">
                               <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-xl text-yellow-500 shadow-sm">
                                     {mat.usageType ? <FileText size={14} /> : <Layers size={14} />}
                                  </div>
                                  <div>
                                     <p className="text-xs font-black text-gray-700">{mInfo?.name || 'Material Excluído'}</p>
                                     <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                           {mat.usageType === 'multiple_per_unit' ? `${mat.usageValue} pçs/folha` : 
                                            mat.usageType === 'multiple_units' ? `${mat.usageValue} folhas/pç` : 
                                            mat.usageType === 'single' ? '1 folha inteira' :
                                            `${mat.quantity} ${mInfo?.unit}`}
                                        </p>
                                        {(mat.printingCost ?? 0) > 0 && (
                                          <span className="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">+ R$ {mat.printingCost?.toFixed(2)} imp.</span>
                                        )}
                                     </div>
                                  </div>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => removeMaterialFromProduct(index)}
                                 className="p-2 text-gray-300 hover:text-red-500"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>
                          );
                        })}
                        {newProduct.materials?.length === 0 && <p className="text-center py-6 text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-50 italic">Adicione materiais acima</p>}
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-5 space-y-8">
                  <div className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                     <TrendingUp size={64} className="absolute -bottom-4 -right-4 opacity-5" />
                     <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-4">Prévia do Preço Final</p>
                     <h2 className="text-6xl font-black mb-2">R$ {currentPreview?.finalPrice.toFixed(2)}</h2>
                     <div className="h-1 w-20 bg-yellow-400 rounded-full mb-8"></div>
                     
                     <div className="w-full space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-2">
                           <span className="opacity-60 uppercase tracking-widest">Materiais</span>
                           <span className="text-yellow-400">R$ {currentPreview?.variableCosts.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-2">
                           <span className="opacity-60 uppercase tracking-widest">Mão de Obra</span>
                           <span className="text-pink-400">R$ {currentPreview?.laborCosts.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-2">
                           <span className="opacity-60 uppercase tracking-widest">Lucro Bruto</span>
                           <span className="text-green-400">R$ {currentPreview?.profit.toFixed(2)}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                           <DollarSign size={14} className="text-green-500" /> Margem de Lucro Desejada (%)
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-green-600 text-xl"
                          value={newProduct.profitMargin}
                          onChange={e => setNewProduct({...newProduct, profitMargin: parseFloat(e.target.value) || 0})}
                        />
                     </div>

                     <div className="space-y-4 pt-4">
                        <button 
                          type="submit"
                          className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${editingProductId ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-100' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-100'}`}
                        >
                           {editingProductId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                           {editingProductId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="w-full py-4 bg-white text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600"
                        >
                           Descartar e Fechar
                        </button>
                     </div>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
