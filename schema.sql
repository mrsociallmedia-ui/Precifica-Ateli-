-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS
-- Cole este código no SQL Editor do Supabase e clique em 'RUN'

CREATE TABLE IF NOT EXISTS public.user_data (
    user_email TEXT PRIMARY KEY,
    app_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_data_select_policy') THEN
        CREATE POLICY "user_data_select_policy" ON public.user_data FOR SELECT 
        USING (auth.jwt() ->> 'email' = user_email);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_data_all_policy') THEN
        CREATE POLICY "user_data_all_policy" ON public.user_data FOR ALL 
        USING (auth.jwt() ->> 'email' = user_email)
        WITH CHECK (auth.jwt() ->> 'email' = user_email);
    END IF;
END $$;