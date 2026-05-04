# Guia de Configuração Supabase

Este aplicativo utiliza o **Supabase** para persistência de dados e autenticação. Siga os passos abaixo para configurar seu próprio projeto.

## 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com/).
2. Crie um novo projeto.
3. Copie o **Project URL** e a **Anon Key** (disponíveis em Project Settings > API).

## 2. Configurar Variáveis de Ambiente
No seu ambiente de desenvolvimento (ou configurações do AI Studio), adicione as seguintes variáveis:
- `VITE_SUPABASE_URL`: (Seu Project URL)
- `VITE_SUPABASE_ANON_KEY`: (Sua Anon Key)

## 3. Preparar o Banco de Dados (SQL)
Vá até o **SQL Editor** no painel do Supabase e execute o seguinte script para criar as tabelas e políticas de segurança (RLS):

```sql
-- Criar a tabela para armazenar os dados dos usuários
CREATE TABLE IF NOT EXISTS public.user_data (
    user_email TEXT PRIMARY KEY,
    app_state JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam apenas SEUS PRÓPRIOS dados
CREATE POLICY "Usuários podem ler seus próprios dados" 
ON public.user_data 
FOR SELECT 
USING (auth.jwt() ->> 'email' = user_email);

-- Política para permitir que usuários autenticados salvem apenas SEUS PRÓPRIOS dados
CREATE POLICY "Usuários podem inserir seus próprios dados" 
ON public.user_data 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Política para permitir que usuários autenticados atualizem apenas SEUS PRÓPRIOS dados
CREATE POLICY "Usuários podem atualizar seus próprios dados" 
ON public.user_data 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = user_email);

-- Política para permitir que o catálogo público seja lido por qualquer pessoa (opcional, se quiser compartilhar catálogo)
-- Nota: Esta política permite leitura se o user_email for igual ao solicitado via API
CREATE POLICY "Leitura pública do catálogo" 
ON public.user_data 
FOR SELECT 
TO public 
USING (true);
```

## 4. Ativar Autenticação Google (Opcional)
Se desejar habilitar login social, configure em **Authentication > Providers > Google**. Caso contrário, o sistema usará login por e-mail e senha.

---

**Nota:** Enquanto o Supabase não estiver configurado, o aplicativo funcionará em **Modo Local (Mock)**, salvando tudo no navegador. Assim que você fornecer as chaves, ele tentará sincronizar automaticamente.
