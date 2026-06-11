import React, { useState, useEffect } from 'react';
import { Materia, Simulado, LogSessao, StatusAula } from '../types';
import { Sparkles, BarChart2, CheckCircle, RefreshCcw, BookOpen, Clock, Award, ShieldAlert, AlertTriangle, TrendingUp } from 'lucide-react';


interface IAProps {
  materias: Materia[];
  simulados: Simulado[];
  historico: LogSessao[];
}

export default function IADiagnostico({ materias, simulados, historico }: IAProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostico, setDiagnostico] = useState<string | null>(() => {
    return localStorage.getItem('tcu_ia_diagnostico_recente') || null;
  });
  const [loadingMessage, setLoadingMessage] = useState('');
  const [checklistStatus, setChecklistStatus] = useState<boolean[]>([]);

  // Calcular estatísticas totais para enviar e exibir
  let totalHoras = 0;
  let totalQuestoes = 0;
  let totalAcertos = 0;

  materias.forEach(m => {
    m.aulas.forEach(a => {
      totalQuestoes += (a.questoesResolvidas || 0);
      totalAcertos += (a.questoesAcertadas || 0);
      totalHoras += (a.horasEstudadas || 0);
    });
  });

  // 1. Carga Horária nos últimos 7 dias
  const agora = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(agora.getDate() - 7);
  
  let horasUltimaSemana = 0;
  historico.forEach(log => {
    const dataLog = new Date(log.data);
    if (dataLog >= seteDiasAtras && dataLog <= agora) {
      horasUltimaSemana += log.duracaoMinutos / 60;
    }
  });

  // 2. Pior Matéria (Ponto Crítico)
  let piorMateriaNome = "Nenhuma";
  let piorMateriaSigla = "";
  let piorMateriaAcerto = 100;
  
  materias.forEach(m => {
    let resolv = 0;
    let acert = 0;
    m.aulas.forEach(a => {
      resolv += (a.questoesResolvidas || 0);
      acert += (a.questoesAcertadas || 0);
    });
    
    if (resolv > 0) {
      const taxa = (acert / resolv) * 100;
      if (taxa < piorMateriaAcerto) {
        piorMateriaAcerto = taxa;
        piorMateriaNome = m.nome;
        piorMateriaSigla = m.sigla;
      }
    }
  });

  // 3. Progresso do Edital
  let totalAulas = 0;
  let aulasConcluidas = 0;
  materias.forEach(m => {
    totalAulas += m.aulas.length;
    aulasConcluidas += m.aulas.filter(a => a.status === StatusAula.Concluido).length;
  });
  const pctEdital = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

  // Parser de Seções do Diagnóstico
  const obterDiagnosticoEstruturado = (text: string | null) => {
    if (!text) return null;

    const secoes = {
      geral: '',
      alerta: '',
      recomendacoes: '',
      passos: [] as string[]
    };

    const idxGeral = text.indexOf('[DIAGNOSTICO_GERAL]');
    const idxAlerta = text.indexOf('[ALERTA_FRAQUEZA]');
    const idxRecomendacoes = text.indexOf('[RECOMENDACOES]');
    const idxPassos = text.indexOf('[PASSOS]');

    if (idxGeral === -1 && idxAlerta === -1 && idxRecomendacoes === -1 && idxPassos === -1) {
      secoes.geral = text;
      return secoes;
    }

    const obterSubtexto = (inicioIdx: number, fimIdx: number) => {
      if (inicioIdx === -1) return '';
      const sub = text.substring(inicioIdx);
      const nextLineIdx = sub.indexOf('\n');
      const start = inicioIdx + (nextLineIdx !== -1 ? nextLineIdx + 1 : 0);
      const end = fimIdx !== -1 ? fimIdx : text.length;
      return text.substring(start, end).trim();
    };

    secoes.geral = obterSubtexto(idxGeral, idxAlerta !== -1 ? idxAlerta : (idxRecomendacoes !== -1 ? idxRecomendacoes : idxPassos));
    secoes.alerta = obterSubtexto(idxAlerta, idxRecomendacoes !== -1 ? idxRecomendacoes : idxPassos);
    secoes.recomendacoes = obterSubtexto(idxRecomendacoes, idxPassos);
    
    const passosTexto = obterSubtexto(idxPassos, -1);
    if (passosTexto) {
      const linhas = passosTexto.split('\n');
      linhas.forEach(linha => {
        const trimmed = linha.trim();
        if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('* [ ]') || trimmed.startsWith('* [x]')) {
          secoes.passos.push(trimmed.replace(/^[-*]\s*\[[ x]\]\s*/i, '').trim());
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          secoes.passos.push(trimmed.replace(/^[-*]\s*/, '').trim());
        } else if (trimmed.length > 3 && !trimmed.startsWith('[PASSOS]')) {
          secoes.passos.push(trimmed);
        }
      });
    }

    return secoes;
  };

  const secoes = obterDiagnosticoEstruturado(diagnostico);

  useEffect(() => {
    if (secoes && secoes.passos.length > 0) {
      const saved = localStorage.getItem('tcu_ia_checklist_status');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === secoes.passos.length) {
            setChecklistStatus(parsed);
            return;
          }
        } catch(e) {}
      }
      setChecklistStatus(new Array(secoes.passos.length).fill(false));
    }
  }, [diagnostico]);

  const toggleChecklist = (idx: number) => {
    const nextStatus = [...checklistStatus];
    nextStatus[idx] = !nextStatus[idx];
    setChecklistStatus(nextStatus);
    localStorage.setItem('tcu_ia_checklist_status', JSON.stringify(nextStatus));
  };

  const triggerDiagnostic = async () => {
    setLoading(true);
    setLoadingMessage("Analisando seu desempenho e consolidação do edital do Estratégia...");
    
    const steps = [
      "Calculando média harmônica de erros na banca FGV...",
      "Cruzando seu histórico de Controle Externo (RITCU) com o de AFO...",
      "Avaliando curvas de esquecimento das revisões espaçadas pendentes...",
      "Consolidando relatórios fiscais do TCU e pontos de peso no Edital...",
      "Sistematizando plano de ação de Auditoria Governamental..."
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setLoadingMessage(steps[stepIdx]);
        stepIdx++;
      }
    }, 1500);

    try {
      const response = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materias,
          simulados,
          historico,
          totalHoras,
          totalQuestoes,
          totalAcertos
        })
      });

      const result = await response.json();
      clearInterval(interval);

      if (result.success && result.diagnostico) {
        setDiagnostico(result.diagnostico);
        localStorage.setItem('tcu_ia_diagnostico_recente', result.diagnostico);
      } else {
        setDiagnostico("⚠️ Erro retornado ao contatar o servidor do Diagnóstico Inteligente. Por favor revise seus segredos.");
      }
    } catch (e: any) {
      clearInterval(interval);
      console.error(e);
      setDiagnostico(`❌ Falha na conexão com a inteligência do TCU Coach: ${e.message || 'Erro de rede'}`);
    } finally {
      setLoading(false);
    }
  };

  // MINI PARSER MARKDOWN EXTREMAMENTE ROBUSTO E ELEGANTE PARA REACT 19
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const parseInlineBold = (lineText: string) => {
      const parts = lineText.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) => i % 2 === 1 
        ? <strong key={i} className="text-[#C5A059] font-bold bg-[#C5A059]/10 rounded px-1">{part}</strong> 
        : part
      );
    };

    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Título Nível 1 (#)
      if (trimmed.startsWith('# ')) {
        const cleanText = trimmed.replace('# ', '').trim();
        return <h2 key={idx} className="text-base font-display font-semibold text-white border-l-4 border-[#C5A059] pl-3 mt-6 mb-3 tracking-wide">{parseInlineBold(cleanText)}</h2>;
      }
      
      // Título Nível 2 (##)
      if (trimmed.startsWith('## ')) {
        const cleanText = trimmed.replace('## ', '').trim();
        return (
          <h3 key={idx} className="text-xs font-mono font-bold text-[#C5A059] bg-[#C5A059]/10 uppercase tracking-widest px-3 py-1.5 rounded mt-5 mb-2.5 flex items-center gap-2">
            <Sparkles size={11} className="text-[#C5A059]" />
            {parseInlineBold(cleanText)}
          </h3>
        );
      }

      // Título Nível 3 (###)
      if (trimmed.startsWith('### ')) {
        const cleanText = trimmed.replace('### ', '').trim();
        return <h4 key={idx} className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mt-4 mb-2.5">{parseInlineBold(cleanText)}</h4>;
      }

      // Lista Bullets (- )
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleanText = trimmed.substring(2).trim();
        return (
          <li key={idx} className="ml-5 list-disc text-[#E2E8F0] text-xs my-1.5 leading-relaxed font-sans">
            {parseInlineBold(cleanText)}
          </li>
        );
      }

      // Linha vazia ou quebra
      if (trimmed === '') {
        return <div key={idx} className="h-1.5" />;
      }

      // Linha de citação ou aviso
      if (trimmed.startsWith('> ')) {
        const cleanText = trimmed.replace('> ', '').trim();
        return (
          <div key={idx} className="bg-[#1E293B]/60 border-l-4 border-[#C5A059] p-3 rounded-r my-2.5 text-[#E2E8F0] text-xs font-sans">
            {parseInlineBold(cleanText)}
          </div>
        );
      }

      // Parágrafo Padrão
      return <p key={idx} className="text-[#E2E8F0] text-xs my-1.5 leading-relaxed font-sans">{parseInlineBold(trimmed)}</p>;
    });
  };

  return (
    <div className="space-y-6" id="ia-diagnostico-root">
      
      {/* Box de Entrada de Instrução */}
      <div className="bg-[#0F172A] border border-[#1E293B] text-white rounded p-6 shadow-md relative overflow-hidden" id="ai-coach-banner">
        
        {/* Adorno decorativo de fundo */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <Sparkles size={240} className="stroke-[#C5A059] stroke-2" />
        </div>

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 w-fit px-3 py-1 rounded-full text-[10px] font-mono font-bold text-[#C5A059]">
            <Sparkles size={11} className="animate-pulse text-[#C5A059]" />
            <span>Auditoria Assistida por Inteligência Artificial</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-medium text-white">
            Consultor de Estudos TCU Coach
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
            Com base no seu progresso total do material do <strong>Estratégia Concursos</strong>, histórico recente de simulados da banca e metas das suas repetições espaçadas, nossa IA gera um diagnóstico analítico idêntico ao de um auditor fiscal experiente, ajudando-o a corrigir rotas e blindar seus pontos fracos de memorização antes da prova!
          </p>

          <button
            onClick={triggerDiagnostic}
            disabled={loading}
            className="px-6 py-2.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-bold rounded text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCcw size={14} className="animate-spin" /> Processando Gabaritos...
              </>
            ) : (
              <>
                🎯 Solicitar Auditoria IA do meu Desempenho
              </>
            )}
          </button>
        </div>
      </div>

      {/* TELA DE LOADING DA IA */}
      {loading && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-8 shadow-sm flex flex-col items-center justify-center space-y-4 text-center animate-pulse" id="ai-loading-box">
          <div className="p-4 bg-[#0C0E12] border border-[#2D3748] text-[#C5A059] rounded-full animate-spin">
            <RefreshCcw size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white font-display">O TCU Coach está processando suas planilhas...</h4>
            <p className="text-xs text-[#94A3B8] font-sans italic max-w-md mx-auto">"{loadingMessage}"</p>
          </div>
        </div>
      )}

      {/* RENDERIZADOR DO DIAGNÓSTICO DE IA */}
      {!loading && diagnostico && secoes && (
        <div className="space-y-6 animate-scale-up" id="ai-results-panel">
          
          {/* BARRA DE METRICAS RAPIDAS (ROW 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ai-metricas-rapidas">
            
            {/* Carga de Horas */}
            <div className={`p-4 rounded border flex items-center gap-3.5 ${
              horasUltimaSemana > 50 
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' 
                : horasUltimaSemana > 30 
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300' 
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className={`p-2.5 rounded-full shrink-0 ${
                horasUltimaSemana > 50 
                  ? 'bg-rose-500/10 text-rose-400' 
                  : horasUltimaSemana > 30 
                  ? 'bg-amber-500/10 text-amber-400' 
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                <Clock size={16} className={horasUltimaSemana > 50 ? 'animate-pulse' : ''} />
              </div>
              <div className="font-sans">
                <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">Carga Horária (7d)</span>
                <span className="text-xs font-bold">
                  {horasUltimaSemana > 50 
                    ? `⚠️ Fadiga Crítica (${horasUltimaSemana.toFixed(1)}h)` 
                    : horasUltimaSemana > 30 
                    ? `⚡ Carga Intensa (${horasUltimaSemana.toFixed(1)}h)` 
                    : `✅ Ritmo Saudável (${horasUltimaSemana.toFixed(1)}h)`
                  }
                </span>
              </div>
            </div>

            {/* Matéria Frágil */}
            <div className="p-4 bg-slate-900/40 border border-[#1E293B] rounded flex items-center gap-3.5 text-[#E2E8F0]">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-full shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div className="font-sans">
                <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">Ponto Crítico</span>
                <span className="text-xs font-bold">
                  {piorMateriaSigla 
                    ? `🔥 ${piorMateriaSigla} (${Math.round(piorMateriaAcerto)}% acerto)` 
                    : '📚 Sem dados de acerto'
                  }
                </span>
              </div>
            </div>

            {/* Cobertura de Edital */}
            <div className="p-4 bg-slate-900/40 border border-[#1E293B] rounded flex items-center gap-3.5 text-[#E2E8F0]">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-full shrink-0">
                <TrendingUp size={16} />
              </div>
              <div className="flex-1 font-sans">
                <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">Edital Concluído</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold">{pctEdital}%</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pctEdital}%` }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* GRID BENTO DE CONTEUDO (ROW 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUNA ESQUERDA: DIAGNOSTICO E ALERTAS (7 COLUNAS) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Box 1: Diagnóstico Geral */}
              {secoes.geral && (
                <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1E293B]/80 pb-3">
                    <Award size={16} className="text-[#C5A059]" />
                    <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">Diagnóstico Geral do Coach</h3>
                  </div>
                  <div className="prose prose-invert max-w-none text-[#E2E8F0] leading-relaxed font-sans space-y-1">
                    {renderMarkdown(secoes.geral)}
                  </div>
                </div>
              )}

              {/* Box 2: Alertas de Fraqueza */}
              {secoes.alerta && (
                <div className="bg-gradient-to-br from-slate-950 via-[#0F172A] to-rose-950/15 border border-rose-500/20 rounded p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-rose-950/30 pb-3 text-rose-400">
                    <ShieldAlert size={16} />
                    <h3 className="text-xs font-mono font-bold tracking-widest uppercase">Zonas de Vulnerabilidade FGV</h3>
                  </div>
                  <div className="prose prose-invert max-w-none text-rose-100 leading-relaxed font-sans space-y-1">
                    {renderMarkdown(secoes.alerta)}
                  </div>
                </div>
              )}

            </div>

            {/* COLUNA DIREITA: RECOMENDAÇÕES E CHECKLIST INTERATIVO (5 COLUNAS) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Box 1: Checklist de Próximos Passos */}
              {secoes.passos.length > 0 && (
                <div className="bg-[#0F172A] border border-[#C5A059]/20 rounded p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1E293B]/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-[#C5A059]" />
                      <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">Plano Próximo Passo</h3>
                    </div>
                    <span className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-2 py-0.5 rounded uppercase">
                      Roadmap
                    </span>
                  </div>

                  <p className="text-[11px] text-[#64748B] leading-normal font-sans">
                    Execute estas tarefas hoje mesmo para implementar as recomendações do Coach:
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {secoes.passos.map((passo, pIdx) => {
                      const isCompleted = checklistStatus[pIdx] || false;
                      return (
                        <div 
                          key={pIdx} 
                          onClick={() => toggleChecklist(pIdx)}
                          className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                            isCompleted 
                              ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400/80 line-through' 
                              : 'bg-[#0C0E12] border-[#1E293B] text-white hover:border-[#C5A059]/30'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isCompleted}
                            readOnly
                            className="mt-0.5 rounded border-[#1E293B] text-[#C5A059] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs font-sans font-medium leading-relaxed">
                            {passo}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Box 2: Recomendações Críticas do Ciclo */}
              {secoes.recomendacoes && (
                <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1E293B]/80 pb-3">
                    <BarChart2 size={16} className="text-[#C5A059]" />
                    <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">Recomendações do Ciclo</h3>
                  </div>
                  <div className="prose prose-invert max-w-none text-[#94A3B8] leading-relaxed font-sans space-y-1">
                    {renderMarkdown(secoes.recomendacoes)}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* BOTAO PARA RECALCULAR NO FOOTER */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0F172A] border border-[#1E293B] p-4 rounded gap-4">
            <span className="text-[10px] text-[#64748B] font-mono leading-normal text-center sm:text-left">
              💡 Este laudo foi gerado interpretando o conteúdo real de AFO, Direito Constitucional, Administrativo, TI e Controle Externo.
            </span>
            <button
              onClick={triggerDiagnostic}
              className="w-full sm:w-auto text-[11px] font-bold text-black bg-[#C5A059] hover:bg-[#C5A059]/90 px-4 py-2 rounded transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <RefreshCcw size={11} /> Recalcular Laudo
            </button>
          </div>

        </div>
      )}

      {/* CASO NÃO TENHA DIAGNÓSTICO E NÃO ESTEJA CARREGANDO */}
      {!loading && !diagnostico && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-8 text-center text-[#64748B] space-y-3" id="ai-placeholder-box">
          <Sparkles size={32} className="mx-auto text-[#1E293B] animate-pulse" />
          <h4 className="font-semibold text-white font-display">Laudo Técnico de Auditoria de Estudos</h4>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto font-sans leading-normal">
            Você ainda não solicitou sua auditoria de estudos de IA nesta sessão. Clique no botão de solicitação acima para avaliar o seu aproveitamento do Estratégia!
          </p>
        </div>
      )}

    </div>
  );
}
