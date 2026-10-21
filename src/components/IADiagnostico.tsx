import React, { useState, useEffect } from 'react';
import { Materia, Simulado, LogSessao, StatusAula, CicloEstudo, RevisaoEspacada, RedacaoCorrigida } from '../types';
import { Sparkles, BarChart2, CheckCircle, RefreshCcw, BookOpen, Clock, Award, ShieldAlert, AlertTriangle, TrendingUp, RotateCcw, PenTool, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { registrarConsumoTokens } from '../utils/geminiTokenTracker';
import { obterHistoricoRedacoes } from '../utils/redacaoService';


interface IAProps {
  materias: Materia[];
  simulados: Simulado[];
  historico: LogSessao[];
  ciclo?: CicloEstudo | null;
  revisoes?: RevisaoEspacada[];
  planejamentoSemanal?: any;
}

export default function IADiagnostico({ materias, simulados, historico, ciclo, revisoes = [], planejamentoSemanal }: IAProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostico, setDiagnostico] = useState<string | null>(() => {
    return localStorage.getItem('superestrategico_ia_diagnostico_recente') || null;
  });
  const [loadingMessage, setLoadingMessage] = useState('');
  const [checklistStatus, setChecklistStatus] = useState<boolean[]>([]);

  // 1. Carga Horária Periodizada (Hoje, 7 dias, 30 dias)
  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

  let horasHoje = 0;
  let horasSemana = 0;
  let horasMes = 0;
  let questoesHoje = 0;
  let acertosHoje = 0;
  let questoesSemana = 0;
  let acertosSemana = 0;

  historico.forEach(log => {
    const dataLog = new Date(log.data);
    const logH = log.duracaoMinutos / 60;
    
    // Hoje
    if (log.data && log.data.substring(0, 10) === hojeStr) {
      horasHoje += logH;
      questoesHoje += (log.questoesResolvidas || 0);
      acertosHoje += (log.questoesAcertadas || 0);
    }
    // 7 dias
    if (dataLog >= seteDiasAtras) {
      horasSemana += logH;
      questoesSemana += (log.questoesResolvidas || 0);
      acertosSemana += (log.questoesAcertadas || 0);
    }
    // 30 dias
    if (dataLog >= trintaDiasAtras) {
      horasMes += logH;
    }
  });

  const percentualAcertosSemana = questoesSemana > 0 ? Math.round((acertosSemana / questoesSemana) * 100) : 0;
  let horasUltimaSemana = horasSemana;

  // Calcular estatísticas totais para enviar e exibir
  let totalHoras = 0;
  let totalQuestoes = 0;
  let totalAcertos = 0;

  // 2. Pior Matéria (Ponto Crítico) e Análise de Ciclos por Matéria
  let piorMateriaNome = "Nenhuma";
  let piorMateriaSigla = "";
  let piorMateriaAcerto = 100;

  const materiasPerformance = materias.map(m => {
    let horas = 0;
    let questoes = 0;
    let acertos = 0;
    
    m.aulas.forEach(a => {
      questoes += (a.questoesResolvidas || 0);
      acertos += (a.questoesAcertadas || 0);
      horas += (a.horasEstudadas || 0);
    });

    const histMateria = historico.filter(h => h.materiaId === m.id);
    const mHorasHist = histMateria.reduce((acc, curr) => acc + (curr.duracaoMinutos / 60), 0);
    const mQuestHist = histMateria.reduce((acc, curr) => acc + (curr.questoesResolvidas || 0), 0);
    const mAcertHist = histMateria.reduce((acc, curr) => acc + (curr.questoesAcertadas || 0), 0);

    const finalHoras = Math.max(horas, mHorasHist);
    const finalQuestoes = Math.max(questoes, mQuestHist);
    const finalAcertos = Math.max(acertos, mAcertHist);

    totalHoras += finalHoras;
    totalQuestoes += finalQuestoes;
    totalAcertos += finalAcertos;

    const taxa = finalQuestoes > 0 ? (finalAcertos / finalQuestoes) * 100 : 0;
    if (finalQuestoes > 0 && taxa < piorMateriaAcerto) {
      piorMateriaAcerto = taxa;
      piorMateriaNome = m.nome;
      piorMateriaSigla = m.sigla;
    }

    // Ciclos da matéria: contagem de logs de estudo nas aulas da matéria
    const ciclosContagem = m.aulas.length > 0
      ? Math.min(...m.aulas.map(aula => histMateria.filter(h => h.aulaId === aula.id).length))
      : 0;

    const metaAcertos = m.metaAcertos !== undefined ? m.metaAcertos : (['CEX', 'AFO', 'AUD'].includes(m.sigla) ? 95 : 90);

    return {
      id: m.id,
      nome: m.nome,
      sigla: m.sigla,
      horas: finalHoras,
      questoes: finalQuestoes,
      acertos: finalAcertos,
      taxaAcerto: Math.round(taxa),
      metaAcertos,
      aulasConcluidas: m.aulas.filter(a => a.status === StatusAula.Concluido).length,
      totalAulas: m.aulas.length,
      ciclosContagem
    };
  });

  // Estatísticas de Ciclo do Edital
  const vezesEditalCiclado = materiasPerformance.length > 0
    ? Math.min(...materiasPerformance.map(m => m.ciclosContagem))
    : 0;
  const materiasZeradas = materiasPerformance.filter(m => m.ciclosContagem === 0);

  // 3. Progresso do Edital
  let totalAulas = 0;
  let aulasConcluidas = 0;
  materias.forEach(m => {
    totalAulas += m.aulas.length;
    aulasConcluidas += m.aulas.filter(a => a.status === StatusAula.Concluido).length;
  });
  const pctEdital = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

  // 4. Status de Revisões Espaçadas
  const revisoesPendentes = revisoes.filter(r => !r.concluida);
  const revisoesAtrasadas = revisoesPendentes.filter(r => new Date(r.dataRevisaoAlvo).getTime() < agora.getTime());
  const revisoesConcluidas = revisoes.filter(r => r.concluida);

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
      const saved = localStorage.getItem('superestrategico_ia_checklist_status');
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
    localStorage.setItem('superestrategico_ia_checklist_status', JSON.stringify(nextStatus));
  };

  const triggerDiagnostic = async () => {
    setLoading(true);
    setLoadingMessage("Analisando seu desempenho holístico em todas as áreas do TCU...");
    
    const steps = [
      "Calculando distribuição de horas periodizadas (Hoje, 7d, 30d)...",
      "Avaliando status do Ciclo de Estudos e quantas vezes o edital foi ciclado...",
      "Cruzando assertividade real por disciplina contra a meta TCU Target (90-95%)...",
      "Auditando fila de repetições espaçadas e quebra da curva do esquecimento...",
      "Checando histórico de redações discursivas, bancas e notas obtidas...",
      "Estruturando plano tático de Auditor de Controle Externo..."
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setLoadingMessage(steps[stepIdx]);
        stepIdx++;
      }
    }, 1500);

    try {
      const userApiKey = localStorage.getItem('superestrategico_user_gemini_api_key');
      let resultText = '';

      // Obter histórico de redações para enriquecer o diagnóstico
      let redacoesHist: RedacaoCorrigida[] = [];
      try {
        redacoesHist = await obterHistoricoRedacoes();
      } catch (e) {
        console.warn('Aviso ao carregar redações para diagnóstico:', e);
      }

      if (userApiKey) {
        // Formatadores dos resumos
        const materiasResumo = materiasPerformance.map(m => {
        const statusMeta = m.questoes > 0 
          ? (m.taxaAcerto >= m.metaAcertos ? `✅ Meta Atingida` : `⚠️ Abaixo da meta (${m.metaAcertos}%)`)
          : `Sem questões`;
        return `- **${m.nome} (${m.sigla})**: ${m.aulasConcluidas}/${m.totalAulas} aulas concluídas. Questões: ${m.questoes}, Acertos: ${m.taxaAcerto}% (Meta TCU Target: ${m.metaAcertos}%) - ${statusMeta} | Ciclos concluídos: ${m.ciclosContagem}x`;
      }).join("\n");

      const simuladosResumo = simulados && simulados.length > 0
        ? simulados.map((s: any) => `- **${s.titulo}** (${s.data}): ${s.questoesAcertadas}/${s.totalQuestoes} acertos (${Math.round((s.questoesAcertadas/s.totalQuestoes)*100)}%)`).join("\n")
        : "Nenhum simulado cadastrado ainda.";

      const redacoesResumo = redacoesHist.length > 0
        ? redacoesHist.slice(0, 5).map(r => `- **${r.concurso || 'TCU'}** (${r.banca || 'FGV'} - ${r.tipo}): Nota ${r.notaGlobal} | Tema: "${r.tema}" (${new Date(r.dataCriacao).toLocaleDateString('pt-BR')})`).join("\n")
        : "Nenhuma redação discursiva realizada ainda.";

      const cicloResumo = ciclo && ciclo.itens && ciclo.itens.length > 0
        ? `Ciclo: "${ciclo.nome}", contendo ${ciclo.itens.length} matérias coordenadas. Matéria no ponteiro atual: ${ciclo.itens[ciclo.itemAtualIndice]?.materiaId || 'Início'}. Edital ciclado integralmente: ${vezesEditalCiclado} vezes. Disciplinas zeradas no ciclo: ${materiasZeradas.length > 0 ? materiasZeradas.map(m => m.sigla).join(', ') : 'Nenhuma'}.`
        : "Ciclo de estudos não configurado.";

      const revisoesResumo = `Total: ${revisoes.length} revisões cadastradas. Pendentes: ${revisoesPendentes.length}, Atrasadas (risco de curva do esquecimento): ${revisoesAtrasadas.length}, Dominadas/Concluídas: ${revisoesConcluidas.length}.`;

      const cronogramaResumo = planejamentoSemanal && typeof planejamentoSemanal === 'object'
        ? `Meta semanal de estudo: ${planejamentoSemanal.horasMetaSemanal || 119}h planejadas. Carga cumprida nos últimos 7 dias: ${horasSemana.toFixed(1)}h (${questoesSemana} questões, ${percentualAcertosSemana}% de acerto).`
        : `Carga cumprida nos últimos 7 dias: ${horasSemana.toFixed(1)}h (${questoesSemana} questões, ${percentualAcertosSemana}% de acerto).`;

      const periodizadasResumo = `- **Hoje**: ${horasHoje.toFixed(1)}h de estudo ativo, ${questoesHoje} questões resolvidas (${acertosHoje} acertos).
- **Últimos 7 dias**: ${horasSemana.toFixed(1)}h de estudo ativo, ${questoesSemana} questões resolvidas (${percentualAcertosSemana}% de assertividade).
- **Últimos 30 dias**: ${horasMes.toFixed(1)}h acumuladas.`;

      const prompt = `Você é um Coach e Mentor altamente especializado no concurso de Auditor Federal de Controle Externo do TCU (Tribunal de Contas da União), a carreira de auditoria e controle mais exigente do país.
Analise a telemetria integral de todas as áreas da plataforma do aluno (Painel Geral, Ciclo de Estudos, Histórico de Ciclos, Cronograma Semanal, Material do Estratégia, Revisões Espaçadas, Simulados da Banca e Redações Discursivas) e elabore um diagnóstico tático completo de alto impacto.

### 1. Repartição de Horas Periodizadas (Gráfico Horizontal de Foco):
${periodizadasResumo}

### 2. Status do Ciclo de Estudos e Histórico de Ciclos:
${cicloResumo}
- Total de sessões/blocos de foco coordenados: ${historico.length} sessões.

### 3. Índice de Acertos e Erros por Disciplina (TCU Target - 90% a 95%):
${materiasResumo}
- Ponto mais vulnerável no momento: ${piorMateriaNome} (${piorMateriaSigla}) com ${Math.round(piorMateriaAcerto)}% de acerto.
- Média geral de todas as matérias: ${totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0}% (${totalAcertos} acertos em ${totalQuestoes} questões resolvidas ao longo de ${totalHoras.toFixed(1)}h de estudo).

### 4. Curva do Esquecimento e Revisões Espaçadas:
${revisoesResumo}

### 5. Cronograma Semanal e Ritmo de Execução:
${cronogramaResumo}

### 6. Simulados da Banca:
${simuladosResumo}

### 7. Mentor de Redação IA (Treinamento Discursivo):
${redacoesResumo}

---

### Instruções Cruciais de Estrutura da Resposta:
Você deve estruturar seu laudo técnico exatamente com os delimitadores de tag indicados abaixo. Não coloque nenhum texto fora delas:

[DIAGNOSTICO_GERAL]
(Apresente uma análise holística da evolução do aluno. Avalie as Horas Periodizadas (Hoje vs 7 dias vs 30 dias), o ritmo no Cronograma Semanal, a velocidade de cobertura do edital e o volume de sessões coordenadas do Ciclo de Estudos. Destaque se o ritmo atual é sustentável para a aprovação no TCU.)

[ALERTA_FRAQUEZA]
(Identifique pontualmente as maiores ameaças estatísticas: matérias abaixo da meta TCU Target de 90-95%, disciplinas negligenciadas ou zeradas no ciclo, revisões espaçadas vencidas/atrasadas com quebra da curva do esquecimento e defasagem no treino discursivo de redação.)

[RECOMENDACOES]
(Forneça diretrizes práticas de engenharia de estudos: como reorganizar os blocos de 90 minutos do ciclo, calibrar as revisões atrasadas de 24h/7d/30d, elevar a assertividade nas disciplinas-chave como Controle Externo/AFO/Auditoria e equilibrar o tempo entre resolução de questões e confecção de peças/redações discursivas.)

[PASSOS]
- [ ] Passo 1
- [ ] Passo 2
- [ ] Passo 3
(Defina 3 passos de ação corretiva de implementação imediata para o dia de hoje. Use estritamente o formato de tarefas do Markdown: "- [ ] Texto do passo").

Mantenha uma linguagem incisiva, analítica, profissional e focada no mais alto padrão de desempenho exigido pelo TCU.`;

        const safetySettings = [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ];

        const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite'];
        let response: Response | null = null;
        let data: any = {};
        let lastError = '';
        let usedModel = '';

        for (const currentModel of modelsToTry) {
          try {
            usedModel = currentModel;
            // No loading message setter for IADiagnostico, it uses a generic loading state
            
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${userApiKey}`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings
              })
            });
            
            data = await response.json().catch(() => ({}));
            
            if (response.ok) {
              lastError = '';
              break;
            } else {
              lastError = data.error?.message || `Erro HTTP ${response.status}`;
              console.warn(`Falha ao usar o modelo ${currentModel}: ${lastError}`);
              
              if (response.status === 400 || response.status === 403 || lastError.toLowerCase().includes('key') || lastError.toLowerCase().includes('invalid')) {
                break;
              }
            }
          } catch (fetchErr: any) {
            lastError = fetchErr.message || 'Erro de rede';
            console.warn(`Erro de rede ao usar o modelo ${currentModel}: ${lastError}`);
          }
        }

        if (!response || !response.ok) {
          const errorMsg = lastError || 'Erro desconhecido ao se comunicar com a API do Gemini';
          const isQuota = (response && response.status === 429) || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit');
          const isHighDemand = (response && response.status === 503) || errorMsg.toLowerCase().includes('demand') || errorMsg.toLowerCase().includes('overload') || errorMsg.toLowerCase().includes('busy');
          
          if (isQuota) {
            throw new Error(`Limite de cota excedido no Google AI Studio (Erro 429). Se você está usando uma chave gratuita do Gemini, por favor aguarde cerca de 1 minuto antes de tentar novamente, ou ative o faturamento (Pay-as-you-go) no seu painel para obter limites maiores.`);
          }
          
          if (isHighDemand) {
            throw new Error(`Os servidores do Gemini estão sob alta demanda neste momento. Por favor, aguarde alguns instantes e tente novamente.`);
          }
          
          throw new Error(errorMsg);
        }

        const candidate = data.candidates?.[0];
        resultText = candidate?.content?.parts?.[0]?.text || '';
        
        if (!resultText && candidate) {
          const reason = candidate.finishReason;
          if (reason === 'SAFETY') {
            throw new Error('A resposta foi bloqueada pelos filtros de segurança da API do Gemini.');
          } else if (reason && reason !== 'STOP') {
            throw new Error(`Geração interrompida prematuramente pela API (Motivo: ${reason}).`);
          }
        }

        if (data?.usageMetadata) {
          registrarConsumoTokens({
            feature: 'diagnostico',
            featureName: 'Diagnóstico de Estudos',
            model: usedModel || 'gemini-3.5-flash',
            promptTokens: data.usageMetadata.promptTokenCount,
            candidatesTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount
          });
        }
      } else {
        const { data: authData } = await supabase.auth.getSession();
        const token = authData?.session?.access_token;

        const response = await fetch("/api/diagnostico", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(userApiKey ? { "X-Gemini-Api-Key": userApiKey } : {})
          },
          body: JSON.stringify({
            materias,
            simulados,
            historico,
            totalHoras,
            totalQuestoes,
            totalAcertos,
            ciclo,
            revisoes,
            planejamentoSemanal,
            redacoes: redacoesHist,
            horasPeriodizadas: {
              hoje: horasHoje,
              semana: horasSemana,
              mes: horasMes,
              questoesHoje,
              acertosHoje,
              questoesSemana,
              acertosSemana
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Erro HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.diagnostico) {
          resultText = result.diagnostico;
          if (result.usageMetadata) {
            registrarConsumoTokens({
              feature: 'diagnostico',
              featureName: 'Diagnóstico de Estudos',
              model: 'gemini-3.5-flash',
              promptTokens: result.usageMetadata.promptTokenCount,
              candidatesTokens: result.usageMetadata.candidatesTokenCount,
              totalTokens: result.usageMetadata.totalTokenCount
            });
          }
        } else {
          throw new Error(result.error || "Erro retornado do servidor de IA.");
        }
      }

      clearInterval(interval);

      if (resultText) {
        setDiagnostico(resultText);
        localStorage.setItem('superestrategico_ia_diagnostico_recente', resultText);
      } else {
        setDiagnostico("⚠️ Não foi possível retornar o laudo do Tutor Coach. Verifique se há dados suficientes.");
      }
    } catch (e: any) {
      clearInterval(interval);
      console.error(e);
      setDiagnostico(`❌ Falha na conexão com a inteligência do IA Coach: ${e.message || 'Erro de rede'}`);
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
            Consultor de Estudos IA Coach
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
            <h4 className="text-sm font-bold text-white font-display">O IA Coach está processando suas planilhas...</h4>
            <p className="text-xs text-[#94A3B8] font-sans italic max-w-md mx-auto">"{loadingMessage}"</p>
          </div>
        </div>
      )}

      {/* RENDERIZADOR DO DIAGNÓSTICO DE IA */}
      {!loading && diagnostico && secoes && (
        <div className="space-y-6 animate-scale-up" id="ai-results-panel">
          
          {/* BARRA DE METRICAS RAPIDAS (ROW 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ai-metricas-rapidas">
            
            {/* Carga de Horas Periodizadas */}
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
                <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">Horas Periodizadas</span>
                <span className="text-xs font-bold block">
                  Hoje: {horasHoje.toFixed(1)}h • 7d: {horasSemana.toFixed(1)}h • 30d: {horasMes.toFixed(1)}h
                </span>
              </div>
            </div>

            {/* Matéria Frágil (TCU Target) */}
            <div className="p-4 bg-slate-900/40 border border-[#1E293B] rounded flex items-center gap-3.5 text-[#E2E8F0]">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-full shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div className="font-sans">
                <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">Ponto Crítico (TCU Target)</span>
                <span className="text-xs font-bold block">
                  {piorMateriaSigla 
                    ? `🔥 ${piorMateriaSigla} (${Math.round(piorMateriaAcerto)}% vs 90-95%)` 
                    : '📚 Sem dados de acerto'
                  }
                </span>
              </div>
            </div>

            {/* Cobertura de Edital & Ciclos */}
            <div className="p-4 bg-slate-900/40 border border-[#1E293B] rounded flex items-center gap-3.5 text-[#E2E8F0]">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-full shrink-0">
                <RotateCcw size={16} />
              </div>
              <div className="flex-1 font-sans">
                <span className="text-[9px] text-[#64748B] block font-mono uppercase tracking-wider">Edital ({pctEdital}%) • Ciclos ({vezesEditalCiclado}x)</span>
                <div className="flex items-center gap-2 mt-0.5">
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
                    <h3 className="text-xs font-mono font-bold tracking-widest uppercase">Zonas de Vulnerabilidade por Disciplina</h3>
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
