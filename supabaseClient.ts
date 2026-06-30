
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
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
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
