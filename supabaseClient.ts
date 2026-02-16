
import { createClient } from '@supabase/supabase-js';

// Credenciais configuradas para o projeto scnjxuzapasdfgevegds
const SUPABASE_URL = 'https://scnjxuzapasdfgevegds.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AlGWoYoW7lJtePDIiWwb2w_fXwMFqkj';

// Mock do Supabase para fallback caso as chaves falhem
const createMockSupabase = () => {
  const mockAuth = {
    signInWithPassword: async ({ email, password }: any) => {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const user = users.find((u: any) => u.email === email && u.password === password);
      if (user) return { data: { user: { email } }, error: null };
      return { data: { user: null }, error: { message: 'E-mail ou senha incorretos (Modo Local).' } };
    },
    signUp: async ({ email, password }: any) => {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      if (users.find((u: any) => u.email === email)) return { data: { user: null }, error: { message: 'Usuário já existe.' } };
      users.push({ email, password });
      localStorage.setItem('mock_users', JSON.stringify(users));
      return { data: { user: { email } }, error: null };
    },
    resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
    verifyOtp: async ({ token }: any) => {
      if (token.length === 6) return { data: {}, error: null };
      return { error: { message: 'Código inválido.' } };
    },
    updateUser: async ({ _password }: any) => ({ data: {}, error: null }),
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
export const supabase: any = (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('.supabase.co'))
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : createMockSupabase();
