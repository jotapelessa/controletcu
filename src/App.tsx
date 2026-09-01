import React, { useState, useEffect, useRef } from 'react';
import { carregarDadosIniciais, salvarMaterias, salvarCiclo, salvarSimulados, salvarRevisoes, salvarHistorico, MATERIAS_PADRAO, CICLO_PADRAO, ajustarEMesclarMaterias, ajustarEMesclarCiclo } from './data';
import { Materia, CicloEstudo, Simulado, RevisaoEspacada, LogSessao, StatusAula, Aula } from './types';
import DashboardStats from './components/DashboardStats';
import CicloEstudoSeccao from './components/CicloEstudoSeccao';
import PlanejamentoSemanal from './components/PlanejamentoSemanal';
import CursosEstrategia from './components/CursosEstrategia';
import RevisoesEspacadas from './components/RevisoesEspacadas';
import SimuladosBanca from './components/SimuladosBanca';
import IADiagnostico from './components/IADiagnostico';
import DadosEBackup from './components/DadosEBackup';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BookOpen, Clock, Calendar, Award, Sparkles, LogOut, CheckCircle, Flame, User, ListCollapse, ShieldAlert } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import SupabaseAuthModal from './components/SupabaseAuthModal';
import Homepage, { DEFAULT_CMS_CONTENT } from './components/Homepage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import CorrecaoRedacao from './components/CorrecaoRedacao';
import AnalisadorEditalTab from './components/AnalisadorEditalTab';

export default function App() {
  // Estados Globais da Aplicação
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [ciclo, setCiclo] = useState<CicloEstudo | null>(null);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [revisoes, setRevisoes] = useState<RevisaoEspacada[]>([]);
  const [historico, setHistorico] = useState<LogSessao[]>([]);
  const [materiaEditalAtivaId, setMateriaEditalAtivaId] = useState<string | undefined>(undefined);

  // Estados do Supabase Cloud Sync
  const [userSession, setUserSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncCloudTime, setLastSyncCloudTime] = useState<string>(() => {
    return localStorage.getItem('superestrategico_last_sync_cloud_time') || '';
  });
  
  // Contador de skips: cada update de estado vindo da nuvem incrementa; o useEffect decrementa e ignora
  const skipSyncCount = useRef(0);
  const syncedLogIds = useRef<Set<string>>(new Set());
  // Flag para evitar chamada dupla de syncDadosFromCloud (getSession + onAuthStateChange)
  const isSyncingFromCloud = useRef(false);
  // Estado de erro de sync visível ao usuário
  const [syncError, setSyncError] = useState<{ friendly: string; technical: string } | null>(null);
  // Estado de sucesso de sync visível ao usuário
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);
  const syncSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getFriendlySyncErrorMessage = (err: any): { friendly: string; technical: string } => {
    const errMsg = err?.message || err?.error_description || JSON.stringify(err) || '';
    const errCode = err?.code || err?.status || '';
    const technical = `${errCode ? `[${errCode}]: ` : ''}${errMsg}`;
    
    let friendly = "Ocorreu um erro ao sincronizar suas alterações com a nuvem.";
    
    if (errCode === 'PGRST204' || errCode === 'PGRST116') {
      friendly = "Configuração incompleta no banco de dados. Contate o suporte técnico.";
    } else if (errCode === '23502') {
      friendly = "Seu progresso ou ciclo possui campos incompletos. Tente redefinir seus dados de estudos.";
    } else if (errCode === '42501' || errCode === 'PGRST301') {
      friendly = "Permissão negada. Verifique o status da sua assinatura ou faça login novamente.";
    } else if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network') || errCode === 'TypeError') {
      friendly = "Não foi possível conectar ao servidor. Suas alterações foram salvas localmente.";
    }
    
    return { friendly, technical };
  };

  // Estados do SaaS e Super Admin
  const [userProfile, setUserProfile] = useState<any>(null);
  const [cmsContent, setCmsContent] = useState<any>(null);

  const fetchAndSetProfile = async (userId: string, userEmail?: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erro ao obter perfil do usuário:', error);
        if (error.code === 'PGRST116') {
          // Tentar criar perfil manualmente caso a trigger atrase
          const emailVal = userEmail || '';
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({ 
              id: userId, 
              email: emailVal, 
              is_super_admin: false, 
              subscription_status: 'ativo' 
            })
            .select()
            .single();
          if (!insertError && newProfile) {
            setUserProfile(newProfile);
          } else {
            // Se falhar a inserção (ex: RLS), define perfil padrão ativo para não travar o app
            setUserProfile({
              id: userId,
              email: emailVal,
              is_super_admin: false,
              subscription_status: 'ativo'
            });
          }
        } else {
          // Qualquer outro erro, define perfil padrão ativo para não travar o usuário
          setUserProfile({
            id: userId,
            email: userEmail || '',
            is_super_admin: false,
            subscription_status: 'ativo'
          });
        }
        return;
      }

      if (profile) {
        setUserProfile(profile);
        // Atualizar last_login de forma assíncrona
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
      }
    } catch (err) {
      console.error('Exceção ao buscar perfil:', err);
      // Fallback em caso de exceção crítica
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
    const dados = carregarDadosIniciais();
    setMaterias(dados.materias);
    setCiclo(dados.ciclo);
    setSimulados(dados.simulados);
    setRevisoes(dados.revisoes);
    setHistorico(dados.historico);

    // Carrega o CMS
    if (isSupabaseConfigured) {
      supabase
        .from('cms_settings')
        .select('*')
        .eq('id', 'global')
        .single()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
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
      // Obter sessão atual
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUserSession(session);
        if (session) {
          // Usa flag para evitar chamada dupla com onAuthStateChange
          if (!isSyncingFromCloud.current) {
            isSyncingFromCloud.current = true;
            // 5 states podem ser atualizados pela nuvem + userSession = 6 skips
            skipSyncCount.current = 6;
            syncDadosFromCloud(session.user.id).finally(() => {
              isSyncingFromCloud.current = false;
            });
          }
          fetchAndSetProfile(session.user.id, session.user.email);
        } else {
          setUserProfile(null);
        }
      });

      // Ouvir mudanças de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserSession(session);
        if (session) {
          if (!isSyncingFromCloud.current) {
            isSyncingFromCloud.current = true;
            skipSyncCount.current = 6;
            syncDadosFromCloud(session.user.id).finally(() => {
              isSyncingFromCloud.current = false;
            });
          }
          fetchAndSetProfile(session.user.id, session.user.email);
        } else {
          setUserProfile(null);
          localStorage.removeItem('superestrategico_last_sync_cloud_time');
          setLastSyncCloudTime('');
          isSyncingFromCloud.current = false;
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

    // Se ainda há skips pendentes (dados sendo carregados da nuvem), decrementa e ignora
    if (skipSyncCount.current > 0) {
      skipSyncCount.current -= 1;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      sendDadosToCloud(userSession.user.id);
    }, 1500);

    const handleConfigUpdated = () => {
      sendDadosToCloud(userSession.user.id);
    };
    window.addEventListener('superestrategico_config_updated', handleConfigUpdated);

    return () => {
      clearTimeout(delayDebounceFn);
      window.removeEventListener('superestrategico_config_updated', handleConfigUpdated);
    };
  }, [materias, ciclo, simulados, revisoes, historico, userSession]);

  // Helper para aplicar configurações salvas no localStorage
  const aplicarConfiguracoesLocais = (conf: any) => {
    if (!conf) return;
    if (conf.timer_segundos !== undefined && conf.timer_segundos !== null) localStorage.setItem('superestrategico_timer_segundos', conf.timer_segundos.toString());
    if (conf.timer_modo_regressivo !== undefined && conf.timer_modo_regressivo !== null) localStorage.setItem('superestrategico_timer_modo_regressivo', conf.timer_modo_regressivo.toString());
    
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
  };

  // Função para enviar os dados atuais ao Supabase
  const sendDadosToCloud = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      setIsSyncingCloud(true);
      setSyncError(null);
      const planejamentoSemanalRaw = localStorage.getItem('superestrategico_planejamento_semanal');
      const planejamentoSemanal = planejamentoSemanalRaw ? JSON.parse(planejamentoSemanalRaw) : null;

      const getLocalStorageItemJson = (key: string) => {
        const item = localStorage.getItem(key);
        if (!item) return null;
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      };

      const configuracoes = {
        timer_segundos: parseInt(localStorage.getItem('superestrategico_timer_segundos') || '0', 10),
        timer_modo_regressivo: localStorage.getItem('superestrategico_timer_modo_regressivo') === 'true',
        timer_hora_inicio: localStorage.getItem('superestrategico_timer_hora_inicio'),
        timer_hora_fim: localStorage.getItem('superestrategico_timer_hora_fim'),
        timer_correct_list: getLocalStorageItemJson('superestrategico_timer_correct_list') || [],
        timer_wrong_list: getLocalStorageItemJson('superestrategico_timer_wrong_list') || [],
        timer_limite_questoes: parseInt(localStorage.getItem('superestrategico_timer_limite_questoes') || '50', 10),
        timer_modal_open: localStorage.getItem('superestrategico_timer_modal_open') === 'true',
        ia_diagnostico_recente: localStorage.getItem('superestrategico_ia_diagnostico_recente'),
        github_token: localStorage.getItem('superestrategico_github_token') || '',
        github_gist_id: localStorage.getItem('superestrategico_github_gist_id') || '',
        user_gemini_api_key: localStorage.getItem('superestrategico_user_gemini_api_key') || ''
      };
      
      const payload = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        materias: materias ?? [],
        ciclo: ciclo ?? {},
        simulados: simulados ?? [],
        revisoes: revisoes ?? [],
        historico: [], // Satisfaz o NOT NULL mas ocupa espaço mínimo (economia de egress)
        planejamento_semanal: planejamentoSemanal,
        configuracoes
      };

      const { error } = await supabase
        .from('user_data_sync')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      // Sincronizar novos logs locais com a tabela historico_logs (delta sync)
      const unsyncedLogs = historico.filter(log => !syncedLogIds.current.has(log.id));
      if (unsyncedLogs.length > 0) {
        const logsPayload = unsyncedLogs.map(p => ({
          id: p.id,
          user_id: userId,
          materia_id: p.materiaId,
          aula_id: p.aulaId || null,
          duracao_minutos: p.duracaoMinutos,
          questoes_resolvidas: p.questoesResolvidas,
          questoes_acertadas: p.questoesAcertadas,
          questoes_erradas: p.questoesErradas,
          tipo: p.tipo,
          comentarios: p.comentarios || null,
          data: p.data
        }));

        const { error: logsError } = await supabase
          .from('historico_logs')
          .upsert(logsPayload, { onConflict: 'id' });

        if (logsError) throw logsError;

        // Adicionar os IDs dos logs enviados com sucesso ao set de sincronizados
        unsyncedLogs.forEach(log => syncedLogIds.current.add(log.id));
      }

      // Gravar timestamp local
      const nowRaw = Date.now();
      localStorage.setItem('superestrategico_last_sync_time_raw', nowRaw.toString());
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSyncCloudTime(nowStr);
      localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);

      // Disparar toast de sucesso
      if (syncSuccessTimeoutRef.current) {
        clearTimeout(syncSuccessTimeoutRef.current);
      }
      setShowSyncSuccessToast(true);
      syncSuccessTimeoutRef.current = setTimeout(() => {
        setShowSyncSuccessToast(false);
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao enviar dados para o Supabase:', err);
      setSyncError(getFriendlySyncErrorMessage(err));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Função para carregar e sincronizar dados da nuvem do Supabase
  const syncDadosFromCloud = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      setIsSyncingCloud(true);
      setSyncError(null);
      
      // Buscar dados de configurações do usuário
      const { data, error } = await supabase
        .from('user_data_sync')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: Registro não encontrado
        throw error;
      }

      // Buscar logs de histórico normalizados
      const { data: dbLogs, error: logsError } = await supabase
        .from('historico_logs')
        .select('*')
        .eq('user_id', userId);

      if (logsError) {
        // Não bloqueia o sync principal, apenas loga o erro de histórico
        console.error('Erro ao buscar historico_logs:', logsError);
      }

      // Mapear logs do banco para formato local
      const mappedLogs: LogSessao[] = (dbLogs || []).map(p => ({
        id: p.id,
        data: p.data,
        materiaId: p.materia_id,
        aulaId: p.aula_id || '',
        duracaoMinutos: p.duracao_minutos,
        questoesResolvidas: p.questoes_resolvidas,
        questoesAcertadas: p.questoes_acertadas,
        questoesErradas: p.questoes_erradas,
        tipo: p.tipo as any,
        comentarios: p.comentarios || undefined
      }));

      // Ordenar por data decrescente (mais recente primeiro)
      mappedLogs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      if (data) {
        // Obter timestamps de modificação para saber qual fonte é mais recente
        const cloudTime = new Date(data.updated_at).getTime();
        const localTimeStr = localStorage.getItem('superestrategico_last_sync_time_raw');
        const localTime = localTimeStr ? parseInt(localTimeStr) : 0;

        if (cloudTime > localTime) {
          // Nuvem possui dados mais recentes — define quantos states serão atualizados
          let statesBeingUpdated = 1; // userSession sempre conta
          if (data.materias) statesBeingUpdated++;
          if (data.ciclo) statesBeingUpdated++;
          if (data.simulados) statesBeingUpdated++;
          if (data.revisoes) statesBeingUpdated++;
          if (dbLogs) statesBeingUpdated++; // historico
          skipSyncCount.current = statesBeingUpdated;

          // Atualiza o browser com dados da nuvem
          let upgradedMaterias = materias;
          if (data.materias) {
            upgradedMaterias = ajustarEMesclarMaterias(data.materias);
            setMaterias(upgradedMaterias);
            salvarMaterias(upgradedMaterias);
          }

          if (data.ciclo) {
            const upgradedCiclo = ajustarEMesclarCiclo(data.ciclo, upgradedMaterias);
            setCiclo(upgradedCiclo);
            salvarCiclo(upgradedCiclo);
          }

          if (data.simulados) { setSimulados(data.simulados); salvarSimulados(data.simulados); }

          if (data.revisoes) { setRevisoes(data.revisoes); salvarRevisoes(data.revisoes); }

          // Atualiza histórico com o que veio da tabela normalizada
          setHistorico(mappedLogs);
          salvarHistorico(mappedLogs);
          syncedLogIds.current = new Set(mappedLogs.map(l => l.id));

          if (data.planejamento_semanal) {
            localStorage.setItem('superestrategico_planejamento_semanal', JSON.stringify(data.planejamento_semanal));
          }

          if (data.configuracoes) {
            aplicarConfiguracoesLocais(data.configuracoes);
          }

          const nowStr = new Date(data.updated_at).toLocaleString('pt-BR');
          setLastSyncCloudTime(nowStr);
          localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
        } else if (localTime > cloudTime) {
          // Browser possui alterações mais recentes, faz upload
          // Só 1 state será alterado (lastSyncCloudTime) — não precisa de skip extra
          skipSyncCount.current = 1;
          await sendDadosToCloud(userId);
        } else {
          // Já estão sincronizados — historico pode ser atualizado
          skipSyncCount.current = 1;
          setHistorico(mappedLogs);
          salvarHistorico(mappedLogs);
          syncedLogIds.current = new Set(mappedLogs.map(l => l.id));

          const nowStr = new Date(data.updated_at).toLocaleString('pt-BR');
          setLastSyncCloudTime(nowStr);
          localStorage.setItem('superestrategico_last_sync_cloud_time', nowStr);
        }
      } else {
        // Usuário novo sem dados na nuvem:
        // Verifica se é um primeiro run com dados mock — não os envia para a nuvem
        const isFirstRun = !localStorage.getItem('superestrategico_last_sync_time_raw');
        if (!isFirstRun) {
          skipSyncCount.current = 1;
          await sendDadosToCloud(userId);
        }
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar dados da nuvem Supabase:', err);
      setSyncError(getFriendlySyncErrorMessage(err));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUserSession(null);
    setUserProfile(null);
    localStorage.removeItem('superestrategico_last_sync_cloud_time');
    setLastSyncCloudTime('');
    syncedLogIds.current.clear();
    
    // Restaura o estado para os dados locais do localStorage
    const dados = carregarDadosIniciais();
    setMaterias(dados.materias);
    setCiclo(dados.ciclo);
    setSimulados(dados.simulados);
    setRevisoes(dados.revisoes);
    setHistorico(dados.historico);
  };

  // Monitorar abas
  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'ciclo' | 'planejamento' | 'edital' | 'revisoes' | 'simulados' | 'coach' | 'dados' | 'admin' | 'redacao' | 'analise-edital'>('painel');

  // Sincronizadores e Triggers de Salvamento
  const handleAtualizarAula = (materiaId: string, aulaAtualizada: Aula) => {
    const novasMaterias = materias.map(m => {
      if (m.id !== materiaId) return m;
      return {
        ...m,
        aulas: m.aulas.map(a => a.id === aulaAtualizada.id ? aulaAtualizada : a)
      };
    });

    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);
  };

  const handleSalvarMaterias = (novasMaterias: Materia[]) => {
    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);
  };

  const handleSalvarCiclo = (novoCiclo: CicloEstudo) => {
    setCiclo(novoCiclo);
    salvarCiclo(novoCiclo);
  };

  const handleSalvarSimulados = (novosSimulados: Simulado[]) => {
    setSimulados(novosSimulados);
    salvarSimulados(novosSimulados);
  };

  const handleSalvarRevisoes = (novasRevisoes: RevisaoEspacada[]) => {
    setRevisoes(novasRevisoes);
    salvarRevisoes(novasRevisoes);
  };

  const handleImportarEditalCompleto = (
    novasMaterias: Materia[],
    novoCicloItens: any[],
    banca: string,
    totalQuestoes: number,
    simuladoDist: any
  ) => {
    // 1. Atualizar matérias
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
      setSimulados(novosSimulados);
      salvarSimulados(novosSimulados);
    }

    // 4. Alternar para o Painel Geral
    setAbaAtiva('painel');
  };

  // ADICIONAR LOG SESSÃO (Chocado na Sessão do Cronômetro)
  const handleAdicionarLogSessao = (novoLogNoId: Omit<LogSessao, 'id'>) => {
    const logId = `log_${Date.now()}`;
    const novoLog: LogSessao = {
      ...novoLogNoId,
      id: logId
    };

    const historicoAtualizado = [novoLog, ...historico];
    setHistorico(historicoAtualizado);
    salvarHistorico(historicoAtualizado);

    // AUTOMATIZAÇÃO PREMIUM DE STATUS DO EDITAL:
    // Atualizar a aula correspondente nas matérias
    const novasMaterias = materias.map(m => {
      if (m.id !== novoLog.materiaId) return m;

      return {
        ...m,
        aulas: m.aulas.map(a => {
          if (a.id !== novoLog.aulaId) return a;

          // Somar horas e questões ao lesson tracker
          const novasHoras = (a.horasEstudadas || 0) + (novoLog.duracaoMinutos / 60);
          const novasQuestResolv = (a.questoesResolvidas || 0) + novoLog.questoesResolvidas;
          const novasQuestAcertadas = (a.questoesAcertadas || 0) + novoLog.questoesAcertadas;
          const novasQuestErradas = (a.questoesErradas || 0) + novoLog.questoesErradas;
          
          let novoStatus = a.status;
          if (novoLog.tipo === 'Teoria (PDF)') {
            novoStatus = StatusAula.LendoPDF;
          } else if (novoLog.tipo === 'Vídeo') {
            novoStatus = StatusAula.AssistindoVideo;
          } else if (novoLog.tipo === 'Revisão' || novoLog.tipo === 'Flashcards') {
            novoStatus = StatusAula.Revisando;
          } else if (novoLog.tipo === 'Questões' && novasQuestResolv >= 10) {
            novoStatus = StatusAula.Concluido;
          }

          // Se concluiu as questões de forma geral, marcar como Concluido
          if (novoLog.questoesResolvidas > 0 && novasQuestResolv >= 15 && novasQuestAcertadas / novasQuestResolv >= 0.7) {
            novoStatus = StatusAula.Concluido;
          }

          return {
            ...a,
            horasEstudadas: novasHoras,
            questoesResolvidas: novasQuestResolv,
            questoesAcertadas: novasQuestAcertadas,
            questoesErradas: novasQuestErradas,
            status: novoStatus,
            dataConclusao: novoStatus === StatusAula.Concluido ? new Date().toISOString().split('T')[0] : a.dataConclusao
          };
        })
      };
    });

    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);

    // AUTOMATIZAÇÃO PREMIUM DE REVISÃO ESPAÇADA AUTOMÁTICA:
    // Se a sessão foi de Teoria (PDF) ou Vídeo, agendar uma revisão de 24 horas para o conteúdo!
    if (novoLog.tipo === 'Teoria (PDF)' || novoLog.tipo === 'Vídeo') {
      const materiaInfo = materias.find(m => m.id === novoLog.materiaId);
      const aulaInfo = materiaInfo?.aulas.find(a => a.id === novoLog.aulaId);

      const alvoAmanha = new Date();
      alvoAmanha.setDate(alvoAmanha.getDate() + 1);

      const novaRevisaoAuto: RevisaoEspacada = {
        id: `rev_auto_${Date.now()}`,
        materiaId: novoLog.materiaId,
        aulaId: novoLog.aulaId,
        titulo: `Revisão de 24h: ${materiaInfo?.sigla} - Aula ${aulaInfo?.numero.toString().padStart(2, '0')}`,
        dataCriacao: new Date().toISOString(),
        dataRevisaoAlvo: alvoAmanha.toISOString(),
        intervaloDias: 1,
        concluida: false,
        etapa: 1,
        historico: [
          { data: new Date().toISOString(), status: 'agendada' }
        ]
      };

      const novasRevisoes = [...revisoes, novaRevisaoAuto];
      setRevisoes(novasRevisoes);
      salvarRevisoes(novasRevisoes);
    }
  };

  // Navegar direto para matéria do Edital quando clica no Dashboard
  const handleNavegarParaMateriaEdital = (materiaId: string) => {
    setMateriaEditalAtivaId(materiaId);
    setAbaAtiva('edital');
  };

  // Limpar os dados e resetar para recomeçar o edital
  const handleResetarGeral = async (solicitarConfirmacao = true) => {
    if (!solicitarConfirmacao || confirm("⚠️ ATENÇÃO: Deseja redefinir todo o progresso dos seus estudos para o estado inicial padrão? Isso apagará suas horas estudadas e simulados.")) {
      // Deletar apenas dados de progresso e histórico
      localStorage.removeItem('superestrategico_materias');
      localStorage.removeItem('superestrategico_ciclo');
      localStorage.removeItem('superestrategico_simulados');
      localStorage.removeItem('superestrategico_revisoes');
      localStorage.removeItem('superestrategico_historico');
      localStorage.removeItem('superestrategico_planejamento_semanal');
      localStorage.removeItem('superestrategico_last_sync_time');
      localStorage.removeItem('superestrategico_ia_diagnostico_recente');
      // Configurações
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
      // Timestamps de sync
      localStorage.removeItem('superestrategico_last_sync_time_raw');
      localStorage.removeItem('superestrategico_last_sync_cloud_time');
      
      syncedLogIds.current.clear();

      // Se logado, envia dados limpos para a nuvem antes do reload
      if (userSession && isSupabaseConfigured) {
        try {
          await supabase
            .from('user_data_sync')
            .upsert({
              user_id: userSession.user.id,
              updated_at: new Date().toISOString(),
              materias: MATERIAS_PADRAO,
              ciclo: CICLO_PADRAO,
              simulados: [],
              revisoes: [],
              historico: [],
              planejamento_semanal: null,
              configuracoes: {}
            }, { onConflict: 'user_id' });

          // Remove logs de histórico da nuvem também
          await supabase
            .from('historico_logs')
            .delete()
            .eq('user_id', userSession.user.id);
        } catch (err) {
          console.error('Erro ao redefinir dados gerais na nuvem:', err);
        }
      }

      // Marcar como inicializado para evitar carregar o mock data novamente
      localStorage.setItem('superestrategico_initialized', 'true');
      
      window.location.reload();
    }
  };

  // Reset apenas de dados de estudo (histórico, progresso, simulados, revisões, ciclo)
  const handleResetarDadosEstudo = async () => {
    // Preserva a configuração da Rotina Semanal (planejamento_semanal)
    const planejamentoSemanalRaw = localStorage.getItem('superestrategico_planejamento_semanal');
    const planejamentoSemanal = planejamentoSemanalRaw ? JSON.parse(planejamentoSemanalRaw) : null;

    // Limpa dados de estudo do localStorage
    localStorage.removeItem('superestrategico_materias');
    localStorage.removeItem('superestrategico_ciclo');
    localStorage.removeItem('superestrategico_simulados');
    localStorage.removeItem('superestrategico_revisoes');
    localStorage.removeItem('superestrategico_historico');
    // Reseta timestamps para forçar o próximo sync a enviar dados limpos
    localStorage.removeItem('superestrategico_last_sync_time_raw');
    localStorage.removeItem('superestrategico_last_sync_cloud_time');
    localStorage.setItem('superestrategico_initialized', 'true');

    syncedLogIds.current.clear();

    // Se logado, envia dados limpos para a nuvem antes do reload
    // para sobrescrever o histórico antigo e evitar que o sync restaure os dados deletados
    if (userSession && isSupabaseConfigured) {
      try {
        await supabase
          .from('user_data_sync')
          .upsert({
            user_id: userSession.user.id,
            updated_at: new Date().toISOString(),
            materias: MATERIAS_PADRAO,
            ciclo: CICLO_PADRAO,
            simulados: [],
            revisoes: [],
            historico: [],
            planejamento_semanal: planejamentoSemanal
          }, { onConflict: 'user_id' });

        // Remove logs de histórico da nuvem também
        await supabase
          .from('historico_logs')
          .delete()
          .eq('user_id', userSession.user.id);
      } catch (err) {
        console.error('Erro ao limpar dados de estudo na nuvem:', err);
      }
    }

    window.location.reload();
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

    // Se logado, atualiza configurações na nuvem com objeto vazio
    if (userSession && isSupabaseConfigured) {
      supabase
        .from('user_data_sync')
        .update({ configuracoes: {} })
        .eq('user_id', userSession.user.id)
        .then(({ error }) => {
          if (error) console.error('Erro ao limpar configurações na nuvem:', error);
        });
    }

    // Sem reload necessário — configurações são aplicadas em runtime
    // Força re-sync para atualizar o estado local
    skipSyncCount.current = 1;
    sendDadosToCloud(userSession?.user?.id || '');
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
            onSuccess={() => {
              if (isSupabaseConfigured) {
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) {
                    setUserSession(session);
                    syncDadosFromCloud(session.user.id);
                    fetchAndSetProfile(session.user.id, session.user.email);
                  }
                });
              }
            }}
          />
        )}
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
                <div className="flex items-center gap-2.5 bg-[#1E293B]/60 border border-emerald-500/20 rounded px-3 py-1.5" id="cloud-status-logged">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${syncError ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  <div className="hidden sm:block text-right">
                    <span className={`text-[9px] block font-mono uppercase tracking-wider ${syncError ? 'text-rose-400' : 'text-emerald-400'}`}>{syncError ? 'Sync Erro' : 'Nuvem Ativa'}</span>
                    <span className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[140px] block">{userSession.user?.email}</span>
                  </div>
                  {isSyncingCloud && (
                    <CheckCircle size={12} className="text-emerald-400 animate-spin" />
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-[9px] text-rose-400 hover:text-rose-300 font-mono ml-1 cursor-pointer"
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

      {/* NOTIFICAÇÃO DE REBRANDING / MIGRAÇÃO DE DADOS */}
      <div className="bg-gradient-to-r from-amber-500/10 to-[#C5A059]/5 border-b border-[#C5A059]/20 text-amber-200 text-xs py-3 px-4 text-center flex items-center justify-center gap-2 font-sans shrink-0">
        <Sparkles size={14} className="text-[#C5A059] shrink-0" />
        <span>
          <strong>Aviso de Atualização:</strong> O TCU Auditor agora é <strong>SuperEstrategico</strong>! Expandimos o suporte para qualquer curso ou edital do Estratégia Concursos. Seus dados e progresso anteriores foram importados automaticamente e estão 100% seguros.
        </span>
      </div>


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
                onAtualizarAula={handleAtualizarAula}
                onAdicionarLog={handleAdicionarLogSessao}
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
                onSyncCloud={() => sendDadosToCloud(userSession?.user?.id)}
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
          onSuccess={() => {
            if (isSupabaseConfigured) {
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                  setUserSession(session);
                  if (!isSyncingFromCloud.current) {
                    isSyncingFromCloud.current = true;
                    skipSyncCount.current = 6;
                    syncDadosFromCloud(session.user.id).finally(() => {
                      isSyncingFromCloud.current = false;
                    });
                  }
                  fetchAndSetProfile(session.user.id, session.user.email);
                }
              });
            }
          }}
        />
      )}

      {/* Toast de erro de sincronização */}
      {syncError && (
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
      )}

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
