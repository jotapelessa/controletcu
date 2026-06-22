import React, { useState, useEffect, useRef } from 'react';
import { Materia, CicloEstudo, StatusAula, LogSessao } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckSquare, 
  ListPlus, 
  ClipboardList, 
  BookOpen, 
  AlertCircle, 
  Sparkles, 
  Timer, 
  BarChart4, 
  HelpCircle, 
  ThumbsUp, 
  ArrowRight, 
  LineChart, 
  CheckCircle2, 
  BookOpenCheck,
  Calendar,
  Layers,
  ChevronRight,
  X
} from 'lucide-react';

interface CicloProps {
  materias: Materia[];
  ciclo: CicloEstudo;
  historico: LogSessao[];
  onSalvarCiclo: (novoCiclo: CicloEstudo) => void;
  onAdicionarLog: (novoLog: Omit<LogSessao, 'id'>) => void;
}

export default function CicloEstudoSeccao({ materias, ciclo, historico, onSalvarCiclo, onAdicionarLog }: CicloProps) {
  // --- SUB ABA DE INTERFACE DE CICLOS ---
  const [subAba, setSubAba] = useState<'timer' | 'analytics'>('timer');

  const currentSlot = ciclo.itens[ciclo.itemAtualIndice] || ciclo.itens[0];
  const materiaAtiva = materias.find(m => m.id === currentSlot?.materiaId) || materias[0];

  // State para o Cronômetro
  const [segundos, setSegundos] = useState<number>(() => {
    const saved = localStorage.getItem('superestrategico_timer_segundos');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rodando, setRodando] = useState(false);
  const [modoRegressivo, setModoRegressivo] = useState<boolean>(() => {
    return localStorage.getItem('superestrategico_timer_modo_regressivo') === 'true';
  });

  const [horaInicio, setHoraInicio] = useState<string | null>(() => localStorage.getItem('superestrategico_timer_hora_inicio'));
  const [horaFim, setHoraFim] = useState<string | null>(() => localStorage.getItem('superestrategico_timer_hora_fim'));
  const [acertosMarcados, setAcertosMarcados] = useState<number[]>(() => {
    const saved = localStorage.getItem('superestrategico_timer_correct_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [errosMarcados, setErrosMarcados] = useState<number[]>(() => {
    const saved = localStorage.getItem('superestrategico_timer_wrong_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [limiteQuestoes, setLimiteQuestoes] = useState<number>(() => {
    const saved = localStorage.getItem('superestrategico_timer_limite_questoes');
    return saved ? parseInt(saved, 10) : 50;
  });

  const [mostrarModalFoco, setMostrarModalFoco] = useState<boolean>(() => {
    return localStorage.getItem('superestrategico_timer_modal_open') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('superestrategico_timer_modal_open', mostrarModalFoco.toString());
  }, [mostrarModalFoco]);
  
  // Timer de contagem regressiva baseado nos minutos do Ciclo (geralmente 90)
  const targetMinutos = currentSlot ? currentSlot.tempoMinutos : 90;
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Seleção de Aula Relacionada
  const [aulaSelecionadaId, setAulaSelecionadaId] = useState('');

  // Form de Log de Estudos
  const [mostrarFormLog, setMostrarFormLog] = useState(false);
  const [questoesResolvidas, setQuestoesResolvidas] = useState(0);
  const [questoesAcertadas, setQuestoesAcertadas] = useState(0);
  const [questoesErradas, setQuestoesErradas] = useState(0);
  const [tipoEstudo, setTipoEstudo] = useState<'Teoria (PDF)' | 'Vídeo' | 'Questões' | 'Revisão' | 'Flashcards'>('Teoria (PDF)');
  const [comentarios, setComentarios] = useState('');
  const [tempoMinutosCustom, setTempoMinutosCustom] = useState(targetMinutos);

  // Última sessão de estudos desta aula específica (memoizado de forma linear O(N) para alta performance)
  const ultimoLog = React.useMemo(() => {
    const logs = historico || [];
    if (logs.length === 0) return null;
    let latest: LogSessao | null = null;
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (log.aulaId === aulaSelecionadaId) {
        if (!latest || log.data > latest.data) {
          latest = log;
        }
      }
    }
    return latest;
  }, [historico, aulaSelecionadaId]);

  // --- SELEÇÃO DE MATÉRIA NO PAINEL ANALÍTICO DE CICLOS ---
  const [materiaAnaliticaId, setMateriaAnaliticaId] = useState<string>(materias[0]?.id || '');

  // Inicializar seleção de aula padrão quando mudar de matéria ativa
  useEffect(() => {
    if (materiaAtiva?.aulas && materiaAtiva.aulas.length > 0) {
      const naoConcluida = materiaAtiva.aulas.find(a => a.status !== StatusAula.Concluido);
      setAulaSelecionadaId(naoConcluida ? naoConcluida.id : materiaAtiva.aulas[0].id);
    }
  }, [materiaAtiva]);

  // Efeito do Cronômetro
  useEffect(() => {
    if (rodando) {
      timerRef.current = setInterval(() => {
        setSegundos(prev => {
          let next;
          if (modoRegressivo) {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setRodando(false);
              setMostrarFormLog(true);
              next = targetMinutos * 60;
            } else {
              next = prev - 1;
            }
          } else {
            next = prev + 1;
          }
          localStorage.setItem('superestrategico_timer_segundos', next.toString());
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rodando, modoRegressivo, targetMinutos]);

  // Alternar rodar/pausa
  const handleTogglePlay = () => {
    const nextRodando = !rodando;
    setRodando(nextRodando);

    const timeStr = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    if (nextRodando) {
      if (!horaInicio) {
        setHoraInicio(timeStr);
        localStorage.setItem('superestrategico_timer_hora_inicio', timeStr);
      }
      setHoraFim(null);
      localStorage.removeItem('superestrategico_timer_hora_fim');
    } else {
      setHoraFim(timeStr);
      localStorage.setItem('superestrategico_timer_hora_fim', timeStr);
    }
  };

  // Resetar cronômetro
  const handleResetCronometro = () => {
    setRodando(false);
    if (modoRegressivo) {
      setSegundos(targetMinutos * 60);
      localStorage.setItem('superestrategico_timer_segundos', (targetMinutos * 60).toString());
    } else {
      setSegundos(0);
      localStorage.setItem('superestrategico_timer_segundos', '0');
    }

    setHoraInicio(null);
    setHoraFim(null);
    setAcertosMarcados([]);
    setErrosMarcados([]);
    setQuestoesResolvidas(0);
    setQuestoesAcertadas(0);
    setQuestoesErradas(0);

    localStorage.removeItem('superestrategico_timer_hora_inicio');
    localStorage.removeItem('superestrategico_timer_hora_fim');
    localStorage.removeItem('superestrategico_timer_correct_list');
    localStorage.removeItem('superestrategico_timer_wrong_list');
  };

  // Alternar entre contar tempo (Progressivo) ou Cronômetro Alvo do Ciclo (Regressivo)
  const handleToggleTimerMode = (regressivo: boolean) => {
    setRodando(false);
    setModoRegressivo(regressivo);
    localStorage.setItem('superestrategico_timer_modo_regressivo', regressivo.toString());
    if (regressivo) {
      setSegundos(targetMinutos * 60);
      localStorage.setItem('superestrategico_timer_segundos', (targetMinutos * 60).toString());
    } else {
      setSegundos(0);
      localStorage.setItem('superestrategico_timer_segundos', '0');
    }
  };

  // Avançar o ciclo
  const handleProximoItemCiclo = () => {
    const proximoIndice = (ciclo.itemAtualIndice + 1) % ciclo.itens.length;
    onSalvarCiclo({
      ...ciclo,
      itemAtualIndice: proximoIndice
    });
    setRodando(false);
    setSegundos(0);
    localStorage.setItem('superestrategico_timer_segundos', '0');
    setModoRegressivo(false);
    localStorage.setItem('superestrategico_timer_modo_regressivo', 'false');

    setHoraInicio(null);
    setHoraFim(null);
    setAcertosMarcados([]);
    setErrosMarcados([]);
    localStorage.removeItem('superestrategico_timer_hora_inicio');
    localStorage.removeItem('superestrategico_timer_hora_fim');
    localStorage.removeItem('superestrategico_timer_correct_list');
    localStorage.removeItem('superestrategico_timer_wrong_list');
  };

  // Voltar o ciclo
  const handleAnteriorItemCiclo = () => {
    const proximoIndice = ciclo.itemAtualIndice === 0 ? ciclo.itens.length - 1 : ciclo.itemAtualIndice - 1;
    onSalvarCiclo({
      ...ciclo,
      itemAtualIndice: proximoIndice
    });
    setRodando(false);
    setSegundos(0);
    localStorage.setItem('superestrategico_timer_segundos', '0');
    setModoRegressivo(false);
    localStorage.setItem('superestrategico_timer_modo_regressivo', 'false');

    setHoraInicio(null);
    setHoraFim(null);
    setAcertosMarcados([]);
    setErrosMarcados([]);
    localStorage.removeItem('superestrategico_timer_hora_inicio');
    localStorage.removeItem('superestrategico_timer_hora_fim');
    localStorage.removeItem('superestrategico_timer_correct_list');
    localStorage.removeItem('superestrategico_timer_wrong_list');
  };

  // Formatar Segundos para HH:MM:SS
  const formatarTempo = (totalSegunds: number) => {
    const hrs = Math.floor(totalSegunds / 3600);
    const mins = Math.floor((totalSegunds % 3600) / 60);
    const secs = totalSegunds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const handleConcluirSessaoEstudo = () => {
    const minutosRealizados = modoRegressivo 
      ? Math.round((targetMinutos * 60 - segundos) / 60)
      : Math.round(segundos / 60);

    setTempoMinutosCustom(minutosRealizados > 0 ? minutosRealizados : targetMinutos);
    setRodando(false);

    if (!horaFim) {
      const timeStr = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      setHoraFim(timeStr);
      localStorage.setItem('superestrategico_timer_hora_fim', timeStr);
    }

    setMostrarFormLog(true);
  };

  const handleSubmitSessao = (e: React.FormEvent) => {
    e.preventDefault();
    
    onAdicionarLog({
      data: new Date().toISOString(),
      materiaId: materiaAtiva.id,
      aulaId: aulaSelecionadaId,
      duracaoMinutos: tempoMinutosCustom,
      questoesResolvidas,
      questoesAcertadas,
      questoesErradas,
      tipo: tipoEstudo,
      comentarios: comentarios || undefined
    });

    // Resetar campos e localStorage da sessão
    setMostrarFormLog(false);
    setQuestoesResolvidas(0);
    setQuestoesAcertadas(0);
    setQuestoesErradas(0);
    setComentarios('');
    setSegundos(0);
    setRodando(false);
    setHoraInicio(null);
    setHoraFim(null);
    setAcertosMarcados([]);
    setErrosMarcados([]);
    setMostrarModalFoco(false);

    localStorage.removeItem('superestrategico_timer_segundos');
    localStorage.removeItem('superestrategico_timer_hora_inicio');
    localStorage.removeItem('superestrategico_timer_hora_fim');
    localStorage.removeItem('superestrategico_timer_correct_list');
    localStorage.removeItem('superestrategico_timer_wrong_list');
    localStorage.removeItem('superestrategico_timer_modal_open');

    alert("Excelente! Sessão de estudos salva e vinculada ao material Estratégia TCU. O ciclo sugere avançar de matéria!");
    handleProximoItemCiclo();
  };

  // Funções para controle do grid gabarito
  const handleToggleAcerto = (numeroQuestao: number) => {
    setAcertosMarcados(prev => {
      let next;
      if (prev.includes(numeroQuestao)) {
        next = prev.filter(n => n !== numeroQuestao);
      } else {
        next = [...prev, numeroQuestao];
      }
      localStorage.setItem('superestrategico_timer_correct_list', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleErro = (numeroQuestao: number) => {
    setErrosMarcados(prev => {
      let next;
      if (prev.includes(numeroQuestao)) {
        next = prev.filter(n => n !== numeroQuestao);
      } else {
        next = [...prev, numeroQuestao];
      }
      localStorage.setItem('superestrategico_timer_wrong_list', JSON.stringify(next));
      return next;
    });
  };

  const handleClearGabarito = () => {
    if (window.confirm("Deseja realmente limpar todas as marcações do gabarito?")) {
      setAcertosMarcados([]);
      setErrosMarcados([]);
      localStorage.removeItem('superestrategico_timer_correct_list');
      localStorage.removeItem('superestrategico_timer_wrong_list');
    }
  };

  const handleToggleLimiteQuestoes = () => {
    const novoLimite = limiteQuestoes === 50 ? 100 : 50;
    setLimiteQuestoes(novoLimite);
    localStorage.setItem('superestrategico_timer_limite_questoes', novoLimite.toString());
  };

  // Sincronizar contagem de questões dos grids com o formulário
  useEffect(() => {
    const acertos = acertosMarcados.length;
    const erros = errosMarcados.length;
    setQuestoesAcertadas(acertos);
    setQuestoesErradas(erros);
    setQuestoesResolvidas(acertos + erros);
  }, [acertosMarcados, errosMarcados]);

  // Ajustar erros automaticamente quando digita acertos/resolvidas
  const handleQuestoesAcertadasChange = (val: number) => {
    setQuestoesAcertadas(val);
    if (questoesResolvidas >= val) {
      setQuestoesErradas(questoesResolvidas - val);
    }
  };

  const handleQuestoesResolvidasChange = (val: number) => {
    setQuestoesResolvidas(val);
    if (val >= questoesAcertadas) {
      setQuestoesErradas(val - questoesAcertadas);
    }
  };

  // --- ANÁLISE DE CICLOS INTEGRADA ---
  // Obter média de metas de acordo com o bloco do concurso TCU
  const obterMetaMateria = (m: Materia): number => {
    return m.metaAcertos !== undefined ? m.metaAcertos : (['CEX', 'AFO', 'AUD'].includes(m.sigla) ? 95 : 90);
  };

  // Coleta histórico de logs ordenados cronologicamente (antigo para novo) do assunto selecionado
  const logsMateriaAnalitica = historico
    .filter(log => log.materiaId === materiaAnaliticaId)
    .slice()
    .reverse();

  const materiaAnaliticaObjeto = materias.find(m => m.id === materiaAnaliticaId) || materias[0];

  // Quantas vezes o edital completo foi ciclado (mínimo de ciclos entre todas as disciplinas)
  const vezesEditalCiclado = materias.length > 0
    ? Math.min(...materias.map(m => {
        const logsM = historico.filter(h => h.materiaId === m.id);
        return m.aulas.length > 0
          ? Math.min(...m.aulas.map(aula => logsM.filter(h => h.aulaId === aula.id).length))
          : 0;
      }))
    : 0;

  const ciclosMateria = materiaAnaliticaObjeto?.aulas && materiaAnaliticaObjeto.aulas.length > 0
    ? Math.min(...materiaAnaliticaObjeto.aulas.map(a => logsMateriaAnalitica.filter(h => h.aulaId === a.id).length))
    : 0;

  return (
    <div className="space-y-6" id="ciclo-root">
      
      {/* SELETOR DE MODO SUB ABA (CRONÔMETRO VS. PERFORMANCE DE CICLO) */}
      <div className="flex bg-[#0F172A] p-1.5 border border-[#1E293B] rounded max-w-md" id="sub-aba-selector">
        <button
          onClick={() => setSubAba('timer')}
          className={`flex-1 py-2 px-4 rounded text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${subAba === 'timer' ? 'bg-[#C5A059] text-black font-extrabold' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
        >
          <Timer size={14} /> Cronômetro de Foco
        </button>
        <button
          onClick={() => setSubAba('analytics')}
          className={`flex-1 py-2 px-4 rounded text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${subAba === 'analytics' ? 'bg-[#C5A059] text-black font-extrabold' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
        >
          <BarChart4 size={14} /> Histórico dos Ciclos
        </button>
      </div>

      {/* RENDER SUB ABA 1: FOCO ATIVO & CRONÔMETRO */}
      {subAba === 'timer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-editorial-node" id="timer-mode-layout">
          
          {/* Seção Principal (Bento Col: Trigger Card de Foco) */}
          <div className="lg:col-span-2 flex flex-col">
            
            {/* Trigger Card de Foco */}
            <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-sm flex flex-col justify-between space-y-6 flex-1 h-full" id="trigger-study-card">
              
              <div className="flex justify-between items-start" id="timer-box-header">
                <div className="space-y-2">
                  <span 
                    className="text-[10px] font-mono font-black uppercase tracking-widest text-[#E2E8F0] px-2 py-1 rounded"
                    style={{ backgroundColor: materiaAtiva?.cor || '#3b82f6' }}
                  >
                    Matéria Atual do Ciclo: {materiaAtiva?.sigla || 'TCU'}
                  </span>
                  <h3 className="text-2xl font-display font-medium text-white mt-1">{materiaAtiva?.nome || 'Selecione uma matéria'}</h3>
                  <p className="text-xs text-[#94A3B8]">Meta recomendada de hoje: <strong className="text-[#C5A059]">{targetMinutos} minutos</strong> focados</p>
                </div>
                
                <div className="flex space-x-1.5" id="cycle-navigation-actions">
                  <button 
                    onClick={handleAnteriorItemCiclo}
                    className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-3 py-1.5 rounded-full text-xs font-semibold border border-[#1E293B] transition-colors cursor-pointer active:scale-[0.96]"
                  >
                    ⬅️ Anterior
                  </button>
                  <button 
                    onClick={handleProximoItemCiclo}
                    className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-3 py-1.5 rounded-full text-xs font-semibold border border-[#1E293B] transition-colors cursor-pointer active:scale-[0.96]"
                  >
                    Próximo ➡️
                  </button>
                </div>
              </div>

              {/* Escolha da Aula Ativa do Estratégia */}
              <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-4 space-y-3" id="lesson-linking-panel">
                <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#64748B] block">
                  Vincular estudo ao tópico do Estratégia Concursos:
                </label>
                <select 
                  value={aulaSelecionadaId} 
                  onChange={(e) => setAulaSelecionadaId(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#2D3748] rounded px-3 py-2 text-sm text-[#E2E8F0] outline-none focus:border-[#C5A059] font-sans transition-all"
                >
                  {(materiaAtiva?.aulas || []).map(a => (
                    <option key={a.id} value={a.id} className="bg-[#0F172A] text-[#E2E8F0]">
                      Aula {a.numero.toString().padStart(2, '0')} - {a.titulo} ({a.status})
                    </option>
                  ))}
                </select>

                {(() => {
                  const aulaInfo = materiaAtiva?.aulas?.find(a => a.id === aulaSelecionadaId);
                  if (!aulaInfo) return null;
                  const qResolv = aulaInfo.questoesResolvidas || 0;
                  const qAcert = aulaInfo.questoesAcertadas || 0;
                  const qErr = aulaInfo.questoesErradas || 0;
                  const pct = qResolv > 0 ? Math.round((qAcert / qResolv) * 100) : 0;
                  const target = obterMetaMateria(materiaAtiva);

                  return (
                    <div className="bg-[#0F172A] p-3.5 rounded border border-[#1E293B] w-full space-y-2.5" id="selected-lesson-stats">
                      {/* Última Sessão */}
                      <div className="flex flex-col sm:flex-row sm:items-center text-xs font-mono gap-1.5 sm:gap-4 border-b border-[#1E293B]/50 pb-2.5">
                        <span className="text-[#C5A059] font-bold sm:w-[130px] w-full shrink-0">Última Sessão:</span>
                        {ultimoLog ? (
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 flex-1">
                            <span className="text-[#E2E8F0] bg-[#1E293B] px-1.5 py-0.5 rounded text-[10px] font-sans font-bold sm:w-[105px] w-auto text-center shrink-0">{ultimoLog.tipo}</span>
                            {ultimoLog.questoesResolvidas > 0 ? (
                              (() => {
                                const pctUltimo = Math.round((ultimoLog.questoesAcertadas / ultimoLog.questoesResolvidas) * 100);
                                return (
                                  <>
                                    <span className="text-white font-bold sm:w-[110px] w-auto shrink-0">{ultimoLog.questoesResolvidas} questões</span>
                                    <span className="text-emerald-400 sm:w-[90px] w-auto shrink-0">{ultimoLog.questoesAcertadas} acertos</span>
                                    <span className="text-rose-400 sm:w-[80px] w-auto shrink-0">{ultimoLog.questoesErradas} erros</span>
                                    <span className={`font-bold flex-1 ${pctUltimo >= target ? 'text-emerald-400' : 'text-amber-500'}`}>
                                      {pctUltimo}% aproveitamento
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <span className="text-slate-300 font-semibold sm:w-[110px] w-auto shrink-0">{ultimoLog.duracaoMinutos} min</span>
                                <span className="text-[#64748B] italic flex-1">Nenhuma questão realizada nesta sessão</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#64748B] italic">Você ainda não estudou esta aula.</span>
                        )}
                      </div>

                      {/* Histórico Acumulado */}
                      <div className="flex flex-col sm:flex-row sm:items-center text-xs font-mono gap-1.5 sm:gap-4 pt-0.5">
                        <span className="text-[#64748B] font-bold sm:w-[130px] w-full shrink-0">Total Acumulado:</span>
                        {qResolv > 0 ? (
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 flex-1">
                            <span className="text-[#64748B] bg-[#1E293B]/65 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold sm:w-[105px] w-auto text-center shrink-0">Geral</span>
                            <span className="text-white font-bold sm:w-[110px] w-auto shrink-0">{qResolv} questões</span>
                            <span className="text-emerald-400 sm:w-[90px] w-auto shrink-0">{qAcert} acertos</span>
                            <span className="text-rose-400 sm:w-[80px] w-auto shrink-0">{qErr} erros</span>
                            <span className={`font-bold flex-1 ${pct >= target ? 'text-emerald-400' : 'text-amber-500'}`}>
                              {pct}% aproveitamento (Meta: {target}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#64748B] italic">Nenhuma questão realizada nesta aula.</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[10px] text-[#64748B] flex items-center gap-1.5 leading-normal">
                  <BookOpen size={12} className="text-[#C5A059]" />
                  Ligar o timer a uma aula específica ajudará o sistema a recalcular seu índice de acertos e horas consolidadas por assunto estudado.
                </p>
              </div>

              {/* Botão de Destaque Iniciar/Retomar Foco */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalFoco(true)}
                  className="w-full py-4 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-extrabold rounded text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg shadow-[#C5A059]/10"
                >
                  <Play size={16} fill="black" />
                  {segundos > 0 || rodando ? 'Retomar Foco Ativo' : 'Iniciar Foco de Estudos'}
                </button>
              </div>

            </div>

          </div>

          {/* Lateral de Estrutura do Ciclo */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-sm flex flex-col justify-between animate-editorial-node" id="cycle-flowchart-panel">
            <div>
              <h4 className="text-sm font-display font-medium uppercase tracking-widest text-[#E2E8F0] mb-4 flex items-center gap-2 border-b border-[#1E293B] pb-3">
                <ClipboardList size={16} className="text-[#C5A059]" />
                Estrutura Completa de Ciclo
              </h4>
              <p className="text-xs text-[#94A3B8] mb-4">Siga a ordem sequencial de estudos recomendada para fechar o edital com eficiência:</p>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1" id="cycle-steps-list">
                {ciclo.itens.map((item, index) => {
                  const itemMat = materias.find(m => m.id === item.materiaId) || materias[0];
                  const isAtivo = index === ciclo.itemAtualIndice;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => onSalvarCiclo({ ...ciclo, itemAtualIndice: index })}
                      className={`p-3 rounded-sm border flex justify-between items-center cursor-pointer transition-all ${isAtivo ? 'border-[#C5A059] bg-[#1E293B]/40' : 'border-[#1E293B]/50 bg-[#0C0E12]/50 hover:bg-[#1E293B]/30'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span 
                          className={`w-7 h-7 rounded flex items-center justify-center font-bold font-mono text-xs ${isAtivo ? 'bg-[#C5A059] text-black' : 'bg-[#1E293B] text-[#94A3B8] border border-[#2D3748]'}`}
                        >
                          {item.Ordem}
                        </span>
                        <div>
                          <h5 className="text-xs font-bold text-white">{itemMat?.nome || 'Matéria'}</h5>
                          <span className="text-[10px] text-[#64748B] font-mono">Duração: {item.tempoMinutos}m ({Math.round(item.tempoMinutos / 60)}h)</span>
                        </div>
                      </div>
                      
                      {isAtivo ? (
                        <span className="bg-[#C5A059]/20 text-[#C5A059] text-[9px] font-mono tracking-widest uppercase border border-[#C5A059]/30 px-2 py-0.5 rounded-sm">
                          ATIVO AGORA
                        </span>
                      ) : (
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: itemMat?.cor }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 bg-[#0C0E12] rounded p-4 border border-[#1E293B] flex gap-2.5 text-[11px] text-[#94A3B8]" id="cycle-tip-box">
              <Sparkles size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#C5A059] uppercase tracking-wider block mb-1">Regra de Ouro do Auditor</span>
                <p className="font-normal leading-normal">Se o ciclo atual sugerir uma matéria que você já domina, não pule o ciclo: aproveite os 90 minutos para fazer baterias de questões avançadas ou simulados rápidos em vez de revisitar a teoria!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER SUB ABA 2: PAINEL ANALÍTICO COMPLETO DOS CICLOS */}
      {subAba === 'analytics' && (
        <div className="space-y-6 animate-editorial-node" id="analytics-mode-layout">
          
          {/* CARDS SUPERIORES DE MÉTRICA DE CICLAÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="analytics-overview-row">
            
            <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded hover:border-[#C5A059]/30 transition-all">
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-widest block mb-1">Sessões Totais do Ciclo</span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <h3 className="text-3xl font-bold font-display text-[#C5A059]">{historico.length}</h3>
                <span className="text-xs text-[#94A3B8] font-mono">blocos concluídos</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed mt-2 font-mono">
                Soma cumulativa de logins em todas as 17 disciplinas.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded hover:border-[#C5A059]/30 transition-all">
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-widest block mb-1">Ciclo Cumulativo do Edital</span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <h3 className="text-3xl font-bold font-display text-[#C5A059]">{vezesEditalCiclado}x</h3>
                <span className="text-xs text-[#94A3B8] font-mono">ciclos completos</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed mt-2 font-mono">
                Número de vezes que todas as disciplinas foram totalmente cicladas.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded hover:border-[#C5A059]/30 transition-all">
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-widest block mb-1">Meta Regulatória TCU</span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <h3 className="text-3xl font-bold font-display text-emerald-400">90% - 95%</h3>
                <span className="text-xs text-[#94A3B8] font-mono">de acertos</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed mt-2 font-mono">
                Nível mínimo recomendado para disputar o topo da classificação (ajustável por disciplina).
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="analytics-master-grid">
            
            {/* LADO ESQUERDO: LISTA DE MATÉRIAS OUTLINE (CLICÁVEL PARA FILTRAR) */}
            <div className="lg:col-span-1 bg-[#0F172A] border border-[#1E293B] p-5 rounded flex flex-col justify-between" id="analytics-materia-picker">
              <div>
                <h4 className="text-sm font-display font-bold uppercase tracking-widest text-[#E2E8F0] pb-2.5 mb-3 border-b border-[#1E293B] flex items-center gap-1.5">
                  <Layers size={14} className="text-[#C5A059]" />
                  Ciclos por Disciplina
                </h4>
                <p className="text-xs text-[#94A3B8] mb-4 leading-relaxed">
                  Clique sobre qualquer matéria para inspecionar seus ciclos individuais e taxas de assertividade nas questões.
                </p>

                <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1" id="materia-picker-list">
                  {materias.map(m => {
                    const logsM = historico.filter(x => x.materiaId === m.id);
                    const ciclosCount = m.aulas.length > 0
                      ? Math.min(...m.aulas.map(aula => logsM.filter(h => h.aulaId === aula.id).length))
                      : 0;
                    const isSelected = m.id === materiaAnaliticaId;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setMateriaAnaliticaId(m.id)}
                        className={`p-2.5 rounded flex items-center justify-between cursor-pointer border transition-all ${isSelected ? 'bg-[#1E293B] border-[#C5A059] text-white font-bold shadow-md' : 'bg-[#0F172A] border-[#1E293B] hover:bg-[#1E293B]/45 text-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor }} />
                          <span className="text-[11px] font-mono font-semibold text-slate-400">[{m.sigla}]</span>
                          <span className="text-xs truncate max-w-[125px]">{m.nome}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold bg-[#0C0E12] px-2 py-0.5 rounded text-[#C5A059]" title={`${ciclosCount} ciclos completados nesta matéria`}>
                          {ciclosCount}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LADO DIREITO: DETALHAMENTO & TABELA DOS CICLOS DA DISCIPLINA SELECIONADA */}
            <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] p-6 rounded" id="analytics-materia-detail">
              
              {/* CABEÇALHO DO DETALHAMENTO */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#1E293B] mb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black text-white" style={{ backgroundColor: materiaAnaliticaObjeto.cor }}>
                      {materiaAnaliticaObjeto.sigla}
                    </span>
                    <h3 className="text-lg font-display font-semibold text-white">{materiaAnaliticaObjeto.nome}</h3>
                  </div>
                  <p className="text-xs text-[#94A3B8]">Histórico de progresso individualizado por ciclo estudado</p>
                </div>

                <div className="bg-[#0C0E12] border border-[#1E293B] p-2 rounded flex gap-4 text-xs font-mono shrink-0">
                  <div className="text-center">
                    <span className="text-[9px] text-[#64748B] block">META BANCA</span>
                    <span className="text-white font-bold">{obterMetaMateria(materiaAnaliticaObjeto)}% acertos</span>
                  </div>
                  <div className="border-r border-[#1E293B]/60" />
                  <div className="text-center">
                    <span className="text-[9px] text-[#64748B] block">CONTAGEM CICLOS</span>
                    <span className="text-[#C5A059] font-bold">{ciclosMateria} ciclos</span>
                  </div>
                </div>
              </div>

              {logsMateriaAnalitica.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3" id="no-cycle-logs-state">
                  <AlertCircle size={32} className="text-[#64748B] mx-auto" />
                  <p className="text-xs">
                    Esta matéria ainda não foi ciclada. Para iniciar, registre uma sessão de estudos ou utilize o <strong className="text-white">Cronômetro de Foco</strong> da sub-aba anterior!
                  </p>
                </div>
              ) : (
                <div className="space-y-6" id="materia-cycle-logs-present">
                  
                  {/* Ciclos de Estudo por Aula */}
                  <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded">
                    <h5 className="text-[10px] font-mono font-bold text-[#64748B] mb-3 uppercase tracking-wide">Aproveitamento e Foco por Aula:</h5>
                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                      {materiaAnaliticaObjeto.aulas.map(aula => {
                        const contagemAula = logsMateriaAnalitica.filter(l => l.aulaId === aula.id).length;
                        const qResolv = aula.questoesResolvidas || 0;
                        const qAcert = aula.questoesAcertadas || 0;
                        const qPct = qResolv > 0 ? Math.round((qAcert / qResolv) * 100) : 0;
                        const target = obterMetaMateria(materiaAnaliticaObjeto);

                        let performanceStyle = 'bg-[#1E293B]/20 border-[#1E293B] text-[#64748B]';
                        if (qResolv > 0) {
                          if (qPct >= target) {
                            performanceStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold';
                          } else if (qPct >= 80) {
                            performanceStyle = 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059] font-bold';
                          } else {
                            performanceStyle = 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold';
                          }
                        } else if (contagemAula > 0) {
                          performanceStyle = 'bg-[#1E293B]/40 border-[#2D3748] text-slate-300';
                        }

                        return (
                          <div 
                            key={aula.id} 
                            className={`text-[11px] font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all ${performanceStyle}`}
                            title={`${aula.titulo}: ${contagemAula}x estudada | ${qResolv} Q (${qPct}% acertos)`}
                          >
                            <span className="font-bold">A{aula.numero.toString().padStart(2, '0')}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className="font-semibold">{qResolv > 0 ? `${qPct}% (${qResolv}Q)` : `${contagemAula}x`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TABELA DE SESSÕES CONVENIADAS POR NÚMERO DE CICLO */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs font-sans text-[#E2E8F0]">
                      <thead>
                        <tr className="border-b border-[#1E293B] text-[#64748B] text-[10px] uppercase font-mono tracking-widest text-left">
                          <th className="py-3 px-2 text-center">Nº Ciclo</th>
                          <th className="py-3 px-2">Data</th>
                          <th className="py-3 px-2 text-center">Tempo (min)</th>
                          <th className="py-3 px-2">Tipo</th>
                          <th className="py-3 px-2 text-center">Questões (Resol / Acer / Err)</th>
                          <th className="py-3 px-2 text-right">Aproveitamento</th>
                          <th className="py-3 px-2 text-center">Status Ciclo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]/50">
                        {logsMateriaAnalitica.map((log, index) => {
                          const cycleNum = index + 1;
                          const hasQuestions = log.questoesResolvidas > 0;
                          const accPerc = hasQuestions ? Math.round((log.questoesAcertadas / log.questoesResolvidas) * 100) : 0;
                          const target = obterMetaMateria(materiaAnaliticaObjeto);
                          const isSuccess = accPerc >= target;

                          return (
                            <tr key={log.id} className="hover:bg-[#1E293B]/20 transition-colors">
                              {/* Ciclo Number */}
                              <td className="py-3 px-2 text-center font-mono font-black text-white">
                                <span className="bg-[#1E293B] border border-[#2D3748] px-2 py-0.5 rounded text-[10px] text-[#C5A059]">
                                  Ciclo {cycleNum}
                                </span>
                              </td>
                              
                              {/* Data de Execução */}
                              <td className="py-3 px-2 font-mono text-slate-400">
                                {new Date(log.data).toLocaleDateString('pt-BR')}
                              </td>

                              {/* Duração em Minutos */}
                              <td className="py-3 px-2 text-center font-mono">
                                {log.duracaoMinutos}m
                              </td>

                              {/* Tipo de Sessão */}
                              <td className="py-3 px-2 font-medium">
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                  {log.tipo}
                                </span>
                              </td>

                              {/* Estatísticas Numéricas de Questões */}
                              <td className="py-3 px-2 text-center font-mono text-[11px]">
                                {hasQuestions ? (
                                  <span className="text-slate-400">
                                    {log.questoesResolvidas} total / <strong className="text-emerald-400">+{log.questoesAcertadas}</strong> / <strong className="text-rose-400">-{log.questoesErradas}</strong>
                                  </span>
                                ) : (
                                  <span className="text-[#64748B] italic">Sem exercícios</span>
                                )}
                              </td>

                              {/* Índice em Porcentagem */}
                              <td className="py-3 px-2 text-right font-mono font-bold text-[13px] text-[#C5A059]">
                                {hasQuestions ? `${accPerc}%` : '-'}
                              </td>

                              {/* Estado Conforme Target de Acertos */}
                              <td className="py-3 px-2">
                                <div className="flex justify-center">
                                  {!hasQuestions ? (
                                    <span className="text-[9px] font-mono uppercase bg-[#1E293B] text-slate-500 px-2 py-0.5 rounded border border-slate-800">
                                      Leitura
                                    </span>
                                  ) : isSuccess ? (
                                    <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                                      Meta Atingida
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                                      Revisar Estudo
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MINI GRÁFICO DE APRENDIZADO LINEAR ENTRE CICLOS */}
                  <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
                    <h5 className="text-xs font-display font-medium text-white flex items-center gap-1.5">
                      <LineChart size={14} className="text-[#C5A059]" /> Evolução Percentual Intercíclica
                    </h5>
                    
                    <div className="flex items-end justify-between h-24 pt-4 border-b border-[#1E293B] px-4 font-mono select-none" id="mini-linear-bar-chart">
                      {logsMateriaAnalitica.map((log, index) => {
                        const hasQuestions = log.questoesResolvidas > 0;
                        const accPerc = hasQuestions ? Math.round((log.questoesAcertadas / log.questoesResolvidas) * 100) : 0;
                        const cycleNum = index + 1;

                        return (
                          <div key={log.id} className="flex flex-col items-center flex-1 group relative">
                            {/* Gráfico Bar Tooltip */}
                            <span className="absolute -top-6 text-[10px] bg-slate-900 border border-slate-700 text-[#C5A059] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {hasQuestions ? `${accPerc}%` : 'Sem Q.'}
                            </span>
                            
                            {/* Altura da Barra */}
                            <div 
                              className="w-5 bg-[#C5A059]/40 hover:bg-[#C5A059]/80 rounded-t transition-all cursor-pointer"
                              style={{ height: `${hasQuestions ? Math.max(8, accPerc) : 6}px` }}
                            />
                            
                            {/* Rótulo da Barra */}
                            <span className="text-[9px] text-[#64748B] mt-1.5">Cycle {cycleNum}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-[#64748B] text-center italic leading-normal">
                      Passe o mouse por cima das barras verticais para visualizar o índice de cada ciclo sequenciado deste assunto Estratégia TCU. Use essa tendência analítica para verificar se o seu aproveitamento de véspera está aumentando ou diminuindo!
                    </p>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* 3. MODAL / DROPDOWN FORM PARA LOGAR SESSÃO DE ESTUDOS */}
      {mostrarFormLog && (
        <div className="fixed inset-0 bg-[#0C0E12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in" id="study-session-log-modal">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded w-full max-w-lg p-6 shadow-2xl relative">
            
            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-2">
              <ListPlus size={20} className="text-[#C5A059]" />
              Salvar Registro de Estudo
            </h3>
            <p className="text-xs text-[#94A3B8] mb-6 font-sans">
              Insira os dados da sua última sessão para manter o edital e taxas de erros atualizados.
            </p>

            <form onSubmit={handleSubmitSessao} className="space-y-4">
              
              {/* Tópico / Aula Vinculada */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1">Aula / Tópico do Estratégia</label>
                <select
                  value={aulaSelecionadaId}
                  onChange={(e) => setAulaSelecionadaId(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] font-sans"
                >
                  {(materiaAtiva?.aulas || []).map(a => (
                    <option key={a.id} value={a.id} className="bg-[#0F172A] text-[#E2E8F0]">
                      Aula {a.numero.toString().padStart(2, '0')} - {a.titulo} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1">Matéria</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={materiaAtiva?.nome || 'Nenhuma matéria ativa'}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2.5 text-xs text-white font-bold outline-none font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1">Tipo de Estudo</label>
                  <select
                    value={tipoEstudo}
                    onChange={(e: any) => setTipoEstudo(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] font-sans"
                  >
                    <option value="Teoria (PDF)" className="bg-[#0F172A]">Teoria (PDF)</option>
                    <option value="Vídeo" className="bg-[#0F172A]">Vídeoaula</option>
                    <option value="Questões" className="bg-[#0F172A]">Resolução de Questões</option>
                    <option value="Revisão" className="bg-[#0F172A]">Revisão Espaçada</option>
                    <option value="Flashcards" className="bg-[#0F172A]">Flashcards</option>
                  </select>
                </div>
              </div>

              {/* Tempo dedicado */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1">Tempo Estudado (minutos)</label>
                <input 
                  type="number" 
                  value={tempoMinutosCustom}
                  onChange={(e) => setTempoMinutosCustom(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none font-mono focus:border-[#C5A059]"
                  required
                />
              </div>

              {/* Seção das Questões */}
              <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded space-y-3">
                <h5 className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-widest block">Exercícios Resolvidos (Banca/Estratégia)</h5>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#94A3B8] block mb-1 font-mono">Total</label>
                    <input 
                      type="number" 
                      min="0"
                      value={questoesResolvidas}
                      onChange={(e) => handleQuestoesResolvidasChange(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2 text-center text-xs font-semibold font-mono text-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 block mb-1 font-mono">Acertos</label>
                    <input 
                      type="number" 
                      min="0"
                      max={questoesResolvidas}
                      value={questoesAcertadas}
                      onChange={(e) => handleQuestoesAcertadasChange(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2 text-center text-xs font-semibold font-mono text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-rose-400 block mb-1 font-mono">Erros</label>
                    <input 
                      type="number" 
                      min="0"
                      value={questoesErradas}
                      readOnly
                      className="w-full bg-[#1E293B]/40 border border-[#2D3748] rounded p-2 text-center text-xs font-semibold font-mono text-rose-400 outline-none select-none opacity-70"
                    />
                  </div>
                </div>
              </div>

              {/* Comentarios */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1">Observações / Tópicos Aprendidos</label>
                <textarea 
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Ex: Teoria de Tomada de Contas Especial fechada. Guardar os limites de alçada do TCU."
                  className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none h-20 resize-none font-sans focus:border-[#C5A059]"
                />
              </div>

              {/* Ações */}
              <div className="flex justify-end space-x-2 pt-2" id="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setMostrarFormLog(false)}
                  className="px-4 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#E2E8F0] border border-[#2D3748] rounded text-xs font-semibold font-sans transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C5A059] text-black font-semibold hover:bg-[#C5A059]/90 rounded text-xs font-sans transition-colors flex items-center gap-1.5 shadow-md shadow-[#C5A059]/10"
                >
                  <CheckSquare size={14} /> Salvar e Avançar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. FOCUSED BACKDROP OVERLAY MODAL */}
      {mostrarModalFoco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#0C0E12]/85 backdrop-blur-md overflow-y-auto animate-fade-in" id="focused-modal-overlay">
          
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-lg w-full md:w-[80%] max-w-6xl shadow-2xl overflow-hidden flex flex-col my-8" id="focused-modal-card">
            
            {/* Modal Header */}
            <div className="border-b border-[#1E293B] px-6 py-4 flex justify-between items-center bg-[#0C0E12]/40">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 ${rodando ? '' : 'hidden'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${rodando ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                  Modo Foco Ativo — {materiaAtiva?.nome}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setMostrarModalFoco(false)}
                className="text-[#64748B] hover:text-white transition-colors p-1.5 hover:bg-[#1E293B] rounded-full cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Minimizar (O timer continuará rodando em background)"
              >
                <span className="hidden sm:inline">Minimizar</span>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Grid 1:3 vertical stack */}
            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-120px)]" id="modal-body-stack">
              
              {/* Linha 1: Contexto (Esquerda) e Cronômetro (Direita) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="modal-row-context-timer">
                
                {/* Coluna Esquerda: Contexto */}
                <div className="lg:col-span-6 bg-[#0C0E12] border border-[#1E293B] rounded p-5 space-y-4 flex flex-col justify-between" id="modal-col-lesson">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span 
                          className="text-[10px] font-mono font-black uppercase tracking-widest text-white px-2.5 py-0.5 rounded inline-block"
                          style={{ backgroundColor: materiaAtiva?.cor || '#3b82f6' }}
                        >
                          {materiaAtiva?.sigla || 'TCU'}
                        </span>
                        <h3 className="text-lg font-display font-medium text-white">{materiaAtiva?.nome}</h3>
                      </div>

                      <div className="flex space-x-1.5" id="modal-cycle-navigation">
                        <button 
                          onClick={handleAnteriorItemCiclo}
                          className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-2.5 py-1 rounded text-[11px] font-semibold border border-[#1E293B] transition-colors cursor-pointer active:scale-[0.96]"
                        >
                          ⬅️ Ant
                        </button>
                        <button 
                          onClick={handleProximoItemCiclo}
                          className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-2.5 py-1 rounded text-[11px] font-semibold border border-[#1E293B] transition-colors cursor-pointer active:scale-[0.96]"
                        >
                          Próx ➡️
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-[#1E293B]/50 pt-3 space-y-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#64748B] block">
                        Tópico do Estratégia Concursos Vinculado:
                      </label>
                      <select 
                        value={aulaSelecionadaId} 
                        onChange={(e) => setAulaSelecionadaId(e.target.value)}
                        className="w-full bg-[#1E293B] border border-[#2D3748] rounded px-3 py-2 text-sm text-[#E2E8F0] outline-none focus:border-[#C5A059] font-sans transition-all"
                      >
                        {(materiaAtiva?.aulas || []).map(a => (
                          <option key={a.id} value={a.id} className="bg-[#0F172A] text-[#E2E8F0]">
                            Aula {a.numero.toString().padStart(2, '0')} - {a.titulo} ({a.status})
                          </option>
                        ))}
                      </select>

                      {(() => {
                        const aulaInfo = materiaAtiva?.aulas?.find(a => a.id === aulaSelecionadaId);
                        if (!aulaInfo) return null;
                        const qResolv = aulaInfo.questoesResolvidas || 0;
                        const qAcert = aulaInfo.questoesAcertadas || 0;
                        const qErr = aulaInfo.questoesErradas || 0;
                        const pct = qResolv > 0 ? Math.round((qAcert / qResolv) * 100) : 0;
                        const target = obterMetaMateria(materiaAtiva);

                        return (
                          <div className="bg-[#0F172A] p-3.5 rounded border border-[#1E293B] w-full space-y-2.5" id="modal-lesson-stats">
                            {/* Sessão Anterior */}
                            <div className="flex flex-col sm:flex-row sm:items-center text-xs font-mono gap-1.5 sm:gap-4 border-b border-[#1E293B]/50 pb-2.5">
                              <span className="text-[#C5A059] font-bold sm:w-[130px] w-full shrink-0">Sessão Anterior:</span>
                              {ultimoLog ? (
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 flex-1">
                                  <span className="text-[#E2E8F0] bg-[#1E293B] px-1.5 py-0.5 rounded text-[10px] font-sans font-bold sm:w-[105px] w-auto text-center shrink-0">{ultimoLog.tipo}</span>
                                  {ultimoLog.questoesResolvidas > 0 ? (
                                    (() => {
                                      const pctUltimo = Math.round((ultimoLog.questoesAcertadas / ultimoLog.questoesResolvidas) * 100);
                                      return (
                                        <>
                                          <span className="text-white font-bold sm:w-[110px] w-auto shrink-0">{ultimoLog.questoesResolvidas} questões</span>
                                          <span className="text-emerald-400 sm:w-[90px] w-auto shrink-0">{ultimoLog.questoesAcertadas} acertos</span>
                                          <span className="text-rose-400 sm:w-[80px] w-auto shrink-0">{ultimoLog.questoesErradas} erros</span>
                                          <span className={`font-bold flex-1 ${pctUltimo >= target ? 'text-emerald-400' : 'text-amber-500'}`}>
                                            {pctUltimo}% aproveitamento
                                          </span>
                                        </>
                                      );
                                    })()
                                  ) : (
                                    <>
                                      <span className="text-slate-300 font-semibold sm:w-[110px] w-auto shrink-0">{ultimoLog.duracaoMinutos} min</span>
                                      <span className="text-[#64748B] italic flex-1">Nenhuma questão realizada nesta sessão</span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#64748B] italic">Você ainda não estudou esta aula.</span>
                              )}
                            </div>

                            {/* Histórico Acumulado */}
                            <div className="flex flex-col sm:flex-row sm:items-center text-xs font-mono gap-1.5 sm:gap-4 pt-0.5">
                              <span className="text-[#64748B] font-bold sm:w-[130px] w-full shrink-0">Total Acumulado:</span>
                              {qResolv > 0 ? (
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 flex-1">
                                  <span className="text-[#64748B] bg-[#1E293B]/65 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold sm:w-[105px] w-auto text-center shrink-0">Geral</span>
                                  <span className="text-white font-bold sm:w-[110px] w-auto shrink-0">{qResolv} questões</span>
                                  <span className="text-emerald-400 sm:w-[90px] w-auto shrink-0">{qAcert} acertos</span>
                                  <span className="text-rose-400 sm:w-[80px] w-auto shrink-0">{qErr} erros</span>
                                  <span className={`font-bold flex-1 ${pct >= target ? 'text-emerald-400' : 'text-amber-500'}`}>
                                    {pct}% aproveitamento (Meta: {target}%)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[#64748B] italic">Nenhuma questão realizada nesta aula.</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Tempo / Cronômetro */}
                <div className="lg:col-span-6 bg-[#0C0E12] border border-[#1E293B] rounded p-5 flex flex-col items-center justify-between space-y-4" id="modal-row-timer">
                  
                  <div className="flex space-x-1 bg-[#0F172A] p-1 rounded-full border border-[#1E293B]" id="modal-timer-mode-toggle">
                    <button
                      type="button"
                      onClick={() => handleToggleTimerMode(false)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${!modoRegressivo ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
                    >
                      Cronômetro Livre
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTimerMode(true)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${modoRegressivo ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
                    >
                      Temporizador Alvo ({targetMinutos}m)
                    </button>
                  </div>

                  <h2 className="text-4xl sm:text-5xl font-bold font-mono tracking-widest text-[#C5A059] bg-[#0F172A] py-3 rounded border border-[#1E293B] w-full text-center shadow-inner max-w-sm">
                    {formatarTempo(segundos)}
                  </h2>

                  <div className="flex space-x-3 w-full items-center justify-center max-w-md" id="modal-clock-actions">
                    <button
                      type="button"
                      onClick={handleResetCronometro}
                      className="p-3 bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#94A3B8] hover:text-rose-400 border border-[#2D3748] rounded-full transition-all cursor-pointer active:scale-[0.95]"
                      title="Zerar"
                    >
                      <RotateCcw size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className={`flex-1 py-3 rounded-full text-black font-extrabold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-[#C5A059]/10 text-xs uppercase tracking-wider ${rodando ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-[#C5A059] hover:bg-[#C5A059]/90'}`}
                    >
                      {rodando ? (
                        <>
                          <Pause size={14} /> Pausar Foco
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Iniciar Foco
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleConcluirSessaoEstudo}
                      disabled={segundos === 0 && !modoRegressivo}
                      className="px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-full font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-sky-600/10 uppercase tracking-wider"
                    >
                      <CheckSquare size={14} /> Salvar Estudos
                    </button>
                  </div>

                  {/* Horários de Início e Fim */}
                  <div className="flex gap-4 justify-center text-[10px] font-mono text-[#94A3B8] w-full max-w-xs pt-1" id="modal-timer-timestamps">
                    <span className="flex items-center gap-1.5 bg-[#0F172A] border border-[#1E293B] px-3 py-1 rounded text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Início: <strong className="text-white">{horaInicio || '--:--:--'}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#0F172A] border border-[#1E293B] px-3 py-1 rounded text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Pausa: <strong className="text-white">{horaFim || '--:--:--'}</strong>
                    </span>
                  </div>
                </div>

              </div>

              {/* Linha 2: Gabarito de Exercícios (Empilhados Verticalmente Sem Rolagem) */}
              <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-5 space-y-4" id="modal-row-gabarito">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm font-display font-medium text-white flex items-center gap-2">
                      <CheckSquare size={16} className="text-[#C5A059]" />
                      Gabarito em Tempo Real
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Registre acertos/erros durante a resolução. Todos os botões visíveis de uma vez.
                    </p>
                  </div>
                  
                  <div className="flex gap-1.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleToggleLimiteQuestoes}
                      className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-2.5 py-1.5 rounded text-[10px] font-bold font-mono border border-[#1E293B] transition-colors cursor-pointer"
                    >
                      Limite: {limiteQuestoes} Q
                    </button>
                    <button
                      type="button"
                      onClick={handleClearGabarito}
                      className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-rose-400 px-2.5 py-1.5 rounded text-[10px] font-bold font-mono border border-[#1E293B] transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Painéis de Acertos e Erros empilhados verticalmente e sem rolagem interna */}
                <div className="flex flex-col gap-4">
                  
                  {/* Questões Certas */}
                  <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded space-y-3">
                    <div className="flex justify-between items-center border-b border-[#1E293B]/50 pb-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Acertos
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        {acertosMarcados.length}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 pr-1">
                      {Array.from({ length: limiteQuestoes }, (_, i) => i + 1).map(num => {
                        const isActive = acertosMarcados.includes(num);
                        return (
                          <button
                            key={`acerto-modal-${num}`}
                            type="button"
                            onClick={() => handleToggleAcerto(num)}
                            className={`w-8 h-8 rounded-full text-[10px] font-mono font-bold transition-all flex items-center justify-center border cursor-pointer ${
                              isActive
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/15 font-black scale-105'
                                : 'bg-[#0C0E12] text-[#64748B] border-[#1E293B] hover:border-emerald-500/30 hover:text-emerald-400 hover:scale-[1.05]'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Questões Erradas */}
                  <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded space-y-3">
                    <div className="flex justify-between items-center border-b border-[#1E293B]/50 pb-2">
                      <span className="text-[11px] font-mono font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Erros
                      </span>
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full">
                        {errosMarcados.length}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 pr-1">
                      {Array.from({ length: limiteQuestoes }, (_, i) => i + 1).map(num => {
                        const isActive = errosMarcados.includes(num);
                        return (
                          <button
                            key={`erro-modal-${num}`}
                            type="button"
                            onClick={() => handleToggleErro(num)}
                            className={`w-8 h-8 rounded-full text-[10px] font-mono font-bold transition-all flex items-center justify-center border cursor-pointer ${
                              isActive
                                ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/15 font-black scale-105'
                                : 'bg-[#0C0E12] text-[#64748B] border-[#1E293B] hover:border-rose-500/30 hover:text-rose-400 hover:scale-[1.05]'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* 5. PÍLULA FLUTUANTE DE FOCO ATIVO (MINIMIZADO) */}
      {!mostrarModalFoco && (rodando || segundos > 0) && (
        <button
          type="button"
          onClick={() => setMostrarModalFoco(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#0F172A] border border-[#C5A059]/40 hover:border-[#C5A059] text-white px-5 py-3 rounded-full shadow-xl shadow-[#C5A059]/10 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group"
        >
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75 ${rodando ? '' : 'hidden'}`}></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C5A059]"></span>
          </span>
          <span className="font-mono text-sm font-bold text-[#E2E8F0] tracking-wider">
            ⚡ Foco Ativo: <span className="text-[#C5A059]">{formatarTempo(segundos)}</span>
          </span>
        </button>
      )}

    </div>
  );
}
