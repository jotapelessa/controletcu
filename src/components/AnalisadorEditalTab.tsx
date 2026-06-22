import React, { useState, useEffect } from 'react';
import { Materia, Aula, StatusAula } from '../types';
import { Sparkles, FileText, Calendar, DollarSign, Award, RefreshCcw, Trash2, ArrowLeft, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Layers, Flame } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AnalisadorEditalTab() {
  // Rascunho persistido no localStorage para evitar perda de dados ao navegar entre abas
  const [editalText, setEditalText] = useState(() => localStorage.getItem('superestrategico_edital_buffer_text') || '');
  const [extractedEdital, setExtractedEdital] = useState<any>(() => {
    const cached = localStorage.getItem('superestrategico_edital_buffer_json');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [aiImportando, setAiImportando] = useState(false);
  const [aiImportStatus, setAiImportStatus] = useState('');
  const [aiImportErro, setAiImportErro] = useState<string | null>(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState<string | null>(null);

  // Leitor PDF
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfLendo, setPdfLendo] = useState(false);
  const [pdfProgresso, setPdfProgresso] = useState<{ atual: number; total: number }>({ atual: 0, total: 0 });
  const [pdfAvisoScanned, setPdfAvisoScanned] = useState(false);



  // Sincronizar o rascunho de texto e JSON com o localStorage
  useEffect(() => {
    localStorage.setItem('superestrategico_edital_buffer_text', editalText);
  }, [editalText]);

  useEffect(() => {
    if (extractedEdital) {
      localStorage.setItem('superestrategico_edital_buffer_json', JSON.stringify(extractedEdital));
      // Selecionar a primeira matéria por padrão
      if (extractedEdital.materias_planejador && extractedEdital.materias_planejador.length > 0 && !selectedMateriaId) {
        setSelectedMateriaId(extractedEdital.materias_planejador[0].id);
      }
    } else {
      localStorage.removeItem('superestrategico_edital_buffer_json');
      setSelectedMateriaId(null);
    }
  }, [extractedEdital]);

  const extrairTextoDePdf = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setAiImportErro("O arquivo PDF excede o limite máximo permitido de 15MB.");
      return;
    }

    setPdfLendo(true);
    setPdfAvisoScanned(false);
    setAiImportErro(null);
    setPdfProgresso({ atual: 0, total: 0 });

    try {
      // 1. Carregar a biblioteca pdfjs-dist dinamicamente
      const pdfjs = (await import('pdfjs-dist')) as any;
      
      // 2. Configurar o worker usando a URL local gerada pelo Vite
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      // 3. Ler o arquivo como ArrayBuffer
      const reader = new FileReader();
      const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error("Erro ao ler o arquivo binário local."));
        reader.readAsArrayBuffer(file);
      });

      const buffer = await arrayBufferPromise;

      // 4. Carregar o documento PDF
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      if (totalPages > 100) {
        throw new Error(`O edital possui muitas páginas (${totalPages} páginas). Para evitar estouro de memória, selecione um edital com no máximo 100 páginas.`);
      }

      setPdfProgresso({ atual: 0, total: totalPages });
      let extractedText = '';

      // 5. Ler as páginas sequencialmente em lotes (para dar garbage collection e progresso suave)
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        // Reconstrução de layout por coordenadas x e y
        const items = textContent.items as any[];
        
        if (items.length > 0) {
          // Ordenar itens por Y descendente e depois por X ascendente
          const leftItems = items.filter(item => item.transform[4] < 297);
          const rightItems = items.filter(item => item.transform[4] >= 297);
          
          if (leftItems.length > 2 && rightItems.length > 2) {
            leftItems.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
            rightItems.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
            
            const pageText = [...leftItems, ...rightItems].map(item => item.str).join(' ');
            extractedText += pageText + '\n\n';
          } else {
            items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
            const pageText = items.map(item => item.str).join(' ');
            extractedText += pageText + '\n\n';
          }
        }

        setPdfProgresso(prev => ({ ...prev, atual: i }));
      }

      // 6. Limpeza (Garbage Collection)
      await pdfDoc.cleanup();
      await loadingTask.destroy();

      // Normalizar texto
      const cleanText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
        .trim();

      // 7. Validar PDF escaneado (imagem sem OCR)
      if (cleanText.length < 150) {
        setPdfAvisoScanned(true);
      } else {
        setEditalText(cleanText);
        
        // Animação de sucesso
        setTimeout(() => {
          const textarea = document.getElementById('ai-edital-textarea');
          if (textarea) {
            textarea.classList.add('animate-pulse-gold');
            setTimeout(() => textarea.classList.remove('animate-pulse-gold'), 1500);
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }

    } catch (err: any) {
      console.error("Erro na extração de PDF:", err);
      if (err.name === 'PasswordException') {
        setAiImportErro("Este PDF está protegido por senha. Por favor, remova a proteção antes de fazer o upload.");
      } else {
        setAiImportErro(err.message || "Erro desconhecido ao ler o PDF.");
      }
    } finally {
      setPdfLendo(false);
    }
  };

  const analisarEditalComIA = async () => {
    if (!editalText.trim()) {
      setAiImportErro("Por favor, forneça o texto do edital para análise.");
      return;
    }

    setAiImportando(true);
    setAiImportErro(null);
    setExtractedEdital(null);
    setAiImportStatus("Lendo e interpretando o texto do edital...");

    // Setup de loading message rotativo
    const loadingMessages = [
      "Lendo e interpretando o texto do edital...",
      "Corrigindo ruídos de OCR e formatação...",
      "Identificando disciplinas e tópicos programáticos...",
      "Estruturando aulas no padrão de concursos...",
      "Gerando ciclo de estudos dinâmico sugerido...",
      "Formatando distribuição de questões do simulado..."
    ];
    let msgIdx = 0;
    const intervalId = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setAiImportStatus(loadingMessages[msgIdx]);
    }, 4500);

    try {
      const userApiKey = localStorage.getItem('superestrategico_user_gemini_api_key');
      let parsedData: any = null;

      const systemPrompt = `Você é o Super Analisador de Editais do SuperEstrategico. Sua função é ler o texto completo de um edital de concurso público ou processo seletivo e extrair todas as informações de forma precisa, organizada e estruturada, focando na montagem automática do plano de estudos do aluno.

Siga rigorosamente as instruções abaixo:

1. PROCESSAMENTO E HIGIENIZAÇÃO:
- Corrija erros comuns de OCR ("1nscr1çã0" -> "Inscrição", "c0ncurs0" -> "Concurso") pelo contexto.
- Ignore cabeçalhos, rodapés, paginações e quebras de linha espúrias.
- Se uma informação não for encontrada no texto, utilize null ou array vazio [] conforme o tipo. Nunca invente dados.

2. TAREFA PRINCIPAL:
Extraia, estruture e organize as informações em um objeto JSON seguindo EXATAMENTE o "ESQUEMA DE SAÍDA" especificado. O output deve ser diretamente compatível com as estruturas de planejador de estudos do aplicativo.

3. REGRAS DE GERAÇÃO E MAPEAMENTO (CRÍTICO):

a) Matérias e Aulas (Mapeamento para Planejador):
   - Cada disciplina extraída do conteúdo programático deve receber um id em snake_case (ex: "direito_constitucional").
   - Atribua uma sigla exclusiva de 3 letras maiúsculas (ex: "CON", "AFO", "RLM"). Garanta que não existam siglas duplicadas.
   - Atribua uma cor em formato Hexadecimal obrigatoriamente escolhida a partir desta lista de cores aprovadas:
     * Azul: #3b82f6
     * Índigo: #6366f1
     * Violeta: #8b5cf6
     * Fúcsia: #d946ef
     * Rosa: #f43f5e
     * Esmeralda: #10b981
     * Verde-Piscina: #14b8a6
     * Ciano: #06b6d4
     * Céu: #0ea5e9
     * Âmbar: #f59e0b
     * Laranja: #f97316
     * Grafite: #64748b
   - Converta os tópicos verticais de estudo em uma lista de aulas (aulas). Cada aula deve possuir:
     * id: string no formato "SIGLA_XX", onde XX é o número da aula com dois dígitos (ex: "CON_00", "CON_01").
     * numero: inteiro sequencial iniciando em 0 (Aula 00, Aula 01...).
     * titulo: string formatada como "Aula XX - [Nome do Tópico Principal]" (ex: "Aula 00 - Direitos e Garantias Fundamentais"). Agrupe tópicos muito curtos ou correlatos em uma mesma aula para manter o edital verticalizado em até 15 a 20 aulas por matéria, no máximo.

b) Ciclo de Estudos Sugerido:
   - Crie uma sugestão de ciclo de estudos circular (ciclo_estudo_sugerido) contendo os blocos de estudo para as matérias cadastradas.
   - Priorize matérias com maior peso ou maior volume de conteúdo programático.
   - Defina o tempoMinutos sugerido (geralmente entre 60 e 90 minutos por bloco).

c) Estrutura de Simulados:
   - Extraia a distribuição de questões por matéria na prova objetiva. No campo simulado_distribuicao, mapeie o total de questões da prova e a quantidade exata estimada para cada materiaId (usando o id snake_case gerado na seção de matérias).

d) Cronograma e Contagem Regressiva:
   - Mapeie as principais datas em formato padrão "YYYY-MM-DD" para permitir cálculos de dias restantes até as provas.

4. ESQUEMA DE SAÍDA (OUTPUT SCHEMA):
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem markdown de bloco de código (não use \`\`\`json ou \`\`\` no início e fim), sem comentários, seguindo exatamente esta estrutura descrita a seguir.

Texto do Edital para Análise:
"""
${editalText}
"""

Retorne o JSON conforme a estrutura abaixo:
{
  "identificacao": {
    "nome_concurso": string | null,
    "orgao": string | null,
    "banca": string | null,
    "nivel": string (ex: "Superior", "Médio") | null,
    "cargos": [string],
    "numero_edital": string | null,
    "data_publicacao": string (formato "YYYY-MM-DD") | null
  },
  "cronograma_chave": {
    "inicio_inscricoes": string (formato "YYYY-MM-DD") | null,
    "fim_inscricoes": string (formato "YYYY-MM-DD") | null,
    "limite_pagamento": string (formato "YYYY-MM-DD") | null,
    "data_prova_objetiva": string (formato "YYYY-MM-DD") | null,
    "data_prova_discursiva": string (formato "YYYY-MM-DD") | null,
    "duracao_prova_objetiva": string (formato "HH:MM") | null,
    "duracao_prova_discursiva": string (formato "HH:MM") | null
  },
  "ficha_resumo_concurso": {
    "remuneracao_inicial": string | null,
    "vagas_imediatas": number | null,
    "vagas_cadastro_reserva": number | null,
    "requisito_escolaridade": string | null,
    "requisito_idade": string | null,
    "resumo_vagas_pcd_negros": string | null,
    "validade_certame": string | null
  },
  "inscricao": {
    "taxa": string | null,
    "site": string | null,
    "requisitos_principais": [string]
  },
  "materias_planejador": [
    {
      "id": string (ex: "direito_constitucional"),
      "nome": string (ex: "Direito Constitucional"),
      "sigla": string (ex: "CON"),
      "cor": string (ex: "#3b82f6"),
      "metaAcertos": number (geralmente 90),
      "aulas": [
        {
          "id": string (ex: "CON_00"),
          "numero": number (ex: 0),
          "titulo": string (ex: "Aula 00 - Direitos Fundamentais")
        }
      ]
    }
  ],
  "ciclo_estudo_sugerido": [
    {
      "materiaId": string (deve corresponder exatamente ao id de uma das materias_planejador),
      "tempoMinutos": number (ex: 90),
      "ordem": number (1, 2, 3...)
    }
  ],
  "simulado_distribuicao": {
    "banca": string | null,
    "totalQuestoes": number | null,
    "distribuicao": {
      "materiaId_snake_case": number
    }
  },
  "criterios_discursiva_correcao": {
    "exigida": boolean,
    "valor_total": number | null,
    "linhas_minimas": number | null,
    "linhas_maximas": number | null,
    "criterios_avaliacao": [string],
    "penalidades_zeram": [string],
    "tema_ou_genero": string | null
  },
  "proibicoes_e_recursos": {
    "materiais_proibidos": [string],
    "procedimento_recurso": string | null,
    "prazo_recurso_dias": number | null
  }
}`;

      if (userApiKey && userApiKey.trim() !== '') {
        // Chamada direta para o Gemini
        let model = 'gemini-3.5-flash';
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        });

        let data = await response.json().catch(() => ({}));
        
        // Fallback para gemini-1.5-flash
        if (!response.ok && (response.status === 429 || response.status === 503 || data.error?.message?.toLowerCase().includes('demand') || data.error?.message?.toLowerCase().includes('overload'))) {
          model = 'gemini-pro-latest';
          setAiImportStatus("Modelo com alta demanda. Usando fallback...");
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
              ]
            })
          });
          data = await response.json().catch(() => ({}));
        }

        if (!response.ok) {
          throw new Error(data.error?.message || `Erro HTTP ${response.status}`);
        }

        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        try {
          parsedData = JSON.parse(candidateText);
        } catch (jsonErr) {
          const cleanText = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanText);
        }
      } else {
        // Chamada ao backend
        const { data: authData } = await supabase.auth.getSession();
        const token = authData?.session?.access_token;

        const response = await fetch("/api/analisar-edital", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ editalText })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Erro HTTP ${response.status}`);
        }

        if (data.mocked) {
          throw new Error(data.error);
        }

        parsedData = data.data;
      }

      if (!parsedData || Object.keys(parsedData).length === 0) {
        throw new Error("Não foi possível obter dados estruturados do edital. Verifique o texto inserido.");
      }

      setExtractedEdital(parsedData);

    } catch (err: any) {
      console.error("Erro no importador de edital IA:", err);
      setAiImportErro(err.message || "Erro desconhecido ao processar o edital.");
    } finally {
      clearInterval(intervalId);
      setAiImportando(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#0C0E12] border border-[#C5A059]/45 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3 text-[#C5A059]">
          <Sparkles size={20} className="shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold font-display uppercase tracking-wider text-white">Análise de Edital com IA</h4>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-1">
              Faça o upload do seu edital em PDF ou cole o texto do Conteúdo Programático no campo de texto abaixo. A Inteligência Artificial fará a extração, analisará o conteúdo e apresentará uma visualização organizada do edital, sugerindo a estruturação de disciplinas e a distribuição da prova.
            </p>
          </div>
        </div>

        {!extractedEdital ? (
          <div className="space-y-3.5">
            {/* Zona de Upload de PDF */}
            {!pdfLendo && !pdfAvisoScanned && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                      extrairTextoDePdf(file);
                    } else {
                      setAiImportErro("Formato de arquivo inválido. Por favor, envie um edital em formato PDF.");
                    }
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf';
                  input.onchange = (e: any) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      extrairTextoDePdf(files[0]);
                    }
                  };
                  input.click();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf';
                    input.onchange = (e: any) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        extrairTextoDePdf(files[0]);
                      }
                    };
                    input.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Área de upload de edital em PDF"
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 outline-none focus:ring-2 focus:ring-[#C5A059] ${
                  isDragOver
                    ? 'border-[#C5A059] bg-[#C5A059]/10'
                    : 'border-[#C5A059]/30 bg-[#161B26]/30 hover:border-[#C5A059]/60 hover:bg-[#161B26]/50'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                   <FileText size={28} className={`text-[#C5A059] ${isDragOver ? 'animate-bounce' : 'animate-pulse'}`} />
                   <div className="space-y-0.5">
                     <p className="text-xs font-bold text-white">
                       {isDragOver ? 'Solte o arquivo para iniciar' : 'Arraste seu edital em PDF aqui ou clique para selecionar'}
                     </p>
                     <p className="text-[10px] text-[#64748B]">
                       Apenas arquivos PDF (.pdf) de até 15MB
                     </p>
                   </div>
                </div>
              </div>
            )}

            {/* Progresso da Extração de Texto do PDF */}
            {pdfLendo && (
              <div className="bg-[#161B26] border border-[#C5A059]/30 rounded-lg p-5 flex flex-col items-center justify-center space-y-3.5">
                <RefreshCcw className="animate-spin text-[#C5A059]" size={24} />
                <div className="w-full max-w-xs space-y-1.5 text-center">
                  <p className="text-xs font-bold text-white">Extraindo Texto do PDF</p>
                  <p className="text-[10px] text-[#94A3B8] font-mono">
                    Página {pdfProgresso.atual} de {pdfProgresso.total}
                  </p>
                  <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C5A059] h-full transition-all duration-200"
                      style={{ width: `${pdfProgresso.total > 0 ? (pdfProgresso.atual / pdfProgresso.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de PDF Escaneado (Sem OCR) */}
            {pdfAvisoScanned && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-rose-300">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-white">Edital Sem Texto Selecionável</h5>
                    <p className="text-[10px] leading-relaxed text-[#B4C6E7]">
                      Não conseguimos ler o texto deste PDF automaticamente porque ele parece ser composto por imagens digitalizadas (scans).
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfAvisoScanned(false);
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf';
                      input.onchange = (e: any) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          extrairTextoDePdf(files[0]);
                        }
                      };
                      input.click();
                    }}
                    className="px-3 py-1.5 bg-[#C5A059] text-black font-bold text-[10px] rounded hover:bg-[#C5A059]/90 cursor-pointer"
                  >
                    Tentar Outro Arquivo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfAvisoScanned(false);
                      setEditalText(" ");
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-[10px] rounded hover:bg-slate-700 cursor-pointer"
                  >
                    Digitar Manualmente
                  </button>
                </div>
              </div>
            )}

            {/* Editor Textarea */}
            {!pdfLendo && !pdfAvisoScanned && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
                    Texto do Edital para Análise
                  </label>
                  {editalText.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja realmente limpar todo o texto do edital?")) {
                          setEditalText('');
                          setPdfAvisoScanned(false);
                        }
                      }}
                      className="text-[9px] text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-[#1E293B] px-2 py-0.5 rounded cursor-pointer border border-[#2D3748] hover:border-rose-500/35 transition-colors"
                    >
                      <Trash2 size={10} /> Limpar Tudo
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    id="ai-edital-textarea"
                    placeholder="Cole aqui o texto do seu edital, regras de disciplinas, conteúdos programáticos..."
                    value={editalText}
                    onChange={(e) => setEditalText(e.target.value)}
                    rows={12}
                    className="w-full bg-[#161B26] border border-[#2D3748] rounded-lg p-3.5 text-xs text-white outline-none focus:border-[#C5A059] font-sans resize-y leading-relaxed transition-all duration-300"
                    disabled={aiImportando}
                  />
                  {aiImportando && (
                    <div className="absolute inset-0 bg-[#0C0E12]/80 rounded-lg flex flex-col items-center justify-center space-y-3 p-4 text-center">
                      <RefreshCcw className="animate-spin text-[#C5A059]" size={28} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#C5A059] uppercase tracking-wider animate-pulse">Processando Edital</p>
                        <p className="text-[10px] text-[#94A3B8] max-w-sm italic leading-normal">{aiImportStatus}</p>
                      </div>
                    </div>
                  )}
                </div>

                {aiImportErro && (
                  <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 leading-relaxed">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{aiImportErro}</span>
                  </div>
                )}

                {editalText.length > 120000 && (
                  <div className="flex items-start gap-2.5 text-amber-300 text-[10px] bg-amber-500/10 p-3 rounded border border-amber-500/25 leading-relaxed">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      <strong>Aviso de tamanho:</strong> O texto colado é muito longo ({editalText.length} caracteres). **Você ainda pode prosseguir com a análise clicando no botão abaixo**, mas para garantir maior precisão e evitar erros por tempo limite de resposta do servidor (timeout de rede) na nuvem, recomendamos apagar seções administrativas redundantes (regras de taxas, isenções, recursos de gabarito) no próprio editor, mantendo estritamente o **Conteúdo Programático** e **Cronograma**.
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-[#64748B] font-mono">
                    {editalText.length} caracteres no buffer
                  </span>
                  <button
                    type="button"
                    onClick={analisarEditalComIA}
                    disabled={aiImportando || !editalText.trim()}
                    className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#C5A059]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#C5A059]/10"
                  >
                    <Sparkles size={13} /> Analisar Edital com IA
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Preview Interativo do Edital Extraído */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-500" /> Análise de Edital Concluída
              </span>
              <button
                type="button"
                onClick={() => setExtractedEdital(null)}
                className="text-[10px] text-[#94A3B8] hover:text-white flex items-center gap-1 bg-[#1E293B] px-2 py-1 rounded"
              >
                <ArrowLeft size={10} /> Voltar/Editar Texto
              </button>
            </div>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#161B26] border border-[#2D3748] rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider">Total Disciplinas</span>
                <span className="text-xl font-display font-bold text-white">{extractedEdital.materias_planejador?.length || 0}</span>
              </div>
              <div className="bg-[#161B26] border border-[#2D3748] rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider">Tópicos / Aulas</span>
                <span className="text-xl font-display font-bold text-[#C5A059]">{extractedEdital.materias_planejador?.reduce((acc: number, m: any) => acc + (m.aulas?.length || 0), 0)}</span>
              </div>
              <div className="bg-[#161B26] border border-[#2D3748] rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider">Prova Discursiva</span>
                <span className={`text-sm font-bold mt-1 ${extractedEdital.criterios_discursiva_correcao?.exigida ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {extractedEdital.criterios_discursiva_correcao?.exigida ? 'Exigida' : 'Não Exigida'}
                </span>
              </div>
              <div className="bg-[#161B26] border border-[#2D3748] rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider">Banca / Órgão</span>
                <span className="text-sm font-bold text-white truncate">{extractedEdital.identificacao?.banca || 'Não definida'}</span>
                <span className="text-[9px] text-[#94A3B8] truncate">{extractedEdital.identificacao?.orgao || '-'}</span>
              </div>
            </div>

            {/* Regras e Cronograma */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cronograma de Provas */}
              {extractedEdital.cronograma_chave && (
                <div className="bg-gradient-to-br from-[#111622] to-[#161B26] p-5 border border-[#2D3748] rounded-xl flex flex-col gap-3 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Calendar size={64} />
                  </div>
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5 z-10">
                    <Calendar size={14} className="text-[#C5A059]" /> Cronograma de Provas
                  </h5>
                  <div className="grid grid-cols-2 gap-3 z-10 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#64748B] uppercase font-mono tracking-wider">Objetiva</span>
                      <span className="text-white font-bold text-xs">{extractedEdital.cronograma_chave.data_prova_objetiva ? extractedEdital.cronograma_chave.data_prova_objetiva.split('-').reverse().join('/') : '-'}</span>
                      <span className="text-[#94A3B8] text-[10px]">{extractedEdital.cronograma_chave.horario_prova_objetiva || extractedEdital.cronograma_chave.duracao_prova_objetiva || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#64748B] uppercase font-mono tracking-wider">Discursiva</span>
                      <span className="text-white font-bold text-xs">{extractedEdital.cronograma_chave.data_prova_discursiva ? extractedEdital.cronograma_chave.data_prova_discursiva.split('-').reverse().join('/') : '-'}</span>
                      <span className="text-[#94A3B8] text-[10px]">{extractedEdital.cronograma_chave.horario_prova_discursiva || extractedEdital.cronograma_chave.duracao_prova_discursiva || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Regras Importantes */}
              {extractedEdital.regras_importantes && extractedEdital.regras_importantes.length > 0 && (
                <div className="bg-gradient-to-br from-[#111622] to-[#161B26] p-5 border border-[#2D3748] rounded-xl flex flex-col gap-3 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <AlertTriangle size={64} />
                  </div>
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5 z-10">
                    <AlertTriangle size={14} className="text-[#C5A059]" /> Regras Importantes
                  </h5>
                  <div className="space-y-2 z-10 mt-1">
                    {extractedEdital.regras_importantes.map((regra: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug">
                        <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{regra}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Master-Detail Verticalization */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Left Sidebar: Disciplines List */}
              <div className="md:w-1/3 flex flex-col gap-2 sticky top-6 self-start">
                <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
                  Matérias Mapeadas
                </h5>
                <div className="flex flex-col gap-1.5">
                  {extractedEdital.materias_planejador?.map((mat: any) => {
                    const isSelected = selectedMateriaId === mat.id;
                    const qCount = extractedEdital.simulado_distribuicao?.distribuicao?.[mat.id] || 0;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMateriaId(mat.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all duration-200 flex items-center gap-2.5 ${isSelected ? 'bg-[#1E293B] border-[#C5A059] shadow-sm shadow-[#C5A059]/10' : 'bg-[#111622] border-[#1E293B] hover:border-[#2D3748] hover:bg-[#161B26]'}`}
                      >
                        <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: mat.cor || '#64748b' }} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>{mat.nome}</span>
                          <span className="text-[9px] font-mono text-[#64748B]">{mat.aulas?.length || 0} Tópicos • {qCount} Qs</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Detail: Selected Discipline Verticalization */}
              <div className="md:w-2/3 bg-[#111622] border border-[#1E293B] rounded-xl flex flex-col">
                {selectedMateriaId ? (() => {
                  const selectedMat = extractedEdital.materias_planejador?.find((m: any) => m.id === selectedMateriaId);
                  if (!selectedMat) return null;
                  return (
                    <>
                      <div className="p-4 border-b border-[#1E293B] bg-[#161B26] rounded-t-xl shrink-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black uppercase text-[#0A0D14] px-2.5 py-1 rounded tracking-wider font-mono shrink-0 shadow-sm" style={{ backgroundColor: selectedMat.cor || '#64748b' }}>
                            {selectedMat.sigla || 'MAT'}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-white leading-tight">{selectedMat.nome}</h3>
                            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{selectedMat.aulas?.length || 0} tópicos extraídos do edital</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 p-4 space-y-2">
                        {selectedMat.aulas && selectedMat.aulas.length > 0 ? (
                          selectedMat.aulas.map((aula: any) => (
                            <div key={aula.id} className="group flex gap-3 p-2.5 rounded-lg hover:bg-[#1E293B]/50 border border-transparent hover:border-[#2D3748] transition-colors items-start">
                              <span className="font-mono text-[9px] bg-[#1E293B] group-hover:bg-[#0A0D14] text-slate-400 font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 border border-[#2D3748]">
                                T{aula.numero.toString().padStart(2, '0')}
                              </span>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] text-slate-300 leading-snug">{aula.titulo}</span>
                                {aula.relevancia_alta && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded w-fit">
                                    <Flame size={10} /> Tópico Essencial
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-[#64748B] space-y-2">
                            <FileText size={24} className="opacity-20" />
                            <p className="text-xs">Nenhum tópico mapeado nesta disciplina.</p>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center h-full text-[#64748B] space-y-2">
                    <Layers size={32} className="opacity-20" />
                    <p className="text-xs">Selecione uma disciplina ao lado para visualizar os tópicos.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ciclo e Discursiva Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ciclo de Estudo Sugerido */}
              <div className="bg-gradient-to-br from-[#111622] to-[#161B26] p-5 border border-[#2D3748] rounded-xl flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <RefreshCcw size={64} />
                </div>
                <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5 z-10">
                  <Layers size={14} className="text-[#C5A059]" /> Ciclo Sugerido (Tempo de Estudo)
                </h5>
                <div className="flex flex-wrap gap-2 z-10 mt-1">
                  {extractedEdital.ciclo_estudo_sugerido && extractedEdital.ciclo_estudo_sugerido.length > 0 ? (
                    extractedEdital.ciclo_estudo_sugerido.map((item: any, idx: number) => {
                      const matchMat = extractedEdital.materias_planejador?.find((m: any) => m.id === item.materiaId);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 bg-[#0A0D14] text-slate-200 text-[11px] px-2.5 py-1.5 rounded-md border border-[#2D3748] font-mono shadow-sm">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: matchMat?.cor || '#64748b' }} />
                          <span className="font-bold tracking-tight">{matchMat?.sigla || 'MAT'}</span>
                          <span className="text-[#64748B] ml-1 bg-[#1E293B] px-1 rounded text-[9px]">{item.tempoMinutos || 90}m</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-[#64748B] italic">Sem sugestão de ciclo formatada.</p>
                  )}
                </div>
              </div>

              {/* Critérios da Prova Discursiva */}
              <div className="bg-gradient-to-br from-[#111622] to-[#161B26] p-5 border border-[#2D3748] rounded-xl flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Award size={64} />
                </div>
                <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5 z-10">
                  <Award size={14} className="text-[#C5A059]" /> Diretrizes da Prova Discursiva
                </h5>
                {extractedEdital.criterios_discursiva_correcao?.exigida ? (
                  <div className="space-y-3 z-10 mt-1">
                    <div className="flex gap-4">
                      <div className="bg-[#0A0D14] border border-[#2D3748] rounded px-3 py-1.5 flex flex-col">
                        <span className="text-[8px] font-mono text-[#64748B] uppercase">Valor Total</span>
                        <span className="text-white font-bold text-xs">{extractedEdital.criterios_discursiva_correcao.valor_total} pts</span>
                      </div>
                      <div className="bg-[#0A0D14] border border-[#2D3748] rounded px-3 py-1.5 flex flex-col">
                        <span className="text-[8px] font-mono text-[#64748B] uppercase">Extensão</span>
                        <span className="text-white font-bold text-xs">{extractedEdital.criterios_discursiva_correcao.linhas_minimas || 10} a {extractedEdital.criterios_discursiva_correcao.linhas_maximas || 30} linhas</span>
                      </div>
                    </div>
                    {extractedEdital.criterios_discursiva_correcao.penalidades_zeram?.length > 0 && (
                      <div className="space-y-1.5 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5">
                        <p className="font-bold text-rose-300 text-[10px] uppercase font-mono tracking-wider">Causas que zeram a nota:</p>
                        <div className="space-y-1">
                          {extractedEdital.criterios_discursiva_correcao.penalidades_zeram.slice(0, 3).map((pen: string, idx: number) => (
                            <div key={idx} className="text-[10px] text-rose-200/80 flex items-start gap-1.5 leading-snug">
                              <span className="text-rose-500 font-bold mt-0.5">•</span> {pen}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 z-10">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <p className="text-[11px] text-emerald-200">Prova discursiva não exigida ou não detalhada no edital.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ações de Navegação */}
            <div className="flex justify-end pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Deseja realmente iniciar uma nova análise e limpar os dados atuais?")) {
                    setExtractedEdital(null);
                    setEditalText('');
                    localStorage.removeItem('superestrategico_edital_buffer_text');
                    localStorage.removeItem('superestrategico_edital_buffer_json');
                  }
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCcw size={13} /> Nova Análise
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
