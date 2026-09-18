import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Sparkles, 
  MessageCircle, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  RefreshCw,
  ShoppingBag,
  CreditCard,
  MapPin,
  FileText
} from 'lucide-react';
import { CompanyData } from '../types';
import { buildWhatsAppLink } from '../utils';

interface OrderTrackItem {
  id: string;
  orderNum: string;
  date: string;
  dueDate?: string;
  deliveryDate?: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'delayed' | string;
  celebrantName?: string;
  customerName?: string;
  customerPhone?: string;
  theme?: string;
  description?: string;
  notes?: string;
  observations?: string;
  items?: Array<{ name: string; quantity: number; price?: number }>;
  total?: number;
  paymentMethod?: string;
  paidAt?: string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    neighborhood?: string;
    city?: string;
  };
}

interface CatalogTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  companyData: CompanyData | null;
  defaultPhone?: string;
  defaultOrderNumber?: string;
}

export const CatalogTrackingModal: React.FC<CatalogTrackingModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  companyData,
  defaultPhone,
  defaultOrderNumber
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderTrackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderTrackItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialTerm = defaultOrderNumber || defaultPhone || '';
      if (initialTerm) {
        setSearchTerm(initialTerm);
        performSearch(initialTerm);
      } else {
        // Tentar carregar histórico local caso o cliente tenha pedidos salvos no navegador
        try {
          const localOrders = JSON.parse(localStorage.getItem('my_online_orders') || '[]');
          if (localOrders.length > 0) {
            setOrders(localOrders.map((o: any) => {
              const mappedItems = (o.items || []).map((it: any) => ({
                name: it.name || it.product?.name || 'Produto',
                quantity: Number(it.quantity) || Number(it.qty) || 1,
                price: Number(it.price) || Number(it.unitPrice) || 0
              }));
              const itemsTotal = mappedItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0);
              const finalTotal = Number(o.total) || itemsTotal || 0;

              return {
                id: o.orderNum,
                orderNum: o.orderNum,
                date: o.date,
                status: 'pending',
                celebrantName: o.customerName,
                items: mappedItems,
                total: finalTotal,
                paymentMethod: o.paymentMethod || 'A Combinar',
                notes: o.deliveryType === 'pickup' ? 'Retirada no Ateliê' : 'Entrega no Endereço'
              };
            }));
            setSearched(true);
          }
        } catch (e) {}
      }
    }
  }, [isOpen, defaultOrderNumber, defaultPhone]);

  if (!isOpen) return null;

  const performSearch = async (termToSearch: string) => {
    const term = termToSearch.trim();
    if (!term) return;

    setLoading(true);
    setSearched(true);
    setSelectedOrder(null);

    // 1. Tentar buscar da API de rastreamento do servidor
    try {
      const res = await fetch(`/api/catalog/track-orders?userEmail=${encodeURIComponent(userEmail)}&search=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders(data.orders);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Aviso ao buscar pedidos via API:", e);
    }

    // 2. Fallback: Buscar pedidos do localStorage local
    try {
      const localOrders = JSON.parse(localStorage.getItem('my_online_orders') || '[]');
      const cleanTerm = term.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = localOrders.filter((o: any) => {
        const oNum = String(o.orderNum || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const oPhone = String(o.customerPhone || '').replace(/\D/g, '');
        const oName = String(o.customerName || '').toLowerCase();
        return oNum.includes(cleanTerm) || (cleanTerm.length >= 6 && oPhone.includes(cleanTerm)) || oName.includes(term.toLowerCase());
      });

      if (matched.length > 0) {
        setOrders(matched.map((o: any) => {
          const mappedItems = (o.items || []).map((it: any) => ({
            name: it.name || it.product?.name || 'Produto',
            quantity: Number(it.quantity) || Number(it.qty) || 1,
            price: Number(it.price) || Number(it.unitPrice) || 0
          }));
          const itemsTotal = mappedItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0);
          const finalTotal = Number(o.total) || itemsTotal || 0;

          return {
            id: o.orderNum,
            orderNum: o.orderNum,
            date: o.date,
            status: 'pending',
            celebrantName: o.customerName,
            items: mappedItems,
            total: finalTotal,
            paymentMethod: o.paymentMethod || 'A Combinar',
            notes: o.deliveryType === 'pickup' ? 'Retirada no Ateliê' : 'Entrega no Endereço'
          };
        }));
        setLoading(false);
        return;
      }
    } catch (e) {}

    setOrders([]);
    setLoading(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchTerm);
  };

  // Helper para identificar etapa da timeline (0 a 4)
  const getStepProgress = (status: string, paidAt?: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') return 4; // Entregue
    if (s === 'in_progress' || s === 'delayed') return 2; // Em Produção
    if (s === 'approved' || paidAt) return 1; // Pagamento Aprovado
    return 0; // Pedido Recebido
  };

  const getStatusBadge = (status: string, paidAt?: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') {
      return {
        label: 'Pronto / Entregue',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (s === 'in_progress' || s === 'delayed') {
      return {
        label: 'Em Produção no Ateliê',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500'
      };
    }
    if (s === 'approved' || paidAt) {
      return {
        label: 'Pagamento Confirmado',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    }
    return {
      label: 'Aguardando Pagamento / Início',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500'
    };
  };

  const openWhatsAppForOrder = (order: OrderTrackItem) => {
    if (!companyData?.phone) {
      alert("Número de WhatsApp do ateliê não encontrado.");
      return;
    }

    const text = `Olá ${companyData?.name || 'Ateliê'}! Gostaria de acompanhar o andamento do meu pedido *${order.orderNum}* (Cliente: ${order.celebrantName || order.customerName || 'Cliente'}). Como está a confecção?`;
    const url = buildWhatsAppLink(companyData.phone, text);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-pink-100 overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-6 text-white relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-inner">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                Acompanhar Meus Pedidos
              </h3>
              <p className="text-xs text-white/90 font-medium">
                Consulte o status de produção e entrega do seu pedido em tempo real
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="p-6 pb-3 border-b border-gray-100 bg-[#fffcf8]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Digite seu WhatsApp ou nº do pedido (ex: #PED-1234)"
                className="w-full p-3.5 pl-11 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-pink-400 shadow-xs transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-4 top-4 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="px-5 py-3.5 bg-pink-500 hover:bg-pink-600 active:scale-95 disabled:opacity-40 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-pink-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>

          <p className="text-[10px] text-gray-400 mt-2 ml-1">
            Dica: Você pode digitar o número completo do pedido ou apenas o número de WhatsApp informado na compra.
          </p>
        </div>

        {/* Conteúdo dos Pedidos */}
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-pink-500">
              <RefreshCw size={28} className="animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest">Localizando seus pedidos no ateliê...</p>
            </div>
          )}

          {!loading && searched && orders.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 bg-pink-50 text-pink-400 rounded-3xl flex items-center justify-center mx-auto">
                <Package size={28} />
              </div>
              <h4 className="font-black text-gray-800 text-sm">Nenhum pedido localizado</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Não encontramos pedidos com o termo "<strong>{searchTerm}</strong>". Verifique se o número do pedido ou WhatsApp está correto.
              </p>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  {orders.length} {orders.length === 1 ? 'Pedido Encontrado' : 'Pedidos Encontrados'}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  Atualizado em tempo real
                </span>
              </div>

              {orders.map((order, idx) => {
                const badge = getStatusBadge(order.status, order.paidAt);
                const step = getStepProgress(order.status, order.paidAt);

                return (
                  <div 
                    key={order.id || idx}
                    className="bg-white border border-pink-100 rounded-3xl p-5 shadow-sm space-y-5 hover:border-pink-300 transition-all"
                  >
                    {/* Linha de Cima: Nº do Pedido e Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-800">
                          {order.orderNum}
                        </span>
                        {order.celebrantName && (
                          <span className="text-xs text-gray-400 font-bold">
                            • {order.celebrantName}
                          </span>
                        )}
                      </div>

                      <div className={`px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${badge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`}></span>
                        <span>{badge.label}</span>
                      </div>
                    </div>

                    {/* Timeline Visual de 5 Etapas */}
                    <div className="py-2">
                      <div className="relative flex items-center justify-between">
                        {/* Linha de fundo */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-0"></div>
                        {/* Linha preenchida */}
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-pink-500 transition-all duration-500 -z-0"
                          style={{ width: `${(step / 4) * 100}%` }}
                        ></div>

                        {/* Etapas */}
                        {[
                          { title: 'Pedido Feito', icon: CheckCircle2 },
                          { title: 'Pagamento', icon: CreditCard },
                          { title: 'Em Produção', icon: Sparkles },
                          { title: 'Pronto / Envio', icon: Truck },
                          { title: 'Entregue', icon: Package }
                        ].map((s, sIdx) => {
                          const isDone = sIdx <= step;
                          const isCurrent = sIdx === step;
                          const IconComponent = s.icon;

                          return (
                            <div key={sIdx} className="flex flex-col items-center relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isDone 
                                  ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
                                  : 'bg-white border-2 border-gray-200 text-gray-300'
                              } ${isCurrent ? 'ring-4 ring-pink-100 scale-110' : ''}`}>
                                <IconComponent size={14} />
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-tight mt-1.5 ${
                                isDone ? 'text-pink-600 font-bold' : 'text-gray-300'
                              }`}>
                                {s.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Informações de Prazo & Detalhes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50/70 rounded-2xl text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Calendar size={11} className="text-pink-500" /> Previsão de Entrega
                        </span>
                        <p className="font-black text-gray-800">
                          {order.dueDate ? new Date(order.dueDate).toLocaleDateString('pt-BR') : 'A combinar com o ateliê'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <CreditCard size={11} className="text-blue-500" /> Pagamento
                        </span>
                        <p className="font-black text-gray-800">
                          {order.paymentMethod || 'Pix'} {order.total ? `• R$ ${order.total.toFixed(2)}` : ''}
                        </p>
                      </div>

                      {order.notes && (
                        <div className="sm:col-span-2 space-y-1 pt-1 border-t border-gray-200/60">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <MapPin size={11} className="text-emerald-500" /> Entrega / Retirada
                          </span>
                          <p className="font-bold text-gray-700 text-[11px] leading-relaxed">
                            {order.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Itens do Pedido */}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Itens do Pedido ({order.items.length})
                          </span>
                          {order.total && order.total > 0 ? (
                            <span className="text-xs font-black text-pink-600">
                              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                            </span>
                          ) : null}
                        </div>
                        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden text-xs bg-gray-50/50">
                          {order.items.map((item, itIdx) => {
                            const qty = Number(item.quantity) || Number((item as any).qty) || 1;
                            const unitPrice = Number(item.price) || Number((item as any).unitPrice) || 0;
                            const itemTotal = unitPrice > 0 ? unitPrice * qty : (order.items?.length === 1 && order.total ? order.total : 0);

                            return (
                              <div key={itIdx} className="p-3 px-3.5 flex justify-between items-center bg-white hover:bg-pink-50/30 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 bg-pink-100/80 text-pink-700 rounded-lg font-black text-xs">
                                    {qty}x
                                  </span>
                                  <span className="font-bold text-gray-800 text-xs">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="text-right">
                                  {itemTotal > 0 ? (
                                    <div className="flex flex-col items-end">
                                      <span className="font-black text-gray-800 text-xs">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal)}
                                      </span>
                                      {qty > 1 && unitPrice > 0 && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitPrice)} un.)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-bold text-gray-400">
                                      R$ 0,00
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ação WhatsApp para tirar dúvidas */}
                    <button
                      type="button"
                      onClick={() => openWhatsAppForOrder(order)}
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-700 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 border border-emerald-200 transition-all cursor-pointer"
                    >
                      <MessageCircle size={16} className="text-emerald-600" />
                      <span>Falar sobre este pedido no WhatsApp do Ateliê</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
