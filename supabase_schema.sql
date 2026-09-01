-- =========================================================================
-- SCHEMA SUPABASE — SuperEstrategico
-- Execute este script no SQL Editor do seu projeto Supabase para
-- criar ou recriar as tabelas necessárias.
-- Idempotente: pode ser executado múltiplas vezes sem erros.
-- =========================================================================

-- =========================================================================
-- 1. user_data_sync — Dados de progresso de estudo por usuário
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_data_sync (
    user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    materias JSONB NOT NULL DEFAULT '[]'::jsonb,
    ciclo JSONB NOT NULL DEFAULT '{}'::jsonb,
    simulados JSONB NOT NULL DEFAULT '[]'::jsonb,
    revisoes JSONB NOT NULL DEFAULT '[]'::jsonb,
    historico JSONB NOT NULL DEFAULT '[]'::jsonb,
    planejamento_semanal JSONB,
    configuracoes JSONB
);

ALTER TABLE public.user_data_sync ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem (seguro de rodar mesmo se não existirem)
DROP POLICY IF EXISTS "Usuários podem visualizar apenas os seus próprios dados" ON public.user_data_sync;
DROP POLICY IF EXISTS "Usuários podem inserir apenas os seus próprios dados" ON public.user_data_sync;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas os seus próprios dados" ON public.user_data_sync;
DROP POLICY IF EXISTS "Usuários podem excluir apenas os seus próprios dados" ON public.user_data_sync;
DROP POLICY IF EXISTS "select_own_data" ON public.user_data_sync;
DROP POLICY IF EXISTS "insert_own_data" ON public.user_data_sync;
DROP POLICY IF EXISTS "update_own_data" ON public.user_data_sync;
DROP POLICY IF EXISTS "delete_own_data" ON public.user_data_sync;

CREATE POLICY "select_own_data" ON public.user_data_sync
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_data" ON public.user_data_sync
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_data" ON public.user_data_sync
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_data" ON public.user_data_sync
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_data_sync_timestamp ON public.user_data_sync;
CREATE TRIGGER update_user_data_sync_timestamp
    BEFORE UPDATE ON public.user_data_sync
    FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- =========================================================================
-- 2. historico_logs — Logs de sessão de estudo (tabela normalizada)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.historico_logs (
    id TEXT NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    materia_id TEXT NOT NULL,
    aula_id TEXT,
    duracao_minutos INTEGER NOT NULL DEFAULT 0,
    questoes_resolvidas INTEGER NOT NULL DEFAULT 0,
    questoes_acertadas INTEGER NOT NULL DEFAULT 0,
    questoes_erradas INTEGER NOT NULL DEFAULT 0,
    tipo TEXT NOT NULL,
    comentarios TEXT,
    data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar apenas os seus próprios logs" ON public.historico_logs;
DROP POLICY IF EXISTS "Usuários podem inserir apenas os seus próprios logs" ON public.historico_logs;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas os seus próprios logs" ON public.historico_logs;
DROP POLICY IF EXISTS "Usuários podem excluir apenas os seus próprios logs" ON public.historico_logs;
DROP POLICY IF EXISTS "select_own_logs" ON public.historico_logs;
DROP POLICY IF EXISTS "insert_own_logs" ON public.historico_logs;
DROP POLICY IF EXISTS "update_own_logs" ON public.historico_logs;
DROP POLICY IF EXISTS "delete_own_logs" ON public.historico_logs;

CREATE POLICY "select_own_logs" ON public.historico_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_logs" ON public.historico_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_logs" ON public.historico_logs
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_logs" ON public.historico_logs
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- 3. Funções helpers de admin (sem recursão)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_id AND is_super_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. profiles — Controle de assinatura e permissões
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    subscription_status TEXT NOT NULL DEFAULT 'ativo',
    last_login TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar os seus próprios perfis ou Super Admins visualizam tudo" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar os seus próprios perfis ou Super Admins atualizam tudo" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil básico ou Super Admins inserem tudo" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins podem excluir perfis" ON public.profiles;
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "delete_profile_admin" ON public.profiles;

CREATE POLICY "select_own_profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.check_is_super_admin(auth.uid()) = true);

CREATE POLICY "update_own_profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.check_is_super_admin(auth.uid()) = true);

CREATE POLICY "insert_own_profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id OR public.check_is_super_admin(auth.uid()) = true);

CREATE POLICY "delete_profile_admin" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.check_is_super_admin(auth.uid()) = true);

-- Trigger para criar perfil automaticamente no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_super_admin, subscription_status)
    VALUES (NEW.id, NEW.email, false, 'ativo')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- =========================================================================
-- 5. cms_settings — Configurações dinâmicas da Homepage
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.cms_settings (
    id TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.cms_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública do CMS da Homepage" ON public.cms_settings;
DROP POLICY IF EXISTS "Apenas Super Admins podem editar o CMS" ON public.cms_settings;
DROP POLICY IF EXISTS "public_read_cms" ON public.cms_settings;
DROP POLICY IF EXISTS "admin_write_cms" ON public.cms_settings;

-- Leitura pública (sem autenticação) para a homepage funcionar
CREATE POLICY "public_read_cms" ON public.cms_settings
    FOR SELECT TO anon, authenticated USING (true);

-- Escrita apenas para super admins autenticados
CREATE POLICY "admin_write_cms" ON public.cms_settings
    FOR ALL TO authenticated
    USING (public.check_is_super_admin(auth.uid()) = true)
    WITH CHECK (public.check_is_super_admin(auth.uid()) = true);

-- =========================================================================
-- 6. redacoes_corrigidas — Histórico de redações corrigidas com IA
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.redacoes_corrigidas (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    concurso TEXT,
    banca TEXT,
    tipo TEXT,
    tema TEXT,
    texto TEXT,
    nota_global TEXT,
    correcao_raw TEXT
);

ALTER TABLE public.redacoes_corrigidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_redacoes" ON public.redacoes_corrigidas;
DROP POLICY IF EXISTS "insert_own_redacoes" ON public.redacoes_corrigidas;
DROP POLICY IF EXISTS "delete_own_redacoes" ON public.redacoes_corrigidas;

CREATE POLICY "select_own_redacoes" ON public.redacoes_corrigidas
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_redacoes" ON public.redacoes_corrigidas
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_redacoes" ON public.redacoes_corrigidas
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- 7. Habilitar Realtime (execute apenas uma vez, comente se já foi feito)
-- =========================================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.user_data_sync;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.cms_settings;

-- =========================================================================
-- 8. edital_analisado — Backup e rascunho de edital extraído por usuário
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.edital_analisado (
    user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    edital_text TEXT,
    edital_json JSONB
);

ALTER TABLE public.edital_analisado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_edital_analisado" ON public.edital_analisado;
DROP POLICY IF EXISTS "insert_own_edital_analisado" ON public.edital_analisado;
DROP POLICY IF EXISTS "update_own_edital_analisado" ON public.edital_analisado;
DROP POLICY IF EXISTS "delete_own_edital_analisado" ON public.edital_analisado;

CREATE POLICY "select_own_edital_analisado" ON public.edital_analisado
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_edital_analisado" ON public.edital_analisado
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_edital_analisado" ON public.edital_analisado
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_edital_analisado" ON public.edital_analisado
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- VERIFICAÇÃO: Execute para confirmar que as tabelas existem
-- =========================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

