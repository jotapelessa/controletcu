import React, { useState } from 'react';
import { Materia, Simulado, LogSessao } from '../types';
import { Sparkles, BarChart2, CheckCircle, RefreshCcw, BookOpen, Clock, Award, ShieldAlert } from 'lucide-react';

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

  // Calcular estatísticas totais para enviar
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

  const triggerDiagnostic = async () => {
    setLoading(true);
    setLoadingMessage("Analisando seu desempenho e consolidação do edital do Estratégia...");
    
    // Simulação de passos de IA para deixar o carregador mega envolvente
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
      {!loading && diagnostico && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-sm relative animate-scale-up" id="ai-results-panel">
          
          {/* Header do painel de resultado */}
          <div className="flex justify-between items-center pb-4 border-b border-[#1E293B] mb-6" id="ai-results-header">
            <h3 className="text-xs font-mono font-bold text-[#E2E8F0] flex items-center gap-2 tracking-wider uppercase">
              <Award size={14} className="text-[#C5A059]" />
              Laudo Técnico do Coach (TCU Auditor)
            </h3>
            <button
              onClick={triggerDiagnostic}
              className="text-[11px] font-bold text-[#C5A059] hover:text-[#C5A059]/90 flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-[#2D3748] px-3 py-1.5 rounded transition-all font-sans cursor-pointer"
            >
              <RefreshCcw size={11} /> Recalcular Laudo
            </button>
          </div>

          {/* Área de Texto do Markdown renderizado */}
          <div className="prose prose-invert max-w-none text-[#E2E8F0] leading-relaxed font-sans space-y-1" id="markdown-response-container">
            {renderMarkdown(diagnostico)}
          </div>

          <div className="bg-[#1E293B]/20 p-4 rounded mt-6 border border-[#2D3748] text-[10px] text-[#94A3B8] leading-relaxed flex items-start gap-2.5 font-sans">
            <CheckCircle size={14} className="text-[#C5A059] shrink-0 mt-0.5" />
            <p>
              Este laudo foi gerado interpretando o conteúdo programático real das respectivas aulas de <strong>AFO, Direito Constitucional, Administrativo, TI e Controle Externo</strong> do material preparatório principal da banca. A inteligência de estudos considera aprovação com margem de segurança de ~82% de acertos gerais em simulados FGV.
            </p>
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
