import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Salva o edital analisado no Supabase (se o usuário estiver logado)
 */
export async function salvarEditalAnalisado(text: string, json: any): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) return; // Não logado, mantém apenas local

    const { error } = await supabase
      .from('edital_analisado')
      .upsert({
        user_id: user.id,
        edital_text: text,
        edital_json: json,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Erro ao salvar edital no Supabase:', error);
    }
  } catch (err) {
    console.error('Erro de conexão ao salvar edital na nuvem:', err);
  }
}

/**
 * Obtém o edital analisado do Supabase para o usuário logado
 */
export async function obterEditalAnalisado(): Promise<{ editalText: string; editalJson: any } | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) return null;

    const { data, error } = await supabase
      .from('edital_analisado')
      .select('edital_text, edital_json')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar edital no Supabase:', error);
      return null;
    }

    if (data) {
      return {
        editalText: data.edital_text || '',
        editalJson: data.edital_json || null
      };
    }

    return null;
  } catch (err) {
    console.error('Erro de conexão ao buscar edital na nuvem:', err);
    return null;
  }
}

/**
 * Remove o edital analisado do Supabase
 */
export async function removerEditalAnalisado(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) return;

    const { error } = await supabase
      .from('edital_analisado')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro ao deletar edital do Supabase:', error);
    }
  } catch (err) {
    console.error('Erro de conexão ao deletar edital na nuvem:', err);
  }
}
