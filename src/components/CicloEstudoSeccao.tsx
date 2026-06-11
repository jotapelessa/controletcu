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
  ChevronRight
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
  const [segundos, setSegundos] = useState(0);
  const [rodando, setRodando] = useState(false);
  const [modoRegressivo, setModoRegressivo] = useState(false);
  
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
  const [tipoEstudo, setTipoEstudo] = useState<'Teoria (PDF)' | 'Vídeo' | 'Questões' | 'Revisão'>('Teoria (PDF)');
  const [comentarios, setComentarios] = useState('');
  const [tempoMinutosCustom, setTempoMinutosCustom] = useState(targetMinutos);

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
          if (modoRegressivo) {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setRodando(false);
              setMostrarFormLog(true);
              return targetMinutos * 60;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
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
    setRodando(!rodando);
  };

  // Resetar cronômetro
  const handleResetCronometro = () => {
    setRodando(false);
    if (modoRegressivo) {
      setSegundos(targetMinutos * 60);
    } else {
      setSegundos(0);
    }
  };

  // Alternar entre contar tempo (Progressivo) ou Cronômetro Alvo do Ciclo (Regressivo)
  const handleToggleTimerMode = (regressivo: boolean) => {
    setRodando(false);
    setModoRegressivo(regressivo);
    if (regressivo) {
      setSegundos(targetMinutos * 60);
    } else {
      setSegundos(0);
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
    setModoRegressivo(false);
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
    setModoRegressivo(false);
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

    // Resetar campos
    setMostrarFormLog(false);
    setQuestoesResolvidas(0);
    setQuestoesAcertadas(0);
    setQuestoesErradas(0);
    setComentarios('');
    setSegundos(0);
    setRodando(false);

    alert("Excelente! Sessão de estudos salva e vinculada ao material Estratégia TCU. O ciclo sugere avançar de matéria!");
    handleProximoItemCiclo();
  };

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
    const sigla = m.sigla;
    if (['CEX', 'AFO', 'AUD'].includes(sigla)) return 85; 
    return 80;
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
          {/* Seção Cronômetro */}
          <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-sm flex flex-col justify-between space-y-6" id="active-study-timer-box">
            
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
                  className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-3 py-1.5 rounded-sm text-xs font-medium border border-[#1E293B] transition-colors"
                >
                  ⬅️ Anterior
                </button>
                <button 
                  onClick={handleProximoItemCiclo}
                  className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#C5A059] px-3 py-1.5 rounded-sm text-xs font-medium border border-[#1E293B] transition-colors"
                >
                  Próximo ➡️
                </button>
              </div>
            </div>

            {/* Escolha da Aula Ativa dO Estratégia */}
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
              <p className="text-[10px] text-[#64748B] flex items-center gap-1.5 leading-normal">
                <BookOpen size={12} className="text-[#C5A059]" />
                Ligar o timer a uma aula específica ajudará o sistema a recalcular seu índice de acertos e horas consolidadas por assunto estudado.
              </p>
            </div>

            {/* mostrador Gigante do Tempo */}
            <div className="flex flex-col items-center justify-center py-6 space-y-5" id="giant-clock-container">
              <div className="flex space-x-1.5 bg-[#0C0E12] p-1 rounded border border-[#1E293B]" id="timer-mode-toggle">
                <button
                  type="button"
                  onClick={() => handleToggleTimerMode(false)}
                  className={`px-4 py-1.5 rounded-sm text-xs font-semibold tracking-wide transition-all ${!modoRegressivo ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
                >
                  Cronômetro livre
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTimerMode(true)}
                  className={`px-4 py-1.5 rounded-sm text-xs font-semibold tracking-wide transition-all ${modoRegressivo ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
                >
                  Temporizador Alvo ({targetMinutos}m)
                </button>
              </div>

              <h2 className="text-6xl sm:text-7xl font-bold font-mono tracking-widest text-[#C5A059] bg-[#0C0E12] px-10 py-6 rounded border border-[#1E293B] max-w-sm w-full text-center shadow-inner">
                {formatarTempo(segundos)}
              </h2>

              <div className="flex space-x-3.5 items-center" id="clock-trigger-actions">
                <button
                  type="button"
                  onClick={handleResetCronometro}
                  className="p-3 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-rose-400 border border-[#1E293B] rounded-full transition-all"
                  title="Zerar"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className={`px-8 py-3.5 rounded-full text-white font-extrabold flex items-center gap-2 transition-all hover:scale-[1.02] ${rodando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#C5A059] hover:bg-[#C5A059]/90 text-black'}`}
                >
                  {rodando ? (
                    <>
                      <Pause size={18} /> Pausar Estudo
                    </>
                  ) : (
                    <>
                      <Play size={18} /> Iniciar Foco
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleConcluirSessaoEstudo}
                  disabled={segundos === 0 && !modoRegressivo}
                  className="px-5 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full font-semibold text-sm flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <CheckSquare size={16} /> Logar Estudo
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
                <h3 className="text-3xl font-bold font-display text-emerald-400">80% - 85%</h3>
                <span className="text-xs text-[#94A3B8] font-mono">de acertos FGV</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed mt-2 font-mono">
                Nível mínimo recomendado para disputar o topo da classificação.
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
                    <h5 className="text-[10px] font-mono font-bold text-[#64748B] mb-3 uppercase tracking-wide">Ciclos de Estudo por Aula:</h5>
                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                      {materiaAnaliticaObjeto.aulas.map(aula => {
                        const contagemAula = logsMateriaAnalitica.filter(l => l.aulaId === aula.id).length;
                        return (
                          <div 
                            key={aula.id} 
                            className={`text-[11px] font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all ${contagemAula > 0 ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]' : 'bg-[#1E293B]/20 border-[#1E293B] text-[#64748B]'}`}
                            title={`${aula.titulo}: ${contagemAula} vezes estudada`}
                          >
                            <span className="font-bold">A{aula.numero.toString().padStart(2, '0')}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className="font-semibold">{contagemAula}x</span>
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

                              {/* Estado Conforme Target FGV */}
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
                      Passe o mouse por cima das barras verticais para visualizar o índice de cada ciclo sequenciado deste assunto Estratégia TCU. Use essa tendência analítica para verificar se o seu aproveitamento de véspera da FGV está aumentando ou diminuindo!
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
        <div className="fixed inset-0 bg-[#0C0E12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="study-session-log-modal">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded w-full max-w-lg p-6 shadow-2xl relative">
            
            <h3 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-2">
              <ListPlus size={20} className="text-[#C5A059]" />
              Salvar Registro de Estudo (TCU Auditor)
            </h3>
            <p className="text-xs text-[#94A3B8] mb-6 font-sans">
              Insira os dados da sua última sessão para manter o edital e taxas de erros atualizados.
            </p>

            <form onSubmit={handleSubmitSessao} className="space-y-4">
              
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
                <h5 className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-widest block">Exercícios Resolvidos (FGV/Estratégia)</h5>
                
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

    </div>
  );
}
