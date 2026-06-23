import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RedacaoCorrigida } from '../types';

const LOCAL_STORAGE_KEY = 'superestrategico_redacoes_historico';
const MAX_LOCAL_ITEMS = 50;

// Carrega a lista do localStorage
function obterDoLocalStorage(): RedacaoCorrigida[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler redações do localStorage:', e);
    return [];
  }
}

// Salva a lista no localStorage
function salvarNoLocalStorage(redacoes: RedacaoCorrigida[]) {
  try {
    // Mantém no máximo 50 redações no cache local
    const limite = redacoes.slice(0, MAX_LOCAL_ITEMS);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limite));
  } catch (e) {
    console.error('Erro ao salvar redações no localStorage:', e);
  }
}

/**
 * Obtém todo o histórico de redações, mesclando localStorage e Supabase (se logado)
 */
export async function obterHistoricoRedacoes(): Promise<RedacaoCorrigida[]> {
  const localItems = obterDoLocalStorage();

  if (!isSupabaseConfigured) {
    return localItems;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return localItems; // Usuário offline ou não logado, retorna histórico local
    }

    // Busca redações do Supabase
    const { data: dbItems, error } = await supabase
      .from('redacoes_corrigidas')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro ao buscar redações do Supabase:', error);
      return localItems;
    }

    const remoteItems: RedacaoCorrigida[] = (dbItems || []).map((db) => ({
      id: db.id,
      dataCriacao: db.created_at || new Date().toISOString(),
      concurso: db.concurso || '',
      banca: db.banca || '',
      tipo: db.tipo || '',
      tema: db.tema || '',
      texto: db.texto || '',
      notaGlobal: db.nota_global || '',
      correcaoRaw: db.correcao_raw || ''
    }));

    // Mesclagem inteligente
    const mapaRedacoes = new Map<string, RedacaoCorrigida>();
    localItems.forEach((item) => mapaRedacoes.set(item.id, item));
    remoteItems.forEach((item) => mapaRedacoes.set(item.id, item));

    const resultadoMesclado = Array.from(mapaRedacoes.values()).sort(
      (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
    );

    // Salva cópia mesclada atualizada no localStorage
    salvarNoLocalStorage(resultadoMesclado);

    // Sincroniza itens locais novos (que não estão na nuvem) para o Supabase
    const remoteIds = new Set(remoteItems.map((r) => r.id));
    const itensNaoSincronizados = localItems.filter((l) => !remoteIds.has(l.id));

    if (itensNaoSincronizados.length > 0) {
      const inserts = itensNaoSincronizados.map((item) => ({
        id: item.id,
        user_id: user.id,
        created_at: item.dataCriacao,
        concurso: item.concurso,
        banca: item.banca,
        tipo: item.tipo,
        tema: item.tema,
        texto: item.texto,
        nota_global: item.notaGlobal,
        correcao_raw: item.correcaoRaw
      }));

      const { error: insertError } = await supabase
        .from('redacoes_corrigidas')
        .insert(inserts);

      if (insertError) {
        console.error('Erro ao sincronizar redações locais com a nuvem:', insertError);
      }
    }

    return resultadoMesclado;
  } catch (err) {
    console.error('Erro geral ao sincronizar histórico de redações:', err);
    return localItems;
  }
}

/**
 * Adiciona uma redação ao histórico local e na nuvem
 */
export async function adicionarRedacaoAoHistorico(
  redacao: Omit<RedacaoCorrigida, 'dataCriacao'>
): Promise<RedacaoCorrigida> {
  const novaRedacao: RedacaoCorrigida = {
    ...redacao,
    dataCriacao: new Date().toISOString()
  };

  // Salva no localStorage local
  const localItems = obterDoLocalStorage();
  const novoHistorico = [novaRedacao, ...localItems.filter(item => item.id !== novaRedacao.id)];
  salvarNoLocalStorage(novoHistorico);

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        // Envia para o Supabase
        const { error } = await supabase
          .from('redacoes_corrigidas')
          .insert({
            id: novaRedacao.id,
            user_id: user.id,
            created_at: novaRedacao.dataCriacao,
            concurso: novaRedacao.concurso,
            banca: novaRedacao.banca,
            tipo: novaRedacao.tipo,
            tema: novaRedacao.tema,
            texto: novaRedacao.texto,
            nota_global: novaRedacao.notaGlobal,
            correcao_raw: novaRedacao.correcaoRaw
          });

        if (error) {
          console.error('Erro ao salvar redação no Supabase:', error);
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao salvar redação na nuvem:', err);
    }
  }

  return novaRedacao;
}

/**
 * Remove uma redação do histórico local e da nuvem
 */
export async function removerRedacaoDoHistorico(id: string): Promise<void> {
  // Remove do localStorage local
  const localItems = obterDoLocalStorage();
  const novoHistorico = localItems.filter((item) => item.id !== id);
  salvarNoLocalStorage(novoHistorico);

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        const { error } = await supabase
          .from('redacoes_corrigidas')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao deletar redação do Supabase:', error);
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao deletar redação na nuvem:', err);
    }
  }
}
