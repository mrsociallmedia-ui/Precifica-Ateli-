
import { createClient } from '@supabase/supabase-js';

// Credenciais do Supabase - Usando variáveis de ambiente para segurança
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
let supabaseInstance: any;
try {
  // Supabase anon keys are JWTs and always start with 'eyJ'
  if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('.supabase.co') && SUPABASE_KEY.startsWith('eyJ')) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    if (SUPABASE_URL || SUPABASE_KEY) {
      console.warn("Credenciais do Supabase inválidas ou incompletas. Usando modo local (Mock).");
    }
    supabaseInstance = createMockSupabase();
  }
} catch (e) {
  console.error("Erro ao inicializar Supabase Client:", e);
  supabaseInstance = createMockSupabase();
}

export const supabase = supabaseInstance;
