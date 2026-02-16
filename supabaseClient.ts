
import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string): string => {
  const v = (import.meta as any).env?.[`VITE_${name}`] || 
            (import.meta as any).env?.[name] || 
            (window as any).process?.env?.[name] || 
            (window as any).process?.env?.[`VITE_${name}`] ||
            (window as any).process?.env?.[`NEXT_PUBLIC_${name}`] ||
            '';
  return typeof v === 'string' ? v.trim() : '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('SUPABASE_PUBLISHABLE_KEY');
const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY');

// Mock do Supabase para quando as chaves não estão presentes
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
    resetPasswordForEmail: async (email: string) => {
      return { data: {}, error: null }; // Simula envio de e-mail
    },
    verifyOtp: async ({ token }: any) => {
      // No mock, qualquer código de 6 dígitos funciona
      if (token.length === 6) return { data: {}, error: null };
      return { error: { message: 'Código inválido.' } };
    },
    updateUser: async ({ password }: any) => {
      return { data: {}, error: null };
    },
    signOut: async () => ({ error: null }),
    onAuthStateChange: (cb: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
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

  return {
    auth: mockAuth,
    from: mockFrom,
    isMock: true
  };
};

export const supabase: any = (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : createMockSupabase();
