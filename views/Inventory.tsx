
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit3, Search, Truck, Tag, DollarSign, FileCode, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Material } from '../types';

interface InventoryProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
}

export const Inventory: React.FC<InventoryProps> = ({ materials, setMaterials }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: '', unit: 'unidade', price: 0, quantity: 1, supplier: ''
  });

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name) return;
    
    const material: Material = {
      id: Date.now().toString(),
      name: newMaterial.name!,
      unit: newMaterial.unit!,
      price: Number(newMaterial.price),
      quantity: Number(newMaterial.quantity),
      supplier: newMaterial.supplier || ''
    };

    setMaterials([...materials, material]);
    setNewMaterial({ name: '', unit: 'unidade', price: 0, quantity: 1, supplier: '' });
    setShowForm(false);
  };

  const deleteMaterial = (id: string) => {
    if(confirm('Excluir este material?')) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  // Função de Importação XML
  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(event.target?.result as string, "text/xml");
        const materialNodes = xmlDoc.getElementsByTagName("material");
        
        if (materialNodes.length === 0) {
          throw new Error("Nenhum material encontrado no XML");
        }

        const importedMaterials: Material[] = [];
        
        for (let i = 0; i < materialNodes.length; i++) {
          const node = materialNodes[i];
          const getVal = (tag: string) => node.getElementsByTagName(tag)[0]?.textContent || "";
          
          importedMaterials.push({
            id: `xml-${Date.now()}-${i}`,
            name: getVal("nome") || getVal("name"),
            unit: getVal("unidade") || getVal("unit") || "unidade",
            price: parseFloat(getVal("preco") || getVal("price") || "0"),
            quantity: parseFloat(getVal("quantidade") || getVal("quantity") || "1"),
            supplier: getVal("fornecedor") || getVal("supplier") || ""
          });
        }

        setMaterials(prev => [...prev, ...importedMaterials]);
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (error) {
        console.error("Erro XML:", error);
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Estoque de <span className="text-yellow-500">Materiais</span></h2>
          <p className="text-gray-400 font-medium">Controle de insumos e fornecedores.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            accept=".xml" 
            ref={fileInputRef} 
            onChange={handleImportXML} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-black px-6 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
          >
            <FileCode size={20} />
            {importStatus === 'success' ? 'Importado!' : importStatus === 'error' ? 'Erro no XML' : 'Importar XML'}
          </button>
          
          <button 
            onClick={() => setShowForm(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg shadow-yellow-100 active:scale-95"
          >
            <Plus size={20} />
            Novo Material
          </button>
        </div>
      </div>

      {importStatus === 'success' && (
        <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3 animate-slideDown">
          <CheckCircle2 className="text-green-500" size={20} />
          <p className="text-green-700 font-bold text-sm">Materiais importados com sucesso do arquivo XML!</p>
        </div>
      )}

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
                <th className="px-8 py-5">Material / Fornecedor</th>
                <th className="px-8 py-5">Unidade</th>
                <th className="px-8 py-5">Preço Pago</th>
                <th className="px-8 py-5 text-center">Qtd. Total</th>
                <th className="px-8 py-5 text-center">Preço Unit.</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-50">
              {filteredMaterials.map(m => {
                const unitPrice = m.quantity > 0 ? m.price / m.quantity : 0;
                return (
                  <tr key={m.id} className="hover:bg-yellow-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-700 text-base">{m.name}</span>
                        {m.supplier && (
                          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 mt-0.5">
                            <Truck size={10} className="text-yellow-500" /> {m.supplier}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-blue-50 text-blue-500 rounded-lg text-xs font-black uppercase tracking-widest">{m.unit}</span>
                    </td>
                    <td className="px-8 py-5 font-black text-gray-800">R$ {m.price.toFixed(2)}</td>
                    <td className="px-8 py-5 text-center text-gray-600 font-bold">{m.quantity}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs">
                        R$ {unitPrice.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2.5 text-blue-400 hover:bg-blue-50 rounded-xl transition-all">
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteMaterial(m.id)}
                          className="p-2.5 text-gray-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
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
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
               <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl"><Plus size={24} /></div>
               Novo Material
            </h3>
            
            <form onSubmit={handleAddMaterial} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Material</label>
                  <input 
                    type="text" required
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                    value={newMaterial.name}
                    onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                    placeholder="Ex: Papel Lamicote Gold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Truck size={12} className="text-yellow-500" /> Fornecedor
                  </label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                    value={newMaterial.supplier}
                    onChange={e => setNewMaterial({...newMaterial, supplier: e.target.value})}
                    placeholder="Ex: Papelaria Criativa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Unidade</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold text-gray-700"
                    value={newMaterial.unit}
                    onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}
                  >
                    <option value="unidade">Unidade</option>
                    <option value="pacote">Pacote</option>
                    <option value="folha">Folha</option>
                    <option value="embalagem">Embalagem</option>
                    <option value="metro">Metro</option>
                    <option value="cm">Centímetro</option>
                    <option value="gramas">Gramas</option>
                    <option value="litro">Litro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Qtd Total</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-bold"
                    value={newMaterial.quantity}
                    onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Preço Total</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none font-black text-blue-600"
                    value={newMaterial.price}
                    onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Preço Unitário Calculado</span>
                <span className="text-xl font-black text-blue-600">
                  R$ {((newMaterial.price || 0) / (newMaterial.quantity || 1)).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-yellow-400 text-yellow-900 font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-100"
                >
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
