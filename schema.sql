
-- Execute este script no SQL Editor do seu projeto Supabase

-- Tabela para armazenar o estado consolidado de cada usuário
CREATE TABLE IF NOT EXISTS user_data (
  user_email TEXT PRIMARY KEY,
  app_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários acessem apenas seus próprios dados
-- (Necessário que o usuário esteja autenticado e o email coincida)
CREATE POLICY "Usuários podem ver seus próprios dados" 
ON user_data FOR SELECT 
USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Usuários podem atualizar seus próprios dados" 
ON user_data FOR ALL 
USING (auth.jwt() ->> 'email' = user_email)
WITH CHECK (auth.jwt() ->> 'email' = user_email);
