import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import * as cheerio from 'cheerio';

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
      const taxaAcerto = totQuestoes > 0 ? Math.round((totAcertos / totQuestoes) * 100) : 0;

      return `- **${m.nome} (${m.sigla})**: ${concluidas}/${m.aulas.length} aulas concluídas. ${emProgresso} em progresso. Questões resolvidas: ${totQuestoes}, Acerto: ${taxaAcerto}%`;
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
(Escreva aqui o diagnóstico geral detalhado sobre o volume de horas e taxa de acertos em relação ao nível exigido de 80-85% pela banca FGV para o TCU.)

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
