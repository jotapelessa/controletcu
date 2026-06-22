import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: any, res: any) {
  // CORS Config
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acesso não autorizado. Token de sessão ausente.' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Acesso não autorizado. Sessão inválida ou expirada.' });
    }

    const { editalText } = req.body;
    if (!editalText || editalText.trim() === '') {
      return res.status(400).json({ success: false, error: 'O texto do edital não pode estar vazio.' });
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
   - Converta os assuntos programáticos em uma lista de tópicos (mantendo a chave JSON como "aulas" por compatibilidade). Cada item deve possuir:
     * id: string no formato "SIGLA_XX", onde XX é o número do tópico com dois dígitos (ex: "CON_01", "CON_02").
     * numero: inteiro sequencial iniciando em 1 (1, 2, 3...).
     * titulo: string formatada como "Tópico XX - [Nome do Assunto Principal]" (ex: "Tópico 01 - Direitos e Garantias Fundamentais"). A verticalização deve ser EXAUSTIVA e ALTAMENTE DETALHADA. Não omita nem resuma os tópicos. Desdobre o conteúdo programático do edital em quantos tópicos forem necessários para cobrir 100% dos assuntos, mantendo a terminologia exata do edital. Se a matéria for extensa, pode gerar 30, 40 ou mais tópicos.
     * relevancia_alta: boolean. Marque como true APENAS para os 20% a 30% de tópicos que formam a base estrutural ou são historicamente o "coração" daquela disciplina em concursos. O restante deve ser false.

b) Ciclo de Estudos Sugerido:
   - Crie uma sugestão de ciclo de estudos circular (ciclo_estudo_sugerido) contendo os blocos de estudo para as matérias cadastradas.
   - Priorize matérias com maior peso ou maior volume de conteúdo programático.
   - Defina o tempoMinutos sugerido (geralmente entre 60 e 90 minutos por bloco).

c) Estrutura de Simulados:
   - Extraia a distribuição de questões por matéria na prova objetiva. No campo simulado_distribuicao, mapeie o total de questões da prova e a quantidade exata estimada para cada materiaId (usando o id snake_case gerado na seção de matérias).

d) Cronograma e Contagem Regressiva:
   - Mapeie as principais datas em formato padrão "YYYY-MM-DD" para permitir cálculos de dias restantes até as provas.
   - Capture os horários e turnos de cada prova.

e) Regras Importantes:
   - Extraia no MÁXIMO as 5 a 8 regras mais críticas do edital (ex: nota mínima para não ser eliminado, critérios de desempate, cor da caneta, itens permitidos/proibidos).
   - Seja conciso nas regras. Não transcreva parágrafos longos, use frases curtas e diretas.

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
    "duracao_prova_discursiva": string (formato "HH:MM") | null,
    "horario_prova_objetiva": string (ex: "Manhã - 08:00 às 12:00") | null,
    "horario_prova_discursiva": string (ex: "Tarde - 14:00 às 18:00") | null
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
  "regras_importantes": [string (máximo 8 regras concisas)],
  "materias_planejador": [
    {
      "id": string (ex: "direito_constitucional"),
      "nome": string (ex: "Direito Constitucional"),
      "sigla": string (ex: "CON"),
      "cor": string (ex: "#3b82f6"),
      "metaAcertos": number (geralmente 90),
      "aulas": [
        {
          "id": string (ex: "CON_01"),
          "numero": number (ex: 1),
          "titulo": string (ex: "Tópico 01 - Direitos Fundamentais"),
          "relevancia_alta": boolean (true apenas para temas centrais/estruturais)
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
      model: 'gemini-3.5-flash',
      contents: prompt
    });

    const outputText = response.text || '';
    let parsedData = {};
    try {
      parsedData = JSON.parse(outputText);
    } catch (parseErr) {
      console.warn('Retorno da IA não é JSON puro, tentando limpar tags markdown:', parseErr);
      const cleanJson = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    return res.status(200).json({
      success: true,
      data: parsedData
    });

  } catch (err: any) {
    console.error('Erro na análise de edital Gemini serverless:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno do servidor ao analisar edital'
    });
  }
}
