import React, { useState, useEffect, useRef } from 'react';
import { carregarDadosIniciais, salvarMaterias, salvarCiclo, salvarSimulados, salvarRevisoes, salvarHistorico, MATERIAS_PADRAO, CICLO_PADRAO, ajustarEMesclarMaterias, ajustarEMesclarCiclo } from './data';
import { Materia, CicloEstudo, Simulado, RevisaoEspacada, LogSessao, StatusAula, Aula, LogSessaoBatchItem } from './types';
import DashboardStats from './components/DashboardStats';
import CicloEstudoSeccao from './components/CicloEstudoSeccao';
import PlanejamentoSemanal from './components/PlanejamentoSemanal';
import CursosEstrategia from './components/CursosEstrategia';
import RevisoesEspacadas from './components/RevisoesEspacadas';
import SimuladosBanca from './components/SimuladosBanca';
import IADiagnostico from './components/IADiagnostico';
import DadosEBackup from './components/DadosEBackup';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BookOpen, Clock, Calendar, Award, LogOut, CheckCircle, Flame, User, ListCollapse, ShieldAlert, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured, getAuthenticatedClient } from './lib/supabase';
import SupabaseAuthModal from './components/SupabaseAuthModal';
import Homepage, { DEFAULT_CMS_CONTENT } from './components/Homepage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import CorrecaoRedacao from './components/CorrecaoRedacao';
import AnalisadorEditalTab from './components/AnalisadorEditalTab';
import { sincronizarRedacoesPendentes } from './utils/redacaoService';

export default function App() {
  // Estados Globais da Aplicação (inicializados diretamente do localStorage / padrões para evitar estados vazios no mount)
  const [materias, setMaterias] = useState<Materia[]>(() => carregarDadosIniciais().materias);
  const [ciclo, setCiclo] = useState<CicloEstudo | null>(() => carregarDadosIniciais().ciclo);
  const [simulados, setSimulados] = useState<Simulado[]>(() => carregarDadosIniciais().simulados);
  const [revisoes, setRevisoes] = useState<RevisaoEspacada[]>(() => carregarDadosIniciais().revisoes);
  const [historico, setHistorico] = useState<LogSessao[]>(() => carregarDadosIniciais().historico);
  const [materiaEditalAtivaId, setMateriaEditalAtivaId] = useState<string | undefined>(undefined);

  // Refs sincronizadas para evitar problemas de stale closure em callbacks assíncronos de sync
  const materiasRef = useRef(materias);
  materiasRef.current = materias;
  const cicloRef = useRef(ciclo);
  cicloRef.current = ciclo;
  const simuladosRef = useRef(simulados);
  simuladosRef.current = simulados;
  const revisoesRef = useRef(revisoes);
  revisoesRef.current = revisoes;
  const historicoRef = useRef(historico);
  historicoRef.current = historico;

  // Estados do Supabase Cloud Sync
  const [userSession, setUserSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncCloudTime, setLastSyncCloudTime] = useState<string>(() => {
    return localStorage.getItem('superestrategico_last_sync_cloud_time') || '';
  });

  useEffect(() => {
    const handleCloudTimeUpdate = () => {
      const stored = localStorage.getItem('superestrategico_last_sync_cloud_time') || '';
      setLastSyncCloudTime(stored);
    };
    window.addEventListener('superestrategico_last_sync_cloud_time_updated', handleCloudTimeUpdate);
    return () => window.removeEventListener('superestrategico_last_sync_cloud_time_updated', handleCloudTimeUpdate);
  }, []);
  
  const syncedLogIds = useRef<Set<string>>(new Set());
  // Flag booleana para evitar ciclo de auto-sync durante download/sincronização de dados da nuvem
  const isSyncingFromCloud = useRef(false);
  // Estado de erro de sync visível ao usuário
  const [syncError, setSyncError] = useState<{ friendly: string; technical: string } | null>(null);
  // Estado de sucesso de sync visível ao usuário
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);
  const syncSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthOrRlsError = (err: any): boolean => {
    if (!err) return false;
    const code = String(err.code || err.status || '');
    const msg = String(err.message || err.error_description || err.details || (typeof err === 'string' ? err : ''));
    return (
      code === '42501' ||
      code === 'PGRST301' ||
      code === '401' ||
      code === '403' ||
      err.status === 401 ||
      err.status === 403 ||
      err.statusCode === 401 ||
      err.statusCode === 403 ||
      msg.includes('42501') ||
      msg.toUpperCase().includes('PGRST301') ||
      msg.toLowerCase().includes('row-level security') ||
      msg.toLowerCase().includes('violates row-level security policy')
    );
  };

  const getFriendlySyncErrorMessage = (err: any): { friendly: string; technical: string } => {
    const rawMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err)) || '';
    const errCode = String(err?.code || err?.status || '');
    
    // Suprimir código 42501 e mensagens técnicas intimidantes de RLS/Auth para o usuário
    if (isAuthOrRlsError(err) || rawMsg.includes('42501') || rawMsg.toLowerCase().includes('row-level security')) {
      return {
        friendly: "Sua sessão expirou ou não está autenticada. Faça login novamente para sincronizar com a nuvem.",
        technical: "Sessão de usuário expirada ou não autenticada no servidor."
      };
    }

    // Sanitização defensiva contra vazamento acidental de RLS ou 42501
    const sanitizedErrMsg = rawMsg
      .replace(/new row violates row-level security policy[^\n]*/gi, 'Acesso não autorizado na nuvem')
      .replace(/\[?42501\]?:?\s*/g, '');

    const technical = `${errCode && errCode !== '42501' ? `[${errCode}]: ` : ''}${sanitizedErrMsg}`;
    let friendly = "Ocorreu um erro ao sincronizar suas alterações com a nuvem.";
    
    if (errCode === 'PGRST204' || errCode === 'PGRST116') {
      friendly = "Configuração incompleta no banco de dados. Contate o suporte técnico.";
    } else if (errCode === '23502') {
      friendly = "Seu progresso ou ciclo possui campos incompletos. Tente redefinir seus dados de estudos.";
    } else if (rawMsg.toLowerCase().includes('fetch') || rawMsg.toLowerCase().includes('network') || errCode === 'TypeError') {
      friendly = "Não foi possível conectar ao servidor. Suas alterações foram salvas localmente.";
    }
    
    return { friendly, technical };
  };

  // Estados do SaaS e Super Admin
  const [userProfile, setUserProfile] = useState<any>(null);
  const [cmsContent, setCmsContent] = useState<any>(null);

  // Obter e validar sessão ativa no Supabase (renovando proativamente se expirada ou prestes a expirar)
  const getValidSession = async (): Promise<any | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.warn('Aviso ao obter sessão no Supabase:', sessionErr);
        return null;
      }

      let session = sessionData?.session;
      if (!session) return null;

      // Se a sessão expirou ou está a menos de 60 segundos de expirar, tenta renovar proativamente
      const isExpiredOrExpiring = session.expires_at && (session.expires_at * 1000 < Date.now() + 60000);
      if (isExpiredOrExpiring) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.session) {
          session = refreshed.session;
          setUserSession(session);
        } else {
          console.warn('refreshSession falhou:', refreshErr);
          return null;
        }
      }

      if (!session.access_token || !session.user?.id) {
        return null;
      }

      return session;
    } catch (err) {
      console.warn('Exceção ao validar sessão no Supabase:', err);
      return null;
    }
  };

  const fetchAndSetProfile = async (userId: string, userEmail?: string, accessToken?: string) => {
    if (!isSupabaseConfigured) return;
    try {
      let token = accessToken;
      if (!token) {
        const session = await getValidSession();
        token = session?.access_token;
      }
      const client = token ? getAuthenticatedClient(token) : supabase;

      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.warn('Aviso ao buscar perfil no Supabase:', error);
      }

      if (profile) {
        setUserProfile(profile);
        // Atualizar last_login de forma assíncrona (não bloqueante)
        Promise.resolve(
          client
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId)
        ).catch(() => {});
        return;
      }

      // Perfil não encontrado: tentar criar perfil manualmente caso a trigger de auth atrase
      const emailVal = userEmail || '';
      const { data: newProfile, error: insertError } = await client
        .from('profiles')
        .insert({ 
          id: userId, 
          email: emailVal, 
          is_super_admin: false, 
          subscription_status: 'ativo' 
        })
        .select()
        .maybeSingle();

      if (!insertError && newProfile) {
        setUserProfile(newProfile);
        return;
      }

      // Em qualquer caso de erro ou restrição de RLS, define perfil padrão ativo local para nunca travar a interface do aluno
      setUserProfile({
        id: userId,
        email: userEmail || '',
        is_super_admin: false,
        subscription_status: 'ativo'
      });
    } catch (err) {
      console.warn('Exceção ao buscar perfil:', err);
      setUserProfile({
        id: userId,
        email: userEmail || '',
        is_super_admin: false,
        subscription_status: 'ativo'
      });
    }
  };

  // Carregar dados no mount e gerenciar autenticação
  useEffect(() => {
    // Carrega o CMS
    if (isSupabaseConfigured) {
      supabase
        .from('cms_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Erro ao carregar CMS do Supabase:', error);
            setCmsContent(DEFAULT_CMS_CONTENT);
          } else if (data && data.content) {
            setCmsContent(data.content);
          } else {
            setCmsContent(DEFAULT_CMS_CONTENT);
          }
        });
    } else {
      setCmsContent(DEFAULT_CMS_CONTENT);
    }

    if (isSupabaseConfigured) {
      // 1. Obter e validar sessão atual de forma proativa
      getValidSession().then((session) => {
        if (session) {
          setUserSession(session);
          setShowAuthModal(false);
          if (!isSyncingFromCloud.current) {
            syncDadosFromCloud(session.user.id);
          }
          fetchAndSetProfile(session.user.id, session.user.email, session.access_token);
        }
      });

      // 2. Ouvir mudanças de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (session) {
            const isExpired = session.expires_at && (session.expires_at * 1000 <= Date.now());
            if (isExpired) {
              setUserSession(null);
            } else {
              setUserSession(session);
              setShowAuthModal(false);
              fetchAndSetProfile(session.user.id, session.user.email, session.access_token);
            }
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUserSession(null);
          setUserProfile(null);
          setSyncError(null);
          setShowAuthModal(false);
          localStorage.removeItem('superestrategico_last_sync_cloud_time');
          localStorage.removeItem('superestrategico_last_sync_time_raw');
          setLastSyncCloudTime('');
          window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));
          isSyncingFromCloud.current = false;
          syncedLogIds.current.clear();
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session) {
            setUserSession(session);
            setShowAuthModal(false);
            setSyncError(null);
            if (!isSyncingFromCloud.current) {
              syncDadosFromCloud(session.user.id);
            }
            fetchAndSetProfile(session.user.id, session.user.email, session.access_token);
          }
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Limpar timer de sucesso ao desmontar
  useEffect(() => {
    return () => {
      if (syncSuccessTimeoutRef.current) {
        clearTimeout(syncSuccessTimeoutRef.current);
      }
    };
  }, []);

  // Sincronizar automaticamente com o Supabase quando o estado mudar localmente (debounced)
  useEffect(() => {
    if (!userSession || !isSupabaseConfigured) return;

    // Se estiver sincronizando da nuvem, ignora mudanças para evitar loop
    if (isSyncingFromCloud.current) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      sendDadosToCloud(userSession.user.id);
    }, 1500);

    const handleConfigUpdated = () => {
      if (!isSyncingFromCloud.current) {
        sendDadosToCloud(userSession.user.id);
      }
    };
    window.addEventListener('superestrategico_config_updated', handleConfigUpdated);

    return () => {
      clearTimeout(delayDebounceFn);
      window.removeEventListener('superestrategico_config_updated', handleConfigUpdated);
    };
  }, [materias, ciclo, simulados, revisoes, historico, userSession]);

  // Helper para ler e deserializar JSON do localStorage com segurança
  const getLocalStorageItemJson = (key: string) => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  };

  // Helper para aplicar configurações salvas no localStorage
  const aplicarConfiguracoesLocais = (conf: any) => {
    if (!conf) return;
    if (conf.timer_segundos !== undefined && conf.timer_segundos !== null) localStorage.setItem('superestrategico_timer_segundos', conf.timer_segundos.toString());
    if (conf.timer_modo_regressivo !== undefined && conf.timer_modo_regressivo !== null) localStorage.setItem('superestrategico_timer_modo_regressivo', conf.timer_modo_regressivo.toString());
    if (conf.timer_rodando !== undefined && conf.timer_rodando !== null) localStorage.setItem('superestrategico_timer_rodando', conf.timer_rodando.toString());
    if (conf.timer_timestamp_inicio !== undefined && conf.timer_timestamp_inicio !== null) localStorage.setItem('superestrategico_timer_timestamp_inicio', conf.timer_timestamp_inicio.toString());
    if (conf.timer_timestamp_ultimo_tick !== undefined && conf.timer_timestamp_ultimo_tick !== null) localStorage.setItem('superestrategico_timer_timestamp_ultimo_tick', conf.timer_timestamp_ultimo_tick.toString());
    if (conf.timer_gabarito_multi_aulas !== undefined && conf.timer_gabarito_multi_aulas !== null) localStorage.setItem('superestrategico_timer_gabarito_multi_aulas', JSON.stringify(conf.timer_gabarito_multi_aulas));
    if (conf.timer_aulas_foco_ids !== undefined && conf.timer_aulas_foco_ids !== null) localStorage.setItem('superestrategico_timer_aulas_foco_ids', JSON.stringify(conf.timer_aulas_foco_ids));
    if (conf.timer_aula_selecionada_id !== undefined && conf.timer_aula_selecionada_id !== null) localStorage.setItem('superestrategico_timer_aula_selecionada_id', conf.timer_aula_selecionada_id);

    if (conf.timer_hora_inicio !== undefined) {
      if (conf.timer_hora_inicio) localStorage.setItem('superestrategico_timer_hora_inicio', conf.timer_hora_inicio);
      else localStorage.removeItem('superestrategico_timer_hora_inicio');
    }
    if (conf.timer_hora_fim !== undefined) {
      if (conf.timer_hora_fim) localStorage.setItem('superestrategico_timer_hora_fim', conf.timer_hora_fim);
      else localStorage.removeItem('superestrategico_timer_hora_fim');
    }
    if (conf.timer_correct_list !== undefined && conf.timer_correct_list !== null) localStorage.setItem('superestrategico_timer_correct_list', JSON.stringify(conf.timer_correct_list));
    if (conf.timer_wrong_list !== undefined && conf.timer_wrong_list !== null) localStorage.setItem('superestrategico_timer_wrong_list', JSON.stringify(conf.timer_wrong_list));
    if (conf.timer_limite_questoes !== undefined && conf.timer_limite_questoes !== null) localStorage.setItem('superestrategico_timer_limite_questoes', conf.timer_limite_questoes.toString());
    if (conf.timer_modal_open !== undefined && conf.timer_modal_open !== null) localStorage.setItem('superestrategico_timer_modal_open', conf.timer_modal_open.toString());
    
    if (conf.ia_diagnostico_recente !== undefined) {
      if (conf.ia_diagnostico_recente) localStorage.setItem('superestrategico_ia_diagnostico_recente', conf.ia_diagnostico_recente);
      else localStorage.removeItem('superestrategico_ia_diagnostico_recente');
    }
    if (conf.github_token !== undefined && conf.github_token !== null) localStorage.setItem('superestrategico_github_token', conf.github_token);
    if (conf.github_gist_id !== undefined && conf.github_gist_id !== null) localStorage.setItem('superestrategico_github_gist_id', conf.github_gist_id);
    if (conf.user_gemini_api_key !== undefined && conf.user_gemini_api_key !== null) {
      if (conf.user_gemini_api_key) localStorage.setItem('superestrategico_user_gemini_api_key', conf.user_gemini_api_key);
      else localStorage.removeItem('superestrategico_user_gemini_api_key');
    }
    if (conf.gemini_token_logs !== undefined && conf.gemini_token_logs !== null) {
      localStorage.setItem('superestrategico_gemini_token_logs', JSON.stringify(conf.gemini_token_logs));
      window.dispatchEvent(new Event('superestrategico_tokens_updated'));
    }
  };

  // Helper para mesclar histórico de estudos sem perder sessões locais ou da nuvem
  const mergeHistoricoLogs = (localLogs: LogSessao[], cloudLogs: LogSessao[], userId: string): LogSessao[] => {
    const map = new Map<string, LogSessao>();

    for (const l of localLogs) {
      if (!l || !l.id) continue;
      const cleanId = l.id.startsWith(`${userId}_`) ? l.id.slice(userId.length + 1) : l.id;
      map.set(cleanId, { ...l, id: l.id });
    }

    for (const c of cloudLogs) {
      if (!c || !c.id) continue;
      const cleanId = c.id.startsWith(`${userId}_`) ? c.id.slice(userId.length + 1) : c.id;
      map.set(cleanId, { ...c, id: c.id });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
    );
  };

  // Função para enviar os dados atuais ao Supabase
  const sendDadosToCloud = async (userId?: string, explicitSession?: any): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;

    // 1. Obter e validar a sessão ativa antes de fazer qualquer chamada
    const session = (explicitSession && explicitSession.access_token && explicitSession.user?.id)
      ? explicitSession
      : await getValidSession();
    if (!session || !session.access_token || !session.user?.id) {
      console.warn('sendDadosToCloud cancelado: sessão não encontrada ou expirada no Supabase.');
      setSyncError({
        friendly: "Não foi possível validar a sessão com a nuvem. Suas alterações continuam salvas localmente.",
        technical: "Sessão inválida ou expirada."
      });
      return false;
    }

    let activeUserId = session.user.id;
    let client = getAuthenticatedClient(session.access_token);

    try {
      setIsSyncingCloud(true);
      setSyncError(null);

      const planejamentoSemanalRaw = localStorage.getItem('superestrategico_planejamento_semanal');
      const planejamentoSemanal = planejamentoSemanalRaw ? JSON.parse(planejamentoSemanalRaw) : null;

      const configuracoes = {
        timer_segundos: parseInt(localStorage.getItem('superestrategico_timer_segundos') || '0', 10),
        timer_modo_regressivo: localStorage.getItem('superestrategico_timer_modo_regressivo') === 'true',
        timer_rodando: localStorage.getItem('superestrategico_timer_rodando') === 'true',
        timer_timestamp_inicio: parseInt(localStorage.getItem('superestrategico_timer_timestamp_inicio') || '0', 10) || null,
        timer_timestamp_ultimo_tick: parseInt(localStorage.getItem('superestrategico_timer_timestamp_ultimo_tick') || '0', 10) || null,
        timer_gabarito_multi_aulas: getLocalStorageItemJson('superestrategico_timer_gabarito_multi_aulas') || {},
        timer_aulas_foco_ids: getLocalStorageItemJson('superestrategico_timer_aulas_foco_ids') || [],
        timer_aula_selecionada_id: localStorage.getItem('superestrategico_timer_aula_selecionada_id') || '',
        timer_hora_inicio: localStorage.getItem('superestrategico_timer_hora_inicio'),
        timer_hora_fim: localStorage.getItem('superestrategico_timer_hora_fim'),
        timer_correct_list: getLocalStorageItemJson('superestrategico_timer_correct_list') || [],
        timer_wrong_list: getLocalStorageItemJson('superestrategico_timer_wrong_list') || [],
        timer_limite_questoes: parseInt(localStorage.getItem('superestrategico_timer_limite_questoes') || '50', 10),
        timer_modal_open: localStorage.getItem('superestrategico_timer_modal_open') === 'true',
        ia_diagnostico_recente: localStorage.getItem('superestrategico_ia_diagnostico_recente'),
        github_token: localStorage.getItem('superestrategico_github_token') || '',
        github_gist_id: localStorage.getItem('superestrategico_github_gist_id') || '',
        user_gemini_api_key: localStorage.getItem('superestrategico_user_gemini_api_key') || '',
        gemini_token_logs: getLocalStorageItemJson('superestrategico_gemini_token_logs') || []
      };

      // Sempre usar dados atuais das refs com fallback para valores padrão seguros
      const currentMaterias = materiasRef.current && materiasRef.current.length > 0 ? materiasRef.current : carregarDadosIniciais().materias;
      const currentCiclo = cicloRef.current || carregarDadosIniciais().ciclo;
      const currentSimulados = simuladosRef.current ?? [];
      const currentRevisoes = revisoesRef.current ?? [];
      const currentHistorico = historicoRef.current ?? [];
      
      const payload = {
        user_id: activeUserId,
        updated_at: new Date().toISOString(),
        materias: currentMaterias,
        ciclo: currentCiclo,
        simulados: currentSimulados,
        revisoes: currentRevisoes,
        historico: currentHistorico, // Mantém snapshot completo no user_data_sync
        planejamento_semanal: planejamentoSemanal,
        configuracoes
      };

      let { data: upsertData, error } = await client
        .from('user_data_sync')
        .upsert(payload, { onConflict: 'user_id' })
        .select('updated_at')
        .single();

      // Se a sessão expirou durante a requisição (erro 42501 RLS, PGRST301, 401, 403), tenta renovar o token via refreshSession e retenta
      if (isAuthOrRlsError(error)) {
        console.warn('Erro de RLS/Auth detectado no envio, tentando renovar sessão com refreshSession()...');
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.session && refreshed.session.access_token && refreshed.session.user?.id) {
          setUserSession(refreshed.session);
          activeUserId = refreshed.session.user.id;
          client = getAuthenticatedClient(refreshed.session.access_token);
          const retry = await client
            .from('user_data_sync')
            .upsert({ ...payload, user_id: activeUserId }, { onConflict: 'user_id' })
            .select('updated_at')
            .single();
          error = retry.error;
          upsertData = retry.data;
        } else {
          console.warn('Token expirado não pôde ser renovado na nuvem.');
          setSyncError({
            friendly: "Não foi possível sincronizar na nuvem no momento. Suas alterações continuam salvas localmente.",
            technical: `Erro de renovação de sessão: ${refreshErr?.message || 'Token inválido'}`
          });
          return false;
        }
      }

      // Se o erro de RLS/Auth persistir mesmo após o retry
      if (isAuthOrRlsError(error)) {
        console.warn('Erro de RLS/Auth persistiu após tentativa de renovação.');
        setSyncError({
          friendly: "Erro de autenticação ou permissão na nuvem. Suas alterações continuam salvas localmente.",
          technical: `Erro de RLS/Auth: ${error?.message || '42501'}`
        });
        return false;
      }

      if (error) {
        console.warn('Aviso: envio de dados para a nuvem não concluído:', error);
        setSyncError(getFriendlySyncErrorMessage(error));
        return false;
      }

      // Sincronizar novos logs locais com a tabela historico_logs (delta sync)
      // Prefixar IDs com activeUserId para evitar conflito RLS 42501 entre usuários
      const unsyncedLogs = currentHistorico.filter(log => {
        if (!log || !log.id || typeof log.id !== 'string') return false;
        const cleanId = log.id.startsWith(`${activeUserId}_`) ? log.id.slice(activeUserId.length + 1) : log.id;
        const scopedId = `${activeUserId}_${cleanId}`;
        return !syncedLogIds.current.has(cleanId) && !syncedLogIds.current.has(scopedId) && !syncedLogIds.current.has(log.id);
      });

      if (unsyncedLogs.length > 0) {
        const logsPayload = unsyncedLogs.map(p => {
          const cleanId = p.id.startsWith(`${activeUserId}_`) ? p.id.slice(activeUserId.length + 1) : p.id;
          const scopedId = `${activeUserId}_${cleanId}`;
          return {
            id: scopedId,
            user_id: activeUserId,
            materia_id: p.materiaId,
            aula_id: p.aulaId || null,
            duracao_minutos: p.duracaoMinutos ?? 0,
            questoes_resolvidas: p.questoesResolvidas ?? 0,
            questoes_acertadas: p.questoesAcertadas ?? 0,
            questoes_erradas: p.questoesErradas ?? 0,
            tipo: p.tipo,
            comentarios: p.comentarios || null,
            data: p.data
          };
        });

        let { error: logsError } = await client
          .from('historico_logs')
          .upsert(logsPayload, { onConflict: 'id' });

        if (logsError && isAuthOrRlsError(logsError)) {
          console.warn('Erro de RLS/Auth ao sincronizar historico_logs, tentando renovar sessão...');
          const { data: refreshedLogs, error: refreshLogsErr } = await supabase.auth.refreshSession();
          if (!refreshLogsErr && refreshedLogs?.session?.access_token && refreshedLogs?.session?.user?.id) {
            setUserSession(refreshedLogs.session);
            activeUserId = refreshedLogs.session.user.id;
            client = getAuthenticatedClient(refreshedLogs.session.access_token);
            const retryLogs = await client
              .from('historico_logs')
              .upsert(logsPayload.map(lp => ({ ...lp, user_id: activeUserId })), { onConflict: 'id' });
            logsError = retryLogs.error;
          } else {
            console.warn('Erro de RLS/Auth ao sincronizar historico_logs não pôde ser renovado.');
            setSyncError({
              friendly: "Não foi possível sincronizar histórico de estudos na nuvem. Alterações salvas localmente.",
              technical: `Erro de renovação de sessão: ${refreshLogsErr?.message || 'Token inválido'}`
            });
            return false;
          }
        }

        if (logsError) {
          console.warn('Aviso ao sincronizar historico_logs com a nuvem:', logsError);
          setSyncError(getFriendlySyncErrorMessage(logsError));
          return false;
        } else {
          // Adicionar os IDs dos logs enviados com sucesso ao set de sincronizados
          unsyncedLogs.forEach(log => {
            const cleanId = log.id.startsWith(`${activeUserId}_`) ? log.id.slice(activeUserId.length + 1) : log.id;
            const scopedId = `${activeUserId}_${cleanId}`;
            syncedLogIds.current.add(cleanId);
            syncedLogIds.current.add(scopedId);
            syncedLogIds.current.add(log.id);
          });
        }
      }

      // Sincronizar qualquer redação pendente na fila para o Supabase
      sincronizarRedacoesPendentes().catch(err => {
        console.warn('Aviso ao sincronizar redações pendentes em sendDadosToCloud:', err);
      });

      // Gravar timestamp exato retornado pelo Supabase no banco (elimina falsos deltas por clock skew)
      const serverTimeMs = upsertData?.updated_at
        ? new Date(upsertData.updated_at).getTime()
        : Date.now();

      localStorage.setItem('superestrategico_last_sync_time_raw', serverTimeMs.toString());
      
      const nowStr = new Date(serverTimeMs).toLocaleString('pt-BR');
      setLastSyncCloudTime(nowStr);
      localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
      window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));

      // Disparar toast de sucesso
      if (syncSuccessTimeoutRef.current) {
        clearTimeout(syncSuccessTimeoutRef.current);
      }
      setShowSyncSuccessToast(true);
      syncSuccessTimeoutRef.current = setTimeout(() => {
        setShowSyncSuccessToast(false);
      }, 2500);

      return true;
    } catch (err: any) {
      console.warn('Aviso ao enviar dados para o Supabase:', err);
      setSyncError(getFriendlySyncErrorMessage(err));
      return false;
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Função para carregar e sincronizar dados da nuvem do Supabase
  const syncDadosFromCloud = async (userId: string, force = false, explicitSession?: any): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    if (isSyncingFromCloud.current && !force) return false;
    isSyncingFromCloud.current = true;

    try {
      setIsSyncingCloud(true);
      setSyncError(null);

      // 1. Garantir que uma sessão autenticada válida existe antes de consultar
      const session = (explicitSession && explicitSession.access_token && explicitSession.user?.id)
        ? explicitSession
        : await getValidSession();
      if (!session || !session.access_token || !session.user?.id) {
        console.warn('syncDadosFromCloud cancelado: sessão não encontrada ou expirada no Supabase.');
        setSyncError({
          friendly: "Não foi possível validar a sessão com a nuvem. Operando com dados locais.",
          technical: "Sessão inválida ou expirada."
        });
        return false;
      }

      let activeUserId = session.user.id;
      let client = getAuthenticatedClient(session.access_token);
      
      // Buscar dados de configurações do usuário
      let { data, error } = await client
        .from('user_data_sync')
        .select('*')
        .eq('user_id', activeUserId)
        .single();

      // Se houver erro de autenticação ou RLS, tenta renovar sessão uma vez
      if (isAuthOrRlsError(error)) {
        console.warn('syncDadosFromCloud: erro de RLS/autenticação ao carregar dados, tentando renovar sessão...');
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.session && refreshed.session.access_token && refreshed.session.user?.id) {
          setUserSession(refreshed.session);
          activeUserId = refreshed.session.user.id;
          client = getAuthenticatedClient(refreshed.session.access_token);
          const retry = await client
            .from('user_data_sync')
            .select('*')
            .eq('user_id', activeUserId)
            .single();
          data = retry.data;
          error = retry.error;
        } else {
          console.warn('syncDadosFromCloud: sessão expirada não pôde ser renovada.');
          setSyncError({
            friendly: "Não foi possível atualizar dados da nuvem no momento. Operando com dados locais.",
            technical: `Erro de renovação de sessão: ${refreshErr?.message || 'Token inválido'}`
          });
          return false;
        }
      }

      // Se ainda for erro de RLS ou autenticação após retry, aborta notificando o usuário
      if (isAuthOrRlsError(error)) {
        console.warn('syncDadosFromCloud: erro de RLS/autenticação persistiu ao carregar dados:', error);
        setSyncError({
          friendly: "Erro de permissão ao sincronizar com a nuvem. Operando com dados locais.",
          technical: `Erro de RLS/Auth: ${error?.message || '42501'}`
        });
        return false;
      }

      // PGRST116: Registro não encontrado na nuvem
      // Se ainda não há registro no Supabase, confirma sessão antes de semear a nuvem
      if (error && error.code === 'PGRST116') {
        console.info('Usuário sem registro no Supabase (PGRST116). Semeando dados iniciais para a nuvem...');
        return await sendDadosToCloud(activeUserId, session);
      }

      if (error) {
        throw error;
      }

      // Buscar logs de histórico normalizados ordenados por data decrescente
      let { data: dbLogs, error: logsError } = await client
        .from('historico_logs')
        .select('*')
        .eq('user_id', activeUserId)
        .order('data', { ascending: false });

      if (logsError && isAuthOrRlsError(logsError)) {
        console.warn('syncDadosFromCloud: erro de RLS/autenticação ao carregar historico_logs, tentando renovar sessão...');
        const { data: refreshedLogs, error: refreshLogsErr } = await supabase.auth.refreshSession();
        if (!refreshLogsErr && refreshedLogs?.session && refreshedLogs.session.access_token && refreshedLogs.session.user?.id) {
          setUserSession(refreshedLogs.session);
          activeUserId = refreshedLogs.session.user.id;
          client = getAuthenticatedClient(refreshedLogs.session.access_token);
          const retryLogs = await client
            .from('historico_logs')
            .select('*')
            .eq('user_id', activeUserId)
            .order('data', { ascending: false });
          dbLogs = retryLogs.data;
          logsError = retryLogs.error;
        }
      }

      if (logsError) {
        console.warn('syncDadosFromCloud: aviso ao buscar historico_logs:', logsError);
        if (isAuthOrRlsError(logsError)) {
          setSyncError(getFriendlySyncErrorMessage(logsError));
          return false;
        }
      }

      // Mapear logs do banco para formato local com mapeamento correto de colunas snake_case
      let mappedLogs: LogSessao[] = (dbLogs || []).map(p => ({
        id: p.id,
        data: p.data,
        materiaId: p.materia_id,
        aulaId: p.aula_id || '',
        duracaoMinutos: p.duracao_minutos ?? p.duracaoMinutos ?? 0,
        questoesResolvidas: p.questoes_resolvidas ?? p.questoesResolvidas ?? 0,
        questoesAcertadas: p.questoes_acertadas ?? p.questoesAcertadas ?? 0,
        questoesErradas: p.questoes_erradas ?? p.questoesErradas ?? 0,
        tipo: p.tipo as any,
        comentarios: p.comentarios || undefined,
        paginaParou: p.pagina_parou ?? p.paginaParou ?? undefined,
        paginasTotais: p.paginas_totais ?? p.paginasTotais ?? undefined,
        progressoPercentual: p.progresso_percentual ?? p.progressoPercentual ?? undefined
      }));

      // Fallback: se historico_logs estiver vazio, tenta extrair de data.historico em user_data_sync
      if (mappedLogs.length === 0 && data?.historico && Array.isArray(data.historico) && data.historico.length > 0) {
        mappedLogs = (data.historico as any[]).map(p => ({
          id: p.id || `${activeUserId}_log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          data: p.data || new Date().toISOString(),
          materiaId: p.materiaId || p.materia_id || '',
          aulaId: p.aulaId || p.aula_id || '',
          duracaoMinutos: p.duracaoMinutos ?? p.duracao_minutos ?? 0,
          questoesResolvidas: p.questoesResolvidas ?? p.questoes_resolvidas ?? 0,
          questoesAcertadas: p.questoesAcertadas ?? p.questoes_acertadas ?? 0,
          questoesErradas: p.questoesErradas ?? p.questoes_erradas ?? 0,
          tipo: p.tipo || 'Teoria (PDF)',
          comentarios: p.comentarios || undefined,
          paginaParou: p.paginaParou ?? p.pagina_parou ?? undefined,
          paginasTotais: p.paginasTotais ?? p.paginas_totais ?? undefined,
          progressoPercentual: p.progressoPercentual ?? p.progresso_percentual ?? undefined
        }));
      }

      // Registrar todos os logs vindos da nuvem em syncedLogIds para nunca duplicar
      mappedLogs.forEach(l => {
        if (!l || !l.id || typeof l.id !== 'string') return;
        const cleanId = l.id.startsWith(`${activeUserId}_`) ? l.id.slice(activeUserId.length + 1) : l.id;
        const scopedId = `${activeUserId}_${cleanId}`;
        syncedLogIds.current.add(cleanId);
        syncedLogIds.current.add(scopedId);
        syncedLogIds.current.add(l.id);
      });

      // Mesclagem segura: mantém todos os logs locais offline e da nuvem
      let effectiveLogs = mappedLogs;

      if (data) {
        // Obter timestamps de modificação para saber qual fonte é mais recente
        const cloudTime = !isNaN(new Date(data.updated_at).getTime()) ? new Date(data.updated_at).getTime() : 0;
        const localTimeStr = localStorage.getItem('superestrategico_last_sync_time_raw');
        const localTime = localTimeStr ? parseInt(localTimeStr, 10) : 0;

        const isCloudEmpty = !data.materias || !Array.isArray(data.materias) || data.materias.length === 0;

        if (isCloudEmpty) {
          // Escudo de Nuvem Vazia: A nuvem não possui matérias cadastradas.
          // Não sobrescreve os dados locais e inicializa a nuvem com os dados locais atuais.
          console.info('Escudo de Nuvem Vazia acionado: Nuvem sem matérias. Inicializando nuvem com dados locais...');
          effectiveLogs = mergeHistoricoLogs(historicoRef.current, mappedLogs, activeUserId);
          historicoRef.current = effectiveLogs;
          setHistorico(effectiveLogs);
          salvarHistorico(effectiveLogs);
          return await sendDadosToCloud(activeUserId);
        } else if (localTime === 0 || (cloudTime > localTime && !force)) {
          // Nuvem possui dados mais recentes OU browser é novo/limpo (localTime === 0):
          // Baixa os dados da nuvem para o navegador
          effectiveLogs = mappedLogs;
          historicoRef.current = effectiveLogs;
          setHistorico(effectiveLogs);
          salvarHistorico(effectiveLogs);

          let upgradedMaterias = materiasRef.current;
          if (data.materias && Array.isArray(data.materias) && data.materias.length > 0) {
            upgradedMaterias = ajustarEMesclarMaterias(data.materias);
            materiasRef.current = upgradedMaterias;
            setMaterias(upgradedMaterias);
            salvarMaterias(upgradedMaterias);
          }

          if (data.ciclo && data.ciclo.itens) {
            const upgradedCiclo = ajustarEMesclarCiclo(data.ciclo, upgradedMaterias);
            cicloRef.current = upgradedCiclo;
            setCiclo(upgradedCiclo);
            salvarCiclo(upgradedCiclo);
          }

          if (data.simulados && Array.isArray(data.simulados)) {
            simuladosRef.current = data.simulados;
            setSimulados(data.simulados);
            salvarSimulados(data.simulados);
          }

          if (data.revisoes && Array.isArray(data.revisoes)) {
            revisoesRef.current = data.revisoes;
            setRevisoes(data.revisoes);
            salvarRevisoes(data.revisoes);
          }

          if (data.planejamento_semanal) {
            localStorage.setItem('superestrategico_planejamento_semanal', JSON.stringify(data.planejamento_semanal));
          }

          if (data.configuracoes) {
            aplicarConfiguracoesLocais(data.configuracoes);
          }

          // Gravar AMBOS os timestamps no storage
          localStorage.setItem('superestrategico_last_sync_time_raw', cloudTime.toString());
          const nowStr = new Date(cloudTime).toLocaleString('pt-BR');
          setLastSyncCloudTime(nowStr);
          localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
          window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));

          // Se após mesclagem houver logs locais pendentes de envio ao historico_logs, envia delta
          const hasUnsyncedLogs = effectiveLogs.some(l => {
            if (!l || !l.id || typeof l.id !== 'string') return false;
            const cleanId = l.id.startsWith(`${activeUserId}_`) ? l.id.slice(activeUserId.length + 1) : l.id;
            const scopedId = `${activeUserId}_${cleanId}`;
            return !syncedLogIds.current.has(cleanId) && !syncedLogIds.current.has(scopedId) && !syncedLogIds.current.has(l.id);
          });

          if (hasUnsyncedLogs) {
            return await sendDadosToCloud(activeUserId);
          } else {
            // Disparar toast de sucesso
            if (syncSuccessTimeoutRef.current) {
              clearTimeout(syncSuccessTimeoutRef.current);
            }
            setShowSyncSuccessToast(true);
            syncSuccessTimeoutRef.current = setTimeout(() => {
              setShowSyncSuccessToast(false);
            }, 2500);
            return true;
          }
        } else if (localTime > cloudTime || force) {
          // Browser possui alterações mais recentes OU usuário forçou sincronização:
          // Faz merge do histórico e upload dos dados para a nuvem
          effectiveLogs = mergeHistoricoLogs(historicoRef.current, mappedLogs, activeUserId);
          historicoRef.current = effectiveLogs;
          setHistorico(effectiveLogs);
          salvarHistorico(effectiveLogs);
          return await sendDadosToCloud(activeUserId);
        } else {
          // cloudTime === localTime: timestamps idênticos
          if (Array.isArray(data.historico) && data.historico.length === 0 && mappedLogs.length === 0) {
            effectiveLogs = [];
            historicoRef.current = [];
            setHistorico([]);
            salvarHistorico([]);
          } else {
            effectiveLogs = mergeHistoricoLogs(historicoRef.current, mappedLogs, activeUserId);
            historicoRef.current = effectiveLogs;
            setHistorico(effectiveLogs);
            salvarHistorico(effectiveLogs);
          }

          const hasUnsyncedLogs = effectiveLogs.some(l => {
            if (!l || !l.id || typeof l.id !== 'string') return false;
            const cleanId = l.id.startsWith(`${activeUserId}_`) ? l.id.slice(activeUserId.length + 1) : l.id;
            const scopedId = `${activeUserId}_${cleanId}`;
            return !syncedLogIds.current.has(cleanId) && !syncedLogIds.current.has(scopedId) && !syncedLogIds.current.has(l.id);
          });

          if (hasUnsyncedLogs) {
            return await sendDadosToCloud(activeUserId);
          } else {
            localStorage.setItem('superestrategico_last_sync_time_raw', cloudTime.toString());
            const nowStr = new Date(cloudTime).toLocaleString('pt-BR');
            setLastSyncCloudTime(nowStr);
            localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
            window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));

            // Disparar toast de sucesso
            if (syncSuccessTimeoutRef.current) {
              clearTimeout(syncSuccessTimeoutRef.current);
            }
            setShowSyncSuccessToast(true);
            syncSuccessTimeoutRef.current = setTimeout(() => {
              setShowSyncSuccessToast(false);
            }, 2500);
            return true;
          }
        }
      } else {
        // Se data não existe mas não retornou erro PGRST116, envia dados locais
        return await sendDadosToCloud(activeUserId);
      }
    } catch (err: any) {
      console.warn('Aviso ao sincronizar dados da nuvem Supabase:', err);
      setSyncError(getFriendlySyncErrorMessage(err));
      return false;
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => {
        isSyncingFromCloud.current = false;
      }, 500);
    }
  };

  // Função unificada e inteligente para o botão "Forçar Sincronismo na Nuvem"
  const handleForcarSincronismoCloud = async (): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;

    const session = await getValidSession();
    if (!session || !session.access_token || !session.user?.id) {
      setShowAuthModal(true);
      return false;
    }

    try {
      setIsSyncingCloud(true);
      return await syncDadosFromCloud(session.user.id, true);
    } catch (err: any) {
      console.warn('Erro ao forçar sincronização com a nuvem:', err);
      setSyncError(getFriendlySyncErrorMessage(err));
      return false;
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;
    setShowAuthModal(false);
    await supabase.auth.signOut();
    setUserSession(null);
    setUserProfile(null);
    setSyncError(null);
    localStorage.removeItem('superestrategico_last_sync_cloud_time');
    localStorage.removeItem('superestrategico_last_sync_time_raw');
    setLastSyncCloudTime('');
    window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));
    syncedLogIds.current.clear();
    isSyncingFromCloud.current = false;
    
    // Restaura o estado para os dados locais do localStorage
    const dados = carregarDadosIniciais();
    setMaterias(dados.materias);
    setCiclo(dados.ciclo);
    setSimulados(dados.simulados);
    setRevisoes(dados.revisoes);
    setHistorico(dados.historico);
  };

  // Helper de conversão entre pathname da URL e identificador de aba
  const getAbaInfoFromPath = (pathname: string): { aba: 'painel' | 'ciclo' | 'planejamento' | 'edital' | 'revisoes' | 'simulados' | 'coach' | 'dados' | 'admin' | 'redacao' | 'analise-edital'; historicoAberto: boolean } => {
    try {
      const decoded = decodeURIComponent(pathname).toLowerCase().replace(/\/+$/, '') || '/';
      const cleanPath = decoded.startsWith('/') ? decoded.slice(1) : decoded;

      if (!cleanPath || cleanPath === 'painel') {
        return { aba: 'painel', historicoAberto: false };
      }
      if (cleanPath === 'historicos' || cleanPath === 'historico') {
        return { aba: 'painel', historicoAberto: true };
      }
      if (cleanPath === 'ciclos' || cleanPath === 'ciclo') {
        return { aba: 'ciclo', historicoAberto: false };
      }
      if (cleanPath === 'cronograma' || cleanPath === 'planejamento') {
        return { aba: 'planejamento', historicoAberto: false };
      }
      if (cleanPath === 'material' || cleanPath === 'cursos') {
        return { aba: 'edital', historicoAberto: false };
      }
      if (cleanPath === 'revisões' || cleanPath === 'revisoes' || cleanPath === 'revisao') {
        return { aba: 'revisoes', historicoAberto: false };
      }
      if (cleanPath === 'simulado' || cleanPath === 'simulados') {
        return { aba: 'simulados', historicoAberto: false };
      }
      if (cleanPath === 'couch' || cleanPath === 'coach' || cleanPath === 'ia-coach') {
        return { aba: 'coach', historicoAberto: false };
      }
      if (cleanPath === 'edital' || cleanPath === 'analise-edital' || cleanPath === 'edital-ia') {
        return { aba: 'analise-edital', historicoAberto: false };
      }
      if (cleanPath === 'redação' || cleanPath === 'redacao' || cleanPath === 'redacoes') {
        return { aba: 'redacao', historicoAberto: false };
      }
      if (cleanPath === 'dados' || cleanPath === 'backup') {
        return { aba: 'dados', historicoAberto: false };
      }
      if (cleanPath === 'admin') {
        return { aba: 'admin', historicoAberto: false };
      }
    } catch (e) {
      console.warn('Aviso ao analisar pathname da URL:', e);
    }
    return { aba: 'painel', historicoAberto: false };
  };

  const getPathForAba = (aba: string, historicoAberto = false): string => {
    if (aba === 'painel' && historicoAberto) return '/historicos';
    switch (aba) {
      case 'painel': return '/painel';
      case 'ciclo': return '/ciclos';
      case 'planejamento': return '/cronograma';
      case 'edital': return '/material';
      case 'revisoes': return '/revisões';
      case 'simulados': return '/simulado';
      case 'coach': return '/couch';
      case 'analise-edital': return '/edital';
      case 'redacao': return '/redação';
      case 'dados': return '/dados';
      case 'admin': return '/admin';
      default: return '/painel';
    }
  };

  // Monitorar abas e subvisão de histórico a partir da URL
  const initialAbaInfo = getAbaInfoFromPath(typeof window !== 'undefined' ? window.location.pathname : '/');
  const [abaAtiva, setAbaAtivaState] = useState<'painel' | 'ciclo' | 'planejamento' | 'edital' | 'revisoes' | 'simulados' | 'coach' | 'dados' | 'admin' | 'redacao' | 'analise-edital'>(initialAbaInfo.aba);
  const [historicoCompletoAberto, setHistoricoCompletoAberto] = useState<boolean>(initialAbaInfo.historicoAberto);

  // Navegar para uma aba atualizando a URL no histórico do navegador
  const navegarParaAba = (novaAba: 'painel' | 'ciclo' | 'planejamento' | 'edital' | 'revisoes' | 'simulados' | 'coach' | 'dados' | 'admin' | 'redacao' | 'analise-edital', abrirHistorico = false) => {
    setAbaAtivaState(novaAba);
    setHistoricoCompletoAberto(abrirHistorico);

    const novoPath = getPathForAba(novaAba, abrirHistorico);
    if (typeof window !== 'undefined' && window.location.pathname !== novoPath) {
      window.history.pushState({ aba: novaAba, historicoAberto: abrirHistorico }, '', novoPath);
    }
  };

  // Escutar eventos popstate do navegador (botões Voltar/Avançar)
  useEffect(() => {
    const handlePopState = () => {
      const info = getAbaInfoFromPath(window.location.pathname);
      setAbaAtivaState(info.aba);
      setHistoricoCompletoAberto(info.historicoAberto);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Setter compatível para componentes filhos
  const setAbaAtiva = (novaAba: 'painel' | 'ciclo' | 'planejamento' | 'edital' | 'revisoes' | 'simulados' | 'coach' | 'dados' | 'admin' | 'redacao' | 'analise-edital') => {
    navegarParaAba(novaAba, false);
  };

  // Sincronizadores e Triggers de Salvamento
  const handleAtualizarAula = (materiaId: string, aulaAtualizada: Aula) => {
    const novasMaterias = materias.map(m => {
      if (m.id !== materiaId) return m;
      return {
        ...m,
        aulas: m.aulas.map(a => a.id === aulaAtualizada.id ? aulaAtualizada : a)
      };
    });

    materiasRef.current = novasMaterias;
    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);
    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());
  };

  const handleSalvarMaterias = (novasMaterias: Materia[]) => {
    materiasRef.current = novasMaterias;
    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);
    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());
  };

  const handleSalvarCiclo = (novoCiclo: CicloEstudo) => {
    cicloRef.current = novoCiclo;
    setCiclo(novoCiclo);
    salvarCiclo(novoCiclo);
    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());
  };

  const handleSalvarSimulados = (novosSimulados: Simulado[]) => {
    simuladosRef.current = novosSimulados;
    setSimulados(novosSimulados);
    salvarSimulados(novosSimulados);
    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());
  };

  const handleSalvarRevisoes = (novasRevisoes: RevisaoEspacada[]) => {
    revisoesRef.current = novasRevisoes;
    setRevisoes(novasRevisoes);
    salvarRevisoes(novasRevisoes);
    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());
  };

  const handleImportarEditalCompleto = (
    novasMaterias: Materia[],
    novoCicloItens: any[],
    banca: string,
    totalQuestoes: number,
    simuladoDist: any
  ) => {
    // 1. Atualizar matérias
    materiasRef.current = novasMaterias;
    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);

    // 2. Atualizar ciclo
    const cicloAtualizado: CicloEstudo = {
      id: `ciclo_importado_${Date.now()}`,
      nome: `Ciclo Importado - Pós-Edital`,
      itens: novoCicloItens.map((item, idx) => ({
        id: `ic_${idx + 1}`,
        materiaId: item.materiaId,
        tempoMinutos: item.tempoMinutos || 90,
        Ordem: idx + 1
      })),
      itemAtualIndice: 0
    };
    cicloRef.current = cicloAtualizado;
    setCiclo(cicloAtualizado);
    salvarCiclo(cicloAtualizado);

    // 3. Atualizar simulados (se houver distribuição)
    if (totalQuestoes && simuladoDist && Object.keys(simuladoDist).length > 0) {
      const templateSimulado: Simulado = {
        id: `sim_template_${Date.now()}`,
        titulo: `Simulado Pós-Edital Oficial - ${banca || 'Banca'}`,
        data: new Date().toISOString().split('T')[0],
        banca: banca || 'Estratégia',
        totalQuestoes: totalQuestoes,
        questoesAcertadas: 0,
        questoesErradas: 0,
        desempenhoPorMateria: Object.keys(simuladoDist).reduce((acc: any, key) => {
          const matchMateria = novasMaterias.find(m => m.id === key);
          if (matchMateria) {
            acc[key] = {
              questoes: simuladoDist[key],
              acertos: 0,
              erros: 0
            };
          }
          return acc;
        }, {}),
        observacoes: 'Modelo de simulado gerado automaticamente pela IA a partir do edital.'
      };
      
      const novosSimulados = [templateSimulado, ...simulados];
      simuladosRef.current = novosSimulados;
      setSimulados(novosSimulados);
      salvarSimulados(novosSimulados);
    }

    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());

    // 4. Alternar para o Painel Geral
    setAbaAtiva('painel');
  };

  // ADICIONAR LOG SESSÃO (Suporta registro individual ou múltiplos registros/aulas em lote)
  const handleAdicionarLogSessao = (
    entrada: Omit<LogSessao, 'id'> | LogSessaoBatchItem | (Omit<LogSessao, 'id'> | LogSessaoBatchItem)[]
  ) => {
    const rawItems = Array.isArray(entrada) ? entrada : [entrada];
    if (rawItems.length === 0) return;

    // Normalizar para lista de LogSessaoBatchItem
    const batchItems: LogSessaoBatchItem[] = rawItems.map(item => {
      if ('log' in item) {
        return item as LogSessaoBatchItem;
      }
      return { log: item as Omit<LogSessao, 'id'> };
    });

    const now = Date.now();
    const novosLogs: LogSessao[] = batchItems.map((item, idx) => ({
      ...item.log,
      id: `log_${now}_${idx}_${Math.random().toString(36).substring(2, 7)}`
    }));

    // 1. Atualizar histórico atomicamente
    setHistorico(prev => {
      const atualizado = [...novosLogs, ...prev];
      historicoRef.current = atualizado;
      salvarHistorico(atualizado);
      return atualizado;
    });

    // 2. Atualizar matérias e aulas atomicamente
    setMaterias(prevMaterias => {
      const novasMaterias = prevMaterias.map(m => {
        // Verificar se algum item afeta esta matéria
        const itensMateria = batchItems.filter(b => b.log.materiaId === m.id);
        if (itensMateria.length === 0) return m;

        return {
          ...m,
          aulas: m.aulas.map(a => {
            const itemAula = itensMateria.find(b => b.log.aulaId === a.id);
            if (!itemAula) return a;

            const log = itemAula.log;
            const updateExplicit = itemAula.aulaUpdate;

            const novasHoras = (a.horasEstudadas || 0) + (log.duracaoMinutos / 60);
            const novasQuestResolv = (a.questoesResolvidas || 0) + log.questoesResolvidas;
            const novasQuestAcertadas = (a.questoesAcertadas || 0) + log.questoesAcertadas;
            const novasQuestErradas = (a.questoesErradas || 0) + log.questoesErradas;

            // Determinar status
            let novoStatus = a.status;
            if (updateExplicit?.status) {
              novoStatus = updateExplicit.status;
            } else if (log.progressoPercentual !== undefined && log.progressoPercentual >= 100) {
              novoStatus = StatusAula.Concluido;
            } else if (log.tipo === 'Teoria (PDF)') {
              novoStatus = StatusAula.LendoPDF;
            } else if (log.tipo === 'Vídeo') {
              novoStatus = StatusAula.AssistindoVideo;
            } else if (log.tipo === 'Revisão' || log.tipo === 'Flashcards') {
              novoStatus = StatusAula.Revisando;
            } else if (log.tipo === 'Questões' && novasQuestResolv >= 10) {
              novoStatus = StatusAula.Concluido;
            }

            if (!updateExplicit?.status && log.questoesResolvidas > 0 && novasQuestResolv >= 15 && novasQuestAcertadas / novasQuestResolv >= 0.7) {
              novoStatus = StatusAula.Concluido;
            }

            // Páginas e progresso
            const paginasLidas = updateExplicit?.paginasLidas !== undefined
              ? updateExplicit.paginasLidas
              : (log.paginaParou !== undefined ? log.paginaParou : a.paginasLidas);

            const paginasTotais = updateExplicit?.paginasTotais !== undefined
              ? updateExplicit.paginasTotais
              : (log.paginasTotais !== undefined ? log.paginasTotais : a.paginasTotais);

            let progressoPercentual = updateExplicit?.progressoPercentual !== undefined
              ? updateExplicit.progressoPercentual
              : (log.progressoPercentual !== undefined ? log.progressoPercentual : a.progressoPercentual);

            if (novoStatus === StatusAula.Concluido) {
              progressoPercentual = 100;
              if (paginasTotais && (!paginasLidas || paginasLidas < paginasTotais)) {
                // se concluída e temos totais, lidas = totais
              }
            } else if (paginasTotais && paginasTotais > 0 && paginasLidas !== undefined) {
              progressoPercentual = Math.min(100, Math.round((paginasLidas / paginasTotais) * 100));
            }

            return {
              ...a,
              horasEstudadas: novasHoras,
              questoesResolvidas: novasQuestResolv,
              questoesAcertadas: novasQuestAcertadas,
              questoesErradas: novasQuestErradas,
              status: novoStatus,
              paginasLidas,
              paginasTotais,
              progressoPercentual,
              dataConclusao: novoStatus === StatusAula.Concluido ? (a.dataConclusao || new Date().toISOString().split('T')[0]) : a.dataConclusao
            };
          })
        };
      });

      materiasRef.current = novasMaterias;
      salvarMaterias(novasMaterias);
      return novasMaterias;
    });

    // 3. Automatização de Revisões Espaçadas de 24h para Teoria / Vídeo
    const novasRevisoesAuto: RevisaoEspacada[] = [];
    const alvoAmanha = new Date();
    alvoAmanha.setDate(alvoAmanha.getDate() + 1);

    batchItems.forEach((bItem, i) => {
      const log = bItem.log;
      if (log.tipo === 'Teoria (PDF)' || log.tipo === 'Vídeo') {
        const materiaInfo = (materiasRef.current || materias).find(m => m.id === log.materiaId);
        const aulaInfo = materiaInfo?.aulas.find(a => a.id === log.aulaId);

        novasRevisoesAuto.push({
          id: `rev_auto_${now}_${i}`,
          materiaId: log.materiaId,
          aulaId: log.aulaId,
          titulo: `Revisão de 24h: ${materiaInfo?.sigla || ''} - Aula ${aulaInfo ? aulaInfo.numero.toString().padStart(2, '0') : ''}`,
          dataCriacao: new Date().toISOString(),
          dataRevisaoAlvo: alvoAmanha.toISOString(),
          intervaloDias: 1,
          concluida: false,
          etapa: 1,
          historico: [
            { data: new Date().toISOString(), status: 'agendada' }
          ]
        });
      }
    });

    if (novasRevisoesAuto.length > 0) {
      setRevisoes(prev => {
        const atualizadas = [...prev, ...novasRevisoesAuto];
        revisoesRef.current = atualizadas;
        salvarRevisoes(atualizadas);
        return atualizadas;
      });
    }

    localStorage.setItem('superestrategico_last_sync_time_raw', Date.now().toString());

    // 4. Sincronização em nuvem se o usuário estiver autenticado
    if (userSession?.user?.id) {
      sendDadosToCloud(userSession.user.id);
    }
  };

  // Navegar direto para matéria do Edital quando clica no Dashboard
  const handleNavegarParaMateriaEdital = (materiaId: string) => {
    setMateriaEditalAtivaId(materiaId);
    setAbaAtiva('edital');
  };

  // Limpar os dados e resetar para recomeçar o edital (Reset Absolutamente Tudo)
  const handleResetarGeral = async (solicitarConfirmacao = true) => {
    if (solicitarConfirmacao) {
      if (!confirm("⚠️ ATENÇÃO: Deseja redefinir todo o progresso dos seus estudos para o estado inicial padrão? Isso apagará suas horas estudadas, simulados e configurações.")) {
        return;
      }
    }

    const isUserLoggedIn = Boolean(userSession?.user?.id);
    let session: any = null;
    let activeUserId = userSession?.user?.id;

    if (isSupabaseConfigured && isUserLoggedIn) {
      session = await getValidSession();
      if (!session?.access_token || !session?.user?.id) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.session?.access_token && refreshed?.session?.user?.id) {
          session = refreshed.session;
          setUserSession(session);
          activeUserId = session.user.id;
        }
      }

      if (!session?.access_token || !session?.user?.id) {
        alert('⚠️ Sua sessão na nuvem expirou ou é inválida. Por favor, faça login novamente antes de resetar seus dados para que a nuvem também seja limpa com segurança.');
        throw new Error('Sua sessão na nuvem expirou ou é inválida. Por favor, faça login novamente antes de resetar.');
      }
    }

    isSyncingFromCloud.current = true;
    setIsSyncingCloud(true);

    let serverTimeMs = Date.now();
    let nowStr = new Date(serverTimeMs).toLocaleString('pt-BR');

    // Deep clone para evitar mutação direta das instâncias estáticas
    const cleanMaterias = JSON.parse(JSON.stringify(MATERIAS_PADRAO));
    const cleanCiclo = JSON.parse(JSON.stringify(CICLO_PADRAO));

    if (isSupabaseConfigured && session?.user?.id && session?.access_token) {
      activeUserId = session.user.id;
      let client = getAuthenticatedClient(session.access_token);

      // 1. Deletar todos os registros de historico_logs deste usuário
      let { error: delErr } = await client
        .from('historico_logs')
        .delete()
        .eq('user_id', activeUserId)
        .select('id');

      if (delErr && isAuthOrRlsError(delErr)) {
        console.warn('Erro de RLS/Auth ao deletar historico_logs no reset geral, tentando renovar sessão...');
        const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
        if (!refErr && refreshed?.session?.user?.id && refreshed?.session?.access_token) {
          session = refreshed.session;
          setUserSession(session);
          activeUserId = session.user.id;
          client = getAuthenticatedClient(session.access_token);
          const retry = await client
            .from('historico_logs')
            .delete()
            .eq('user_id', activeUserId)
            .select('id');
          delErr = retry.error;
        }
      }

      if (delErr) {
        console.error('Falha ao deletar historico_logs na nuvem:', delErr);
        isSyncingFromCloud.current = false;
        setIsSyncingCloud(false);
        const friendly = getFriendlySyncErrorMessage(delErr);
        alert(`❌ Erro ao limpar histórico na nuvem: ${friendly.friendly}`);
        throw new Error(`Erro ao deletar historico_logs: ${delErr.message}`);
      }

      // 2. Upsert dados limpos na tabela user_data_sync (configurações limpas e planejamento null)
      let { data: upsertData, error: syncErr } = await client
        .from('user_data_sync')
        .upsert({
          user_id: activeUserId,
          updated_at: new Date().toISOString(),
          materias: cleanMaterias,
          ciclo: cleanCiclo,
          simulados: [],
          revisoes: [],
          historico: [],
          planejamento_semanal: null,
          configuracoes: {}
        }, { onConflict: 'user_id' })
        .select('updated_at')
        .single();

      if (syncErr && isAuthOrRlsError(syncErr)) {
        console.warn('Erro de RLS/Auth ao atualizar user_data_sync no reset geral, tentando renovar sessão...');
        const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
        if (!refErr && refreshed?.session?.user?.id && refreshed?.session?.access_token) {
          session = refreshed.session;
          setUserSession(session);
          activeUserId = session.user.id;
          client = getAuthenticatedClient(session.access_token);
          const retry = await client
            .from('user_data_sync')
            .upsert({
              user_id: activeUserId,
              updated_at: new Date().toISOString(),
              materias: cleanMaterias,
              ciclo: cleanCiclo,
              simulados: [],
              revisoes: [],
              historico: [],
              planejamento_semanal: null,
              configuracoes: {}
            }, { onConflict: 'user_id' })
            .select('updated_at')
            .single();
          syncErr = retry.error;
          upsertData = retry.data;
        }
      }

      if (syncErr) {
        console.error('Falha ao atualizar user_data_sync na nuvem:', syncErr);
        isSyncingFromCloud.current = false;
        setIsSyncingCloud(false);
        const friendly = getFriendlySyncErrorMessage(syncErr);
        alert(`❌ Erro ao atualizar dados limpos na nuvem: ${friendly.friendly}`);
        throw new Error(`Erro ao atualizar user_data_sync: ${syncErr.message}`);
      }

      if (upsertData?.updated_at) {
        serverTimeMs = new Date(upsertData.updated_at).getTime();
        nowStr = new Date(serverTimeMs).toLocaleString('pt-BR');
      }
    }

    // Limpar configurações do localStorage
    localStorage.removeItem('superestrategico_planejamento_semanal');
    localStorage.removeItem('superestrategico_ia_diagnostico_recente');
    localStorage.removeItem('superestrategico_timer_segundos');
    localStorage.removeItem('superestrategico_timer_modo_regressivo');
    localStorage.removeItem('superestrategico_timer_hora_inicio');
    localStorage.removeItem('superestrategico_timer_hora_fim');
    localStorage.removeItem('superestrategico_timer_correct_list');
    localStorage.removeItem('superestrategico_timer_wrong_list');
    localStorage.removeItem('superestrategico_timer_limite_questoes');
    localStorage.removeItem('superestrategico_timer_modal_open');
    localStorage.removeItem('superestrategico_github_token');
    localStorage.removeItem('superestrategico_github_gist_id');

    // Atualizar dados de estudos no localStorage
    salvarMaterias(cleanMaterias);
    salvarCiclo(cleanCiclo);
    salvarSimulados([]);
    salvarRevisoes([]);
    salvarHistorico([]);

    localStorage.setItem('superestrategico_initialized', 'true');
    localStorage.setItem('superestrategico_last_sync_time_raw', serverTimeMs.toString());
    localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
    localStorage.setItem('superestrategico_last_sync_time', nowStr);
    setLastSyncCloudTime(nowStr);
    window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));

    syncedLogIds.current.clear();

    // Atualizar React states e refs diretamente
    setMaterias(cleanMaterias);
    setCiclo(cleanCiclo);
    setSimulados([]);
    setRevisoes([]);
    setHistorico([]);

    materiasRef.current = cleanMaterias;
    cicloRef.current = cleanCiclo;
    simuladosRef.current = [];
    revisoesRef.current = [];
    historicoRef.current = [];

    setIsSyncingCloud(false);
    setTimeout(() => {
      isSyncingFromCloud.current = false;
    }, 2500);

    // Toast de sucesso
    if (syncSuccessTimeoutRef.current) {
      clearTimeout(syncSuccessTimeoutRef.current);
    }
    setShowSyncSuccessToast(true);
    syncSuccessTimeoutRef.current = setTimeout(() => {
      setShowSyncSuccessToast(false);
    }, 3000);
  };

  // Reset apenas de dados de estudo (histórico, progresso, simulados, revisões, ciclo)
  const handleResetarDadosEstudo = async () => {
    const isUserLoggedIn = Boolean(userSession?.user?.id);
    let session: any = null;
    let activeUserId = userSession?.user?.id;

    if (isSupabaseConfigured && isUserLoggedIn) {
      session = await getValidSession();
      if (!session?.access_token || !session?.user?.id) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.session?.access_token && refreshed?.session?.user?.id) {
          session = refreshed.session;
          setUserSession(session);
          activeUserId = session.user.id;
        }
      }

      if (!session?.access_token || !session?.user?.id) {
        alert('⚠️ Sua sessão na nuvem expirou ou é inválida. Por favor, faça login novamente antes de resetar seus dados para que a nuvem também seja limpa com segurança.');
        throw new Error('Sua sessão na nuvem expirou ou é inválida. Por favor, faça login novamente antes de resetar.');
      }
    }

    isSyncingFromCloud.current = true;
    setIsSyncingCloud(true);

    let serverTimeMs = Date.now();
    let nowStr = new Date(serverTimeMs).toLocaleString('pt-BR');

    // Deep clone para evitar mutação direta das instâncias estáticas
    const cleanMaterias = JSON.parse(JSON.stringify(MATERIAS_PADRAO));
    const cleanCiclo = JSON.parse(JSON.stringify(CICLO_PADRAO));

    // Limpar listas temporárias de questões do cronômetro para evitar que sessões fantasmas sejam salvas
    localStorage.removeItem('superestrategico_timer_correct_list');
    localStorage.removeItem('superestrategico_timer_wrong_list');
    localStorage.removeItem('superestrategico_timer_segundos');
    localStorage.removeItem('superestrategico_timer_hora_inicio');
    localStorage.removeItem('superestrategico_timer_hora_fim');
    localStorage.removeItem('superestrategico_ia_diagnostico_recente');

    if (isSupabaseConfigured && session?.user?.id && session?.access_token) {
      activeUserId = session.user.id;
      let client = getAuthenticatedClient(session.access_token);

      // 1. Deletar todos os registros de historico_logs deste usuário
      let { error: delErr } = await client
        .from('historico_logs')
        .delete()
        .eq('user_id', activeUserId)
        .select('id');

      if (delErr && isAuthOrRlsError(delErr)) {
        console.warn('Erro de RLS/Auth ao deletar historico_logs no reset de estudo, tentando renovar sessão...');
        const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
        if (!refErr && refreshed?.session?.user?.id && refreshed?.session?.access_token) {
          session = refreshed.session;
          setUserSession(session);
          activeUserId = session.user.id;
          client = getAuthenticatedClient(session.access_token);
          const retry = await client
            .from('historico_logs')
            .delete()
            .eq('user_id', activeUserId)
            .select('id');
          delErr = retry.error;
        }
      }

      if (delErr) {
        console.error('Falha ao deletar historico_logs na nuvem:', delErr);
        isSyncingFromCloud.current = false;
        setIsSyncingCloud(false);
        const friendly = getFriendlySyncErrorMessage(delErr);
        alert(`❌ Erro ao limpar histórico na nuvem: ${friendly.friendly}`);
        throw new Error(`Erro ao limpar historico_logs: ${delErr.message}`);
      }

      // Preservar planejamento_semanal e configurações do usuário (limpando timer questions)
      const planejamentoSemanalRaw = localStorage.getItem('superestrategico_planejamento_semanal');
      const planejamentoSemanal = planejamentoSemanalRaw ? JSON.parse(planejamentoSemanalRaw) : null;

      const configuracoes = {
        timer_segundos: 0,
        timer_modo_regressivo: localStorage.getItem('superestrategico_timer_modo_regressivo') === 'true',
        timer_hora_inicio: null,
        timer_hora_fim: null,
        timer_correct_list: [],
        timer_wrong_list: [],
        timer_limite_questoes: parseInt(localStorage.getItem('superestrategico_timer_limite_questoes') || '50', 10),
        timer_modal_open: false,
        ia_diagnostico_recente: null,
        github_token: localStorage.getItem('superestrategico_github_token') || '',
        github_gist_id: localStorage.getItem('superestrategico_github_gist_id') || '',
        user_gemini_api_key: localStorage.getItem('superestrategico_user_gemini_api_key') || '',
        gemini_token_logs: getLocalStorageItemJson('superestrategico_gemini_token_logs') || []
      };

      // 2. Upsert dados limpos na tabela user_data_sync
      let { data: upsertData, error: syncErr } = await client
        .from('user_data_sync')
        .upsert({
          user_id: activeUserId,
          updated_at: new Date().toISOString(),
          materias: cleanMaterias,
          ciclo: cleanCiclo,
          simulados: [],
          revisoes: [],
          historico: [],
          planejamento_semanal: planejamentoSemanal,
          configuracoes
        }, { onConflict: 'user_id' })
        .select('updated_at')
        .single();

      if (syncErr && isAuthOrRlsError(syncErr)) {
        console.warn('Erro de RLS/Auth ao atualizar user_data_sync no reset de estudo, tentando renovar sessão...');
        const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
        if (!refErr && refreshed?.session?.user?.id && refreshed?.session?.access_token) {
          session = refreshed.session;
          setUserSession(session);
          activeUserId = session.user.id;
          client = getAuthenticatedClient(session.access_token);
          const retry = await client
            .from('user_data_sync')
            .upsert({
              user_id: activeUserId,
              updated_at: new Date().toISOString(),
              materias: cleanMaterias,
              ciclo: cleanCiclo,
              simulados: [],
              revisoes: [],
              historico: [],
              planejamento_semanal: planejamentoSemanal,
              configuracoes
            }, { onConflict: 'user_id' })
            .select('updated_at')
            .single();
          syncErr = retry.error;
          upsertData = retry.data;
        }
      }

      if (syncErr) {
        console.error('Falha ao atualizar user_data_sync na nuvem:', syncErr);
        isSyncingFromCloud.current = false;
        setIsSyncingCloud(false);
        const friendly = getFriendlySyncErrorMessage(syncErr);
        alert(`❌ Erro ao atualizar dados limpos na nuvem: ${friendly.friendly}`);
        throw new Error(`Erro ao atualizar user_data_sync: ${syncErr.message}`);
      }

      if (upsertData?.updated_at) {
        serverTimeMs = new Date(upsertData.updated_at).getTime();
        nowStr = new Date(serverTimeMs).toLocaleString('pt-BR');
      }
    }

    // Atualizar dados de estudos no localStorage
    salvarMaterias(cleanMaterias);
    salvarCiclo(cleanCiclo);
    salvarSimulados([]);
    salvarRevisoes([]);
    salvarHistorico([]);

    localStorage.setItem('superestrategico_initialized', 'true');
    localStorage.setItem('superestrategico_last_sync_time_raw', serverTimeMs.toString());
    localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
    localStorage.setItem('superestrategico_last_sync_time', nowStr);
    setLastSyncCloudTime(nowStr);
    window.dispatchEvent(new Event('superestrategico_last_sync_cloud_time_updated'));

    syncedLogIds.current.clear();

    // Atualizar React states e refs diretamente
    setMaterias(cleanMaterias);
    setCiclo(cleanCiclo);
    setSimulados([]);
    setRevisoes([]);
    setHistorico([]);

    materiasRef.current = cleanMaterias;
    cicloRef.current = cleanCiclo;
    simuladosRef.current = [];
    revisoesRef.current = [];
    historicoRef.current = [];

    setIsSyncingCloud(false);
    setTimeout(() => {
      isSyncingFromCloud.current = false;
    }, 2500);

    // Toast de confirmação visual
    if (syncSuccessTimeoutRef.current) {
      clearTimeout(syncSuccessTimeoutRef.current);
    }
    setShowSyncSuccessToast(true);
    syncSuccessTimeoutRef.current = setTimeout(() => {
      setShowSyncSuccessToast(false);
    }, 3000);
  };

  // Reset apenas de configurações do usuário (timer, GitHub, IA, etc.)
  const handleResetarConfiguracoes = () => {
    // Chaves de configuração a limpar
    const configKeys = [
      'superestrategico_timer_segundos',
      'superestrategico_timer_modo_regressivo',
      'superestrategico_timer_hora_inicio',
      'superestrategico_timer_hora_fim',
      'superestrategico_timer_correct_list',
      'superestrategico_timer_wrong_list',
      'superestrategico_timer_limite_questoes',
      'superestrategico_timer_modal_open',
      'superestrategico_ia_diagnostico_recente',
      'superestrategico_github_token',
      'superestrategico_github_gist_id',
    ];
    configKeys.forEach(k => localStorage.removeItem(k));

    // Se logado com sessão válida, atualiza configurações na nuvem com objeto vazio
    if (isSupabaseConfigured) {
      getValidSession().then((session) => {
        if (session?.access_token && session?.user?.id) {
          const client = getAuthenticatedClient(session.access_token);
          client
            .from('user_data_sync')
            .update({ configuracoes: {} })
            .eq('user_id', session.user.id)
            .then(({ error }) => {
              if (error) console.error('Erro ao limpar configurações na nuvem:', error);
            });
          sendDadosToCloud(session.user.id);
        }
      });
    }
  };


  // Importar backup completo de Dados e configurações
  const handleImportarBackupTotal = (backup: any) => {
    const upgradedMaterias = ajustarEMesclarMaterias(backup.materias);
    setMaterias(upgradedMaterias);
    salvarMaterias(upgradedMaterias);

    if (backup.ciclo) {
      const upgradedCiclo = ajustarEMesclarCiclo(backup.ciclo, upgradedMaterias);
      setCiclo(upgradedCiclo);
      salvarCiclo(upgradedCiclo);
    }
    
    setSimulados(backup.simulados);
    salvarSimulados(backup.simulados);

    setRevisoes(backup.revisoes);
    salvarRevisoes(backup.revisoes);

    setHistorico(backup.historico);
    salvarHistorico(backup.historico);

    if (backup.planejamentoSemanal) {
      const ps = backup.planejamentoSemanal;
      if (ps && typeof ps === 'object') {
        if (!ps.diasAtivos || !Array.isArray(ps.diasAtivos) || ps.diasAtivos.length !== 7) {
          ps.diasAtivos = [true, true, true, true, true, true, false];
        }
        localStorage.setItem('superestrategico_planejamento_semanal', JSON.stringify(ps));
      }
    }

    if (backup.configuracoes) {
      aplicarConfiguracoesLocais(backup.configuracoes);
    }

    if (backup.redacoes && Array.isArray(backup.redacoes) && backup.redacoes.length > 0) {
      try {
        const localRedacoesRaw = localStorage.getItem('superestrategico_redacoes_historico');
        const localRedacoes = localRedacoesRaw ? JSON.parse(localRedacoesRaw) : [];
        const mapa = new Map();
        localRedacoes.forEach((r: any) => mapa.set(r.id, r));
        backup.redacoes.forEach((r: any) => mapa.set(r.id, r));
        const mesclado = Array.from(mapa.values());
        localStorage.setItem('superestrategico_redacoes_historico', JSON.stringify(mesclado));
        sincronizarRedacoesPendentes().catch(() => {});
      } catch (e) {
        console.warn('Aviso ao restaurar redações do backup:', e);
      }
    }
  };

  const handleAuthSuccess = (session?: any) => {
    setShowAuthModal(false);
    if (session) {
      setUserSession(session);
      setSyncError(null);
      if (!isSyncingFromCloud.current) {
        syncDadosFromCloud(session.user.id, false, session);
      }
      fetchAndSetProfile(session.user.id, session.user.email, session.access_token);
    }
  };

  const renderSyncErrorToast = () => {
    if (!syncError) return null;
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 px-5 py-3 rounded-xl shadow-2xl border border-rose-500/40 bg-[#1a0a0a] text-rose-300 text-sm font-medium animate-fade-in-up max-w-[90vw] md:max-w-md"
        style={{ boxShadow: '0 0 30px rgba(239,68,68,0.2)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{syncError.friendly}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(!userSession || syncError.friendly.toLowerCase().includes('login') || syncError.friendly.toLowerCase().includes('sessão')) && (
              <button
                type="button"
                onClick={() => {
                  setSyncError(null);
                  setShowAuthModal(true);
                }}
                className="text-[10px] bg-[#C5A059] text-black font-bold px-2 py-1 rounded hover:bg-[#C5A059]/90 cursor-pointer uppercase transition-all"
              >
                Fazer Login
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const detailsEl = document.getElementById('technical-error-details');
                if (detailsEl) {
                  detailsEl.classList.toggle('hidden');
                }
              }}
              className="text-[10px] text-rose-400 hover:text-rose-200 underline cursor-pointer"
            >
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="text-[10px] text-rose-400 hover:text-rose-200 font-bold uppercase cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
        <div
          id="technical-error-details"
          className="hidden mt-2 p-2 bg-black/40 border border-rose-950/60 rounded text-[10px] font-mono text-rose-400/80 break-all overflow-y-auto max-h-24"
        >
          {syncError.technical}
        </div>
      </div>
    );
  };

  // Se não houver sessão ativa, renderiza a landing page pública por padrão
  if (!userSession) {
    return (
      <>
        <Homepage 
          onLoginClick={() => setShowAuthModal(true)} 
          cmsContent={cmsContent}
        />
        {showAuthModal && (
          <SupabaseAuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
        {renderSyncErrorToast()}
      </>
    );
  }

  // Se houver sessão mas o perfil do banco ainda está sendo carregado
  if (userSession && !userProfile) {
    return (
      <div className="min-h-screen bg-[#0C0E12] text-[#E2E8F0] flex flex-col items-center justify-center font-sans antialiased">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#C5A059] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-[#94A3B8] font-mono tracking-widest uppercase animate-pulse">Carregando Perfil...</p>
        </div>
      </div>
    );
  }

  // Se a conta estiver banida ou congelada, bloqueia o acesso total ao painel do aluno
  if (userSession && userProfile && (userProfile.subscription_status === 'banido' || userProfile.subscription_status === 'congelado')) {
    return (
      <div className="min-h-screen bg-[#0C0E12] text-[#E2E8F0] flex flex-col items-center justify-center font-sans antialiased p-6">
        <div className="max-w-md w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500" />
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 animate-pulse">
            <ShieldAlert size={32} />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {userProfile.subscription_status === 'banido' ? 'Conta Banida / Suspensa' : 'Assinatura Congelada'}
          </h2>
          
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {userProfile.subscription_status === 'banido' 
              ? 'Esta conta foi suspensa por violar os termos de uso ou devido a pendências no faturamento de sua assinatura.' 
              : 'Sua assinatura está temporariamente congelada. Para reativar o acesso ao painel do aluno, atualize sua assinatura ou entre em contato com o administrador.'}
          </p>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-[#1E293B] hover:bg-[#1E293B]/80 text-white font-bold border border-[#2D3748] rounded text-sm tracking-wider uppercase transition-all"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0E12] text-[#E2E8F0] flex flex-col font-sans antialiased" id="superestrategico-app-layout">
      
      {/* HEADER DE MARCA COMPREENSIVO */}
      <header className="bg-[#0F172A] text-[#E2E8F0] border-b border-[#1E293B] shrink-0" id="superestrategico-header-brand">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3.5" id="brand-logo-area">
            <div className="p-2.5 bg-[#1E293B] border border-[#C5A059] text-[#C5A059] rounded flex items-center justify-center shadow-md">
              <Shield size={24} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-display font-bold tracking-wider leading-none text-[#C5A059]">SuperEstrategico</h1>
                <span className="text-[9px] bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase font-mono">
                  Estratégia Sync
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-[0.25em] font-sans mt-1">
                Controle de Estudos para Concursos • Ciclos e Revisões
              </p>
            </div>
          </div>

          {/* User Welcome and cloud sync actions */}
          <div className="flex items-center gap-3" id="brand-user-area">
            
            {/* CLOUD SYNC STATUS — visível no header */}
            {isSupabaseConfigured && (
              userSession ? (
                /* Logado: mostra email + status + botão de logout */
                <div className="flex items-center gap-2 bg-[#1E293B]/60 border border-emerald-500/20 rounded px-2.5 py-1.5" id="cloud-status-logged">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${syncError ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  <div className="hidden sm:block text-right">
                    <span className={`text-[9px] block font-mono uppercase tracking-wider ${syncError ? 'text-rose-400' : 'text-emerald-400'}`}>{syncError ? 'Sync Erro' : 'Nuvem Ativa'}</span>
                    <span className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[130px] block">{userSession.user?.email}</span>
                  </div>
                  <button
                    onClick={handleForcarSincronismoCloud}
                    disabled={isSyncingCloud}
                    className="p-1 text-[#C5A059] hover:text-[#C5A059]/80 hover:bg-[#C5A059]/10 rounded transition-all cursor-pointer disabled:opacity-50"
                    title={isSyncingCloud ? "Sincronizando com a Nuvem..." : "Sincronizar com a Nuvem agora"}
                  >
                    <RefreshCw size={12} className={isSyncingCloud ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-[9px] text-rose-400 hover:text-rose-300 font-mono ml-0.5 cursor-pointer p-1 hover:bg-rose-950/20 rounded transition-all"
                    title="Sair da conta"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              ) : (
                /* Deslogado: botão proeminente de login */
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059]/10 border border-[#C5A059]/40 hover:bg-[#C5A059]/20 text-[#C5A059] rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer font-mono"
                  id="btn-cloud-login"
                >
                  <User size={13} />
                  Entrar na Nuvem
                </button>
              )
            )}

            {/* Atalho Super Admin ao lado do card da nuvem */}
            {userSession && userProfile?.is_super_admin && (
              <button
                onClick={() => setAbaAtiva('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-[11px] font-bold font-mono tracking-wider transition-all cursor-pointer uppercase ${
                  abaAtiva === 'admin'
                    ? 'bg-red-950/40 border-red-500 text-red-400 shadow-md border-solid'
                    : 'bg-[#1E293B]/40 border-red-500/30 text-red-500 hover:text-red-400 hover:bg-[#1E293B]/80'
                }`}
                title="Painel de Controle Super Admin"
              >
                <Shield size={12} />
                Admin
              </button>
            )}

            <div className="text-right hidden md:block">
              {userProfile?.is_super_admin ? (
                <>
                  <span className="text-[10px] text-red-400 tracking-widest uppercase block font-mono font-bold">Super Admin</span>
                  <span className="text-xs font-serif italic text-red-500">Controle Total do Sistema</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-[#64748B] tracking-widest uppercase block font-mono">
                    {userProfile?.subscription_status === 'cancelado' ? 'Inativo / Cancelado' : 'Assinante Premium'}
                  </span>
                  <span className="text-xs font-serif italic text-[#C5A059]">
                    {userProfile?.subscription_status === 'renovado' ? 'Plano Gold Premium (Renovado)' : 'Plano SuperEstrategico Completo'}
                  </span>
                </>
              )}
            </div>
            
            <div className="w-8 h-8 rounded-full border border-[#C5A059] bg-[#1E293B] text-[#C5A059] flex items-center justify-center font-serif text-xs font-semibold" title={userSession?.user?.email || ''}>
              {userSession ? userSession.user.email.substring(0, 2).toUpperCase() : 'SE'}
            </div>

            <button
              onClick={handleResetarGeral}
              className="text-[10px] text-[#94A3B8] hover:text-rose-400 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-[#1E293B] px-2.5 rounded py-1.5 transition-colors flex items-center gap-1.5 font-sans"
              title="Redefinir planilhas"
            >
              <LogOut size={11} className="text-[#C5A059]" /> Redefinir Planilha
            </button>
          </div>

        </div>
      </header>

      {/* PAINEL DE NAVEGAÇÃO DE PÁGINAS (TABS) */}
      <nav className="bg-[#0C0E12] border-b border-[#1E293B] sticky top-0 z-40" id="superestrategico-navigation-rail">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-2 overflow-x-auto py-2 no-scrollbar scroll-smooth" id="nav-group-scroll">
            
            <button
              onClick={() => setAbaAtiva('painel')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'painel' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Painel Geral
            </button>

            <button
              onClick={() => setAbaAtiva('ciclo')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'ciclo' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Ciclo de Estudo
            </button>

            <button
              onClick={() => setAbaAtiva('planejamento')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'planejamento' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Cronograma Semanal
            </button>

            <button
              onClick={() => {
                setMateriaEditalAtivaId(undefined);
                setAbaAtiva('edital');
              }}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'edital' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Material Estratégia
            </button>

            <button
              onClick={() => setAbaAtiva('revisoes')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'revisoes' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Revisões Espaçadas
            </button>

            <button
              onClick={() => setAbaAtiva('simulados')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'simulados' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Simulado
            </button>

            <button
              onClick={() => setAbaAtiva('coach')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'coach' ? 'border-[#C5A059] text-[#C5A059] bg-[#0F172A]/80' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              IA Tutor Coach
            </button>

            <button
              onClick={() => setAbaAtiva('analise-edital')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'analise-edital' ? 'border-[#C5A059] text-[#C5A059] bg-[#0F172A]/80' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Análise de Edital IA
            </button>

            <button
              onClick={() => setAbaAtiva('redacao')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'redacao' ? 'border-[#C5A059] text-[#C5A059] bg-[#0F172A]/80' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Redação IA
            </button>

            <button
              onClick={() => setAbaAtiva('dados')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'dados' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              Dados & Backup
            </button>

          </div>
        </div>
      </nav>

      {/* CORPO DA PÁGINA COM RENDERIZAÇÃO ANIMADA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8" id="superestrategico-content-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="focus:outline-none"
          >
            
            {/* RENDERIZAÇÃO SELETIVA DE ABAS */}
            {abaAtiva === 'painel' && materias.length > 0 && (
              <DashboardStats 
                materias={materias} 
                historico={historico} 
                onSelectMateria={handleNavegarParaMateriaEdital}
                inicialMostrarHistorico={historicoCompletoAberto}
                onToggleHistorico={(aberto) => navegarParaAba('painel', aberto)}
              />
            )}

            {abaAtiva === 'ciclo' && ciclo && materias.length > 0 && (
              <CicloEstudoSeccao
                materias={materias}
                ciclo={ciclo}
                historico={historico}
                onSalvarCiclo={handleSalvarCiclo}
                onAdicionarLog={handleAdicionarLogSessao}
              />
            )}

            {abaAtiva === 'planejamento' && materias.length > 0 && (
              <PlanejamentoSemanal
                materias={materias}
                ciclo={ciclo}
                onAtualizarAula={handleAtualizarAula}
                onAdicionarLog={handleAdicionarLogSessao}
                onSalvarCiclo={handleSalvarCiclo}
              />
            )}

            {abaAtiva === 'edital' && materias.length > 0 && (
              <CursosEstrategia
                materias={materias}
                onAtualizarAula={handleAtualizarAula}
                materiaInicialAbertaId={materiaEditalAtivaId}
                historico={historico}
                onSalvarMaterias={handleSalvarMaterias}
              />
            )}

            {abaAtiva === 'revisoes' && materias.length > 0 && (
              <RevisoesEspacadas
                materias={materias}
                revisoes={revisoes}
                onSalvarRevisoes={handleSalvarRevisoes}
              />
            )}

            {abaAtiva === 'simulados' && materias.length > 0 && (
              <SimuladosBanca
                materias={materias}
                simulados={simulados}
                onSalvarSimulados={handleSalvarSimulados}
              />
            )}

            {abaAtiva === 'coach' && materias.length > 0 && (
              <IADiagnostico
                materias={materias}
                simulados={simulados}
                historico={historico}
                ciclo={ciclo}
                revisoes={revisoes}
                planejamentoSemanal={(() => {
                  try {
                    const raw = localStorage.getItem('superestrategico_planejamento_semanal');
                    return raw ? JSON.parse(raw) : null;
                  } catch { return null; }
                })()}
              />
            )}

            {abaAtiva === 'analise-edital' && (
              <AnalisadorEditalTab />
            )}

            {abaAtiva === 'redacao' && (
              <CorrecaoRedacao />
            )}

            {abaAtiva === 'dados' && (
              <DadosEBackup
                materias={materias}
                ciclo={ciclo}
                simulados={simulados}
                revisoes={revisoes}
                historico={historico}
                onImportBackup={handleImportarBackupTotal}
                onResetGeral={handleResetarGeral}
                onSalvarMaterias={handleSalvarMaterias}
                userEmail={userSession?.user?.email}
                onOpenAuth={() => setShowAuthModal(true)}
                onLogout={handleLogout}
                onSyncCloud={handleForcarSincronismoCloud}
                isSyncingCloud={isSyncingCloud}
                lastSyncCloudTime={lastSyncCloudTime}
                onResetDadosEstudo={handleResetarDadosEstudo}
                onResetConfiguracoes={handleResetarConfiguracoes}
                isLoggedIn={!!userSession}
              />
            )}

            {abaAtiva === 'admin' && userProfile?.is_super_admin && (
              <SuperAdminDashboard currentAdminEmail={userSession?.user?.email} />
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0C0E12] border-t border-[#1E293B] text-[#64748B] py-8 text-center text-[10px] sm:text-xs shrink-0 font-sans" id="superestrategico-footer">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-serif italic text-[#C5A059] text-base font-semibold tracking-wide">Plataforma de Alta Performance para Alunos do Estratégia Concursos</p>
          <p className="font-normal text-[#94A3B8]">Desenvolvido com foco no material programático do Estratégia Concursos e metodologia de ciclos integrados com revisões científicas espaçadas.</p>
          <p className="font-mono text-[9px] text-[#64748B] mt-2">© 2026 TCU Auditor Planner - Conteúdo 100% persistido e criptografado localmente no navegador.</p>
        </div>
      </footer>

      {showAuthModal && (
        <SupabaseAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Toast de erro de sincronização */}
      {renderSyncErrorToast()}

      {/* Toast de sucesso de sincronização */}
      {showSyncSuccessToast && (
        <div
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/30 bg-[#0C1510]/95 backdrop-blur-md text-emerald-400 text-sm font-medium animate-editorial-node"
          style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-semibold text-white">Sincronizado!</span>
            <span className="text-[10px] text-emerald-400/80 text-left">Dados salvos na nuvem do Supabase</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSyncSuccessToast(false)}
            className="text-emerald-500 hover:text-emerald-300 font-bold text-xs shrink-0 cursor-pointer ml-auto"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
