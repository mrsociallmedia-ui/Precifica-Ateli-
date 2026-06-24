import React, { useState } from 'react';
import { 
  Cloud, 
  Database, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Download, 
  Upload, 
  Lock, 
  Play, 
  ArrowRight
} from 'lucide-react';
import { supabase, isMock } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';

interface SupabaseIntegrationProps {
  currentUser: string | null;
  syncStatus: 'synced' | 'syncing' | 'error' | 'local';
  syncErrorMessage: string | null;
  onRefresh: () => Promise<void>;
  onForceSync: () => Promise<void>;
}

const SQL_SCRIPT = `CREATE TABLE IF NOT EXISTS public.user_data (
    user_email text PRIMARY KEY,
    app_state jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_data_select_policy" ON public.user_data;
DROP POLICY IF EXISTS "user_data_all_policy" ON public.user_data;

CREATE POLICY "user_data_select_policy" ON public.user_data 
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "user_data_all_policy" ON public.user_data 
    FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE INDEX IF NOT EXISTS idx_user_data_email_lower ON public.user_data (lower(user_email));`;

export default function SupabaseIntegration({ 
  currentUser, 
  syncStatus, 
  syncErrorMessage, 
  onRefresh, 
  onForceSync 
}: SupabaseIntegrationProps) {
  
  // Custom connection state initialization
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState(() => localStorage.getItem('custom_supabase_url') || '');
  const [customSupabaseKey, setCustomSupabaseKey] = useState(() => localStorage.getItem('custom_supabase_key') || '');
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; code?: string } | null>(null);
  const [isSavingSync, setIsSavingSync] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedKeys, setCopiedKeys] = useState<{ [key: string]: boolean }>({});

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeys(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedKeys(prev => ({ ...prev, [id]: false })), 2000);
  };

  const handleTestConnection = async () => {
    if (!customSupabaseUrl || !customSupabaseKey) {
      setTestResult({ success: false, message: 'Por favor, insira a URL e a Chave Anon (key) para testar a conexão.' });
      return;
    }
    
    setIsTestingSync(true);
    setTestResult(null);

    try {
      let cleanUrl = customSupabaseUrl.trim();
      cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
      if (cleanUrl && !cleanUrl.startsWith('http')) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const testClient = createClient(cleanUrl, customSupabaseKey.trim());
      const { error } = await testClient.from('user_data').select('user_email').limit(1);
      
      if (error) {
        console.error("Query test failed:", error);
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          setTestResult({ 
            success: false, 
            code: 'no_table', 
            message: 'Conexão efetuada com sucesso! No entanto, a tabela "user_data" não foi encontrada. É necessário criá-la no SQL Editor.' 
          });
        } else {
          setTestResult({ 
            success: false, 
            message: `Erro ao buscar dados: ${error.message}` 
          });
        }
      } else {
        setTestResult({ 
          success: true, 
          message: 'Excelente! Conexão estabelecida com sucesso e a tabela "user_data" está pronta para uso!' 
        });
      }
    } catch (err: any) {
      console.error("Test connection critical error:", err);
      setTestResult({ 
        success: false, 
        message: `Falha na conexão: ${err.message || 'Verifique se a URL informada é válida.'}` 
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  const handleSaveConnection = () => {
    setIsSavingSync(true);
    try {
      if (customSupabaseUrl.trim()) {
        localStorage.setItem('custom_supabase_url', customSupabaseUrl.trim());
      } else {
        localStorage.removeItem('custom_supabase_url');
      }

      if (customSupabaseKey.trim()) {
        localStorage.setItem('custom_supabase_key', customSupabaseKey.trim());
      } else {
        localStorage.removeItem('custom_supabase_key');
      }

      alert('Configurações atualizadas! A página será reiniciada para estabelecer a nova conexão na nuvem.');
      window.location.reload();
    } catch (err: any) {
      alert(`Falha ao salvar configurações: ${err.message}`);
    } finally {
      setIsSavingSync(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('Deseja restaurar as credenciais padrão do Calculiê? Suas configurações de nuvem customizadas serão desligadas.')) {
      localStorage.removeItem('custom_supabase_url');
      localStorage.removeItem('custom_supabase_key');
      alert('Configuração padrão restaurada! A página será recarregada.');
      window.location.reload();
    }
  };

  const handleBackupData = () => {
    const backup: { [key: string]: any } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('craft_') || key.includes('mock_db_') || key.includes('app_state') || key.startsWith('calculie_'))) {
        backup[key] = localStorage.getItem(key);
      }
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `calculie_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          Object.keys(parsed).forEach(k => {
            localStorage.setItem(k, parsed[k]);
          });
          alert('Dados do Ateliê carregados com sucesso! O sistema será recarregado.');
          window.location.reload();
        } catch (err) {
          alert('Arquivo inválido. Certifique-se de que escolheu o arquivo .json correto do backup.');
        }
      };
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-600 font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Nuvem e Segurança
          </span>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight mt-1 flex items-center gap-3">
            <Cloud className="text-indigo-600 animate-pulse" size={32} /> Integração Supabase
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1 max-w-2xl">
            Sincronize todos os cálculos, clientes, catálogos, pedidos e custos do seu ateliê em tempo real na nuvem do Supabase. Acesse de múltiplos celulares ou tablets com segurança militar.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBackupData}
            title="Baixar cópia de segurança local"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 border border-gray-200"
          >
            <Download size={14} /> Backup Local (JSON)
          </button>
          
          <label className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 border border-gray-200 cursor-pointer">
            <Upload size={14} /> Importar Backup
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>
      </div>

      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Painel do Status da Conexão */}
        <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] border border-gray-150 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-3">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Painel de Nuvem</span>
              <Database size={16} className="text-pink-500" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1">Status da Sincronização</span>
                {syncStatus === 'synced' ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50/50 border border-green-100 p-3 rounded-2xl">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Conectado & Ativo</p>
                      <p className="text-[10px] font-semibold text-green-500">Dados protegidos na nuvem</p>
                    </div>
                  </div>
                ) : syncStatus === 'syncing' ? (
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50/50 border border-blue-100 p-3 rounded-2xl animate-pulse">
                    <RefreshCw size={18} className="shrink-0 animate-spin" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Sincronizando</p>
                      <p className="text-[10px] font-semibold text-blue-500">Salvando novas alterações...</p>
                    </div>
                  </div>
                ) : syncStatus === 'local' ? (
                  <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50/50 border border-yellow-101/50 p-3 rounded-2xl">
                    <Info size={18} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Modo Local</p>
                      <p className="text-[10px] font-semibold text-yellow-500">Armazenamento local do navegador</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-650 bg-red-50/50 border border-red-101/50 p-3 rounded-2xl">
                    <AlertCircle size={18} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Erro na Conexão</p>
                      <p className="text-[10px] font-semibold text-red-550 truncate max-w-[180px]" title={syncErrorMessage || ''}>
                        {syncErrorMessage || 'Falha de transmissão'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">E-mail do Ateliê</p>
                <p className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-black text-gray-700 truncate">
                  {currentUser || 'Não logado (offline/local)'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">Origem do Banco</p>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-semibold text-gray-600 space-y-1">
                  <p className="truncate"><span className="font-extrabold text-[#3b82f6]">Ambiente:</span> {isMock ? 'Mock local' : 'Supabase ativo'}</p>
                  <p className="text-[10px] truncate max-w-full"><span className="font-extrabold text-pink-600 text-[10px]">URL:</span> </p>
                  <p className="text-[9px] font-mono select-all truncate bg-white/50 border border-gray-50 p-1.5 rounded">{localStorage.getItem('custom_supabase_url') || 'Utilizando credenciais do Calculiê'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-gray-50">
            <button
              onClick={onForceSync}
              disabled={syncStatus === 'syncing' || !currentUser}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
            >
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              Sincronizar Agora
            </button>
            
            {localStorage.getItem('custom_supabase_url') && (
              <button
                onClick={handleRestoreDefaults}
                className="w-full py-3 border-2 border-red-50 hover:bg-red-55 border-dashed text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Voltar para Configuração Padrão
              </button>
            )}
          </div>
        </div>

        {/* Integração customizada */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-150 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <div>
              <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center gap-2">
                🚀 Vincular Seu Banco Supabase Próprio
              </h4>
              <p className="text-[11px] text-gray-400 font-medium">Use sua própria base de dados gratuita do Supabase para ter total controle.</p>
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3b82f6]"></span>
            </span>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-0.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supabase URL</label>
                  <button 
                    onClick={() => handleCopyText(localStorage.getItem('custom_supabase_url') || '', 'url')}
                    className="text-[9px] text-[#3b82f6] font-bold uppercase hover:underline"
                  >
                    {copiedKeys['url'] ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-xs focus:ring-4 focus:ring-indigo-50 hover:bg-gray-100/50 transition-all font-mono" 
                  value={customSupabaseUrl}
                  onChange={e => setCustomSupabaseUrl(e.target.value)}
                  placeholder="https://gswqndbpxfhybxtxshst.supabase.co"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-0.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supabase Anon Key</label>
                  <button 
                    onClick={() => handleCopyText(localStorage.getItem('custom_supabase_key') || '', 'key')}
                    className="text-[9px] text-[#3b82f6] font-bold uppercase hover:underline"
                  >
                    {copiedKeys['key'] ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <input 
                  type="password" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-xs focus:ring-4 focus:ring-indigo-50 hover:bg-gray-100/50 transition-all font-mono" 
                  value={customSupabaseKey}
                  onChange={e => setCustomSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                />
              </div>
            </div>

            {/* Test Connection Result Box */}
            {testResult && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-fadeIn ${testResult.success ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {testResult.success ? (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-green-600" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-650" />
                )}
                <div className="text-xs font-bold leading-relaxed">
                  <p className="font-extrabold">{testResult.success ? 'Teste Concluído!' : 'Falha no Teste'}</p>
                  <p className="opacity-90 mt-0.5">{testResult.message}</p>
                  
                  {testResult.code === 'no_table' && (
                    <div className="mt-3 bg-white p-4 rounded-xl border border-red-101/60 space-y-2 text-[11px] text-gray-700 shadow-sm max-w-full">
                      <p className="font-black text-red-600 uppercase tracking-wide">Como criar a tabela para salvar os dados?</p>
                      <p>Siga estas instruções simples para resolver no seu painel do Supabase:</p>
                      <ol className="list-decimal list-inside space-y-1.5 pl-1 font-semibold text-gray-600">
                        <li>Vá no menu esquerdo do seu projeto Supabase e clique em <strong className="text-gray-800">SQL Editor</strong>.</li>
                        <li>Clique em <strong className="text-gray-800">+ New Query</strong> na parte de cima.</li>
                        <li>Copie o script SQL que está no final desta página.</li>
                        <li>Cole o script no editor e clique no botão azul <strong className="text-gray-800">Run</strong> no canto inferior direito.</li>
                        <li>Feito isso, clique em "Testar Conexão" para validar o sucesso!</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <button 
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingSync || !customSupabaseUrl || !customSupabaseKey}
                className="flex-1 py-4 border-2 border-gray-900 text-gray-900 hover:bg-gray-50 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 disabled:opacity-45"
              >
                {isTestingSync ? (
                  <RefreshCw size={14} className="animate-spin text-gray-800" />
                ) : (
                  <Database size={14} className="text-gray-800" />
                )}
                Testar Credenciais
              </button>

              <button 
                type="button"
                onClick={handleSaveConnection}
                disabled={isSavingSync || !customSupabaseUrl || !customSupabaseKey}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2.5 disabled:opacity-45"
              >
                {isSavingSync ? (
                  <RefreshCw size={14} className="animate-spin text-white" />
                ) : (
                  <Check size={14} className="text-white" />
                )}
                Salvar e Conectar Banco
              </button>
            </div>
          </div>

          <div className="p-4 bg-yellow-50/50 rounded-2xl border border-yellow-101/60 flex items-start gap-2.5">
            <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-yellow-800 font-semibold leading-normal">
              <p className="font-black">Importante sobre o Login de Usuário:</p>
              <p className="mt-0.5">Seu cadastro de e-mail e senha são salvos dentro do seu próprio Supabase de forma criptografada. Se você alterar a URL da nuvem, crie um novo cadastro clicando no botão "Cadastre-se" na tela inicial para poder logar.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Passo a Passo com Script SQL */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-150 shadow-sm space-y-8">
        <div>
          <h3 className="font-black text-gray-800 text-base uppercase tracking-wider flex items-center gap-2.5 border-b border-gray-50 pb-4">
            <Lock size={18} className="text-indigo-600" /> Guia de Configuração Expressa (Supabase em 3 minutos)
          </h3>
          <p className="text-xs text-gray-400 mt-1">Siga este passo a passo simplificado para ter sua própria nuvem grátis ativa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 font-black text-xs flex items-center justify-center">1</div>
            <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wide">Crie Seu Banco</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
              Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">supabase.com</a> e crie uma conta gratuita. Crie um novo projeto com o nome do seu ateliê.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 font-black text-xs flex items-center justify-center">2</div>
            <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wide">Rode o Script SQL</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
              Vá em <strong className="text-gray-700">SQL Editor</strong>, crie uma nova aba de "Query", cole o código ao lado e clique em <strong className="text-indigo-600 font-black">Run</strong>. Isso cria a tabela com segurança RLS ativa.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 font-black text-xs flex items-center justify-center">3</div>
            <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wide">Insira os Acessos</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
              No painel do Supabase, acesse <strong className="text-gray-700">Project Settings → API</strong>. Copie sua URL e sua Chave Anon/Public e salve nos campos acima.
            </p>
          </div>
        </div>

        {/* SQL Code Box */}
        <div className="space-y-3 pt-4 border-t border-gray-50">
          <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Código SQL para Execução</span>
              <p className="text-[11px] text-gray-500 font-bold mt-0.5">Clique no botão para copiar todo o código SQL automaticamente.</p>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-4 py-2 bg-gray-900 border border-neutral-950 text-white rounded-xl text-[10px] hover:bg-neutral-800 transition-all font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              {copiedSql ? (
                <>
                  <Check size={12} /> Copiado!
                </>
              ) : (
                <>
                  <Copy size={12} /> Copiar Código SQL
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-gray-900 text-emerald-400 font-mono text-[10px] rounded-2xl overflow-auto select-all max-h-60 custom-scrollbar border border-neutral-950 shadow-inner">
            {SQL_SCRIPT}
          </pre>
        </div>
      </div>
    </div>
  );
}
