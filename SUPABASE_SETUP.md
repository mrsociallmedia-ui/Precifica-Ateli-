# Guia de Configuração Supabase

Este aplicativo utiliza o **Supabase** para persistência de dados e autenticação. Siga os passos abaixo para configurar seu próprio projeto.

## 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com/).
2. Crie um novo projeto.
3. Copie o **Project URL** e a **Anon Key** (disponíveis em Project Settings > API).

## 2. Configurar Variáveis de Ambiente
No AI Studio, vá em **Settings** e adicione as seguintes variáveis (Segredos):
- `VITE_SUPABASE_URL`: `https://scnjxuzapasdfgevegds.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `sb_publishable_AlGWoYoW7lJtePDIiWwb2w_fXwMFqkj`

## 3. Preparar o Banco de Dados (SQL)
1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (parece um code `>_`).
2. Clique no botão **+ New Query** ou **New Snippet** (no topo da lista de queries).
3. Cole o script abaixo no editor que abrir e clique em **Run** (ou aperte `Cmd + Enter`).

-- 1. Criar a tabela para armazenar os dados dos usuários
CREATE TABLE IF NOT EXISTS public.user_data (
    user_email TEXT PRIMARY KEY,
    app_state JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ativar Row Level Security (RLS)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas antigas (evita erro 42710)
DROP POLICY IF EXISTS "user_data_select_policy" ON public.user_data;
DROP POLICY IF EXISTS "user_data_all_policy" ON public.user_data;
DROP POLICY IF EXISTS "user_data_public_select" ON public.user_data;

-- 4. Política para leitura (próprio usuário autenticado)
CREATE POLICY "user_data_select_policy" ON public.user_data 
FOR SELECT 
TO authenticated
USING (lower(auth.jwt() ->> 'email') = lower(user_email));

-- 5. Política para todas as operações (próprio usuário autenticado)
CREATE POLICY "user_data_all_policy" ON public.user_data 
FOR ALL 
TO authenticated
USING (lower(auth.jwt() ->> 'email') = lower(user_email))
WITH CHECK (lower(auth.jwt() ->> 'email') = lower(user_email));

-- 6. Política para leitura pública (Necessária para Catálogo e Acompanhamento de Pedidos)
-- NOTA: Permite que QUALQUER UM veja o estado da conta se souber o e-mail. 
-- Em produção, o ideal seria uma tabela separada para dados públicos.
CREATE POLICY "user_data_public_select" ON public.user_data
FOR SELECT
TO anon
USING (true);

-- 7. Índice para performance
CREATE INDEX IF NOT EXISTS idx_user_data_email_lower ON public.user_data (lower(user_email));

## 4. Ativar Autenticação Google (Opcional)
Se desejar habilitar login social, configure em **Authentication > Providers > Google**. Caso contrário, o sistema usará login por e-mail e senha.

---

**Nota:** Enquanto o Supabase não estiver configurado, o aplicativo funcionará em **Modo Local (Mock)**, salvando tudo no navegador. Assim que você fornecer as chaves, ele tentará sincronizar automaticamente.
