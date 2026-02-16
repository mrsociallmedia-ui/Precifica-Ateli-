
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

// Busca pelas chaves padrão do Supabase ou as fornecidas no ambiente
const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('SUPABASE_PUBLISHABLE_KEY');
const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY');

// O cliente só é criado se houver uma URL válida começando com http
export const supabase = (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;
