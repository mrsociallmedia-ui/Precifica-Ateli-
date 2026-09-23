import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Bell, X, Calendar, ChevronRight, CheckCheck, Sparkles, Trash2 } from 'lucide-react';
import { Project } from '../types';

export interface CatalogOrderAlert {
  id: string;
  quoteNumber?: string;
  customerName: string;
  total: number;
  itemsSummary?: string;
  createdAt: string;
  read?: boolean;
}

interface CatalogOrderNotificationProps {
  notifications: CatalogOrderAlert[];
  activeToast: CatalogOrderAlert | null;
  onDismissToast: () => void;
  onMarkAllRead: () => void;
  onDismissNotification?: (id: string) => void;
  onSelectOrder: (order: CatalogOrderAlert, targetTab: 'schedule' | 'catalog') => void;
}

// Emissão de alerta sonoro agradável utilizando Web Audio API nativo
export const playCatalogOrderChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tocar apenas se o contexto estiver ativo
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Primeiro tom suave (D5 ~ 587Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tom harmônico alegre (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);

    // Terceiro tom brilhante (C#6 ~ 1108Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1108.73, now + 0.24);
    gain3.gain.setValueAtTime(0.25, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.85);
  } catch (err) {
    console.warn("Aviso ao reproduzir áudio de notificação:", err);
  }
};

// Notificação nativa do navegador (Web Notification)
export const triggerBrowserNotification = (title: string, body: string) => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/images/papelietes_calcula_logo.png'
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/images/papelietes_calcula_logo.png'
            });
          }
        });
      }
    }
  } catch (e) {
    console.warn("Aviso na notificação do navegador:", e);
  }
};

export const CatalogOrderNotification: React.FC<CatalogOrderNotificationProps> = ({
  notifications,
  activeToast,
  onDismissToast,
  onMarkAllRead,
  onDismissNotification,
  onSelectOrder
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Sino na Barra Superior */}
      <button
        type="button"
        onClick={() => {
          setShowDropdown(!showDropdown);
        }}
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
          unreadCount > 0
            ? 'bg-pink-50 border-pink-200 text-pink-600 shadow-xs hover:bg-pink-100'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200/60 text-gray-500'
        }`}
        title={unreadCount > 0 ? `${unreadCount} novo(s) pedido(s) no Catálogo Online` : 'Notificações de Pedidos'}
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-bounce text-pink-600' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-pink-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de Histórico de Notificações do Catálogo */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-pink-100/80 p-4 z-50 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                <ShoppingBag size={14} />
              </div>
              <h4 className="font-black text-gray-800 text-sm">Pedidos do Catálogo</h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-black rounded-full">
                  {unreadCount} novo{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[10px] font-black text-pink-600 hover:text-pink-700 hover:bg-pink-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Limpar notificações lidas"
              >
                <CheckCheck size={13} />
                <span>Limpar lidos</span>
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-400 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
                <Bell size={20} />
              </div>
              <p className="text-xs font-bold text-gray-500">Nenhum pedido pendente</p>
              <p className="text-[10px] text-gray-400 max-w-[220px] mx-auto">
                Assim que um cliente fizer um pedido pelo catálogo online, ele aparecerá aqui e no cronograma.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-2xl border transition-all text-left space-y-1.5 relative group/item ${
                    !notif.read
                      ? 'bg-pink-50/50 border-pink-100 hover:bg-pink-50'
                      : 'bg-gray-50/60 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-black uppercase text-pink-600 bg-white px-2 py-0.5 rounded-md border border-pink-100 shadow-2xs">
                        {notif.quoteNumber || '#PED-CATALOGO'}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {onDismissNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissNotification(notif.id);
                          }}
                          className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors"
                          title="Remover notificação"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-gray-800">{notif.customerName}</p>
                    {notif.itemsSummary && (
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-1">{notif.itemsSummary}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100/60">
                    <span className="text-xs font-black text-emerald-600">
                      R$ {Number(notif.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          onSelectOrder(notif, 'schedule');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar size={10} />
                        <span>Cronograma</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          onSelectOrder(notif, 'catalog');
                        }}
                        className="px-2.5 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Ver</span>
                        <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TOAST POPUP FLUTUANTE EM TEMPO REAL NO APLICATIVO */}
      {activeToast && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] max-w-sm w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border-2 border-pink-400/80 p-4 animate-bounce-short">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <ShoppingBag size={20} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500"></span>
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> Novo Pedido no Catálogo!
                </span>
                <button
                  type="button"
                  onClick={onDismissToast}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-1.5">
                <h5 className="font-black text-gray-800 text-sm truncate">
                  {activeToast.customerName}
                </h5>
                <p className="text-[11px] font-black text-gray-500 mt-0.5">
                  Pedido <span className="text-pink-600 font-black">{activeToast.quoteNumber || '#PED-CATALOGO'}</span>
                </p>
                {activeToast.itemsSummary && (
                  <p className="text-[11px] text-gray-500 font-medium line-clamp-1 mt-0.5">
                    {activeToast.itemsSummary}
                  </p>
                )}
                <p className="text-sm font-black text-emerald-600 mt-1">
                  R$ {Number(activeToast.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectOrder(activeToast, 'schedule');
                    onDismissToast();
                  }}
                  className="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Calendar size={12} />
                  <span>Ver no Cronograma</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectOrder(activeToast, 'catalog');
                    onDismissToast();
                  }}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Catálogo</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
