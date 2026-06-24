import React from 'react';
import { 
  Cloud, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RefreshCw
} from 'lucide-react';
import { isMock } from '../supabaseClient';

interface SupabaseIntegrationProps {
  currentUser: string | null;
  syncStatus: 'synced' | 'syncing' | 'error' | 'local';
  syncErrorMessage: string | null;
  onRefresh: () => Promise<void>;
  onForceSync: () => Promise<void>;
}

export default function SupabaseIntegration({ 
  currentUser, 
  syncStatus, 
  syncErrorMessage, 
  onRefresh, 
  onForceSync 
}: SupabaseIntegrationProps) {
  
  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto pb-12 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-600 font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Nuvem e Segurança
          </span>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight mt-1 flex items-center gap-3">
            <Cloud className="text-indigo-600 animate-pulse" size={32} /> Nuvem Supabase
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            Sincronize todos os cálculos, clientes, catálogos, pedidos e custos do seu ateliê em tempo real na nuvem do Supabase.
          </p>
        </div>
      </div>

      {/* Painel do Status da Conexão */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-150 shadow-sm space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray-50 pb-3">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Painel de Nuvem</span>
            <Database size={16} className="text-pink-500" />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1">Status da Sincronização</span>
              {syncStatus === 'synced' ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50/50 border border-green-100 p-4 rounded-2xl">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Conectado & Ativo</p>
                    <p className="text-[10px] font-semibold text-green-500">Dados protegidos na nuvem do seu ateliê</p>
                  </div>
                </div>
              ) : syncStatus === 'syncing' ? (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl animate-pulse">
                  <RefreshCw size={18} className="shrink-0 animate-spin" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Sincronizando</p>
                    <p className="text-[10px] font-semibold text-blue-500">Salvando novas alterações...</p>
                  </div>
                </div>
              ) : syncStatus === 'local' ? (
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50/50 border border-yellow-101/50 p-4 rounded-2xl">
                  <Info size={18} className="shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Modo Local</p>
                    <p className="text-[10px] font-semibold text-yellow-500">Armazenamento local do navegador</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-650 bg-red-50/50 border border-red-101/50 p-4 rounded-2xl">
                  <AlertCircle size={18} className="shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Erro na Conexão</p>
                    <p className="text-[10px] font-semibold text-red-550 max-w-md" title={syncErrorMessage || ''}>
                      {syncErrorMessage || 'Falha de transmissão'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">E-mail do Ateliê</p>
              <p className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl text-xs font-black text-gray-700 truncate">
                {currentUser || 'Não logado (offline/local)'}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">Banco Conectado</p>
              <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl text-xs font-semibold text-gray-600 space-y-1">
                <p className="truncate"><span className="font-extrabold text-[#3b82f6]">Ambiente:</span> {isMock ? 'Mock local' : 'Supabase ativo'}</p>
                <p className="text-[10px] truncate max-w-full"><span className="font-extrabold text-pink-600 text-[10px]">Servidor:</span> Nuvem do Ateliê</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-50">
          <button
            onClick={onForceSync}
            disabled={syncStatus === 'syncing' || !currentUser}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
          >
            <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            Sincronizar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
