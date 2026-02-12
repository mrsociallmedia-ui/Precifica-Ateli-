
import { createClient } from '@supabase/supabase-js';

// Função ultra-resiliente para buscar variáveis de ambiente em qualquer contexto (Vite, Node, Browser, MCP)
const getEnv = (name: string): string => {
  const v = (import.meta as any).env?.[`VITE_${name}`] || 
            (import.meta as any).env?.[name] || 
            (window as any).process?.env?.[name] || 
            (window as any).process?.env?.[`VITE_${name}`] ||
            (typeof process !== 'undefined' ? process.env[name] : '') ||
            '';
  return typeof v === 'string' ? v.trim() : '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY');

// Só inicializa se tivermos valores válidos e que pareçam URLs para evitar erros fatais do SDK
export const supabase = (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

if (!supabase) {
  console.info("Supabase: Modo offline/local ativo por falta de credenciais válidas.");
}
