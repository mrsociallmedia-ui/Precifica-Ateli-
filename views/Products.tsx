
import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Edit3, Package, DollarSign, Clock, Layers, ChevronRight, X, Printer, Info, Ruler, Search, ArrowRightLeft, TrendingUp, Tag, PlusCircle, CheckCircle2, FileText, Copy, LayoutGrid, FileStack, Repeat, FileText as FileIcon, Layers3 } from 'lucide-react';
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
    name: '', category: productCategories[0] || 'Geral', description: '', minutesToMake: 60, materials: [],
    profitMargin: companyData.defaultProfitMargin, marketPrice: 0
  });
  
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
      profitMargin: companyData.defaultProfitMargin, marketPrice: 0
    });
    setShowForm(true);
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

    setNewProduct({ ...newProduct, materials: [...(newProduct.materials || []), matItem] });
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
        category: newProduct.category || 'Geral',
        minutesToMake: Number(newProduct.minutesToMake) || 0,
        materials: newProduct.materials || [],
        profitMargin: Number(newProduct.profitMargin) || 30,
        marketPrice: Number(newProduct.marketPrice) || 0
      };
      setProducts(prev => [product, ...prev]);
    }
    setShowForm(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPreview = useMemo(() => {
    if (!showForm) return null;
    const mockProject = {
      items: [{ productId: 'preview', name: newProduct.name || 'Preview', quantity: 1, hoursToMake: (newProduct.minutesToMake || 0) / 60, materials: newProduct.materials || [], profitMargin: newProduct.profitMargin || 30 }],
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
        <button onClick={handleOpenAdd} className="bg-pink-500 hover:bg-pink-600 text-white font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95">
          <Plus size={20} /> Cadastrar Nova Peça
        </button>
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
            <div key={p.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <span className="text-[10px] font-black text-pink-500 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-widest">{p.category}</span>
                    <h3 className="text-xl font-black text-gray-800 mt-2">{p.name}</h3>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => { setEditingProductId(p.id); setNewProduct({...p}); setShowForm(true); }} className="p-2 text-pink-400 hover:bg-pink-50 rounded-xl transition-all"><Edit3 size={20} /></button>
                 </div>
              </div>
              <div className="pt-6 border-t border-gray-50 flex items-center justify-between mt-auto">
                 <div><p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Preço Sugerido</p><p className="text-2xl font-black text-gray-800">R$ {breakdown.finalPrice.toFixed(2)}</p></div>
                 <div className="text-right"><p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Lucro</p><p className="text-sm font-black text-gray-700">{p.profitMargin}%</p></div>
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
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome da Peça</label>
                        <input type="text" required className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-700" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
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
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Base Peça</label>
                        <div className="w-full p-4 bg-gray-100 border border-gray-100 rounded-2xl font-black text-gray-500">
                           R$ {((currentPreview?.laborCosts || 0) + (currentPreview?.variableCosts || 0)).toFixed(2)}
                        </div>
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

                        <button type="button" onClick={addMaterialToProduct} className="w-full py-4 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-xs uppercase hover:bg-yellow-500 transition-all shadow-md active:scale-95">Adicionar Material à Peça</button>
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
                                     </p>
                                  </div>
                               </div>
                               <button type="button" onClick={() => removeMaterialFromProduct(index)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          );
                        })}
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-5">
                  <div className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl text-center space-y-6">
                     <div>
                        <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-4">Valor Sugerido de Venda</p>
                        <h2 className="text-6xl font-black mb-2">R$ {currentPreview?.finalPrice.toFixed(2)}</h2>
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
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-yellow-400">
                           <span>Total Base Peça</span>
                           <span>R$ {((currentPreview?.laborCosts || 0) + (currentPreview?.variableCosts || 0)).toFixed(2)}</span>
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
    </div>
  );
};
