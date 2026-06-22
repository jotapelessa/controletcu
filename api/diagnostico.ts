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
  // Configurando CORS básico para segurança
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
(Escreva aqui o diagnóstico geral detalhado sobre o volume de horas e taxa de acertos em relação ao nível exigido de 90-95% (ou conforme metas configuradas por matéria) exigido para o TCU.)

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

    return res.status(200).json({
      success: true,
      diagnostico: response.text || "Não foi possível gerar seu diagnóstico inteligente. Tente registrar mais horas de estudo."
    });

  } catch (err: any) {
    console.error("Erro no diagnóstico Gemini:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Erro interno do servidor ao gerar diagnóstico"
    });
  }
}
