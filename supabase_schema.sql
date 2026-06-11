-- =========================================================================
-- SCHEMA DE CRIAÇÃO DO BANCO DE DADOS SUPABASE PARA TCU AUDITOR PLANNER
-- Cole este script no SQL Editor do seu projeto Supabase para configurar as tabelas
-- =========================================================================

-- 1. Criação da tabela de sincronização de progresso
CREATE TABLE IF NOT EXISTS public.user_data_sync (
    user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    materias JSONB NOT NULL,
    ciclo JSONB NOT NULL,
    simulados JSONB NOT NULL,
    revisoes JSONB NOT NULL,
    historico JSONB NOT NULL,
    planejamento_semanal JSONB
);

-- 2. Habilita o Row Level Security (RLS) para proteção de dados
ALTER TABLE public.user_data_sync ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de segurança (RLS Policies) para isolamento por usuário
CREATE POLICY "Usuários podem visualizar apenas os seus próprios dados"
    ON public.user_data_sync
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir apenas os seus próprios dados"
    ON public.user_data_sync
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas os seus próprios dados"
    ON public.user_data_sync
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir apenas os seus próprios dados"
    ON public.user_data_sync
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Função e trigger para atualização automática da coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_user_data_sync_timestamp
    BEFORE UPDATE ON public.user_data_sync
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_update_timestamp();

-- 5. Habilitar publicação por Realtime se desejado (opcional para multi-device sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_data_sync;
