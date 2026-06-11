import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
app.use(express.json());

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

### Instruções para a Resposta:
Crie um relatório estruturado no formato Markdown com os seguintes tópicos (use títulos elegantes, com emojis adequados para a área de controle):
1. **📊 Diagnóstico Geral**: Avaliação sobre se a carga horária e taxa de acerto estão saudáveis para o TCU (lembrando que para o TCU, índices acima de 80-85% são o alvo seguro devido ao peso da banca FGV).
2. **🔥 Alerta de Fraqueza (Prioridade Máxima)**: Identifique qual ou quais matérias merecem atenção imediata baseando-se em menor índice de acerto ou aulas paradas. Explique por que especificamente essa matéria é perigosa no TCU (ex: Contabilidade Pública, Estatística ou TI na FGV são devastadoras).
3. **🎯 Recomendações Críticas para o Ciclo**: Dicas acionáveis para ajustar o seu Ciclo de Estudos e sua rotina de Revisões Espaçadas.
4. **⏱️ Plano Próximo Passo**: Um roteiro simples de 2 ou 3 passos para o usuário seguir hoje mesmo de forma prática e disciplinada.

Mantenha uma linguagem acadêmica, séria e focada na excelência que o cargo de Auditor exige. Não use placeholders nem invente dados que não faça parte das estatísticas fornecidas.`;

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
