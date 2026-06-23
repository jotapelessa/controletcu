import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCcw, AlertTriangle, Send, Copy, Trash2, PenTool, FileText, CheckCircle, HelpCircle, Award, BookOpen, Check, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { RedacaoCorrigida } from '../types';
import { obterHistoricoRedacoes, adicionarRedacaoAoHistorico, removerRedacaoDoHistorico } from '../utils/redacaoService';

interface CorrecaoEstruturada {
  dados: string;
  notaGlobal: string;
  estrutura: string;
  conteudo: string;
  coesao: string;
  normaCulta: string;
  notaBanca: string;
  quadroResumo: string;
  reescritas: string;
  planoEstudo: string;
  textoComentado: string;
  rawText: string;
}

export default function CorrecaoRedacao() {
  const [concurso, setConcurso] = useState('');
  const [banca, setBanca] = useState('');
  const [tipo, setTipo] = useState('');
  const [tema, setTema] = useState('');
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Estado para armazenar o destaque da redação atualmente selecionado (clicado/focado)
  const [destaqueSelecionado, setDestaqueSelecionado] = useState<{
    type: string;
    tooltip: string;
    innerText: string;
  } | null>(null);
  
  // Chave de API do Gemini (armazenada localmente)
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Resultado da correção recente
  const [correcaoRaw, setCorrecaoRaw] = useState<string | null>(() => {
    return localStorage.getItem('superestrategico_redacao_recente') || null;
  });

  // Histórico de redações corrigidas
  const [redacoesHistorico, setRedacoesHistorico] = useState<RedacaoCorrigida[]>([]);
  const [redacaoSelecionadaId, setRedacaoSelecionadaId] = useState<string | null>(null);
  const [sidebarAberta, setSidebarAberta] = useState(true);

  // Aba ativa dentro da visualização da correção
  const [abaResultadoAtiva, setAbaResultadoAtiva] = useState<'nota' | 'comentada' | 'estrutura' | 'gramatica' | 'reescrita' | 'plano' | 'completo'>('nota');

  // Carrega as configurações e o histórico salvas no localStorage/Supabase
  useEffect(() => {
    async function carregarHistorico() {
      const historico = await obterHistoricoRedacoes();
      setRedacoesHistorico(historico);
    }
    carregarHistorico();

    const savedKey = localStorage.getItem('superestrategico_user_gemini_api_key');
    if (savedKey && savedKey.trim() !== '') {
      setApiKey(savedKey);
      setHasApiKey(true);
    } else {
      setHasApiKey(false);
    }

    const savedForm = localStorage.getItem('superestrategico_redacao_form');
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        setConcurso(parsed.concurso || '');
        setBanca(parsed.banca || '');
        setTipo(parsed.tipo || '');
        setTema(parsed.tema || '');
        setTexto(parsed.texto || '');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Salva os campos do formulário para evitar perda de dados
  const salvarFormularioLocal = (newConcurso: string, newBanca: string, newTipo: string, newTema: string, newTexto: string) => {
    localStorage.setItem(
      'superestrategico_redacao_form',
      JSON.stringify({ concurso: newConcurso, banca: newBanca, tipo: newTipo, tema: newTema, texto: newTexto })
    );
  };

  const handleSalvarApiKey = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('superestrategico_user_gemini_api_key', apiKey.trim());
    setHasApiKey(true);
    setShowKeyInput(false);
  };

  const handleRemoverApiKey = () => {
    localStorage.removeItem('superestrategico_user_gemini_api_key');
    setApiKey('');
    setHasApiKey(false);
  };

  const handleLimparCampos = () => {
    setConcurso('');
    setBanca('');
    setTipo('');
    setTema('');
    setTexto('');
    localStorage.removeItem('superestrategico_redacao_form');
  };

  const wordCount = texto.trim() === '' ? 0 : texto.trim().split(/\s+/).length;
  const charCount = texto.length;

  // PARSER DE SEÇÕES DA CORREÇÃO
  const parseCorrecao = (text: string | null): CorrecaoEstruturada | null => {
    if (!text) return null;

    const obterSubtexto = (tagInicio: string, tagFim: string) => {
      const idxInicio = text.indexOf(tagInicio);
      if (idxInicio === -1) return '';
      const start = idxInicio + tagInicio.length;
      
      const idxFim = text.indexOf(tagFim, start);
      if (idxFim === -1) {
        return text.substring(start).trim();
      }
      return text.substring(start, idxFim).trim();
    };

    // Se não tiver pelo menos tags chaves de pontuação e gramática, considera não formatado por tags
    if (text.indexOf('[NORMA_CULTA]') === -1 && text.indexOf('[NOTA_BANCA]') === -1) {
      return null;
    }

    return {
      dados: obterSubtexto('[DADOS_REDACAO]', '[/DADOS_REDACAO]'),
      notaGlobal: obterSubtexto('[NOTA_GLOBAL]', '[/NOTA_GLOBAL]'),
      estrutura: obterSubtexto('[ADEQUACAO_ESTRUTURA]', '[/ADEQUACAO_ESTRUTURA]'),
      conteudo: obterSubtexto('[CONTEUDO_TESE]', '[/CONTEUDO_TESE]'),
      coesao: obterSubtexto('[COESAO_COERENCIA]', '[/COESAO_COERENCIA]'),
      normaCulta: obterSubtexto('[NORMA_CULTA]', '[/NORMA_CULTA]'),
      notaBanca: obterSubtexto('[NOTA_BANCA]', '[/NOTA_BANCA]'),
      quadroResumo: obterSubtexto('[QUADRO_RESUMO]', '[/QUADRO_RESUMO]'),
      reescritas: obterSubtexto('[REESCRITA_ESPECIALISTA]', '[/REESCRITA_ESPECIALISTA]'),
      planoEstudo: obterSubtexto('[PLANO_ESTUDO]', '[/PLANO_ESTUDO]'),
      textoComentado: obterSubtexto('[TEXTO_COMENTADO]', '[/TEXTO_COMENTADO]'),
      rawText: text
    };
  };

  const correcaoEstruturada = parseCorrecao(correcaoRaw);

  const obterValoresNota = (notaStr: string) => {
    if (!notaStr) return { obtida: 0, maxima: 100, pct: 0 };
    const cleanStr = notaStr.replace(/[^\d/.,-]/g, '').trim();
    const parts = cleanStr.split('/');
    if (parts.length === 2) {
      const obtida = parseFloat(parts[0].replace(',', '.').trim());
      const maxima = parseFloat(parts[1].replace(',', '.').trim());
      if (!isNaN(obtida) && !isNaN(maxima) && maxima > 0) {
        return {
          obtida,
          maxima,
          pct: Math.min(100, Math.round((obtida / maxima) * 100))
        };
      }
    }
    return { obtida: 0, maxima: 100, pct: 0 };
  };

  const valoresNota = correcaoEstruturada ? obterValoresNota(correcaoEstruturada.notaGlobal) : null;

  const triggerCorrecao = async () => {
    const userApiKey = localStorage.getItem('superestrategico_user_gemini_api_key');
    if (!userApiKey) {
      setError('Chave de API do Gemini não configurada. Por favor, insira a chave para continuar.');
      return;
    }

    if (!texto.trim()) {
      setError('Por favor, insira o texto da redação para realizar a correção.');
      return;
    }

    setLoading(true);
    setError(null);
    setDestaqueSelecionado(null);
    setLoadingMessage('Iniciando comunicação com o Gemini...');

    // Salva o estado atual do formulário
    salvarFormularioLocal(concurso, banca, tipo, tema, texto);

    // Mensagens de carregamento para engajar o usuário
    const messages = [
      'Lendo o tema proposto e o texto da redação...',
      'Analisando adequação ao gênero textual e estrutura exigida...',
      'Avaliando progressão textual, coesão e coerência...',
      'Escaneando domínio da norma culta e regras gramaticais...',
      'Calculando nota com base nos critérios específicos da banca...',
      'Construindo quadro resumo de pontos fortes e fracos...',
      'Elaborando trechos reescritos didáticos (versão do especialista)...',
      'Desenhando o plano de estudos personalizado para evolução...'
    ];

    let msgIndex = 0;
    const interval = setInterval(() => {
      if (msgIndex < messages.length - 1) {
        msgIndex++;
        setLoadingMessage(messages[msgIndex]);
      }
    }, 4500);

    const prompt = `Você é um corretor de redações de concurso público com conhecimento profundo de todas as bancas brasileiras (CESPE/CEBRASPE, FGV, FCC, VUNESP, ESAF, entre outras) e de todos os gêneros textuais cobrados: dissertação argumentativa, dissertação expositiva, carta, parecer técnico, relatório de auditoria, estudo de caso, nota técnica etc.

Seu objetivo é atuar como um mentor personalizado. Você não apenas corrige o texto; você explica o raciocínio por trás de cada apontamento, ensina as regras e capacita o aluno a pensar como um especialista, capaz de atender a qualquer modelo, inclusive redações de auditoria para concursos como Auditor Fiscal, Analista de Controle Externo, Auditor de Controle Interno etc.

DADOS DA REDAÇÃO DO ALUNO:
- Concurso desejado: ${concurso || 'concurso genérico de nível superior'}
- Banca organizadora: ${banca || 'CESPE'}
- Tipo de redação: ${tipo || 'dissertação argumentativa'}
- Tema proposto pela banca: ${tema || 'Não informado'}
- Texto da redação na íntegra:
${texto}

Caso o aluno não tenha informado algum dado acima, assuma: concurso genérico de nível superior, banca CESPE, dissertação argumentativa.

Você deve obrigatoriamente estruturar sua resposta utilizando os delimitadores de tags listados abaixo. Coloque apenas o conteúdo markdown correspondente dentro de cada par de tags, pois a interface do aluno irá ler essas tags para criar um painel interativo avançado:

[DADOS_REDACAO]
* **Concurso desejado:** ${concurso || 'Genérico de Nível Superior'}
* **Banca organizadora:** ${banca || 'CESPE/CEBRASPE'}
* **Tipo de redação:** ${tipo || 'Dissertação Argumentativa'}
* **Tema proposto:** ${tema || 'Não informado (deduzido a partir da redação)'}
[/DADOS_REDACAO]

[NOTA_GLOBAL]
[Substitua pela nota final no formato: X / Y. Exemplo: 12.00 / 20.00 ou 85 / 100. Use exatamente este padrão numérico com barra]
[/NOTA_GLOBAL]

[TEXTO_COMENTADO]
Escreva o texto integral da redação do aluno na íntegra. No entanto, marque praticamente todas as frases e termos utilizando a tag HTML customizada '<highlight type="tipo" tooltip="sua explicação aqui">trecho original</highlight>'. A ideia é criar um mapeamento visual completo de modo que o texto inteiro (ou quase todo) apareça destacado em cores.

Onde o atributo 'type' deve ser exatamente um dos seguintes:
- 'introducao': para as frases do parágrafo de introdução (contextualização, apresentação do tema e tese).
- 'argumento1': para as frases do parágrafo de desenvolvimento que fundamentam o primeiro argumento principal.
- 'argumento2': para as frases do parágrafo de desenvolvimento que fundamentam o segundo argumento principal.
- 'argumento3': para as frases do parágrafo de desenvolvimento que fundamentam o terceiro argumento principal (se houver).
- 'argumento4': para as frases do parágrafo de desenvolvimento que fundamentam o quarto argumento principal ou aspects adicionais (se houver).
- 'coesao': para elementos de ligação, conectivos e transições de ideias (ex: 'Além disso', 'Por outro lado', 'Dessa forma', 'Por conseguinte').
- 'erro': para desvios de gramática, ortografia, pontuação, crase, concordância, inadequação vocabular ou de registro.
- 'conclusao': para as frases do parágrafo de conclusão, propostas de intervenção e considerações finais.

O atributo 'tooltip' deve conter uma explicação didática objetiva e clara (limite de 25 palavras) sobre o papel estrutural ou o erro contido naquele trecho específico.
Certifique-se de que o texto final seja exatamente a redação original do aluno, apenas com a inserção das tags de destaque mapeando toda a estrutura textual de ponta a ponta.
[/TEXTO_COMENTADO]

[ADEQUACAO_ESTRUTURA]
- Verifique se a estrutura atende ao gênero exigido (introdução, desenvolvimento, conclusão ou formato técnico específico).
- Para redações de auditoria (relatório, parecer de auditoria, nota técnica), analise se estão presentes: referência à ordem de serviço ou demanda, objetivo, metodologia, achados, análise, recomendações, conclusão e linguagem técnica adequada (impessoalidade, 3ª pessoa, voz passiva, precisão conceitual).
- Aponte elementos faltantes e desvios, sugerindo a estrutura correta.
- Liste Pontos Fortes e Pontos a Aprimorar com bullet points.
[/ADEQUACAO_ESTRUTURA]

[CONTEUDO_TESE]
- Avalie a compreensão do tema: houve fuga, tangenciamento ou abordagem plena?
- Identifique a tese central e os argumentos. São consistentes, relevantes e bem fundamentados?
- Em dissertações, verifique a proposta de intervenção (se exigida): exequibilidade, detalhamento e respeito aos direitos humanos.
- Em textos técnicos, confira o embasamento legal/normativo, a correção dos conceitos e a pertinência das análises apresentadas.
[/CONTEUDO_TESE]

[COESAO_COERENCIA]
- Analise a progressão de ideias, o uso de conectivos, a manutenção de referentes e a coerência entre as partes.
- Destaque trechos confusos, contraditórios ou sem conexão lógica e sugira melhorias.
[/COESAO_COERENCIA]

[NORMA_CULTA]
- Liste todos os erros encontrados: gramática, ortografia, pontuação, crase, regência, concordância, colocação pronominal, vícios de linguagem.
- Escreva de forma didática com tópicos numerados ou bullets, classificando cada erro com a regra gramatical correspondente (exemplo: "O verbo 'visar' no sentido de almejar exige preposição 'a'...") e propondo a substituição correta.
- Em textos de auditoria, verifique o uso correto de termos técnicos e a impessoalidade.
[/NORMA_CULTA]

[NOTA_BANCA]
- Simule os critérios reais da banca informada:
  * CESPE: Macroestrutura, Microestrutura, Expressão.
  * FGV: Tema, Gênero, Coesão, Registro.
  * FCC: Conteúdo, Estrutura, Expressão.
- Atribua notas detalhadas por cada competência e justifique cada pontuação alinhada com as tabelas de notas da banca.
[/NOTA_BANCA]

[QUADRO_RESUMO]
Monte uma tabela em formato markdown contendo:
| Pontos Fortes | Pontos Fracos | Evolução Potencial (Aplicando as Correções) |
[/QUADRO_RESUMO]

[REESCRITA_ESPECIALISTA]
Selecione de 1 a 3 trechos problemáticos da redação original e apresente lado a lado utilizando exatamente uma tabela Markdown:
| Original (Trecho do Aluno) | Versão do Especialista (Reescrito) |
E explique detalhadamente abaixo da tabela as alterações e o raciocínio por trás de cada escolha, mostrando como um especialista estruturaria a ideia.
[/REESCRITA_ESPECIALISTA]

[PLANO_ESTUDO]
- Indique quais competências precisam de maior atenção (exemplo: coesão, crase, estrutura de parecer).
- Prescreva exercícios específicos: treinar crase, reescrever parágrafos com dados fictícios de auditoria, estudar conectivos para raciocínio lógico.
- Recomende materiais de referência (Manuais de Redação Oficial, normas ABNT, ISSAI para auditoria governamental, NBC TSP/TA, temas atuais de controle).
- Sugira temas simulados variados para ampliar o domínio sobre todos os modelos de redação.
[/PLANO_ESTUDO]

TOM E ABORDAGEM: Seja analítico, porém encorajador. Explique o “porquê” de cada apontamento, usando exemplos práticos. Ao final da redação (dentro do PLANO_ESTUDO), pergunte se o aluno deseja aprofundar algum ponto, tirar dúvidas sobre a reescrita ou receber um novo tema simulado para praticar.`;

    try {
      const safetySettings = [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        }
      ];

      const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite'];
      let response: Response | null = null;
      let data: any = {};
      let lastError = '';
      let usedModel = '';

      for (const currentModel of modelsToTry) {
        try {
          usedModel = currentModel;
          setLoadingMessage(`Enviando redação para correção (${currentModel})...`);
          
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${userApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
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
            
            // Erros de autenticação de chave (400, 403, etc.) indicam que tentar outros modelos não ajudará
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
      const resultText = candidate?.content?.parts?.[0]?.text;
      
      if (resultText) {
        setCorrecaoRaw(resultText);
        localStorage.setItem('superestrategico_redacao_recente', resultText);
        setAbaResultadoAtiva('nota');

        // Adiciona ao histórico de redações
        const parsed = parseCorrecao(resultText);
        const notaStr = parsed ? parsed.notaGlobal : '';
        const novaRedacao = {
          id: Date.now().toString(),
          concurso: concurso || 'Nível Superior',
          banca: banca || 'CESPE',
          tipo: tipo || 'Dissertação',
          tema: tema || 'Tema Geral',
          texto: texto,
          notaGlobal: notaStr || 'Sem nota',
          correcaoRaw: resultText
        };
        adicionarRedacaoAoHistorico(novaRedacao).then((salva) => {
          setRedacoesHistorico(prev => [salva, ...prev.filter(x => x.id !== salva.id)]);
          setRedacaoSelecionadaId(salva.id);
        });
      } else {
        if (candidate) {
          const reason = candidate.finishReason;
          if (reason === 'SAFETY') {
            throw new Error('A resposta foi bloqueada pelos filtros de segurança da API do Gemini (Motivo: Conteúdo Sensível/Segurança). Tente reformular trechos da redação.');
          } else if (reason === 'RECITATION') {
            throw new Error('A resposta foi interrompida devido a políticas de citação de conteúdo (Motivo: RECITATION).');
          } else if (reason && reason !== 'STOP') {
            throw new Error(`Geração interrompida prematuramente pela API (Motivo de término: ${reason}).`);
          }
        }
        throw new Error('Retorno do Gemini vazio. Verifique se o texto enviado é válido.');
      }
    } catch (e: any) {
      console.error(e);
      setError(`Falha ao obter correção da IA: ${e.message || 'Erro de rede'}`);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleCopiarCorrecao = () => {
    if (!correcaoRaw) return;
    navigator.clipboard.writeText(correcaoRaw);
    alert('Relatório completo em Markdown copiado!');
  };

  const handleSelecionarRedacao = (redacao: RedacaoCorrigida) => {
    setRedacaoSelecionadaId(redacao.id);
    setCorrecaoRaw(redacao.correcaoRaw);
    setConcurso(redacao.concurso);
    setBanca(redacao.banca);
    setTipo(redacao.tipo);
    setTema(redacao.tema);
    setTexto(redacao.texto);
    setAbaResultadoAtiva('nota');
    setDestaqueSelecionado(null);
  };

  const handleNovaCorrecao = () => {
    setRedacaoSelecionadaId(null);
    setCorrecaoRaw(null);
    setConcurso('');
    setBanca('');
    setTipo('');
    setTema('');
    setTexto('');
    setDestaqueSelecionado(null);
    localStorage.removeItem('superestrategico_redacao_recente');
  };

  const handleDeletarHistorico = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente apagar esta correção do seu histórico?')) {
      await removerRedacaoDoHistorico(id);
      setRedacoesHistorico(prev => prev.filter(x => x.id !== id));
      if (redacaoSelecionadaId === id) {
        setRedacaoSelecionadaId(null);
        setCorrecaoRaw(null);
        localStorage.removeItem('superestrategico_redacao_recente');
      }
    }
  };

  const handleDeletarCorrecao = () => {
    if (redacaoSelecionadaId) {
      if (confirm('Deseja realmente apagar esta correção salva?')) {
        removerRedacaoDoHistorico(redacaoSelecionadaId).then(() => {
          setRedacoesHistorico(prev => prev.filter(x => x.id !== redacaoSelecionadaId));
          setRedacaoSelecionadaId(null);
          setCorrecaoRaw(null);
          setDestaqueSelecionado(null);
          localStorage.removeItem('superestrategico_redacao_recente');
        });
      }
    } else {
      if (confirm('Deseja realmente apagar esta correção recente?')) {
        setCorrecaoRaw(null);
        setDestaqueSelecionado(null);
        localStorage.removeItem('superestrategico_redacao_recente');
      }
    }
  };

  // PARSER E RENDERIZADOR DE TEXTO COMENTADO COM MARCA TEXTO E TOOLTIPS
  const renderTextoComentado = (comentadoText: string) => {
    if (!comentadoText) return <p className="text-xs text-[#64748B]">Nenhuma marcação gerada pelo mentor de IA.</p>;

    // Regex flexível para extrair a tag <highlight ...>...</highlight>
    const regex = /(<highlight\b[^>]*>[\s\S]*?<\/highlight>)/gi;
    const parts = comentadoText.split(regex);

    return (
      <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-6 text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-wrap font-sans relative">
        {parts.map((part, idx) => {
          if (part.toLowerCase().startsWith('<highlight')) {
            const typeMatch = part.match(/type=["']([^"']+)["']/i);
            const tooltipMatch = part.match(/tooltip=["']([^"']+)["']/i);
            const contentMatch = part.match(/>([\s\S]*?)<\/highlight>/i);

            const type = typeMatch ? typeMatch[1] : '';
            const tooltip = tooltipMatch ? tooltipMatch[1] : '';
            const innerText = contentMatch ? contentMatch[1] : '';

            let bgClass = 'bg-[#1E293B] text-white';
            let labelText = 'Destaque';
            let labelColor = 'text-[#C5A059]';
            let borderClass = 'border-b border-gray-500';

            if (type === 'introducao') {
              bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200';
              labelText = '📌 Introdução & Tese';
              labelColor = 'text-amber-400';
              borderClass = 'border-b-2 border-amber-500/50';
            } else if (type === 'argumento' || type.startsWith('argumento')) {
              const numMatch = type.match(/\d+/);
              const argNum = numMatch ? numMatch[0] : '1';
              labelText = `💡 Argumento ${argNum}`;
              borderClass = 'border-b-2';
              
              if (argNum === '2') {
                bgClass = 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-200';
                labelColor = 'text-orange-400';
                borderClass += ' border-orange-500/50';
              } else if (argNum === '3') {
                bgClass = 'bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-200';
                labelColor = 'text-fuchsia-400';
                borderClass += ' border-fuchsia-500/50';
              } else if (argNum === '4') {
                bgClass = 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200';
                labelColor = 'text-cyan-400';
                borderClass += ' border-cyan-500/50';
              } else {
                // Default ou Argumento 1
                bgClass = 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200';
                labelColor = 'text-sky-400';
                borderClass += ' border-sky-500/50';
              }
            } else if (type === 'coesao') {
              bgClass = 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200';
              labelText = '🔗 Coesão & Coerência';
              labelColor = 'text-indigo-400';
              borderClass = 'border-b-2 border-indigo-500/50';
            } else if (type === 'erro') {
              bgClass = 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-medium';
              labelText = '⚠️ Desvio Gramatical';
              labelColor = 'text-rose-400';
              borderClass = 'border-b-2 border-rose-500/80';
            } else if (type === 'conclusao') {
              bgClass = 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200';
              labelText = '✅ Proposta / Conclusão';
              labelColor = 'text-emerald-400';
              borderClass = 'border-b-2 border-emerald-500/50';
            }

            const isSelected = destaqueSelecionado && destaqueSelecionado.innerText === innerText && destaqueSelecionado.type === type;

            return (
              <span 
                key={idx} 
                className={`relative group cursor-pointer inline px-1 rounded-sm transition-all duration-150 ${bgClass} ${borderClass} ${isSelected ? 'ring-2 ring-[#C5A059] ring-offset-1 ring-offset-[#0C0E12] font-semibold' : ''}`}
                onClick={() => setDestaqueSelecionado({ type, tooltip, innerText })}
                onMouseEnter={() => setDestaqueSelecionado({ type, tooltip, innerText })}
              >
                {innerText}
                
                {/* TOOLTIP ABSOLUTO POPUP */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3.5 bg-[#0F172A] border border-[#1E293B] text-[#E2E8F0] text-[11px] leading-relaxed rounded shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 font-sans normal-case">
                  <span className={`flex items-center gap-1 font-bold mb-1.5 uppercase tracking-wide text-[9px] ${labelColor}`}>
                    {labelText}
                  </span>
                  {tooltip}
                  {/* Seta do Tooltip */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F172A]" />
                </span>
              </span>
            );
          }

          return <React.Fragment key={idx}>{part}</React.Fragment>;
        })}
      </div>
    );
  };

  const renderTextoImpressao = (comentadoText: string) => {
    if (!comentadoText) return null;

    const regex = /(<highlight\b[^>]*>[\s\S]*?<\/highlight>)/gi;
    const parts = comentadoText.split(regex);
    const comentarios: { type: string; tooltip: string; text: string }[] = [];
    let contador = 0;

    const textElement = (
      <div className="border-2 border-slate-400 rounded bg-white mb-6 relative overflow-hidden shadow-sm">
        {/* Cabeçalho da Folha Oficial de Concurso */}
        <div className="border-b-2 border-slate-400 p-4 bg-slate-50 grid grid-cols-3 gap-4 text-[10px] font-sans uppercase tracking-wider text-slate-700">
          <div className="col-span-2 border-r border-slate-300 pr-4">
            <div className="text-[8px] text-slate-500 font-bold mb-1">PROVA DISCURSIVA — FOLHA DE TEXTO DEFINITIVO</div>
            <div className="font-mono text-xs font-bold text-slate-900 truncate">
              CANDIDATO: <span className="font-sans font-normal text-slate-600">Jotape Lessa (Simulado)</span>
            </div>
          </div>
          <div className="pl-2 flex flex-col justify-between">
            <div>
              <div className="text-[8px] text-slate-500 font-bold mb-1">INSCRIÇÃO DO CANDIDATO</div>
              <div className="font-mono text-xs font-bold text-slate-900">#948.192-TCU</div>
            </div>
          </div>
        </div>

        {/* Barra de Informações do Caderno */}
        <div className="border-b border-slate-300 px-4 py-2 bg-slate-100/50 flex justify-between items-center text-[9px] font-mono text-slate-600">
          <span className="font-bold">CADERNO DE RESPOSTA OFICIAL</span>
          <span>VALOR MÁXIMO: {valoresNota ? valoresNota.maxima : '100'} PONTOS</span>
          <span className="font-bold">{wordCount} PALAVRAS</span>
        </div>

        {/* Área de Redação com Linha de Margem */}
        <div className="p-6 text-slate-900 text-xs leading-relaxed font-sans whitespace-pre-wrap relative bg-white min-h-[350px]">
          {/* Linha vertical rosa simulando a margem da folha de redação oficial */}
          <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-rose-300/40 pointer-events-none select-none" />
          
          <div className="pl-6 select-text text-justify">
            {parts.map((part, idx) => {
              if (part.toLowerCase().startsWith('<highlight')) {
                const typeMatch = part.match(/type=["']([^"']+)["']/i);
                const tooltipMatch = part.match(/tooltip=["']([^"']+)["']/i);
                const contentMatch = part.match(/>([\s\S]*?)<\/highlight>/i);

                const type = typeMatch ? typeMatch[1] : '';
                const tooltip = tooltipMatch ? tooltipMatch[1] : '';
                const innerText = contentMatch ? contentMatch[1] : '';

                contador++;
                comentarios.push({ type, tooltip, text: innerText });

                let bgClass = 'bg-slate-50';
                let borderClass = 'border-b border-solid border-slate-300';
                let textNumberColor = 'text-slate-800';

                if (type === 'introducao') {
                  bgClass = 'bg-amber-100/50';
                  borderClass = 'border-b border-solid border-amber-400';
                  textNumberColor = 'text-amber-900';
                } else if (type.startsWith('argumento')) {
                  const num = type.match(/\d+/)?.[0] || '1';
                  borderClass = 'border-b border-solid';
                  if (num === '2') {
                    bgClass = 'bg-orange-100/50';
                    borderClass += ' border-orange-400';
                    textNumberColor = 'text-orange-900';
                  } else if (num === '3') {
                    bgClass = 'bg-fuchsia-100/50';
                    borderClass += ' border-fuchsia-400';
                    textNumberColor = 'text-fuchsia-900';
                  } else if (num === '4') {
                    bgClass = 'bg-cyan-100/50';
                    borderClass += ' border-cyan-400';
                    textNumberColor = 'text-cyan-900';
                  } else {
                    bgClass = 'bg-sky-100/50';
                    borderClass += ' border-sky-400';
                    textNumberColor = 'text-sky-900';
                  }
                } else if (type === 'coesao') {
                  bgClass = 'bg-indigo-100/50';
                  borderClass = 'border-b border-solid border-indigo-400';
                  textNumberColor = 'text-indigo-900';
                } else if (type === 'erro') {
                  bgClass = 'bg-rose-100/50';
                  borderClass = 'border-b border-solid border-rose-400 font-semibold';
                  textNumberColor = 'text-rose-900';
                } else if (type === 'conclusao') {
                  bgClass = 'bg-emerald-100/50';
                  borderClass = 'border-b border-solid border-emerald-400';
                  textNumberColor = 'text-emerald-900';
                }

                return (
                  <span key={idx} className={`inline px-1 rounded-sm ${bgClass} ${borderClass} text-black print-highlight`}>
                    {innerText}
                    <sup className={`font-mono font-bold text-[8px] ml-0.5 ${textNumberColor}`}>
                      {contador}
                    </sup>
                  </span>
                );
              }
              return <React.Fragment key={idx}>{part}</React.Fragment>;
            })}
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-2">
            Texto Marcado e Analisado
          </h4>
          {textElement}
        </div>

        {comentarios.length > 0 && (
          <div className="page-break-before-auto">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-800 mb-3 border-b border-slate-200 pb-1">
              Comentários e Apontamentos do Mentor
            </h4>
            <div className="grid grid-cols-1 gap-3.5">
              {comentarios.map((com, index) => {
                let labelText = 'Destaque';
                let colorClass = 'text-slate-700 bg-slate-100 border-slate-300';
                let borderStyleClass = 'border-l-4 border-slate-450 bg-slate-50';
                
                if (com.type === 'introducao') {
                  labelText = 'Introdução & Tese';
                  colorClass = 'text-amber-800 bg-amber-100 border-amber-200';
                  borderStyleClass = 'border-l-4 border-amber-500 bg-amber-50';
                } else if (com.type.startsWith('argumento')) {
                  const num = com.type.match(/\d+/)?.[0] || '1';
                  labelText = `Argumento ${num}`;
                  if (num === '2') {
                    colorClass = 'text-orange-800 bg-orange-100 border-orange-200';
                    borderStyleClass = 'border-l-4 border-orange-500 bg-orange-50';
                  } else if (num === '3') {
                    colorClass = 'text-fuchsia-800 bg-fuchsia-100 border-fuchsia-200';
                    borderStyleClass = 'border-l-4 border-fuchsia-500 bg-fuchsia-50';
                  } else if (num === '4') {
                    colorClass = 'text-cyan-800 bg-cyan-100 border-cyan-200';
                    borderStyleClass = 'border-l-4 border-cyan-500 bg-cyan-50';
                  } else {
                    colorClass = 'text-sky-800 bg-sky-100 border-sky-200';
                    borderStyleClass = 'border-l-4 border-sky-500 bg-sky-50';
                  }
                } else if (com.type === 'coesao') {
                  labelText = 'Coesão & Coerência';
                  colorClass = 'text-indigo-800 bg-indigo-100 border-indigo-200';
                  borderStyleClass = 'border-l-4 border-indigo-500 bg-indigo-50';
                } else if (com.type === 'erro') {
                  labelText = 'Desvio Gramatical';
                  colorClass = 'text-rose-800 bg-rose-100 border-rose-200';
                  borderStyleClass = 'border-l-4 border-rose-500 bg-rose-50';
                } else if (com.type === 'conclusao') {
                  labelText = 'Proposta / Conclusão';
                  colorClass = 'text-emerald-800 bg-emerald-100 border-emerald-200';
                  borderStyleClass = 'border-l-4 border-emerald-500 bg-emerald-50';
                }

                return (
                  <div key={index} className={`flex gap-3.5 text-xs leading-relaxed p-4 border border-slate-200 rounded ${borderStyleClass} page-break-inside-avoid shadow-sm`}>
                    <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-[9px] ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]} border border-current`}>
                      {index + 1}
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider block ${colorClass.split(' ')[0]}`}>
                          {labelText}
                        </span>
                      </div>
                      <p className="text-slate-500 italic text-[10px] pl-2 border-l border-slate-200 leading-normal">
                        "{com.text}"
                      </p>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        <strong className="text-slate-900">Análise do Mentor:</strong> {com.tooltip}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderiza o laudo completo formatado para impressão
  const renderRelatorioImpressao = () => {
    if (!correcaoEstruturada) return null;
    return (
      <div className="hidden print-report-only print:block text-black bg-white font-sans space-y-8 p-4">
        {/* Cabeçalho e Rodapé Fixos (Repetidos em cada página do PDF A4) */}
        <div className="print-header hidden">
          <span>SUPERESTRATÉGICO — RELATÓRIO DE CORREÇÃO DE REDAÇÃO</span>
          <span>CONCURSO: {concurso || 'Geral'}</span>
        </div>
        <div className="print-footer hidden">
          <span>BANCA: {banca || 'CESPE'}</span>
          <span>Página Gerada por IA — SuperEstrategico</span>
        </div>

        {/* Cabeçalho de Impressão */}
        <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Relatório de Correção de Redação
            </h1>
            <p className="text-[8px] text-slate-500 font-mono">
              SuperEstrategico — Inteligência Artificial & Mentor de Estudos
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-800 block">
              Nota Global: {valoresNota ? `${valoresNota.obtida} / ${valoresNota.maxima}` : correcaoEstruturada.notaGlobal}
            </span>
            <span className="text-[7px] text-slate-500">
              Gerado em {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Metadados da Redação */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded text-xs">
          <div>
            <p className="text-slate-500 uppercase font-mono text-[7px] tracking-wider">Concurso</p>
            <p className="font-bold text-slate-900">{concurso || 'Genérico de Nível Superior'}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase font-mono text-[7px] tracking-wider">Banca Organizadora</p>
            <p className="font-bold text-slate-900">{banca || 'CESPE/CEBRASPE'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-500 uppercase font-mono text-[7px] tracking-wider">Gênero / Tipo de Redação</p>
            <p className="font-bold text-slate-900">{tipo || 'Dissertação Argumentativa'}</p>
          </div>
          {tema && (
            <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
              <p className="text-slate-500 uppercase font-mono text-[7px] tracking-wider">Tema Proposto</p>
              <p className="text-slate-800 leading-relaxed italic">"{tema}"</p>
            </div>
          )}
        </div>

        {/* SEÇÃO 1: Redação Comentada com Marca-Texto e Lista de Comentários */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
            📝 Redação Comentada & Análise Linear
          </h2>
          {renderTextoImpressao(correcaoEstruturada.textoComentado)}
        </div>

        {/* SEÇÃO 2: Simulação de Nota da Banca */}
        <div className="space-y-4 page-break-always">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            📊 Simulação de Nota & Critérios da Banca
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.notaBanca)}
          </div>
        </div>

        {/* SEÇÃO 3: Adequação à Estrutura e Análise de Conteúdo */}
        <div className="space-y-4 page-break-always">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            🔍 Adequação ao Gênero & Estrutura Textual
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.estrutura)}
          </div>
        </div>

        {/* SEÇÃO 4: Conteúdo e Tese */}
        <div className="space-y-4 page-break-always">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            💡 Análise de Conteúdo, Tese e Argumentação
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.conteudo)}
          </div>
        </div>

        {/* SEÇÃO 5: Coesão e Coerência */}
        <div className="space-y-4 page-break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            🔗 Progressão Textual, Coesão e Coerência
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.coesao)}
          </div>
        </div>

        {/* SEÇÃO 6: Domínio da Norma Culta */}
        <div className="space-y-4 page-break-always">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            ✍️ Domínio da Norma Culta & Desvios
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.normaCulta)}
          </div>
        </div>

        {/* SEÇÃO 7: Reescrita do Especialista e Resumo */}
        <div className="space-y-4 page-break-always">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            🔄 Reescrita Didática (Versão do Especialista)
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.reescritas)}
          </div>
          
          <div className="mt-6 border-t border-slate-200 pt-4 page-break-inside-avoid">
            <h3 className="text-[10px] font-bold uppercase text-slate-800 mb-2">Quadro Resumo (Pontos Fortes e Fracos)</h3>
            <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
              {renderMarkdown(correcaoEstruturada.quadroResumo)}
            </div>
          </div>
        </div>

        {/* SEÇÃO 8: Plano de Estudos */}
        <div className="space-y-4 page-break-always">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            📅 Plano de Estudos Individualizado
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans print-markdown">
            {renderMarkdown(correcaoEstruturada.planoEstudo)}
          </div>
        </div>

        {/* Rodapé da folha */}
        <div className="border-t border-slate-300 pt-3 text-center text-[7px] text-slate-400 font-mono">
          Fim do Relatório de Correção. Foco, disciplina e constância. A aprovação é consequência do seu treino.
        </div>
      </div>
    );
  };

  // MINI PARSER MARKDOWN COMPATÍVEL COM TABELAS E BADGES
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const parseInlineStyles = (lineText: string) => {
      // Bold **text**
      const parts = lineText.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-[#C5A059] font-bold bg-[#C5A059]/10 rounded px-1">{part}</strong>;
        }
        
        // Inline code `code`
        const subParts = part.split(/`(.*?)`/g);
        return subParts.map((subPart, j) => {
          if (j % 2 === 1) {
            return <code key={j} className="text-emerald-400 bg-[#0C0E12] border border-[#1E293B] rounded px-1 py-0.5 font-mono text-[11px]">{subPart}</code>;
          }
          return subPart;
        });
      });
    };

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];
    let inTable = false;

    const flushTable = (key: number) => {
      if (currentTableRows.length === 0) return;
      
      const headers = currentTableRows[0];
      const rows = currentTableRows.slice(1);

      elements.push(
        <div key={`table-${key}`} className="overflow-x-auto my-4 border border-[#1E293B] rounded shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1E293B]/70 border-b border-[#2D3748]">
                {headers.map((h, i) => (
                  <th key={i} className="p-3 text-[#C5A059] font-mono font-bold uppercase tracking-wider">
                    {parseInlineStyles(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-[#1E293B] hover:bg-[#1E293B]/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-[#E2E8F0] leading-relaxed align-top">
                      {parseInlineStyles(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detecta tabela
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Ignora linhas de separação e alinhamento do markdown ex: |---|---|
        if (trimmed.replace(/[\s|:\-]/g, '') === '') {
          continue; 
        }
        
        inTable = true;
        const cells = trimmed.split('|').slice(1, -1);
        currentTableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      // Título Nível 1 (#)
      if (trimmed.startsWith('# ')) {
        const cleanText = trimmed.replace('# ', '').trim();
        elements.push(<h2 key={i} className="text-base font-display font-semibold text-white border-l-4 border-[#C5A059] pl-3 mt-5 mb-3 tracking-wide">{parseInlineStyles(cleanText)}</h2>);
      } 
      // Título Nível 2 (##)
      else if (trimmed.startsWith('## ')) {
        const cleanText = trimmed.replace('## ', '').trim();
        elements.push(
          <h3 key={i} className="text-xs font-mono font-bold text-[#C5A059] bg-[#C5A059]/10 uppercase tracking-widest px-3 py-1.5 rounded mt-4 mb-2 flex items-center gap-2">
            <Sparkles size={11} className="text-[#C5A059]" />
            {parseInlineStyles(cleanText)}
          </h3>
        );
      } 
      // Título Nível 3 (###)
      else if (trimmed.startsWith('### ')) {
        const cleanText = trimmed.replace('### ', '').trim();
        elements.push(<h4 key={i} className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mt-4 mb-2">{parseInlineStyles(cleanText)}</h4>);
      } 
      // Itens de Lista (- ou *)
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleanText = trimmed.substring(2).trim();
        elements.push(
          <li key={i} className="ml-5 list-disc text-[#E2E8F0] text-xs my-1.5 leading-relaxed font-sans">
            {parseInlineStyles(cleanText)}
          </li>
        );
      }
      // Listas Numeradas
      else if (/^\d+\.\s/.test(trimmed)) {
        const cleanText = trimmed.replace(/^\d+\.\s/, '').trim();
        const num = trimmed.match(/^\d+/)?.[0];
        elements.push(
          <div key={i} className="ml-4 flex gap-2 text-xs my-2 leading-relaxed font-sans">
            <span className="text-[#C5A059] font-mono font-bold">{num}.</span>
            <span className="text-[#E2E8F0]">{parseInlineStyles(cleanText)}</span>
          </div>
        );
      }
      // Linha vazia
      else if (trimmed === '') {
        elements.push(<div key={i} className="h-1.5" />);
      } 
      // Citações (> )
      else if (trimmed.startsWith('> ')) {
        const cleanText = trimmed.replace('> ', '').trim();
        elements.push(
          <div key={i} className="bg-[#1E293B]/50 border-l-4 border-[#C5A059] p-3 rounded-r my-2 text-[#E2E8F0] text-xs font-sans italic">
            {parseInlineStyles(cleanText)}
          </div>
        );
      } 
      // Parágrafo Padrão
      else {
        elements.push(<p key={i} className="text-[#E2E8F0] text-xs my-1.5 leading-relaxed font-sans">{parseInlineStyles(trimmed)}</p>);
      }
    }

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  return (
    <div className="space-y-6" id="correcao-redacao-root">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Ocultar elementos de tela para que não ocupem espaço */
          #superestrategico-app-layout > header,
          #superestrategico-app-layout > nav,
          #superestrategico-app-layout > div.bg-gradient-to-r,
          #essay-ai-banner,
          #essay-form-panel,
          #essay-loading-box,
          #essay-results-panel > div:first-child,
          #superestrategico-navigation-rail,
          #superestrategico-header-brand,
          .no-print,
          .screen-only-cockpit {
            display: none !important;
          }

          /* Reset de background escuro e estruturas restrictivas para impressão multi-página */
          body, html, #superestrategico-app-layout, main, #correcao-redacao-root {
            background: white !important;
            color: #0F172A !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            display: block !important;
            overflow: visible !important;
            position: static !important;
          }

          /* Corrigir espaçamento das tags sup para não desalinhar a altura da linha */
          .print-report-only sup {
            font-size: 70% !important;
            line-height: 0 !important;
            position: relative !important;
            vertical-align: baseline !important;
            top: -0.4em !important;
          }

          /* Marca-textos suaves para impressão física e PDF */
          .print-highlight {
            border-radius: 2px !important;
            box-decoration-break: clone !important;
            -webkit-box-decoration-break: clone !important;
            border-bottom-style: dotted !important;
            border-bottom-width: 1.5px !important;
          }

          /* Isolar e exibir o container de impressão no topo esquerdo e ocupar 100% de largura */
          .print-report-only {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: #0F172A !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Configuração da página A4 */
          @page {
            size: A4;
            margin: 25mm 20mm 20mm 20mm; /* margens limpas nas folhas A4 */
          }

          /* Cabeçalho e rodapé fixos em todas as páginas */
          .print-header {
            position: fixed;
            top: -15mm;
            left: 0;
            right: 0;
            height: 10mm;
            border-bottom: 1px solid #CBD5E1;
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            font-family: monospace;
            font-size: 8px;
            color: #64748B;
            background: transparent;
          }

          .print-footer {
            position: fixed;
            bottom: -10mm;
            left: 0;
            right: 0;
            height: 10mm;
            border-top: 1px solid #CBD5E1;
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            font-family: monospace;
            font-size: 8px;
            color: #64748B;
            background: transparent;
          }

          /* Quebra de página inteligente */
          .page-break-always {
            page-break-before: always !important;
            margin-top: 10px !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
          }

          /* Substituir cores de texto claras por escuras para impressão legível */
          .print-markdown p, 
          .print-markdown li, 
          .print-markdown div,
          .print-markdown td {
            color: #334155 !important;
            font-size: 11px !important;
            line-height: 1.5 !important;
          }
          .print-markdown h2, 
          .print-markdown h3, 
          .print-markdown h4, 
          .print-markdown strong {
            color: #0F172A !important;
          }
          .print-markdown h2 {
            font-size: 14px !important;
            margin-top: 20px !important;
            margin-bottom: 10px !important;
            border-left: 3px solid #C5A059 !important;
            padding-left: 8px !important;
          }
          .print-markdown h3 {
            font-size: 12px !important;
            margin-top: 15px !important;
            margin-bottom: 8px !important;
            background: #F8FAFC !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
          }
          .print-markdown code {
            background: #F1F5F9 !important;
            border: 1px solid #E2E8F0 !important;
            color: #0F172A !important;
            font-family: monospace !important;
            font-size: 10px !important;
            padding: 1px 3px !important;
            border-radius: 3px !important;
          }
          .print-markdown table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 15px 0 !important;
            page-break-inside: avoid !important;
          }
          .print-markdown th {
            background: #F8FAFC !important;
            color: #0F172A !important;
            font-weight: bold !important;
            border: 1px solid #CBD5E1 !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
          }
          .print-markdown td {
            border: 1px solid #E2E8F0 !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
            background-color: transparent !important;
          }
          .print-markdown tr:nth-child(even) {
            background-color: rgba(248, 250, 252, 0.4) !important;
          }

          /* Forçar cores de fundo em impressoras e salvar PDF */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      ` }} />
      
      {/* BANNER PRINCIPAL */}
      <div className="bg-[#0F172A] border border-[#1E293B] text-white rounded p-6 shadow-md relative overflow-hidden" id="essay-ai-banner">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <PenTool size={240} className="stroke-[#C5A059] stroke-2 animate-pulse" />
        </div>

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center space-x-2 bg-[#C5A059]/10 border border-[#C5A059]/30 w-fit px-3 py-1 rounded-full text-[10px] font-mono font-bold text-[#C5A059]">
            <Sparkles size={11} className="text-[#C5A059]" />
            <span>Mentor de Redação IA</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-medium text-white">
            Correção de Redação com Mentor Especialista
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
            Treine para qualquer banca (CESPE, FGV, FCC, etc.) e gênero com um corretor que analisa estrutura, 
            coerência legal, gramática e fornece nota real detalhada com reescrita especialista side-by-side. 
            Desenvolva a escrita de auditor de controle ou fiscal!
          </p>
        </div>
      </div>

      {/* AVISO DE CHAVE API DO GEMINI */}
      {!hasApiKey && (
        <div className="bg-[#0F172A] border border-amber-500/30 rounded p-5 space-y-3.5 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400">
                Chave de API do Gemini não configurada
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Para utilizar o corretor de redações com inteligência artificial, você precisa inserir sua chave do Google AI Studio. 
                Sua chave fica segura, criptografada e salva apenas localmente no seu navegador.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <input
              type="password"
              placeholder="Insira sua API Key do Gemini..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-[#0C0E12] border border-[#1E293B] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059] flex-1 font-mono"
            />
            <button
              onClick={handleSalvarApiKey}
              className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-bold text-xs rounded transition-colors"
            >
              Salvar Chave
            </button>
          </div>
          <p className="text-[10px] text-[#64748B]">
            Você pode obter uma chave de API gratuitamente em: <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-[#C5A059] hover:underline font-mono">aistudio.google.com</a>
          </p>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL - LOADING OU FORMULÁRIO OU RESULTADO */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full" id="essay-workspace-container">
        {/* BARRA LATERAL (HISTÓRICO) */}
        {sidebarAberta && (
          <div className="w-full lg:w-72 shrink-0 bg-[#0F172A] border border-[#1E293B] rounded p-4 space-y-4 flex flex-col self-stretch no-print">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#C5A059]" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Histórico</h3>
              </div>
              <button
                onClick={() => setSidebarAberta(false)}
                className="text-[#64748B] hover:text-white transition-colors"
                title="Recolher Histórico"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            <button
              onClick={handleNovaCorrecao}
              className="w-full py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-bold text-xs rounded transition-all flex items-center justify-center gap-1.5 shadow"
            >
              <PenTool size={12} /> Nova Correção
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[550px] pr-1 scrollbar-thin">
              {redacoesHistorico.length === 0 ? (
                <div className="text-center py-8 text-[#64748B] text-xs">
                  Nenhuma redação no histórico.
                </div>
              ) : (
                redacoesHistorico.map((item) => {
                  const selecionada = redacaoSelecionadaId === item.id;
                  const dataFormatada = new Date(item.dataCriacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelecionarRedacao(item)}
                      className={`group p-3 rounded border text-left cursor-pointer transition-all ${
                        selecionada
                          ? 'bg-[#C5A059]/10 border-[#C5A059] text-white shadow-md'
                          : 'bg-[#0C0E12] border-[#1E293B] text-[#94A3B8] hover:border-[#2D3748] hover:text-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono text-[#64748B]">{dataFormatada}</span>
                        <button
                          onClick={(e) => handleDeletarHistorico(item.id, e)}
                          className="text-[#64748B] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Excluir do histórico"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <h4 className="text-xs font-semibold truncate leading-snug">{item.tema || 'Sem tema'}</h4>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1E293B]/60 text-[9px] font-mono text-[#64748B]">
                        <span>{item.banca} • {item.concurso}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          selecionada ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#1E293B] text-white'
                        }`}>{item.notaGlobal}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* CONTAINER DO PAINEL PRINCIPAL */}
        <div className="flex-1 w-full space-y-6">
          {/* BOTÃO PARA EXIBIR A BARRA LATERAL (SE ESTIVER RECOLHIDA) */}
          {!sidebarAberta && (
            <button
              onClick={() => setSidebarAberta(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] border border-[#1E293B] hover:border-[#2D3748] text-xs font-mono font-medium rounded text-white transition-all no-print mb-2"
            >
              <ChevronRight size={14} className="text-[#C5A059]" />
              <span>Ver Histórico ({redacoesHistorico.length})</span>
            </button>
          )}

          {loading ? (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-12 shadow-sm flex flex-col items-center justify-center space-y-4 text-center animate-pulse" id="essay-loading-box">
          <div className="p-4 bg-[#0C0E12] border border-[#2D3748] text-[#C5A059] rounded-full animate-spin">
            <RefreshCcw size={28} />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white font-display">Avaliando sua redação...</h4>
            <p className="text-xs text-[#94A3B8] font-sans italic max-w-md mx-auto">"{loadingMessage}"</p>
          </div>
        </div>
      ) : correcaoRaw ? (
        /* RESULTADO DA CORREÇÃO */
        <div className="space-y-4 animate-scale-up" id="essay-results-panel">
          
          {/* CABEÇALHO DE CONTROLE DO RELATÓRIO */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0F172A] border border-[#1E293B] p-4 rounded">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                <CheckCircle size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Correção Finalizada</h4>
                <p className="text-[10px] text-[#94A3B8]">Exibindo diagnóstico estruturado da redação</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopiarCorrecao}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#2D3748] border border-[#2D3748] hover:border-[#C5A059]/40 text-xs font-mono font-medium rounded transition-all flex items-center justify-center gap-1.5 text-white"
              >
                <Copy size={12} /> Copiar Markdown
              </button>

              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/40 hover:border-[#C5A059] text-xs font-mono font-medium rounded transition-all flex items-center justify-center gap-1.5 text-[#C5A059]"
              >
                <Printer size={12} /> Imprimir PDF (A4)
              </button>
              
              <button
                onClick={handleDeletarCorrecao}
                className="px-3.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/30 text-rose-400 text-xs font-mono font-medium rounded transition-all flex items-center justify-center gap-1.5"
                title="Apagar correção"
              >
                <Trash2 size={12} /> Limpar
              </button>

              <button
                onClick={() => {
                  setCorrecaoRaw(null);
                  setDestaqueSelecionado(null);
                }}
                className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black text-xs font-bold rounded transition-colors"
              >
                Nova Correção
              </button>
            </div>
          </div>

          {correcaoEstruturada ? (
            <>
              {/* COCKPIT DE CORREÇÃO ESTRUTURADA EM ABAS (Apenas Tela) */}
              <div className="screen-only-cockpit print:hidden grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* COLUNA ESQUERDA: CIRCULAR PROGRESS + METADATA */}
              <div className="lg:col-span-4 bg-[#0F172A] border border-[#1E293B] rounded p-5 space-y-5">
                
                {/* Visualizador de Nota Circular */}
                <div className="flex flex-col items-center justify-center text-center py-4 border-b border-[#1E293B]">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    
                    {/* SVG Circular Progress */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        className="stroke-[#1E293B]"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        className="stroke-[#C5A059] transition-all duration-1000"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 54}
                        strokeDashoffset={2 * Math.PI * 54 * (1 - (valoresNota?.pct || 0) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-mono font-bold text-white leading-none">
                        {valoresNota ? valoresNota.obtida : '0'}
                      </span>
                      <div className="w-8 h-[1px] bg-[#2D3748] my-1" />
                      <span className="text-[10px] font-mono text-[#64748B]">
                        Máx {valoresNota ? valoresNota.maxima : '20'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-[10px] font-mono font-bold text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Nota Global
                    </span>
                  </div>
                </div>

                {/* Resumo de Dados */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider">Dados Analisados</h5>
                  <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-3 text-[11px] leading-relaxed space-y-2 text-[#94A3B8]">
                    {renderMarkdown(correcaoEstruturada.dados)}
                  </div>
                </div>

                {/* Sub-menu lateral de abas */}
                <div className="flex flex-col gap-1 text-xs">
                  <button
                    onClick={() => setAbaResultadoAtiva('nota')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'nota' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <Award size={13} /> 📊 Nota & Competências
                  </button>

                  <button
                    onClick={() => setAbaResultadoAtiva('comentada')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'comentada' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <PenTool size={13} /> 📝 Redação Comentada
                  </button>

                  <button
                    onClick={() => setAbaResultadoAtiva('estrutura')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'estrutura' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <FileText size={13} /> 🔍 Estrutura & Conteúdo
                  </button>

                  <button
                    onClick={() => setAbaResultadoAtiva('gramatica')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'gramatica' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <CheckCircle size={13} /> ✍️ Correção Gramatical
                  </button>

                  <button
                    onClick={() => setAbaResultadoAtiva('reescrita')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'reescrita' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <RefreshCcw size={13} /> 🔄 Reescrita Especialista
                  </button>

                  <button
                    onClick={() => setAbaResultadoAtiva('plano')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'plano' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <BookOpen size={13} /> 📅 Plano de Estudos
                  </button>

                  <button
                    onClick={() => setAbaResultadoAtiva('completo')}
                    className={`w-full text-left px-3 py-2 rounded font-mono font-bold transition-all flex items-center gap-2 ${
                      abaResultadoAtiva === 'completo' 
                        ? 'bg-[#C5A059]/10 border-l-2 border-[#C5A059] text-white' 
                        : 'text-[#64748B] hover:text-[#C5A059]'
                    }`}
                  >
                    <FileText size={13} /> 📄 Relatório Completo
                  </button>
                </div>

              </div>

              {/* COLUNA DIREITA: CONTEÚDO DA ABA ATIVA */}
              <div className="lg:col-span-8 bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-md min-h-[500px]">
                
                {abaResultadoAtiva === 'nota' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <Award size={15} className="text-[#C5A059]" /> Simulação de Nota & Competências da Banca
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                        {renderMarkdown(correcaoEstruturada.notaBanca)}
                      </div>
                    </div>
                  </div>
                )}

                {abaResultadoAtiva === 'comentada' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <PenTool size={15} className="text-[#C5A059]" /> Redação Comentada com Marca-Texto & Feedback
                      </h4>
                      
                      <div className="bg-[#1E293B]/40 border border-[#2D3748] rounded p-3 text-[11px] text-[#94A3B8] leading-relaxed flex items-center gap-2 mb-4">
                        <Sparkles size={14} className="text-[#C5A059] shrink-0" />
                        <span>
                          <strong>Dica de Estudo:</strong> Passe o cursor do mouse (ou clique no celular) sobre as partes marcadas em cores para abrir o balão explicativo com os apontamentos do mentor para cada trecho.
                        </span>
                      </div>

                      {/* Legenda visual */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-mono mb-5">
                        <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Introdução & Tese
                        </span>
                        <span className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded text-sky-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> Argumento 1
                        </span>
                        <span className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded text-orange-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Argumento 2
                        </span>
                        <span className="flex items-center gap-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 px-2.5 py-1 rounded text-fuchsia-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" /> Argumento 3
                        </span>
                        <span className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded text-cyan-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /> Argumento 4
                        </span>
                        <span className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded text-indigo-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Coesão & Coerência
                        </span>
                        <span className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded text-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Erros Gramaticais
                        </span>
                        <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Proposta / Conclusão
                        </span>
                      </div>

                      {renderTextoComentado(correcaoEstruturada.textoComentado)}

                      {/* Painel de Feedback Detalhado do Mentor */}
                      <div className="mt-6 border border-[#1E293B] rounded bg-[#0C0E12] overflow-hidden">
                        <div className="bg-[#1E293B]/40 border-b border-[#1E293B] px-4 py-2.5 flex items-center justify-between">
                          <h5 className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen size={13} className="text-[#C5A059]" /> Painel de Feedback do Mentor
                          </h5>
                          {destaqueSelecionado && (
                            <button
                              onClick={() => setDestaqueSelecionado(null)}
                              className="text-[10px] font-mono text-[#64748B] hover:text-white transition-colors"
                            >
                              Limpar Seleção
                            </button>
                          )}
                        </div>
                        <div className="p-4 min-h-[100px] flex flex-col justify-center">
                          {destaqueSelecionado ? (
                            <div className="space-y-3 animate-fade-in">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  destaqueSelecionado.type === 'introducao' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  destaqueSelecionado.type === 'argumento1' || destaqueSelecionado.type === 'argumento' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                                  destaqueSelecionado.type === 'argumento2' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                  destaqueSelecionado.type === 'argumento3' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' :
                                  destaqueSelecionado.type === 'argumento4' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                  destaqueSelecionado.type === 'coesao' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                  destaqueSelecionado.type === 'erro' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium' :
                                  destaqueSelecionado.type === 'conclusao' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                  'bg-[#1E293B] text-white border border-[#2D3748]'
                                }`}>
                                  {destaqueSelecionado.type === 'introducao' ? '📌 Introdução & Tese' :
                                   destaqueSelecionado.type === 'argumento1' || destaqueSelecionado.type === 'argumento' ? '💡 Argumento 1' :
                                   destaqueSelecionado.type === 'argumento2' ? '💡 Argumento 2' :
                                   destaqueSelecionado.type === 'argumento3' ? '💡 Argumento 3' :
                                   destaqueSelecionado.type === 'argumento4' ? '💡 Argumento 4' :
                                   destaqueSelecionado.type === 'coesao' ? '🔗 Coesão & Coerência' :
                                   destaqueSelecionado.type === 'erro' ? '⚠️ Desvio Gramatical' :
                                   destaqueSelecionado.type === 'conclusao' ? '✅ Proposta / Conclusão' :
                                   'Destaque'}
                                </span>
                              </div>
                              <div className="bg-[#0C0E12] border-l-2 border-[#C5A059] p-3 rounded-r text-xs text-[#E2E8F0] italic font-sans">
                                "{destaqueSelecionado.innerText}"
                              </div>
                              <div className="text-xs text-[#94A3B8] leading-relaxed font-sans">
                                <strong>Análise do Mentor:</strong> {destaqueSelecionado.tooltip}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 space-y-1">
                              <p className="text-xs text-[#64748B]">Nenhum trecho selecionado.</p>
                              <p className="text-[10px] text-[#475569]">Passe o mouse ou clique em qualquer frase destacada da redação acima para analisar.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {abaResultadoAtiva === 'estrutura' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <FileText size={15} className="text-[#C5A059]" /> Adequação ao Gênero e Estrutura Textual
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed mb-6">
                        {renderMarkdown(correcaoEstruturada.estrutura)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <Sparkles size={14} className="text-[#C5A059]" /> Análise de Conteúdo, Tese e Argumentação
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed mb-6">
                        {renderMarkdown(correcaoEstruturada.conteudo)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <HelpCircle size={15} className="text-[#C5A059]" /> Progressão Textual, Coesão e Coerência
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                        {renderMarkdown(correcaoEstruturada.coesao)}
                      </div>
                    </div>
                  </div>
                )}

                {abaResultadoAtiva === 'gramatica' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <CheckCircle size={15} className="text-[#C5A059]" /> Domínio da Norma Culta & Correção de Desvios
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] italic mb-4 leading-relaxed">
                        Abaixo estão listados todos os desvios gramaticais detectados na sua redação, seguidos de sua respectiva regra e sugestão de correção:
                      </p>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                        {renderMarkdown(correcaoEstruturada.normaCulta)}
                      </div>
                    </div>
                  </div>
                )}

                {abaResultadoAtiva === 'reescrita' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <RefreshCcw size={15} className="text-[#C5A059]" /> Quadro de Reescrita Didática (Versão do Especialista)
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed mb-6">
                        {renderMarkdown(correcaoEstruturada.reescritas)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <FileText size={15} className="text-[#C5A059]" /> Quadro Resumo de Pontos Fortes e Fracos
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                        {renderMarkdown(correcaoEstruturada.quadroResumo)}
                      </div>
                    </div>
                  </div>
                )}

                {abaResultadoAtiva === 'plano' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
                        <BookOpen size={15} className="text-[#C5A059]" /> Plano de Estudo Individual para Especialização
                      </h4>
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                        {renderMarkdown(correcaoEstruturada.planoEstudo)}
                      </div>
                    </div>
                  </div>
                )}

                {abaResultadoAtiva === 'completo' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider border-b border-[#1E293B] pb-2">
                      📄 Relatório de Correção Completo (Texto Bruto)
                    </h4>
                    <pre className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-[11px] font-mono text-[#94A3B8] whitespace-pre-wrap overflow-y-auto max-h-[600px] leading-relaxed">
                      {correcaoEstruturada.rawText}
                    </pre>
                  </div>
                )}

              </div>

            </div>

            {/* RELATÓRIO COMPLETO EXCLUSIVO PARA IMPRESSÃO (A4 PDF) */}
            {renderRelatorioImpressao()}
          </>
          ) : (
            /* VISUALIZADOR SIMPLES DE BACKUP (SE O RESULTADO NÃO ESTIVER ESTRUTURADO POR TAGS) */
            <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-md prose prose-invert max-w-none text-xs space-y-4">
              {renderMarkdown(correcaoRaw)}
            </div>
          )}
          
        </div>
      ) : (
        /* FORMULÁRIO DE ENVIO */
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-md space-y-5" id="essay-form-panel">
          
          <div className="border-b border-[#1E293B] pb-4 flex justify-between items-center">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <PenTool size={13} className="text-[#C5A059]" /> Enviar Nova Redação
            </h3>
            {hasApiKey && (
              <button
                onClick={handleRemoverApiKey}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 bg-[#1E293B]/40 px-2 py-1 rounded"
              >
                <Trash2 size={10} /> Desconectar Gemini Key
              </button>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs rounded flex items-center gap-2">
              <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DADOS GERAIS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">Concurso Desejado</label>
              <input
                type="text"
                placeholder="Ex: Auditor TCU, Receita Federal..."
                value={concurso}
                onChange={(e) => {
                  setConcurso(e.target.value);
                  salvarFormularioLocal(e.target.value, banca, tipo, tema, texto);
                }}
                className="w-full bg-[#0C0E12] border border-[#1E293B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">Banca Organizadora</label>
              <select
                value={banca}
                onChange={(e) => {
                  setBanca(e.target.value);
                  salvarFormularioLocal(concurso, e.target.value, tipo, tema, texto);
                }}
                className="w-full bg-[#0C0E12] border border-[#1E293B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="CESPE">CESPE / Cebraspe</option>
                <option value="FGV">FGV</option>
                <option value="FCC">FCC</option>
                <option value="VUNESP">VUNESP</option>
                <option value="ESAF">ESAF</option>
                <option value="Outra">Outra Banca</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">Tipo de Redação / Gênero</label>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  salvarFormularioLocal(concurso, banca, e.target.value, tema, texto);
                }}
                className="w-full bg-[#0C0E12] border border-[#1E293B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="dissertacao argumentativa">Dissertação Argumentativa</option>
                <option value="dissertacao expositiva">Dissertação Expositiva</option>
                <option value="relatorio de auditoria">Relatório de Auditoria</option>
                <option value="parecer tecnico">Parecer Técnico</option>
                <option value="estudo de caso">Estudo de Caso</option>
                <option value="nota tecnica">Nota Técnica</option>
              </select>
            </div>

          </div>

          {/* TEMA PROPOSTO */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1">
              Tema Proposto pela Banca <span className="text-[#64748B] font-normal font-sans">(Opcional)</span>
            </label>
            <textarea
              placeholder="Insira aqui o tema, a pergunta ou a situação problema formulada pela banca..."
              value={tema}
              rows={3}
              onChange={(e) => {
                setTema(e.target.value);
                salvarFormularioLocal(concurso, banca, tipo, e.target.value, texto);
              }}
              className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-3 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans resize-y leading-relaxed"
            />
          </div>

          {/* TEXTO COMPLETO */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">Texto da Redação na Íntegra</label>
              <span className="text-[10px] font-mono text-[#64748B]">
                {wordCount} palavras • {charCount} caracteres
              </span>
            </div>
            <textarea
              placeholder="Digite ou cole sua redação na íntegra aqui..."
              value={texto}
              rows={16}
              onChange={(e) => {
                setTexto(e.target.value);
                salvarFormularioLocal(concurso, banca, tipo, tema, e.target.value);
              }}
              className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-3.5 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans resize-y leading-relaxed"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleLimparCampos}
              className="px-4 py-2 text-xs text-[#94A3B8] hover:text-[#E2E8F0] font-mono border border-[#1E293B] hover:border-[#2D3748] rounded transition-colors"
            >
              Limpar Campos
            </button>

            <div className="flex items-center gap-2">
              {localStorage.getItem('superestrategico_redacao_recente') && (
                <button
                  onClick={() => setCorrecaoRaw(localStorage.getItem('superestrategico_redacao_recente'))}
                  className="px-4 py-2 bg-[#1E293B] hover:bg-[#2D3748] border border-[#2D3748] text-[#94A3B8] hover:text-white rounded text-xs transition-colors font-mono"
                >
                  Ver Correção Salva
                </button>
              )}

              <button
                onClick={triggerCorrecao}
                disabled={loading || !hasApiKey}
                className={`px-6 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  (!hasApiKey || !texto.trim())
                    ? 'bg-[#1E293B] text-[#64748B] border border-[#2D3748] cursor-not-allowed'
                    : 'bg-[#C5A059] hover:bg-[#C5A059]/90 text-black shadow-md'
                }`}
              >
                <Send size={12} /> Solicitar Correção IA
              </button>
            </div>
          </div>

        </div>
      )}
        </div>
      </div>

    </div>
  );
}
