import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase: As variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY estão ausentes. A sincronização na nuvem estará desativada.'
  );
}

// Inicializa o cliente Supabase com valores reais ou fallbacks seguros para evitar travamento do bundle de produção
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * Cria um cliente Supabase com token de autorização Bearer explícito.
 * Garante que operações PostgREST usem auth.uid() do usuário sem race condition.
 */
export const getAuthenticatedClient = (accessToken: string) => {
  return createClient(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    }
  );
};
