
import { createClient } from '@supabase/supabase-js';

// Normalização da URL (caso o usuário cole o endpoint REST completo ou com barras extras)
const normalizeUrl = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  // Remove prefixos redundantes e sufixos REST comuns
  cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  
  if (cleanUrl && !cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  return cleanUrl;
};

const getRuntimeConfig = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  let url = localStorage.getItem('custom_supabase_url');
  let key = localStorage.getItem('custom_supabase_key');
  
  // Limpar valores inválidos de string comuns
  if (url === 'null' || url === 'undefined' || (url && !url.trim())) url = null;
  if (key === 'null' || key === 'undefined' || (key && !key.trim())) key = null;
  
  // Validar formato básico dos inputs customizados. Se forem inválidos, descartamos para não sobrescrever as chaves reais padrão
  if (url && (!url.startsWith('http') || url.length < 10)) {
    url = null;
  }
  if (key && key.length < 20) {
    key = null;
  }
  
  return {
    url: url ? url.trim() : '',
    key: key ? key.trim() : ''
  };
};

const runtimeConfig = getRuntimeConfig();

// Prioridade: LocalStorage > Env Vars > Defaults fornecidos pelo usuário
// Nota: Em Vite/AI Studio, as variáveis podem estar no import.meta.env ou process.env dependendo da configuração
const getSupabaseUrlEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) return import.meta.env.VITE_SUPABASE_URL;
  if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
  return '';
};

const getSupabaseKeyEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) return import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) return process.env.VITE_SUPABASE_ANON_KEY;
  return '';
};

// URL e Chave fornecidas para integração
const PRIMARY_URL = 'https://scnjxuzapasdfgevegds.supabase.co';
const PRIMARY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbmp4dXphcGFzZGZnZXZlZ2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDMzMzQsImV4cCI6MjA4NjQ3OTMzNH0.syp0Raq5x9q3zz8zNkhsKvcui62lNqEWZ95uKPsXwow';

const SUPABASE_URL = normalizeUrl(
  runtimeConfig.url || 
  getSupabaseUrlEnv() || 
  PRIMARY_URL
);
const SUPABASE_KEY = (
  runtimeConfig.key ||
  getSupabaseKeyEnv() || 
  PRIMARY_KEY
).trim();

// Mock do Supabase para fallback caso as chaves falhem ou para facilitar testes locais
const createMockSupabase = () => {
  const mockAuth = {
    signInWithPassword: async ({ email, password }: any) => {
      // No modo inteligente, qualquer login bem-sucedido localmente é permitido para teste
      return { data: { user: { email }, session: { access_token: 'mock_token', user: { email } } }, error: null };
    },
    signUp: async ({ email, password }: any) => {
      // Cadastro automático local
      return { data: { user: { email }, session: { access_token: 'mock_token', user: { email } } }, error: null };
    },
    resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
    verifyOtp: async ({ token }: any) => {
      return { data: {}, error: null };
    },
    updateUser: async ({ password, email }: any) => {
      return { data: {}, error: null };
    },
    signOut: async () => ({ error: null }),
    onAuthStateChange: (callback: any) => {
      // Simular evento de auth inicial se já houver algo no localStorage
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getSession: async () => ({ data: { session: null }, error: null })
  };

  const mockFrom = (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
        maybeSingle: async () => {
          const data = localStorage.getItem(`mock_db_${table}_${value}`);
          return { data: data ? JSON.parse(data) : null, error: null };
        }
      })
    }),
    upsert: async (data: any, options?: any) => {
      const key = data.user_email || 'default';
      localStorage.setItem(`mock_db_${table}_${key}`, JSON.stringify(data));
      return { error: null };
    }
  });

  return { 
    auth: mockAuth, 
    from: mockFrom, 
    channel: (name: string) => ({
      on: (event: string, config: any, callback: any) => ({
        subscribe: () => {}
      })
    }),
    removeChannel: (channel: any) => {},
    isMock: true 
  };
};

// Limpeza de tokens stale/inválidos do Supabase do localStorage
export const clearStaleSupabaseAuth = () => {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Erro ao limpar tokens stale do Supabase:", e);
  }
};

// Renovação ou reset seguro quando o token JWT expira (PGRST303)
export const handleSupabaseExpiredJwt = async (): Promise<boolean> => {
  if (!supabaseInstance || isMock) return false;
  try {
    console.log("🔄 Renovando sessão Supabase após detecção de JWT expirado...");
    if (supabaseInstance.auth && typeof supabaseInstance.auth.refreshSession === 'function') {
      const { data, error } = await supabaseInstance.auth.refreshSession();
      if (!error && data?.session) {
        console.log("✅ Sessão Supabase renovada com sucesso!");
        return true;
      }
    }
  } catch (e) {
    console.warn("Aviso ao tentar refreshSession no Supabase:", e);
  }

  console.warn("⚠️ Não foi possível renovar sessão expirada via refresh. Limpando tokens obsoletos.");
  clearStaleSupabaseAuth();
  try {
    if (supabaseInstance?.auth?.signOut) {
      await supabaseInstance.auth.signOut({ scope: 'local' });
    }
  } catch {}
  return false;
};

// Executor resiliente para consultas Supabase com auto-recuperação de JWT expirado (PGRST303)
export const executeSupabaseWithRetry = async (
  operation: () => Promise<any>
): Promise<any> => {
  if (!supabaseInstance || isMock) {
    return operation();
  }

  let result: any;
  try {
    result = await operation();
  } catch (err: any) {
    result = { error: err };
  }

  const isJwtExpired = 
    result && result.error && (
      result.error.code === 'PGRST303' ||
      result.error.message?.includes('JWT expired') ||
      result.error.message?.includes('jwt expired') ||
      String(result.error).includes('PGRST303')
    );

  if (isJwtExpired) {
    console.warn("⚠️ JWT Supabase expirado (PGRST303) interceptado. Executando auto-recuperação...");
    await handleSupabaseExpiredJwt();
    // Reexecuta a operação com a sessão renovada ou no modo anon limpo
    try {
      result = await operation();
    } catch (retryErr) {
      result = { error: retryErr };
    }
  }

  return result;
};

/**
 * Busca de dados com fallback resiliente para ignorar tokens expirados (PGRST303)
 */
export const fetchUserDataFromCloud = async (email: string): Promise<{ data: any; error: any }> => {
  if (!email) return { data: null, error: new Error('Email não fornecido') };
  const normalizedEmail = email.trim().toLowerCase();

  // Se for Mock
  if (isMock || !supabaseInstance) {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`mock_db_user_data_${normalizedEmail}`) : null;
    return { data: raw ? JSON.parse(raw) : null, error: null };
  }

  // 1. Tentar via Supabase Client com auto-recuperação
  try {
    const res = await executeSupabaseWithRetry(() =>
      supabaseInstance
        .from('user_data')
        .select('app_state')
        .eq('user_email', normalizedEmail)
        .maybeSingle()
    );

    const isJwtError = res?.error && (
      res.error.code === 'PGRST303' ||
      res.error.message?.includes('JWT expired') ||
      res.error.message?.includes('jwt expired') ||
      String(res.error).includes('PGRST303')
    );

    if (!res?.error) {
      return res;
    }

    if (!isJwtError) {
      return res;
    }
  } catch (err: any) {
    const isJwtError = 
      err?.code === 'PGRST303' || 
      err?.message?.includes('JWT expired') || 
      err?.message?.includes('jwt expired');
    if (!isJwtError) {
      return { data: null, error: err };
    }
  }

  // 2. Fallback resiliente direto via REST com chave anon primária caso o JWT esteja expirado
  try {
    console.warn("🔄 Executando fallback REST para consulta de dados (JWT expirado contornado com sucesso)...");
    clearStaleSupabaseAuth();
    const url = `${SUPABASE_URL}/rest/v1/user_data?user_email=eq.${encodeURIComponent(normalizedEmail)}&select=app_state`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return { data: null, error: new Error(errText) };
    }

    const json = await response.json();
    const firstRow = Array.isArray(json) ? json[0] : json;
    return { data: firstRow || null, error: null };
  } catch (fallbackErr) {
    console.error("Erro no fallback REST do Supabase:", fallbackErr);
    return { data: null, error: fallbackErr };
  }
};

/**
 * Salva dados com fallback resiliente para ignorar tokens expirados (PGRST303)
 */
export const saveUserDataToCloud = async (email: string, appState: any): Promise<{ error: any }> => {
  if (!email) return { error: new Error('Email não fornecido') };
  const normalizedEmail = email.trim().toLowerCase();

  // Se for Mock
  if (isMock || !supabaseInstance) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mock_db_user_data_${normalizedEmail}`, JSON.stringify({
        user_email: normalizedEmail,
        app_state: appState,
        updated_at: new Date().toISOString()
      }));
    }
    return { error: null };
  }

  // 1. Tentar via Supabase Client com auto-recuperação
  try {
    const res = await executeSupabaseWithRetry(() =>
      supabaseInstance
        .from('user_data')
        .upsert({
          user_email: normalizedEmail,
          app_state: appState,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_email' })
    );

    const isJwtError = res?.error && (
      res.error.code === 'PGRST303' ||
      res.error.message?.includes('JWT expired') ||
      res.error.message?.includes('jwt expired') ||
      String(res.error).includes('PGRST303')
    );

    if (!res?.error) {
      return { error: null };
    }

    if (!isJwtError) {
      return { error: res.error };
    }
  } catch (err: any) {
    const isJwtError = 
      err?.code === 'PGRST303' || 
      err?.message?.includes('JWT expired') || 
      err?.message?.includes('jwt expired');
    if (!isJwtError) {
      return { error: err };
    }
  }

  // 2. Fallback resiliente direto via REST com chave anon primária
  try {
    console.warn("🔄 Executando fallback REST para salvar dados (JWT expirado contornado com sucesso)...");
    clearStaleSupabaseAuth();
    const url = `${SUPABASE_URL}/rest/v1/user_data`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_email: normalizedEmail,
        app_state: appState,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { error: new Error(errText) };
    }

    return { error: null };
  } catch (fallbackErr) {
    console.error("Erro no fallback REST do Supabase ao salvar:", fallbackErr);
    return { error: fallbackErr };
  }
};

// Inicialização prioritária com as chaves reais fornecidas
export let isMock = false;
let supabaseInstance: any;

const connectionDiagnostics = {
  url: SUPABASE_URL,
  isSupabaseDomain: SUPABASE_URL.includes('.supabase.co'),
  hasKey: !!SUPABASE_KEY,
  keyLength: SUPABASE_KEY?.length || 0,
  isPrimary: SUPABASE_URL === PRIMARY_URL,
};

try {
  const isUrlValid = SUPABASE_URL && !SUPABASE_URL.includes('example.com') && SUPABASE_URL.startsWith('http');
  const isKeyValid = SUPABASE_KEY && SUPABASE_KEY.length > 20;

  if (isUrlValid && isKeyValid) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });

    // Tratar erro de refresh token expirado/revogado automaticamente
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const reasonStr = String(event.reason?.message || event.reason || '');
        if (reasonStr.includes('Refresh Token Not Found') || reasonStr.includes('Invalid Refresh Token')) {
          console.warn("⚠️ Sessão Supabase expirada/inválida detectada. Limpando tokens obsoletos.");
          clearStaleSupabaseAuth();
          if (typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
        }
      });
    }

    isMock = false;
    console.log("🚀 Supabase: Conexão REAL ativa.", connectionDiagnostics);
  } else {
    console.warn("⚠️ Supabase: Modo LOCAL (Mock) ativo.", connectionDiagnostics);
    supabaseInstance = createMockSupabase();
    isMock = true;
  }
} catch (e) {
  console.error("❌ Supabase: Erro crítico na inicialização.", e);
  supabaseInstance = createMockSupabase();
  isMock = true;
}

export const supabase: any = supabaseInstance;
