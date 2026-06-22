import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import * as cheerio from 'cheerio';
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // max 20 requisições por IP
  message: {
    success: false,
    error: "Muitas requisições de diagnóstico de IA a partir deste IP, por favor tente novamente após 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Endpoint Scraper Estratégia
app.post("/api/scraper", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes('estrategiaconcursos.com.br')) {
    return res.status(400).json({ error: 'URL inválida. Forneça um link do Estratégia Concursos.' });
  }
  try {
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!fetchResponse.ok) throw new Error(`Status ${fetchResponse.status}`);
    const html = await fetchResponse.text();
    const $ = cheerio.load(html);
    const pageText = $('body').text();
    const regex = /Aula\s+(\d{1,2})\s*[-–:]?\s*([^\n\r]+)/gi;
    const aulasExtraidas: { numero: number; titulo: string }[] = [];
    const numerosEncontrados = new Set<number>();
    let match;
    while ((match = regex.exec(pageText)) !== null) {
      const numero = parseInt(match[1], 10);
      let titulo = match[2].trim().replace(/\s+/g, ' ');
      if (!numerosEncontrados.has(numero) && titulo.length > 3) {
        numerosEncontrados.add(numero);
        aulasExtraidas.push({ numero, titulo: `Aula ${numero.toString().padStart(2, '0')} - ${titulo}` });
      }
    }
    aulasExtraidas.sort((a, b) => a.numero - b.numero);
    const cursoNome = $('title').text().split('-')[0].trim();
    return res.status(200).json({
      curso: cursoNome,
      totalAulas: aulasExtraidas.length,
      aulas: aulasExtraidas,
      sucesso: aulasExtraidas.length > 0
    });
  } catch (error: any) {
    console.error('Erro no scraper local:', error);
    return res.status(500).json({ error: 'Falha ao processar o link. O site pode ter bloqueado o acesso.', detalhes: error.message });
  }
});

// Post route for study diagnosis using Gemini
app.post("/api/diagnostico", limiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Acesso não autorizado. Token de sessão ausente." });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Acesso não autorizado. Sessão inválida ou expirada." });
    }

    const { materias, simulados, historico, totalHoras, totalQuestoes, totalAcertos } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: true,
        diagnostico: "⚠️ **Chave API (GEMINI_API_KEY) não encontrada.** Por favor, configure seus segredos no painel de Configurações para habilitar o Diagnóstico Inteligente de IA!"
      });
    }

    const materiasResumo = materias.map((m: any) => {
      const concluidas = m.aulas.filter((a: any) => a.status === 'Concluído').length;
      const emProgresso = m.aulas.filter((a: any) => a.status !== 'Não Iniciado' && a.status !== 'Concluído').length;
      
      let totQuestoes = 0;
      let totAcertos = 0;
      m.aulas.forEach((a: any) => {
        totQuestoes += (a.questoesResolvidas || 0);
        totAcertos += (a.questoesAcertadas || 0);
      });

      const histMateria = (historico || []).filter((h: any) => h.materiaId === m.id);
      const mQuestHist = histMateria.reduce((acc: number, curr: any) => acc + (curr.questoesResolvidas || 0), 0);
      const mAcertHist = histMateria.reduce((acc: number, curr: any) => acc + (curr.questoesAcertadas || 0), 0);

      const finalQuestoes = Math.max(totQuestoes, mQuestHist);
      const finalAcertos = Math.max(totAcertos, mAcertHist);
      const taxaAcerto = finalQuestoes > 0 ? Math.round((finalAcertos / finalQuestoes) * 100) : 0;
      const meta = m.metaAcertos !== undefined ? m.metaAcertos : (['CEX', 'AFO', 'AUD'].includes(m.sigla) ? 95 : 90);

      return `- **${m.nome} (${m.sigla})**: ${concluidas}/${m.aulas.length} aulas concluídas. ${emProgresso} em progresso. Questões resolvidas: ${finalQuestoes}, Acerto: ${taxaAcerto}% (Meta Configurada: ${meta}%)`;
    }).join("\n");

    const simuladosResumo = simulados && simulados.length > 0
      ? simulados.map((s: any) => `- **${s.titulo}** (${s.data}): ${s.questoesAcertadas}/${s.totalQuestoes} acertos (${Math.round((s.questoesAcertadas/s.totalQuestoes)*100)}%)`).join("\n")
      : "Nenhum simulado cadastrado ainda.";

    const historicoResumo = historico && historico.length > 0
      ? historico.slice(0, 5).map((h: any) => `- ${new Date(h.data).toLocaleDateString('pt-BR')}: Estudou ${h.materiaId} por ${h.duracaoMinutos} min (${h.tipo})`).join("\n")
      : "Nenhum histórico recente.";

    const prompt = `Você é um Coach e Mentor altamente especializado no concurso de Auditor de Controle Externo do TCU (Tribunal de Contas da União), a área mais concorrida de controle. 
Analise as estatísticas atuais de estudos deste assinante do Estratégia Concursos e gere um diagnóstico de estudos estratégico profissional, com feedback crítico, construtivo e motivador em Português (Brasil).

### Métricas de Estudo Gerais:
- **Total de Horas Estudadas**: ${(totalHoras ?? 0).toFixed(1)} horas
- **Total de Questões Feitas**: ${totalQuestoes ?? 0}
- **Média Geral de Acertos**: ${(totalQuestoes ?? 0) > 0 ? Math.round(((totalAcertos ?? 0) / (totalQuestoes ?? 1)) * 100) : 0}%

### Desempenho por Matéria (Baseado no Edital Estratégia):
${materiasResumo}

### Histórico de Simulados da Banca:
${simuladosResumo}

### Últimas Sessões de Estudo Registradas:
${historicoResumo}

### Instruções Cruciais de Estrutura da Resposta:
Você deve estruturar seu laudo técnico exatamente com os delimitadores de tag indicados abaixo. Não coloque nenhum texto fora delas:

[DIAGNOSTICO_GERAL]
(Escreva aqui o diagnóstico geral detalhado sobre o volume de horas e taxa de acertos em relação ao nível exigido de 90-95% (ou conforme metas configuradas por matéria) exigido pela banca FGV para o TCU.)

[ALERTA_FRAQUEZA]
(Identifique e disserte sobre as matérias com pior desempenho ou inércia de estudos, alertando sobre o risco estatístico destas no edital do TCU.)

[RECOMENDACOES]
(Dicas práticas de remediação para o ciclo de estudos e gestão de revisões espaçadas.)

[PASSOS]
- [ ] Passo 1
- [ ] Passo 2
(Defina um checklist com 2 ou 3 passos de ação imediata que o usuário deve seguir hoje. Utilize obrigatoriamente o formato de tarefas do Markdown: "- [ ] Texto do passo").

Mantenha uma linguagem acadêmica, séria e focada na excelência profissional que o cargo de Auditor exige.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      diagnostico: response.text || "Não foi possível gerar seu diagnóstico inteligente. Tente registrar mais horas de estudo."
    });

  } catch (err: any) {
    console.error("Erro no diagnóstico Gemini:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro interno do servidor ao gerar diagnóstico"
    });
  }
});

// Post route for edital analysis using Gemini
app.post("/api/analisar-edital", limiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Acesso não autorizado. Token de sessão ausente." });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Acesso não autorizado. Sessão inválida ou expirada." });
    }

    const { editalText } = req.body;
    if (!editalText || editalText.trim() === '') {
      return res.status(400).json({ success: false, error: "O texto do edital não pode estar vazio." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: true,
        mocked: true,
        error: "⚠️ Chave API (GEMINI_API_KEY) não configurada no servidor. Cadastre sua chave pessoal nas Configurações para realizar a importação direta via navegador!"
      });
    }

    const prompt = `Você é o Super Analisador de Editais do SuperEstrategico. Sua função é ler o texto completo de um edital de concurso público ou processo seletivo e extrair todas as informações de forma precisa, organizada e estruturada, focando na montagem automática do plano de estudos do aluno.

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    const outputText = response.text || "";
    let parsedData = {};
    try {
      parsedData = JSON.parse(outputText);
    } catch (parseErr) {
      console.warn("Retorno da IA não é JSON puro, tentando limpar tags markdown:", parseErr);
      const cleanJson = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    res.json({
      success: true,
      data: parsedData
    });

  } catch (err: any) {
    console.error("Erro na análise de edital local:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro interno do servidor ao analisar edital"
    });
  }
});

// Start integration with Vite or production file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production file server active.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TCU Study Trainer backend active on host 0.0.0.0 and port ${PORT}`);
  });
}

startServer();
