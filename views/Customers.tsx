
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  User, 
  Gift, 
  Phone, 
  MapPin, 
  Trash2, 
  Users, 
  Calendar, 
  Home, 
  ShoppingBag, 
  X, 
  DollarSign, 
  CheckCircle2, 
  Clock,
  Edit3
} from 'lucide-react';
import { Customer, Project, Material, Platform, CompanyData } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  projects: Project[];
  materials: Material[];
  platforms: Platform[];
  companyData: CompanyData;
}

export const Customers: React.FC<CustomersProps> = ({ 
  customers, 
  setCustomers, 
  projects, 
  materials, 
  platforms, 
  companyData 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '', birthDate: '', phone: '', address: '', neighborhood: '', zipCode: ''
  });

  const handleOpenAdd = () => {
    setEditingCustomerId(null);
    setNewCustomer({ name: '', birthDate: '', phone: '', address: '', neighborhood: '', zipCode: '' });
    setShowForm(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setNewCustomer({ ...customer });
    setShowForm(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;

    if (editingCustomerId) {
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomerId 
          ? { ...c, ...newCustomer as Customer } 
          : c
      ));
    } else {
      const customer: Customer = {
        id: Date.now().toString(),
        name: newCustomer.name!,
        birthDate: newCustomer.birthDate || '',
        phone: newCustomer.phone || '',
        address: newCustomer.address || '',
        neighborhood: newCustomer.neighborhood || '',
        zipCode: newCustomer.zipCode || ''
      };
      setCustomers([...customers, customer]);
    }

    setNewCustomer({ name: '', birthDate: '', phone: '', address: '', neighborhood: '', zipCode: '' });
    setEditingCustomerId(null);
    setShowForm(false);
  };

  const deleteCustomer = (id: string) => {
    if(confirm('Tem certeza que deseja excluir este cliente?')) {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Não informado';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const customerOrders = useMemo(() => {
    if (!historyCustomer) return [];
    return projects.filter(p => p.customerId === historyCustomer.id);
  }, [historyCustomer, projects]);

  const totalSpent = useMemo(() => {
    return customerOrders.reduce((acc, proj) => {
      const { finalPrice } = calculateProjectBreakdown(proj, materials, platforms, companyData);
      return acc + finalPrice;
    }, 0);
  }, [customerOrders, materials, platforms, companyData]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Base de <span className="text-pink-500">Clientes</span></h2>
          <p className="text-gray-400 font-medium">Gerencie contatos e datas especiais.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-pink-400 hover:bg-pink-500 text-white font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg shadow-pink-100 active:scale-95"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {customers.map(customer => {
          const orderCount = projects.filter(p => p.customerId === customer.id).length;
          return (
            <div key={customer.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 group hover:shadow-xl transition-all flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 shadow-sm group-hover:bg-pink-500 group-hover:text-white transition-all">
                  <User size={28} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEdit(customer)}
                    className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => deleteCustomer(customer.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-black text-gray-800 truncate">{customer.name}</h3>
                <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  {orderCount} {orderCount === 1 ? 'Pedido' : 'Pedidos'}
                </span>
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-400 rounded-xl"><Gift size={16} /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Aniversário</span>
                    <span className="text-sm font-bold text-gray-600">{formatDate(customer.birthDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-500 rounded-xl"><Phone size={16} /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">WhatsApp</span>
                    <span className="text-sm font-bold text-gray-600">{customer.phone || 'Não informado'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-50 text-yellow-500 rounded-xl shrink-0"><MapPin size={16} /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Localização</span>
                    <span className="text-xs font-bold text-gray-500 leading-relaxed">
                      {customer.address || 'Endereço não informado'}
                      {customer.neighborhood && <><br />{customer.neighborhood}</>}
                      {customer.zipCode && <><br /><span className="text-gray-300">CEP: {customer.zipCode}</span></>}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setHistoryCustomer(customer)}
                className="w-full mt-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-pink-50 hover:text-pink-500 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag size={14} /> Histórico de Pedidos
              </button>
            </div>
          );
        })}
        {customers.length === 0 && (
          <div className="col-span-full py-24 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300">
            <Users size={64} className="mb-4 opacity-10" />
            <p className="font-black uppercase tracking-widest text-xs">Sua lista de clientes está vazia.</p>
          </div>
        )}
      </div>

      {/* Modal Histórico */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-pink-500 p-8 text-white">
              <button 
                onClick={() => setHistoryCustomer(null)}
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-pink-500 shadow-xl">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black truncate max-w-[400px]">{historyCustomer.name}</h3>
                  <p className="text-pink-100 font-bold text-xs uppercase tracking-widest">Histórico Completo de Pedidos</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50">
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total de Pedidos</p>
                 <p className="text-2xl font-black text-gray-800">{customerOrders.length}</p>
              </div>
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50">
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Investimento Total</p>
                 <p className="text-2xl font-black text-blue-600">R$ {totalSpent.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              {customerOrders.length > 0 ? (
                customerOrders.map(proj => {
                  const { finalPrice } = calculateProjectBreakdown(proj, materials, platforms, companyData);
                  return (
                    <div key={proj.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-pink-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${proj.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'}`}>
                           {proj.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800">{proj.theme}</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Entrega: {new Date(proj.deliveryDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="font-black text-lg text-gray-800">R$ {finalPrice.toFixed(2)}</p>
                         <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                           proj.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                         }`}>
                           {proj.status === 'completed' ? 'Faturado' : 'Em Aberto'}
                         </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-gray-300 flex flex-col items-center">
                   <ShoppingBag size={48} className="opacity-10 mb-4" />
                   <p className="font-black text-xs uppercase tracking-widest">Este cliente ainda não fez pedidos.</p>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-white">
               <button 
                 onClick={() => setHistoryCustomer(null)}
                 className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all"
               >
                 Fechar Histórico
               </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${editingCustomerId ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
               <div className={`p-3 rounded-2xl ${editingCustomerId ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                 {editingCustomerId ? <Edit3 size={24} /> : <Plus size={24} />}
               </div>
               {editingCustomerId ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <form onSubmit={handleSaveCustomer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" required
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none font-bold"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder="Ex: Maria Oliveira"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Gift size={12} /> Data de Nascimento
                  </label>
                  <input 
                    type="date"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none font-bold text-gray-600"
                    value={newCustomer.birthDate}
                    onChange={e => setNewCustomer({...newCustomer, birthDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Phone size={12} /> WhatsApp
                  </label>
                  <input 
                    type="tel"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none font-bold"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={12} /> Endereço (Rua e Número)
                  </label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none font-bold"
                    value={newCustomer.address}
                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                    placeholder="Av. Brasil, 123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bairro</label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none font-bold"
                    value={newCustomer.neighborhood}
                    onChange={e => setNewCustomer({...newCustomer, neighborhood: e.target.value})}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Home size={12} /> CEP
                  </label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none font-bold"
                    value={newCustomer.zipCode}
                    onChange={e => setNewCustomer({...newCustomer, zipCode: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-8 py-5 border-2 border-gray-50 text-gray-400 rounded-3xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className={`flex-1 px-8 py-5 text-white font-black rounded-3xl transition-all shadow-lg ${editingCustomerId ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-100' : 'bg-pink-400 hover:bg-pink-500 shadow-pink-100'}`}
                >
                  {editingCustomerId ? 'Salvar Alterações' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
