
import { createClient } from '@supabase/supabase-js';

// Credenciais configuradas para o projeto scnjxuzapasdfgevegds
const SUPABASE_URL = 'https://scnjxuzapasdfgevegds.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AlGWoYoW7lJtePDIiWwb2w_fXwMFqkj';

// Mock do Supabase para fallback caso as chaves falhem ou para facilitar testes locais
const createMockSupabase = () => {
  const mockAuth = {
    signInWithPassword: async ({ email, password }: any) => {
      // No modo inteligente, qualquer login bem-sucedido localmente é permitido para teste
      return { data: { user: { email }, session: { access_token: 'mock_token' } }, error: null };
    },
    signUp: async ({ email, password }: any) => {
      // Cadastro automático local
      return { data: { user: { email }, session: { access_token: 'mock_token' } }, error: null };
    },
    resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
    verifyOtp: async ({ token }: any) => {
      return { data: {}, error: null };
    },
    updateUser: async ({ password, email }: any) => {
      return { data: {}, error: null };
    },
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null } })
  };

  const mockFrom = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          const data = localStorage.getItem(`mock_db_${table}`);
          return { data: data ? JSON.parse(data) : null, error: null };
        }
      })
    }),
    upsert: async (data: any) => {
      localStorage.setItem(`mock_db_${table}`, JSON.stringify(data));
      return { error: null };
    }
  });

  return { auth: mockAuth, from: mockFrom, isMock: true };
};

// Inicialização prioritária com as chaves reais fornecidas
let supabaseInstance: any;
try {
  if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('.supabase.co')) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    supabaseInstance = createMockSupabase();
  }
} catch (e) {
  supabaseInstance = createMockSupabase();
}

export const supabase = supabaseInstance;
