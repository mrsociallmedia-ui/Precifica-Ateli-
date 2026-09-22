import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  QrCode, 
  Smartphone, 
  Monitor, 
  DollarSign, 
  Package, 
  Calendar, 
  Eye, 
  Search, 
  ArrowUpRight, 
  Sparkles,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Project, Product, Transaction, CompanyData, Customer } from '../types';

interface CatalogManagerProps {
  currentUser: string;
  companyData: CompanyData;
  products: Product[];
  projects: Project[];
  transactions: Transaction[];
  customers: Customer[];
  onNavigate: (tab: string) => void;
  onEditProject?: (project: Project) => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  currentUser,
  companyData,
  products,
  projects,
  transactions,
  customers,
  onNavigate,
  onEditProject
}) => {
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [searchOrder, setSearchOrder] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Link do catálogo online
  const baseUrl = typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : '';
  const catalogUrl = `${baseUrl}?catalog=${encodeURIComponent(currentUser || '')}`;

  // Filtrar pedidos que vieram do catálogo online
  const catalogOrders = projects.filter(p => 
    (p.quoteNumber && p.quoteNumber.startsWith('#PED-')) ||
    (p.notes && p.notes.toLowerCase().includes('catálogo')) ||
    (p.name && p.name.toLowerCase().includes('catálogo'))
  ).sort((a, b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime());

  // Filtrar transações financeiras do catálogo
  const catalogTransactions = transactions.filter(t => 
    t.category === 'Compra pelo Catálogo' ||
    (t.description && t.description.toLowerCase().includes('catálogo'))
  );

  const totalCatalogRevenue = catalogTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const catalogProducts = products.filter(p => p.showInCatalog !== false);

  const handleCopyLink = () => {
    if (!catalogUrl) return;
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenCatalog = () => {
    if (typeof window !== 'undefined') {
      window.open(catalogUrl, '_blank');
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🌸 *Olá! Conheça o Catálogo Online do ${companyData?.name || 'Nosso Ateliê'}!*\n\nConfira todas as nossas peças exclusivas, faça seu pedido e monte seu orçamento com facilidade pelo link:\n👉 ${catalogUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const filteredOrders = catalogOrders.filter(o => {
    if (!searchOrder) return true;
    const term = searchOrder.toLowerCase();
    const customer = customers.find(c => c.id === o.customerId);
    return (
      (o.quoteNumber && o.quoteNumber.toLowerCase().includes(term)) ||
      (o.name && o.name.toLowerCase().includes(term)) ||
      (customer && customer.name.toLowerCase().includes(term)) ||
      (o.description && o.description.toLowerCase().includes(term))
    );
  });

  const statusBadges: Record<string, { label: string; className: string }> = {
    pending: { label: 'Aguardando', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    approved: { label: 'Aprovado', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_progress: { label: 'Produzindo', className: 'bg-purple-50 text-purple-700 border-purple-200' },
    pending_payment: { label: 'Pag. Pendente', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    completed: { label: 'Finalizado', className: 'bg-green-50 text-green-700 border-green-200' },
    delayed: { label: 'Atrasado', className: 'bg-red-50 text-red-700 border-red-200' },
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-rose-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-pink-100 border border-white/20">
              <Sparkles size={14} className="text-yellow-300" />
              Catálogo Online Ativo & Integrado
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Seu Catálogo Virtual de Pedidos
            </h1>
            <p className="text-pink-100 font-medium text-sm md:text-base leading-relaxed">
              Compartilhe o link da sua vitrine com seus clientes. Cada pedido finalizado pelo WhatsApp é 
              <strong className="text-white"> automaticamente inserido no seu Cronograma</strong> com status financeiro 
              <strong className="text-white"> A Receber</strong>!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleOpenCatalog}
              className="px-5 py-3.5 bg-white text-pink-600 hover:bg-pink-50 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ExternalLink size={16} /> Ver Catálogo
            </button>
            <button 
              onClick={handleShareWhatsApp}
              className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageCircle size={16} /> Enviar no WhatsApp
            </button>
            <button 
              onClick={() => setShowQrModal(true)}
              className="p-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-2xl transition-all cursor-pointer"
              title="Ver QR Code do Catálogo"
            >
              <QrCode size={18} />
            </button>
          </div>
        </div>

        {/* Input da URL do Catálogo */}
        <div className="mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-3 flex items-center gap-3 text-white overflow-hidden">
            <ShoppingBag size={18} className="text-pink-200 shrink-0" />
            <span className="text-xs font-mono truncate text-white/90 selection:bg-pink-700">
              {catalogUrl}
            </span>
          </div>
          <button 
            onClick={handleCopyLink}
            className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md ${
              copied 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
          >
            {copied ? (
              <>
                <Check size={16} /> Link Copiado!
              </>
            ) : (
              <>
                <Copy size={16} /> Copiar Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
            <Package size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Produtos no Catálogo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{catalogProducts.length}</span>
              <span className="text-xs font-bold text-gray-400">de {products.length} itens</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Pedidos Recebidos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{catalogOrders.length}</span>
              <span className="text-xs font-bold text-blue-500">online</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Faturamento do Catálogo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">
                R$ {totalCatalogRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Automação Ativa</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-black text-emerald-600">Cronograma + Caixa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Principal: Pedidos do Catálogo e Preview lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna da Esquerda: Pedidos Recebidos pelo Catálogo (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-pink-500" />
                  Pedidos Gerados pelo Catálogo
                </h3>
                <p className="text-xs font-medium text-gray-400 mt-1">
                  Pedidos sincronizados automaticamente no seu cronograma e lançados no fluxo financeiro.
                </p>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar pedido ou cliente..."
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-pink-300 w-full sm:w-56"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-pink-50 rounded-full mx-auto flex items-center justify-center text-pink-400">
                  <ShoppingBag size={30} />
                </div>
                <div className="max-w-sm mx-auto space-y-1">
                  <h4 className="font-black text-gray-700 text-sm">Nenhum pedido do catálogo ainda</h4>
                  <p className="text-xs text-gray-400 font-medium">
                    Envie o link do catálogo para seus clientes no WhatsApp ou redes sociais. Quando eles finalizarem a compra, o pedido aparecerá aqui automaticamente!
                  </p>
                </div>
                <button 
                  onClick={handleShareWhatsApp}
                  className="px-5 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 size={14} /> Divulgar Catálogo no WhatsApp
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  const badge = statusBadges[order.status] || { label: order.status, className: 'bg-gray-50 text-gray-600 border-gray-200' };
                  const orderDateFormatted = new Date(order.createdAt || order.orderDate).toLocaleDateString('pt-BR');
                  
                  return (
                    <div 
                      key={order.id} 
                      className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-pink-200 hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                              {order.quoteNumber || order.id.slice(0, 8)}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.className}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 inline-flex items-center gap-1 shadow-xs">
                              <AlertCircle size={11} className="text-red-500" /> Financeiro: A Receber
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                              <Clock size={11} /> {orderDateFormatted}
                            </span>
                          </div>
                          <h4 className="font-black text-gray-800 text-sm">
                            {customer?.name || order.celebrantName || 'Cliente Catálogo'}
                          </h4>
                          {customer?.phone && (
                            <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
                              <MessageCircle size={12} className="text-emerald-500" />
                              {customer.phone}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Total</span>
                          <span className="text-base font-black text-emerald-600">
                            R$ {(order.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {order.description && (
                        <div className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-100 font-medium">
                          <span className="font-bold text-gray-700">Itens: </span>
                          {order.description}
                        </div>
                      )}

                      {order.observations && (
                        <div className="text-[11px] text-pink-700 bg-pink-50/60 p-2.5 rounded-xl border border-pink-100 font-medium">
                          <strong className="font-bold">Personalização: </strong>
                          {order.observations}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">Pagamento:</span>
                          <span className="text-gray-700">{order.paymentMethod || 'A combinar'}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                            A Receber (Não lançado)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {customer?.phone && (
                            <a
                              href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                              title="Chamar no WhatsApp"
                            >
                              <MessageCircle size={14} /> Conversar
                            </a>
                          )}
                          <button 
                            onClick={() => onNavigate('schedule')}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                            title="Ver no Cronograma"
                          >
                            <Calendar size={14} /> No Cronograma
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Preview do Catálogo e Configurações Rápidas (5 colunas) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card de Configuração Rápida do Catálogo */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-black text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-pink-500" /> Informações da Sua Vitrine
              </h4>
              <button 
                onClick={() => onNavigate('settings')}
                className="text-[11px] font-black text-pink-600 hover:underline"
              >
                Editar Perfil &gt;
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400 font-bold">Nome do Ateliê:</span>
                <span className="font-black text-gray-800">{companyData?.name || 'Não configurado'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400 font-bold">WhatsApp p/ Pedidos:</span>
                <span className="font-black text-gray-800">{companyData?.phone || 'Não configurado'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400 font-bold">Itens Visíveis:</span>
                <span className="font-black text-pink-600">{catalogProducts.length} produtos</span>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('products')}
              className="w-full py-3 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Package size={16} /> Gerenciar Produtos do Catálogo
            </button>
          </div>

          {/* Pré-visualização Interativa (Mockup de Smartphone) */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-black text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
                <Eye size={16} className="text-pink-500" /> Pré-Visualização
              </h4>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-white shadow-xs text-pink-600' : 'text-gray-400'}`}
                  title="Visão Celular"
                >
                  <Smartphone size={14} />
                </button>
                <button 
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-white shadow-xs text-pink-600' : 'text-gray-400'}`}
                  title="Visão Desktop"
                >
                  <Monitor size={14} />
                </button>
              </div>
            </div>

            {/* Container do Mockup */}
            <div className="flex justify-center bg-gray-100/70 p-4 rounded-3xl overflow-hidden">
              <div className={`transition-all duration-300 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 ${
                previewDevice === 'mobile' ? 'w-[320px] h-[520px]' : 'w-full h-[450px]'
              } flex flex-col`}>
                {/* Barra superior estilo navegador/celular */}
                <div className="bg-pink-500 text-white px-4 py-2.5 flex items-center justify-between text-[11px] font-bold">
                  <span className="truncate max-w-[180px]">{companyData?.name || 'Meu Ateliê'}</span>
                  <ExternalLink size={12} className="cursor-pointer" onClick={handleOpenCatalog} />
                </div>
                {/* Iframe carregando o catálogo em tempo real */}
                <iframe 
                  src={catalogUrl}
                  title="Pré-visualização do Catálogo"
                  className="w-full flex-1 border-0"
                  loading="lazy"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-center font-medium">
              Esta é exatamente a tela que seus clientes visualizam no smartphone ao acessar seu catálogo.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de QR Code do Catálogo */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-scaleIn">
            <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-2xl mx-auto flex items-center justify-center">
              <QrCode size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-800">QR Code do Seu Catálogo</h3>
              <p className="text-xs text-gray-500 font-medium">
                Imprima para o seu balcão de atendimento, embalagens ou mostre na tela do celular!
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 inline-block mx-auto">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(catalogUrl)}`}
                alt="QR Code Catálogo Online"
                className="w-48 h-48 mx-auto rounded-xl shadow-xs"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Fechar
              </button>
              <button 
                onClick={handleCopyLink}
                className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Copiar Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
