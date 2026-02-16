-- SCRIPT DE SEGURANÇA AVANÇADO
-- Este script protege os dados dos artesãos contra acessos não autorizados.

-- 1. Tabela principal
CREATE TABLE IF NOT EXISTS public.user_data (
    user_email TEXT PRIMARY KEY,
    app_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilita RLS
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas antigas para evitar conflitos (limpeza)
DROP POLICY IF EXISTS "user_data_select_policy" ON public.user_data;
DROP POLICY IF EXISTS "user_data_all_policy" ON public.user_data;

-- 4. Política de Leitura (SELECT)
-- Garante que o usuário só veja os dados se o e-mail do token JWT for igual ao e-mail da linha.
CREATE POLICY "user_data_select_policy" ON public.user_data 
FOR SELECT 
USING (lower(auth.jwt() ->> 'email') = lower(user_email));

-- 5. Política de Gerenciamento (INSERT/UPDATE/DELETE)
-- Garante que o usuário só possa modificar dados vinculados ao seu próprio e-mail.
-- O lower() previne vulnerabilidades de case-sensitivity.
CREATE POLICY "user_data_all_policy" ON public.user_data 
FOR ALL 
USING (lower(auth.jwt() ->> 'email') = lower(user_email))
WITH CHECK (lower(auth.jwt() ->> 'email') = lower(user_email));

-- 6. Índice para performance
CREATE INDEX IF NOT EXISTS idx_user_data_email_lower ON public.user_data (lower(user_email));

-- NOTA: O Supabase gerencia a criptografia em repouso e a segurança da conexão (SSL).
