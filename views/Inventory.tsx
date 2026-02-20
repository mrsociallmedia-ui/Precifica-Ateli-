
import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Search, Truck, Package, X, Ruler, Layers, LayoutGrid } from 'lucide-react';
import { Material } from '../types';

interface InventoryProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
}

export const Inventory: React.FC<InventoryProps> = ({ materials, setMaterials }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: '', unit: 'unidade', price: 0, quantity: 1, supplier: '', defaultPiecesPerUnit: 1
  });

  const [units, setUnits] = useState([
    { value: 'unidade', label: 'Unidade (un)' },
    { value: 'metro', label: 'Metro (m)' },
    { value: 'cm', label: 'Centímetro (cm)' },
    { value: 'folha', label: 'Folha' },
    { value: 'rolo', label: 'Rolo / Carretel' },
    { value: 'pacote', label: 'Pacote' }
  ]);

  const handleAddUnit = () => {
    const customUnit = prompt("Digite o nome da nova unidade (ex: Litro, Par, Caixa):");
    if (customUnit) {
      const value = customUnit.toLowerCase().trim();
      if (!units.find(u => u.value === value)) {
        setUnits([...units, { value, label: customUnit }]);
        setNewMaterial({...newMaterial, unit: value});
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingMaterialId(null);
    setNewMaterial({ name: '', unit: 'unidade', price: 0, quantity: 1, supplier: '', defaultPiecesPerUnit: 1 });
    setShowForm(true);
  };

  const handleOpenEdit = (material: Material) => {
    setEditingMaterialId(material.id);
    setNewMaterial({ ...material });
    setShowForm(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name) return;
    
    if (editingMaterialId) {
      setMaterials(prev => prev.map(m => 
        m.id === editingMaterialId 
          ? { ...m, ...newMaterial as Material } 
          : m
      ));
    } else {
      const material: Material = {
        id: Date.now().toString(),
        name: newMaterial.name!,
        unit: newMaterial.unit!,
        price: Number(newMaterial.price),
        quantity: Number(newMaterial.quantity),
        supplier: newMaterial.supplier || '',
        defaultPiecesPerUnit: Number(newMaterial.defaultPiecesPerUnit) || 1
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

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lengthUnits = ['metro', 'cm'];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Estoque de <span className="text-yellow-500">Materiais</span></h2>
          <p className="text-gray-400 font-medium">Controle seus insumos e rendimentos.</p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Novo Material
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input 
          type="text" 
          placeholder="Buscar material ou fornecedor..." 
          className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-yellow-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-yellow-50 text-yellow-700 uppercase text-[10px] font-black tracking-[0.15em]">
                <th className="px-8 py-5">Material</th>
                <th className="px-8 py-5">Unidade</th>
                <th className="px-8 py-5">Preço Pago</th>
                <th className="px-8 py-5 text-center">Rendimento</th>
                <th className="px-8 py-5 text-center">Custo Unit.</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-50">
              {filteredMaterials.map(m => {
                const isLength = lengthUnits.includes(m.unit.toLowerCase());
                const unitPrice = m.quantity > 0 ? m.price / m.quantity : 0;
                const costPerPiece = m.defaultPiecesPerUnit && m.defaultPiecesPerUnit > 0 
                  ? unitPrice / m.defaultPiecesPerUnit 
                  : unitPrice;

                return (
                  <tr key={m.id} className="hover:bg-yellow-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-700 text-base">{m.name}</span>
                        {m.supplier && <span className="text-[10px] text-gray-400 font-bold uppercase">{m.supplier}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit ${isLength ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                        {isLength ? <Ruler size={12} /> : <Layers size={12} />}
                        {m.unit}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-black text-gray-800">R$ {m.price.toFixed(2)}</td>
                    <td className="px-8 py-5 text-center">
                       {m.defaultPiecesPerUnit && m.defaultPiecesPerUnit > 1 ? (
                         <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-pink-500 flex items-center gap-1">
                               <LayoutGrid size={12} /> {m.defaultPiecesPerUnit} pçs/{m.unit}
                            </span>
                         </div>
                       ) : (
                         <span className="text-[10px] font-black text-gray-300 uppercase italic">Integral</span>
                       )}
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="flex flex-col items-center">
                          <span className="font-black text-blue-600 text-xs">R$ {costPerPiece.toFixed(3)}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">por peça</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(m)} className="p-2.5 text-blue-400 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => deleteMaterial(m.id)} className="p-2.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${editingMaterialId ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors"><X size={24} /></button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
               <div className={`p-3 rounded-2xl ${editingMaterialId ? 'bg-blue-50 text-blue-500' : 'bg-yellow-100 text-yellow-600'}`}>
                 {editingMaterialId ? <Edit3 size={24} /> : <Plus size={24} />}
               </div>
               {editingMaterialId ? 'Editar Material' : 'Novo Material'}
            </h3>
            
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
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Unidade</label>
                  <div className="flex gap-2">
                    <select 
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700"
                      value={newMaterial.unit}
                      onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}
                    >
                      {units.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={handleAddUnit}
                      className="p-4 bg-yellow-100 text-yellow-600 rounded-2xl hover:bg-yellow-200 transition-colors"
                      title="Adicionar nova unidade"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
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

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className={`flex-1 px-6 py-4 text-white font-black rounded-2xl shadow-lg ${editingMaterialId ? 'bg-blue-500 hover:bg-blue-600' : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'}`}>Salvar Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
