import { supabase, isSupabaseConfigured, getAuthenticatedClient } from '../lib/supabase';
import { RedacaoCorrigida } from '../types';

const LOCAL_STORAGE_KEY = 'superestrategico_redacoes_historico';
const MAX_LOCAL_ITEMS = 30;

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
    const limite = redacoes.slice(0, MAX_LOCAL_ITEMS);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limite));
  } catch (e) {
    console.error('Erro ao salvar redações no localStorage:', e);
  }
}

const PENDING_QUEUE_KEY = 'superestrategico_redacoes_pendentes_sync';

// Carrega a fila de redações pendentes de envio à nuvem
export function obterRedacoesPendentes(): RedacaoCorrigida[] {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler fila de redações pendentes:', e);
    return [];
  }
}

// Salva a fila de redações pendentes
export function salvarRedacoesPendentes(pendentes: RedacaoCorrigida[]) {
  try {
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(pendentes));
  } catch (e) {
    console.error('Erro ao salvar fila de redações pendentes:', e);
  }
}

// Adiciona uma redação à fila de pendentes
export function enfileirarRedacaoPendente(redacao: RedacaoCorrigida) {
  const fila = obterRedacoesPendentes();
  if (!fila.some(r => r.id === redacao.id)) {
    salvarRedacoesPendentes([...fila, redacao]);
  }
}

// Remove redações sincronizadas da fila de pendentes
export function desinfileirarRedacoesPendentes(ids: string[]) {
  const idsSet = new Set(ids);
  const fila = obterRedacoesPendentes().filter(r => !idsSet.has(r.id));
  salvarRedacoesPendentes(fila);
}

// Helper para obter e validar sessão com renovação proativa
async function obterSessaoValida(): Promise<{ user: any; token: string; client: any } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    let { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session) return null;

    // Se estiver a menos de 60s da expiração, renova
    if (session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshed?.session) {
        session = refreshed.session;
      }
    }

    if (!session?.access_token || !session.user?.id) return null;

    const client = getAuthenticatedClient(session.access_token);
    return { user: session.user, token: session.access_token, client };
  } catch (e) {
    console.warn('Aviso ao obter sessão válida em redacaoService:', e);
    return null;
  }
}

/**
 * Envia redações pendentes da fila para o Supabase
 */
export async function sincronizarRedacoesPendentes(): Promise<number> {
  const pendentes = obterRedacoesPendentes();
  if (pendentes.length === 0) return 0;

  const auth = await obterSessaoValida();
  if (!auth) return 0;

  const payload = pendentes.map(item => ({
    id: item.id,
    user_id: auth.user.id,
    created_at: item.dataCriacao,
    concurso: item.concurso,
    banca: item.banca,
    tipo: item.tipo,
    tema: item.tema,
    texto: item.texto,
    nota_global: item.notaGlobal,
    correcao_raw: item.correcaoRaw
  }));

  try {
    let { error } = await auth.client
      .from('redacoes_corrigidas')
      .upsert(payload, { onConflict: 'id' });

    if (error && (error.code === '42501' || error.status === 401 || error.status === 403)) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshed?.session?.access_token) {
        const retryClient = getAuthenticatedClient(refreshed.session.access_token);
        const retry = await retryClient
          .from('redacoes_corrigidas')
          .upsert(payload.map(p => ({ ...p, user_id: refreshed.session.user.id })), { onConflict: 'id' });
        error = retry.error;
      }
    }

    if (!error) {
      desinfileirarRedacoesPendentes(pendentes.map(p => p.id));
      return pendentes.length;
    } else {
      console.warn('Aviso ao descarregar fila de redações pendentes:', error);
      return 0;
    }
  } catch (e) {
    console.warn('Erro de rede ao sincronizar redações pendentes:', e);
    return 0;
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
    // Sincroniza qualquer pendência acumulada offline primeiro
    await sincronizarRedacoesPendentes();

    const auth = await obterSessaoValida();
    if (!auth) {
      return localItems; // Usuário offline ou não logado, retorna histórico local
    }

    // Busca redações do Supabase
    let { data: dbItems, error } = await auth.client
      .from('redacoes_corrigidas')
      .select('*')
      .eq('user_id', auth.user.id);

    if (error && (error.code === '42501' || error.status === 401 || error.status === 403)) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshed?.session?.access_token) {
        const retryClient = getAuthenticatedClient(refreshed.session.access_token);
        const retry = await retryClient
          .from('redacoes_corrigidas')
          .select('*')
          .eq('user_id', refreshed.session.user.id);
        dbItems = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.error('Erro ao buscar redações do Supabase:', error);
      return localItems;
    }

    const remoteItems: RedacaoCorrigida[] = (dbItems || []).map((db: any) => ({
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
        user_id: auth.user.id,
        created_at: item.dataCriacao,
        concurso: item.concurso,
        banca: item.banca,
        tipo: item.tipo,
        tema: item.tema,
        texto: item.texto,
        nota_global: item.notaGlobal,
        correcao_raw: item.correcaoRaw
      }));

      const { error: insertError } = await auth.client
        .from('redacoes_corrigidas')
        .upsert(inserts, { onConflict: 'id' });

      if (insertError) {
        console.error('Erro ao sincronizar redações locais com a nuvem:', insertError);
        itensNaoSincronizados.forEach(enfileirarRedacaoPendente);
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

  // Salva no localStorage local imediatamente
  const localItems = obterDoLocalStorage();
  const novoHistorico = [novaRedacao, ...localItems.filter(item => item.id !== novaRedacao.id)];
  salvarNoLocalStorage(novoHistorico);

  if (isSupabaseConfigured) {
    try {
      let auth = await obterSessaoValida();

      if (auth) {
        const payload = {
          id: novaRedacao.id,
          user_id: auth.user.id,
          created_at: novaRedacao.dataCriacao,
          concurso: novaRedacao.concurso,
          banca: novaRedacao.banca,
          tipo: novaRedacao.tipo,
          tema: novaRedacao.tema,
          texto: novaRedacao.texto,
          nota_global: novaRedacao.notaGlobal,
          correcao_raw: novaRedacao.correcaoRaw
        };

        // Envia para o Supabase via upsert para ser idempotente
        let { error } = await auth.client
          .from('redacoes_corrigidas')
          .upsert(payload, { onConflict: 'id' });

        // Se falhou por sessão expirada/RLS, tenta refrescar e retentar
        if (error && (error.code === '42501' || error.status === 401 || error.status === 403)) {
          console.warn('Erro de RLS/Auth ao salvar redação, renovando sessão...');
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshed?.session?.access_token && refreshed?.session?.user?.id) {
            const retryClient = getAuthenticatedClient(refreshed.session.access_token);
            const retry = await retryClient
              .from('redacoes_corrigidas')
              .upsert({ ...payload, user_id: refreshed.session.user.id }, { onConflict: 'id' });
            error = retry.error;
          }
        }

        if (error) {
          console.warn('Erro ao salvar redação no Supabase, adicionando à fila pendente:', error);
          enfileirarRedacaoPendente(novaRedacao);
        } else {
          // Desinfileira caso estivesse na fila pendente
          desinfileirarRedacoesPendentes([novaRedacao.id]);
        }
      } else {
        // Sem sessão autenticada ativa no momento, salva na fila pendente
        enfileirarRedacaoPendente(novaRedacao);
      }
    } catch (err) {
      console.warn('Erro de conexão ao salvar redação na nuvem, adicionando à fila pendente:', err);
      enfileirarRedacaoPendente(novaRedacao);
    }
  }

  return novaRedacao;
}

/**
 * Remove uma redação do histórico local e da nuvem
 */
export async function removerRedacaoDoHistorico(id: string): Promise<void> {
  // Remove do localStorage local e de pendentes
  const localItems = obterDoLocalStorage();
  const novoHistorico = localItems.filter((item) => item.id !== id);
  salvarNoLocalStorage(novoHistorico);
  desinfileirarRedacoesPendentes([id]);

  if (isSupabaseConfigured) {
    try {
      let auth = await obterSessaoValida();

      if (auth) {
        let { error } = await auth.client
          .from('redacoes_corrigidas')
          .delete()
          .eq('id', id)
          .eq('user_id', auth.user.id);

        if (error && (error.code === '42501' || error.status === 401 || error.status === 403)) {
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshed?.session?.access_token) {
            const retryClient = getAuthenticatedClient(refreshed.session.access_token);
            await retryClient
              .from('redacoes_corrigidas')
              .delete()
              .eq('id', id)
              .eq('user_id', refreshed.session.user.id);
          }
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao deletar redação na nuvem:', err);
    }
  }
}

