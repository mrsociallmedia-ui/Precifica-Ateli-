import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Layers, 
  LayoutGrid, 
  PackageCheck, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2,
  Filter,
  Ruler,
  X
} from 'lucide-react';
import { Material, Product } from '../types';

interface InventoryProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
}

const DEFAULT_UNITS = [
  { value: 'unidade', label: 'Unidade (un)' },
  { value: 'metro', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'folha', label: 'Folha' },
  { value: 'rolo', label: 'Rolo / Carretel' },
  { value: 'pacote', label: 'Pacote' },
  { value: 'kg', label: 'Quilo (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'par', label: 'Par' },
  { value: 'caixa', label: 'Caixa' }
];

export const Inventory: React.FC<InventoryProps> = ({ materials, setMaterials }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [materialsFilter, setMaterialsFilter] = useState<'all' | 'alerts_only'>('all');

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'table' : 'grid';
    }
    return 'grid';
  });

  // Estatísticas e contagens de Materiais
  const materialStats = useMemo(() => {
    const totalMaterials = materials.length;
    let totalAlerts = 0;
    let outOfStock = 0;
    let lowStock = 0;

    materials.forEach(m => {
      const q = Number(m.quantity) || 0;
      const min = Number(m.minQuantity) || 0;
      if (q <= 0) {
        outOfStock++;
        totalAlerts++;
      } else if (min > 0 && q <= min) {
        lowStock++;
        totalAlerts++;
      }
    });

    const okStock = totalMaterials - totalAlerts;
    return { totalMaterials, totalAlerts, outOfStock, lowStock, okStock };
  }, [materials]);

  // Ações de Estoque de Materiais
  const handleUpdateMaterialQuantity = (materialId: string, delta: number) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === materialId) {
        const cur = Number(m.quantity) || 0;
        const updated = Math.max(0, parseFloat((cur + delta).toFixed(2)));
        return { ...m, quantity: updated };
      }
      return m;
    }));
  };

  const handleSetMaterialQuantity = (materialId: string, val: number) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === materialId) {
        return { ...m, quantity: Math.max(0, val) };
      }
      return m;
    }));
  };

  const handleSetMaterialMinQuantity = (materialId: string, val: number) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === materialId) {
        return { ...m, minQuantity: Math.max(0, val) };
      }
      return m;
    }));
  };

  // Lista Filtrada de Materiais
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (materialsFilter === 'alerts_only') {
        const q = Number(m.quantity) || 0;
        const min = Number(m.minQuantity) || 0;
        return q <= 0 || (min > 0 && q <= min);
      }

      return true;
    });
  }, [materials, searchTerm, materialsFilter]);
  
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: '', 
    unit: 'unidade', 
    price: 0, 
    quantity: 1, 
    supplier: '', 
    defaultPiecesPerUnit: 1,
    minQuantity: 0
  });

  const [units, setUnits] = useState(() => {
    try {
      const lastUser = localStorage.getItem('last_user_email') || '';
      const userKey = lastUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const key = userKey ? `${userKey}_craft_material_units` : 'craft_material_units';
      const saved = localStorage.getItem(key) || localStorage.getItem('craft_material_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingValues = new Set(DEFAULT_UNITS.map(u => u.value));
          const custom = parsed.filter((u: { value: string; label: string }) => u && u.value && !existingValues.has(u.value));
          return [...DEFAULT_UNITS, ...custom];
        }
      }
    } catch {}
    return DEFAULT_UNITS;
  });

  const [showNewUnitInput, setShowNewUnitInput] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');

  const handleSaveNewUnit = () => {
    const trimmed = newUnitInput.trim();
    if (!trimmed) return;
    const value = trimmed.toLowerCase();
    const label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    if (!units.find(u => u.value === value)) {
      const updated = [...units, { value, label }];
      setUnits(updated);
      try {
        const lastUser = localStorage.getItem('last_user_email') || '';
        const userKey = lastUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (userKey) localStorage.setItem(`${userKey}_craft_material_units`, JSON.stringify(updated));
        localStorage.setItem('craft_material_units', JSON.stringify(updated));
      } catch {}
    }
    setNewMaterial(prev => ({ ...prev, unit: value }));
    setNewUnitInput('');
    setShowNewUnitInput(false);
  };

  const handleOpenAdd = () => {
    setEditingMaterialId(null);
    setNewMaterial({ 
      name: '', 
      unit: 'unidade', 
      price: 0, 
      quantity: 1, 
      supplier: '', 
      defaultPiecesPerUnit: 1,
      minQuantity: 2 
    });
    setShowNewUnitInput(false);
    setNewUnitInput('');
    setShowForm(true);
  };

  const [addStockMode, setAddStockMode] = useState(true);

  const handleOpenEdit = (material: Material) => {
    setEditingMaterialId(material.id);
    setAddStockMode(true);
    setNewMaterial({ 
      ...material,
      quantity: 0,
      minQuantity: material.minQuantity ?? 0
    });
    setShowNewUnitInput(false);
    setNewUnitInput('');
    setShowForm(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name) return;
    
    if (editingMaterialId) {
      setMaterials(prev => prev.map(m => {
        if (m.id === editingMaterialId) {
          const existingQty = Number(m.quantity) || 0;
          const inputtedQty = Number(newMaterial.quantity) || 0;
          const finalQty = addStockMode ? existingQty + inputtedQty : inputtedQty;

          return { 
            ...m, 
            ...newMaterial as Material,
            quantity: Math.max(0, finalQty),
            minQuantity: Number(newMaterial.minQuantity) || 0
          };
        }
        return m;
      }));
    } else {
      const material: Material = {
        id: Date.now().toString(),
        name: newMaterial.name!,
        unit: newMaterial.unit!,
        price: Number(newMaterial.price),
        quantity: Number(newMaterial.quantity) || 0,
        supplier: newMaterial.supplier || '',
        defaultPiecesPerUnit: Number(newMaterial.defaultPiecesPerUnit) || 1,
        minQuantity: Number(newMaterial.minQuantity) || 0
      };
      setMaterials(prev => [...prev, material]);
    }

    setShowForm(false);
  };

  const deleteMaterial = (id: string) => {
    if(confirm('Excluir este material? Esta ação não pode ser desfeita.')) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const lengthUnits = ['metro', 'cm'];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header Materiais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">
            Estoque de <span className="text-yellow-500">Materiais</span>
          </h2>
          <p className="text-gray-400 font-medium">
            Controle seus insumos com alerta visual vermelho para níveis abaixo do mínimo.
          </p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Plus size={20} />
          Novo Material
        </button>
      </div>

      {/* Widgets de Status de Materiais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setMaterialsFilter('all')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-center gap-3.5 ${
            materialsFilter === 'all' 
              ? 'bg-white border-yellow-300 ring-2 ring-yellow-200 shadow-md' 
              : 'bg-white border-gray-100 hover:border-yellow-200 shadow-sm'
          }`}
        >
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Total Insumos</span>
            <span className="text-xl font-black text-gray-800">{materialStats.totalMaterials} itens</span>
          </div>
        </div>

        <div 
          onClick={() => setMaterialsFilter('all')}
          className="p-5 rounded-3xl border bg-white border-emerald-100 shadow-sm flex items-center gap-3.5"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Em Dia (OK)</span>
            <span className="text-xl font-black text-emerald-600">{materialStats.okStock} itens</span>
          </div>
        </div>

        <div 
          onClick={() => setMaterialsFilter(materialsFilter === 'alerts_only' ? 'all' : 'alerts_only')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-center gap-3.5 ${
            materialsFilter === 'alerts_only'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-300 shadow-md'
              : materialStats.lowStock > 0 
                ? 'bg-red-50/60 border-red-200 hover:border-red-300 shadow-sm' 
                : 'bg-white border-gray-100 shadow-sm'
          }`}
        >
          <div className={`p-3 rounded-2xl ${materialStats.lowStock > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
            <AlertTriangle size={22} className={materialStats.lowStock > 0 ? 'animate-bounce' : ''} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block flex items-center gap-1">
              Abaixo do Mínimo
              {materialsFilter === 'alerts_only' && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">Ativo</span>}
            </span>
            <span className="text-xl font-black text-red-600">{materialStats.lowStock} materiais</span>
          </div>
        </div>

        <div 
          onClick={() => setMaterialsFilter(materialsFilter === 'alerts_only' ? 'all' : 'alerts_only')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-center gap-3.5 ${
            materialsFilter === 'alerts_only' && materialStats.outOfStock > 0
              ? 'bg-red-50 border-red-400 ring-2 ring-red-300 shadow-md'
              : materialStats.outOfStock > 0 
                ? 'bg-red-50/60 border-red-200 hover:border-red-300 shadow-sm' 
                : 'bg-white border-gray-100 shadow-sm'
          }`}
        >
          <div className={`p-3 rounded-2xl ${materialStats.outOfStock > 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
            <AlertCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block">Esgotados</span>
            <span className="text-xl font-black text-red-700">{materialStats.outOfStock} materiais</span>
          </div>
        </div>
      </div>

      {materialStats.totalAlerts > 0 && (
        <div className="bg-red-50 border-2 border-red-300/80 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-red-900 text-base leading-tight">
                Alerta de Estoque: {materialStats.totalAlerts} {materialStats.totalAlerts === 1 ? 'material está' : 'materiais estão'} abaixo do nível mínimo definido!
              </h4>
              <p className="text-xs text-red-700 font-medium mt-0.5">
                Os itens em vermelho precisam de reposição para que seus pedidos e produção não sejam interrompidos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMaterialsFilter(prev => prev === 'alerts_only' ? 'all' : 'alerts_only')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-sm ${
              materialsFilter === 'alerts_only'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-red-700 border border-red-300 hover:bg-red-100/60'
            }`}
          >
            <Filter size={14} />
            {materialsFilter === 'alerts_only' ? 'Mostrar Todos os Materiais' : 'Ver Apenas Itens em Vermelho'}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar material ou fornecedor..." 
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {materialsFilter === 'alerts_only' && (
          <div className="flex items-center gap-2 bg-red-100 text-red-800 px-4 py-3 rounded-2xl text-xs font-black">
            <AlertTriangle size={15} className="text-red-600" />
            <span>Exibindo apenas materiais abaixo do mínimo</span>
            <button 
              onClick={() => setMaterialsFilter('all')} 
              className="ml-2 hover:bg-red-200/60 p-1 rounded-lg text-red-900 cursor-pointer"
              title="Remover filtro"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm shrink-0">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'table' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Layers size={14} /> Tabela
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'grid' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutGrid size={14} /> Galeria
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-yellow-50 overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-yellow-50 text-yellow-800 uppercase text-[10px] font-black tracking-[0.15em]">
                  <th className="px-6 py-5">Material</th>
                  <th className="px-5 py-5 text-center">Status Alerta</th>
                  <th className="px-5 py-5 text-center">Estoque Atual</th>
                  <th className="px-5 py-5 text-center">Nível Mínimo</th>
                  <th className="px-5 py-5">Unidade</th>
                  <th className="px-5 py-5">Preço Pago</th>
                  <th className="px-5 py-5 text-center">Custo Unit.</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-gray-400 text-xs font-bold">
                      {materialsFilter === 'alerts_only' 
                        ? 'Parabéns! Nenhum material está abaixo do nível mínimo definido no momento.' 
                        : 'Nenhum material encontrado com esses critérios.'}
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map(m => {
                    const isLength = lengthUnits.includes(m.unit.toLowerCase());
                    const unitPrice = m.quantity > 0 ? m.price / m.quantity : 0;
                    const costPerPiece = m.defaultPiecesPerUnit && m.defaultPiecesPerUnit > 0 
                      ? unitPrice / m.defaultPiecesPerUnit 
                      : unitPrice;

                    const curQty = Number(m.quantity) || 0;
                    const minQty = m.minQuantity !== undefined ? Number(m.minQuantity) : 0;
                    const isOut = curQty <= 0;
                    const isLow = minQty > 0 && curQty <= minQty;
                    const isAlert = isOut || isLow;

                    return (
                      <tr 
                        key={m.id} 
                        className={`group transition-all ${
                          isAlert 
                            ? 'bg-red-50/80 hover:bg-red-100/70 border-l-4 border-l-red-500 ring-1 ring-red-200/70 text-red-950 font-medium' 
                            : 'hover:bg-yellow-50/30'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`font-black text-base ${isAlert ? 'text-red-950' : 'text-gray-800'}`}>
                              {m.name}
                            </span>
                            {m.supplier && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isAlert ? 'text-red-700' : 'text-gray-400'}`}>
                                {m.supplier}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          {isAlert ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-[11px] font-black uppercase tracking-wider shadow-2xs animate-pulse">
                              <AlertTriangle size={13} className="text-red-600 shrink-0" />
                              {isOut ? 'Esgotado' : `Abaixo do Mínimo`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Em Dia
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
                            isAlert 
                              ? 'bg-red-100/80 border-red-300 text-red-900 ring-1 ring-red-200' 
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}>
                            <button
                              type="button"
                              onClick={() => handleUpdateMaterialQuantity(m.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-red-200 hover:text-red-700 text-gray-700 flex items-center justify-center transition-colors text-xs font-black shadow-2xs cursor-pointer"
                              title="Diminuir 1 unidade"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={curQty}
                              onChange={(e) => handleSetMaterialQuantity(m.id, parseFloat(e.target.value) || 0)}
                              className={`w-14 text-center text-sm font-black bg-transparent focus:outline-none ${isAlert ? 'text-red-700 font-extrabold' : 'text-gray-900'}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateMaterialQuantity(m.id, 1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-yellow-200 hover:text-yellow-800 text-gray-700 flex items-center justify-center transition-colors text-xs font-black shadow-2xs cursor-pointer"
                              title="Aumentar 1 unidade"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={minQty}
                              onChange={(e) => handleSetMaterialMinQuantity(m.id, parseFloat(e.target.value) || 0)}
                              className={`w-14 px-2 py-1 text-center font-black text-xs rounded-lg border outline-none focus:ring-2 ${
                                isAlert 
                                  ? 'bg-red-100/80 border-red-300 text-red-900 focus:ring-red-400' 
                                  : 'bg-white border-gray-200 text-gray-700 focus:ring-yellow-400'
                              }`}
                              title="Defina o nível mínimo de segurança para acionar o alerta vermelho"
                            />
                            <span className={`text-[10px] font-bold ${isAlert ? 'text-red-700' : 'text-gray-400'}`}>
                              {m.unit}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                            isLength ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {isLength ? <Ruler size={12} /> : <Layers size={12} />}
                            {m.unit}
                          </span>
                        </td>

                        <td className={`px-5 py-4 font-black ${isAlert ? 'text-red-950' : 'text-gray-800'}`}>
                          R$ {m.price.toFixed(2)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-black text-xs ${isAlert ? 'text-red-900' : 'text-blue-600'}`}>
                              R$ {costPerPiece.toFixed(3)}
                            </span>
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                              por peça
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleOpenEdit(m)} 
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                              title="Editar material e estoque mínimo"
                            >
                              <Edit3 size={17} />
                            </button>
                            <button 
                              onClick={() => deleteMaterial(m.id)} 
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                              title="Excluir material"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-fadeIn">
          {filteredMaterials.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-[2.5rem] border border-gray-100 text-center text-gray-400 font-bold">
              Nenhum material encontrado com esses critérios.
            </div>
          ) : (
            filteredMaterials.map(m => {
              const isLength = lengthUnits.includes(m.unit.toLowerCase());
              const unitPrice = m.quantity > 0 ? m.price / m.quantity : 0;
              const costPerPiece = m.defaultPiecesPerUnit && m.defaultPiecesPerUnit > 0 
                ? unitPrice / m.defaultPiecesPerUnit 
                : unitPrice;

              const curQty = Number(m.quantity) || 0;
              const minQty = m.minQuantity !== undefined ? Number(m.minQuantity) : 0;
              const isOut = curQty <= 0;
              const isLow = minQty > 0 && curQty <= minQty;
              const isAlert = isOut || isLow;

              return (
                <div 
                  key={m.id} 
                  className={`p-6 rounded-[2.5rem] transition-all group relative overflow-hidden flex flex-col justify-between min-h-[320px] ${
                    isAlert 
                      ? 'border-2 border-red-400 bg-gradient-to-b from-red-50/70 to-white ring-2 ring-red-200 shadow-md shadow-red-100/50' 
                      : 'bg-white border border-yellow-50 hover:shadow-xl'
                  }`}
                >
                  <div className="relative z-10">
                    {isAlert && (
                      <div className="mb-3 px-3 py-1.5 bg-red-500 text-white rounded-2xl flex items-center justify-between shadow-xs animate-pulse">
                        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
                          <AlertTriangle size={14} className="shrink-0" />
                          {isOut ? 'Esgotado!' : 'Abaixo do Mínimo!'}
                        </span>
                        <span className="text-[10px] font-black bg-red-700/80 px-2 py-0.5 rounded-lg">
                          Mín: {minQty} {m.unit}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                        isLength ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {isLength ? <Ruler size={10} /> : <Layers size={10} />}
                        {m.unit}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenEdit(m)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"><Edit3 size={15} /></button>
                        <button onClick={() => deleteMaterial(m.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    
                    <h4 className={`font-black text-xl leading-tight mb-1 ${isAlert ? 'text-red-950' : 'text-gray-800'}`}>
                      {m.name}
                    </h4>
                    {m.supplier && (
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isAlert ? 'text-red-700' : 'text-gray-400'}`}>
                        {m.supplier}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 mt-6 space-y-4">
                    <div className={`p-3 rounded-2xl border ${
                      isAlert 
                        ? 'bg-red-100/60 border-red-300 text-red-950' 
                        : 'bg-yellow-50/50 border-yellow-100 text-gray-800'
                    }`}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                          Estoque Atual:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateMaterialQuantity(m.id, -1)}
                            className="w-5 h-5 rounded bg-white hover:bg-red-200 text-gray-700 flex items-center justify-center font-black text-xs cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <span className={`text-sm font-black px-1.5 ${isAlert ? 'text-red-600' : 'text-gray-800'}`}>
                            {curQty} {m.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateMaterialQuantity(m.id, 1)}
                            className="w-5 h-5 rounded bg-white hover:bg-yellow-200 text-gray-700 flex items-center justify-center font-black text-xs cursor-pointer shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 border-t border-red-200/50">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                          Nível Mínimo:
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={minQty}
                            onChange={(e) => handleSetMaterialMinQuantity(m.id, parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 text-center text-xs font-black bg-white border border-gray-200 rounded outline-none"
                          />
                          <span className="text-[9px] text-gray-400 font-bold">{m.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Preço Pago</p>
                        <p className="text-xl font-black text-gray-800">R$ {m.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Custo Unit.</p>
                        <p className={`text-lg font-black ${isAlert ? 'text-red-700' : 'text-blue-600'}`}>R$ {costPerPiece.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL ADICIONAR / EDITAR MATERIAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 animate-fadeIn flex items-start justify-center p-4 overflow-y-auto pt-10 md:pt-16">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowForm(false)}
          ></div>
          <div className="bg-white w-full max-w-xl rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden z-10 animate-scaleIn my-4">
            <div className={`absolute top-0 left-0 w-full h-2 ${editingMaterialId ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"><X size={24} /></button>
            <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
               <div className={`p-3 rounded-2xl ${editingMaterialId ? 'bg-blue-50 text-blue-500' : 'bg-yellow-100 text-yellow-600'}`}>
                 {editingMaterialId ? <Edit3 size={24} /> : <Plus size={24} />}
               </div>
               {editingMaterialId ? 'Editar Material' : 'Novo Material'}
            </h3>

            {/* Banner de Estoque Atual ao Editar */}
            {editingMaterialId && (() => {
              const currentMat = materials.find(m => m.id === editingMaterialId);
              const currentStock = Number(currentMat?.quantity) || 0;
              const minStock = Number(currentMat?.minQuantity) || 0;
              const isAlert = currentStock <= 0 || (minStock > 0 && currentStock <= minStock);

              return (
                <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between ${
                  isAlert 
                    ? 'bg-red-50 border-red-200 text-red-950' 
                    : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isAlert ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                      <Layers size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                        Estoque Atual Cadastrado
                      </span>
                      <span className="text-xl font-black">
                        {currentStock} {currentMat?.unit || newMaterial.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                      Nível Mínimo
                    </span>
                    <span className="text-xs font-black">
                      {minStock} {currentMat?.unit || newMaterial.unit}
                    </span>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSaveMaterial} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Material</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="Ex: Fita de Cetim ou Polasseal" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Fornecedor</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={newMaterial.supplier} onChange={e => setNewMaterial({...newMaterial, supplier: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Unidade</label>
                    <button 
                      type="button"
                      onClick={() => setShowNewUnitInput(prev => !prev)}
                      className="text-yellow-700 hover:text-yellow-800 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg bg-yellow-100 hover:bg-yellow-200 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Nova</span>
                    </button>
                  </div>

                  {showNewUnitInput && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-2xl animate-fadeIn">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ex: Litro, Par, Caixa..."
                        value={newUnitInput}
                        onChange={e => setNewUnitInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveNewUnit();
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded-xl outline-none font-bold text-xs text-gray-800 shadow-inner focus:ring-2 focus:ring-yellow-400"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewUnit}
                        className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewUnitInput(false);
                          setNewUnitInput('');
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white transition-all cursor-pointer"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <select 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 focus:ring-2 focus:ring-yellow-400 transition-all cursor-pointer"
                    value={newMaterial.unit}
                    onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}
                  >
                    {units.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Qtd Comprada</label>
                  <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Preço Total Pago</label>
                  <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-blue-600" value={newMaterial.price} onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})} />
                </div>
              </div>

              <div className="p-4 bg-yellow-50/70 border border-yellow-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-900">
                    <PackageCheck size={18} className="text-yellow-700" />
                    <label className="text-xs font-black uppercase tracking-wider">
                      {editingMaterialId ? 'Reposição / Compra de Material' : 'Quantidade em Estoque'}
                    </label>
                  </div>
                  {editingMaterialId && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-yellow-900 select-none bg-white px-3 py-1.5 rounded-xl border border-yellow-300 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={addStockMode}
                        onChange={(e) => setAddStockMode(e.target.checked)}
                        className="w-4 h-4 rounded text-yellow-600 focus:ring-yellow-400 border-yellow-300 cursor-pointer"
                      />
                      <span>Somar ao estoque atual</span>
                    </label>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] text-yellow-900 font-bold">
                      {editingMaterialId && addStockMode
                        ? (() => {
                            const cur = Number(materials.find(m => m.id === editingMaterialId)?.quantity || 0);
                            const added = Number(newMaterial.quantity) || 0;
                            return `Estoque atual: ${cur} ${newMaterial.unit || 'un'} + Compra: ${added} = Total final: ${Math.max(0, parseFloat((cur + added).toFixed(2)))} ${newMaterial.unit || 'un'}`;
                          })()
                        : editingMaterialId
                          ? 'A quantidade digitada substituirá o estoque atual.'
                          : 'Quantidade inicial disponível em estoque:'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="Ex: 10" 
                      className="w-32 p-3 bg-white border border-yellow-300 rounded-xl outline-none font-black text-yellow-900 text-sm focus:ring-2 focus:ring-yellow-400" 
                      value={newMaterial.quantity ?? 0} 
                      onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})} 
                    />
                    <span className="text-xs font-bold text-yellow-900">
                      {newMaterial.unit || 'un'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle size={16} className="text-red-600" />
                  <label className="text-xs font-black uppercase tracking-wider">
                    Estoque Mínimo para Alerta Vermelho
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="Ex: 5" 
                    className="w-32 p-3 bg-white border border-red-300 rounded-xl outline-none font-black text-red-700 text-sm focus:ring-2 focus:ring-red-400" 
                    value={newMaterial.minQuantity ?? 0} 
                    onChange={e => setNewMaterial({...newMaterial, minQuantity: Number(e.target.value)})} 
                  />
                  <span className="text-xs font-bold text-red-800">
                    {newMaterial.unit || 'unidade(s)'}
                  </span>
                </div>
                <p className="text-[11px] text-red-600/90 font-medium">
                  Quando a contagem atual deste material for igual ou menor que este número, o item será destacado em vermelho no estoque para aviso de reposição.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer">Cancelar</button>
                <button type="submit" className={`flex-1 px-6 py-4 font-black rounded-2xl shadow-lg cursor-pointer ${editingMaterialId ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'}`}>
                  {editingMaterialId ? 'Atualizar Estoque e Preço' : 'Salvar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
