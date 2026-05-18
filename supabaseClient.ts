
import { createClient } from '@supabase/supabase-js';

// Normalização da URL (caso o usuário cole o endpoint REST completo ou com barras extras)
const normalizeUrl = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  // Remove sufixo REST comum e barras finais
  cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  
  if (cleanUrl && !cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  return cleanUrl;
};

const getRuntimeConfig = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  return {
    url: localStorage.getItem('custom_supabase_url') || '',
    key: localStorage.getItem('custom_supabase_key') || ''
  };
};

const runtimeConfig = getRuntimeConfig();

const SUPABASE_URL = normalizeUrl(
  runtimeConfig.url || 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://scnjxuzapasdfgevegds.supabase.co'
);
const SUPABASE_KEY = (
  runtimeConfig.key ||
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbmp4dXphcGFzZGZnZXZlZ2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDMzMzQsImV4cCI6MjA4NjQ3OTMzNH0.syp0Raq5x9q3zz8zNkhsKvcui62lNqEWZ95uKPsXwow'
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
    getSession: async () => ({ data: { session: null } })
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

  return { auth: mockAuth, from: mockFrom, isMock: true };
};

// Inicialização prioritária com as chaves reais fornecidas
export let isMock = false;
let supabaseInstance: any;

console.log("Detectando configurações do Supabase...");
console.log("URL configurada:", SUPABASE_URL ? "Sim" : "Não");
console.log("Chave configurada:", SUPABASE_KEY ? "Sim" : "Não");
if (SUPABASE_KEY && !SUPABASE_KEY.startsWith('ey') && !SUPABASE_KEY.startsWith('sb_')) {
  console.warn("AVISO: A chave ANON_KEY do Supabase parece inválida.");
}

try {
  // Se houver uma URL válida e uma chave, tentamos o cliente real
  if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('.supabase.co')) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
    isMock = false;
    console.log("Supabase Client: Usando conexão real com a nuvem.");
  } else {
    console.warn("Supabase Client: Usando modo local (Mock) por falta de chaves válidas.");
    supabaseInstance = createMockSupabase();
    isMock = true;
  }
} catch (e) {
  console.error("Erro crítico ao inicializar Supabase Client:", e);
  supabaseInstance = createMockSupabase();
  isMock = true;
}

export const supabase = supabaseInstance;
