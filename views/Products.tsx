
import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Trash2, Edit3, Package, DollarSign, Clock, Layers, ChevronRight, X, Printer, Info, Ruler, Search, ArrowRightLeft, TrendingUp } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', 
    category: '', 
    description: '', 
    minutesToMake: 60, 
    materials: [],
    profitMargin: companyData.defaultProfitMargin,
    marketPrice: 0
  });
  
  const [selectedMatId, setSelectedMatId] = useState('');
  const [usageType, setUsageType] = useState<'single' | 'multiple_per_unit' | 'multiple_units' | 'standard'>('standard');
  const [usageValue, setUsageValue] = useState(1);
  const [cmValue, setCmValue] = useState(0);
  const [printingCost, setPrintingCost] = useState(0);

  const selectedMaterial = useMemo(() => materials.find(m => m.id === selectedMatId), [selectedMatId, materials]);
  const isFolha = selectedMaterial?.unit.toLowerCase() === 'folha';
  const isMetro = selectedMaterial?.unit.toLowerCase() === 'metro';

  const stats = useMemo(() => {
    return {
      total: products.length,
      categories: new Set(products.map(p => p.category)).size,
    };
  }, [products]);

  const addCategory = () => {
    const name = prompt('Nome da nova categoria:');
    if (name && !productCategories.includes(name)) {
      setProductCategories([...productCategories, name]);
      setNewProduct({...newProduct, category: name});
    }
  };

  const addMaterial = () => {
    if (!selectedMatId || !selectedMaterial) return;

    let finalQty = 1;
    if (isMetro) {
      finalQty = cmValue / 100;
    } else if (isFolha) {
      if (usageType === 'single') finalQty = 1;
      else if (usageType === 'multiple_per_unit') finalQty = 1 / usageValue;
      else if (usageType === 'multiple_units') finalQty = usageValue;
      else finalQty = usageValue;
    } else {
      finalQty = usageValue;
    }

    const newItem: ProjectItem = {
      materialId: selectedMatId,
      quantity: finalQty,
      usageType: isMetro ? 'standard' : usageType,
      usageValue: isMetro ? cmValue : usageValue,
      printingCost
    };

    const existing = newProduct.materials?.find(m => m.materialId === selectedMatId);
    if (existing) {
      setNewProduct({
        ...newProduct,
        materials: newProduct.materials?.map(m => m.materialId === selectedMatId ? newItem : m)
      });
    } else {
      setNewProduct({
        ...newProduct,
        materials: [...(newProduct.materials || []), newItem]
      });
    }

    setSelectedMatId('');
    setUsageType('standard');
    setUsageValue(1);
    setCmValue(0);
    setPrintingCost(0);
  };

  const removeMaterial = (id: string) => {
    setNewProduct({
      ...newProduct,
      materials: newProduct.materials?.filter(m => m.materialId !== id)
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name!,
      category: newProduct.category || 'Geral',
      description: newProduct.description || '',
      minutesToMake: newProduct.minutesToMake || 0,
      materials: newProduct.materials || [],
      profitMargin: newProduct.profitMargin || companyData.defaultProfitMargin,
      marketPrice: newProduct.marketPrice || 0
    };

    setProducts([...products, product]);
    setNewProduct({ 
      name: '', 
      category: '', 
      description: '', 
      minutesToMake: 60, 
      materials: [],
      profitMargin: companyData.defaultProfitMargin,
      marketPrice: 0
    });
    setShowForm(false);
  };

  const deleteProduct = (id: string) => {
    if (confirm('Deseja excluir esta peça da precificação?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Tabela de <span className="text-yellow-500">Precificação</span></h2>
          <p className="text-gray-400 font-medium">Cadastre suas peças padrão e veja os preços automáticos.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg shadow-yellow-100 active:scale-95"
        >
          <Plus size={20} />
          Nova Peça
        </button>
      </div>

      {/* Resumo de Peças */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-yellow-50 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl"><Package size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Peças no Catálogo</p>
            <p className="text-2xl font-black text-gray-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Layers size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categorias</p>
            <p className="text-2xl font-black text-gray-800">{stats.categories}</p>
          </div>
        </div>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-yellow-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar por nome da peça ou categoria..." 
          className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <h3 className="text-xl font-black text-gray-700 flex items-center gap-2 border-b border-yellow-50 pb-2">
        <Sparkles className="text-yellow-500" size={20} /> Lista de Peças Cadastradas
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredProducts.map(product => {
          const breakdown = calculateProjectBreakdown(
            { ...product, hoursToMake: (product.minutesToMake || 0) / 60, profitMargin: product.profitMargin, excedente: companyData.defaultExcedente },
            materials, platforms, companyData
          );

          const marketComparison = product.marketPrice ? (breakdown.finalPrice - product.marketPrice) : 0;
          const isAboveMarket = marketComparison > 0;

          return (
            <div key={product.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-50 group hover:shadow-xl transition-all flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm group-hover:bg-yellow-400 group-hover:text-yellow-900 transition-all">
                  <Layers size={28} />
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-200 hover:text-blue-500 transition-colors">
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => deleteProduct(product.id)}
                    className="text-gray-200 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-black text-gray-800 truncate">{product.name}</h3>
                <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  {product.category}
                </span>
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Tempo</span>
                    <span className="text-sm font-black text-gray-700 flex items-center gap-1"><Clock size={12} className="text-blue-400"/> {product.minutesToMake} min</span>
                  </div>
                  <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Materiais</span>
                    <span className="text-sm font-black text-gray-700 flex items-center gap-1"><Package size={12} className="text-yellow-500"/> {product.materials.length} itens</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2 border-t border-dashed border-gray-100">
                   <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>Custo de Produção</span>
                      <span>R$ {(breakdown.variableCosts + breakdown.laborCosts + breakdown.fixedCosts).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>Margem Lucro</span>
                      <span>{product.profitMargin}%</span>
                   </div>
                   {product.marketPrice ? (
                     <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 p-2 rounded-lg mt-2">
                        <span className="flex items-center gap-1"><ArrowRightLeft size={10} /> Preço Mercado</span>
                        <span className="text-gray-700">R$ {product.marketPrice.toFixed(2)}</span>
                     </div>
                   ) : null}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col gap-1">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Preço Sugerido de Venda</p>
                <div className="flex items-center justify-between">
                   <p className="text-3xl font-black text-blue-600">R$ {breakdown.finalPrice.toFixed(2)}</p>
                   {product.marketPrice ? (
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${isAboveMarket ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                         {isAboveMarket ? `+ R$ ${marketComparison.toFixed(2)} que mercado` : `- R$ ${Math.abs(marketComparison).toFixed(2)} que mercado`}
                      </div>
                   ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/30">
            <Package size={48} className="mx-auto opacity-10 mb-4" />
            <p className="font-black text-xs uppercase tracking-widest">Nenhuma peça cadastrada ainda.</p>
            <p className="text-[10px] font-bold mt-1">Comece cadastrando sua primeira peça no botão "Nova Peça".</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
            <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500 transition-colors">
               <X size={24} />
            </button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
               <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl"><Sparkles size={24} /></div>
               Cadastrar Nova Peça
            </h3>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Peça</label>
                    <input 
                      type="text" required
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Ex: Topo de Bolo Shaker"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-gray-700"
                          value={newProduct.category}
                          onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        >
                          <option value="">Escolher...</option>
                          {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <button 
                          type="button" 
                          onClick={addCategory}
                          className="p-4 bg-yellow-100 text-yellow-600 rounded-2xl hover:bg-yellow-200 transition-all flex items-center justify-center shadow-sm"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minutos de Produção</label>
                      <input 
                        type="number" step="1"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold"
                        value={newProduct.minutesToMake}
                        onChange={e => setNewProduct({...newProduct, minutesToMake: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <TrendingUp size={12} className="text-yellow-600" /> Lucro (%)
                      </label>
                      <input 
                        type="number" step="1"
                        className="w-full p-4 bg-yellow-50 border border-yellow-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-black text-yellow-700"
                        value={newProduct.profitMargin}
                        onChange={e => setNewProduct({...newProduct, profitMargin: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <ArrowRightLeft size={12} className="text-blue-500" /> Preço de Mercado (Opcional)
                      </label>
                      <input 
                        type="number" step="0.01"
                        className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-black text-blue-700"
                        value={newProduct.marketPrice}
                        onChange={e => setNewProduct({...newProduct, marketPrice: parseFloat(e.target.value) || 0})}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                    <textarea 
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-medium h-24 resize-none"
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="Breve descrição dos detalhes da peça..."
                    />
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-yellow-50 p-6 rounded-[2.5rem] border border-yellow-100 space-y-4">
                     <h4 className="font-black text-yellow-800 text-xs uppercase tracking-widest flex items-center gap-2">
                        <Package size={14}/> Materiais Utilizados
                     </h4>
                     
                     <div className="space-y-4 bg-white/60 p-5 rounded-2xl border border-yellow-100/50">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Selecione o Material</label>
                          <select 
                            className="w-full p-3 bg-white border border-yellow-200 rounded-xl outline-none text-sm font-bold shadow-sm"
                            value={selectedMatId}
                            onChange={e => {
                               setSelectedMatId(e.target.value);
                               setUsageType('standard');
                            }}
                          >
                            <option value="">Escolher...</option>
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                          </select>
                        </div>

                        {selectedMaterial && (
                          <div className="space-y-4 animate-fadeIn">
                             <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                                <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-blue-700 font-bold leading-tight">
                                   Unidade de compra: <span className="uppercase">{selectedMaterial.unit}</span>. Informe o uso nesta peça.
                                </p>
                             </div>

                             {isFolha ? (
                               <div className="space-y-3">
                                  <div className="grid grid-cols-1 gap-2">
                                     <button type="button" onClick={() => { setUsageType('single'); setUsageValue(1); }} className={`text-left p-3 rounded-xl border-2 transition-all text-xs font-bold ${usageType === 'single' ? 'border-yellow-400 bg-yellow-100 text-yellow-800' : 'border-gray-100 bg-white text-gray-400'}`}>1 folha inteira</button>
                                     <button type="button" onClick={() => setUsageType('multiple_per_unit')} className={`text-left p-3 rounded-xl border-2 transition-all text-xs font-bold ${usageType === 'multiple_per_unit' ? 'border-yellow-400 bg-yellow-100 text-yellow-800' : 'border-gray-100 bg-white text-gray-400'}`}>Múltiplas peças por folha</button>
                                     <button type="button" onClick={() => setUsageType('multiple_units')} className={`text-left p-3 rounded-xl border-2 transition-all text-xs font-bold ${usageType === 'multiple_units' ? 'border-yellow-400 bg-yellow-100 text-yellow-800' : 'border-gray-100 bg-white text-gray-400'}`}>Múltiplas folhas por peça</button>
                                  </div>
                                  {(usageType === 'multiple_per_unit' || usageType === 'multiple_units') && (
                                    <div className="space-y-2 pt-2">
                                       <label className="text-[9px] font-black text-yellow-700 uppercase tracking-widest">{usageType === 'multiple_per_unit' ? 'Peças por folha?' : 'Folhas por peça?'}</label>
                                       <input type="number" step="1" min="1" className="w-full p-3 bg-white border border-yellow-200 rounded-xl font-bold text-center" value={usageValue} onChange={e => setUsageValue(parseFloat(e.target.value) || 1)} />
                                    </div>
                                  )}
                                  <div className="space-y-2 pt-2">
                                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Printer size={10} /> Custo Impressão (por folha)</label>
                                     <input type="number" step="0.01" className="w-full p-3 bg-white border border-yellow-200 rounded-xl font-bold text-blue-600" placeholder="R$ 0,00" value={printingCost} onChange={e => setPrintingCost(parseFloat(e.target.value) || 0)} />
                                  </div>
                               </div>
                             ) : isMetro ? (
                               <div className="space-y-3">
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Ruler size={10} /> Quantos centímetros (cm) usados?</label>
                                     <input type="number" step="0.1" min="0.1" className="w-full p-3 bg-white border border-yellow-200 rounded-xl font-bold text-center text-blue-600" value={cmValue} onChange={e => setCmValue(parseFloat(e.target.value) || 0)} />
                                     <p className="text-[9px] text-gray-400 italic text-center">Equivale a {(cmValue / 100).toFixed(2)} metro(s).</p>
                                  </div>
                               </div>
                             ) : (
                               <div className="space-y-3">
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantidade Utilizada ({selectedMaterial.unit})</label>
                                     <input type="number" step="0.01" className="w-full p-3 bg-white border border-yellow-200 rounded-xl font-bold text-center" value={usageValue} onChange={e => { setUsageValue(parseFloat(e.target.value) || 0); setUsageType('standard'); }} />
                                  </div>
                               </div>
                             )}
                             <button type="button" onClick={addMaterial} className="w-full bg-yellow-400 text-yellow-900 p-4 rounded-xl hover:bg-yellow-500 transition-all font-black uppercase text-[10px] tracking-widest shadow-md">Adicionar à Peça</button>
                          </div>
                        )}
                     </div>

                     <div className="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar pr-2 pt-2">
                        {newProduct.materials?.map(item => {
                           const m = materials.find(x => x.id === item.materialId);
                           if (!m) return null;
                           return (
                             <div key={item.materialId} className="flex items-center justify-between bg-white p-3 rounded-xl border border-yellow-100 shadow-sm">
                                <div className="flex flex-col">
                                   <span className="text-xs font-bold text-gray-700">{m.name}</span>
                                   <span className="text-[9px] text-gray-400 font-bold uppercase">{item.quantity.toFixed(3)} {m.unit} {item.printingCost ? ` + R$ ${item.printingCost.toFixed(2)} imp.` : ''}</span>
                                </div>
                                <button type="button" onClick={() => removeMaterial(item.materialId)} className="text-red-400 hover:text-red-600 transition-colors p-2"><Trash2 size={16} /></button>
                             </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-8 py-5 border-2 border-gray-50 text-gray-400 rounded-3xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                    <button type="submit" className="flex-1 px-8 py-5 bg-yellow-400 text-yellow-900 font-black rounded-3xl hover:bg-yellow-500 transition-all shadow-lg">Finalizar Cadastro</button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
