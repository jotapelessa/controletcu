/**
 * Utilitário para rastreamento, cálculo de custos e métricas de consumo de tokens da API do Google Gemini.
 */

export interface GeminiTokenLog {
  id: string;
  timestamp: string; // ISO String
  feature: 'redacao' | 'diagnostico' | 'edital' | 'teste';
  featureName: string;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface TokenUsageSummary {
  totalTokens: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  totalCostUsd: number;
  totalAnalises: number;
  mediaTokensPorAnalise: number;
  porRecurso: {
    redacao: { tokens: number; analises: number; pct: number };
    diagnostico: { tokens: number; analises: number; pct: number };
    edital: { tokens: number; analises: number; pct: number };
    teste: { tokens: number; analises: number; pct: number };
  };
}

const STORAGE_KEY = 'superestrategico_gemini_token_logs';
const MAX_LOGS = 100;

// Preços por 1 milhão de tokens (estimativa para família Gemini Flash no Google AI Studio)
const PRECO_INPUT_POR_MILHAO = 0.075; // $0.075 / 1M prompt tokens
const PRECO_OUTPUT_POR_MILHAO = 0.30;  // $0.30 / 1M output tokens

/**
 * Calcula o custo estimado em USD com base nos tokens de entrada e saída.
 */
export function calcularCustoEstimadoUsd(promptTokens: number, candidatesTokens: number): number {
  const custoInput = (promptTokens / 1_000_000) * PRECO_INPUT_POR_MILHAO;
  const custoOutput = (candidatesTokens / 1_000_000) * PRECO_OUTPUT_POR_MILHAO;
  return Number((custoInput + custoOutput).toFixed(6));
}

/**
 * Obtém a lista de logs de tokens salvos no localStorage.
 */
export function obterLogsTokens(): GeminiTokenLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler logs de tokens do Gemini:', err);
    return [];
  }
}

/**
 * Salva a lista de logs no localStorage.
 */
export function definirLogsTokens(logs: GeminiTokenLog[]): void {
  try {
    const limited = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    window.dispatchEvent(new Event('superestrategico_tokens_updated'));
    window.dispatchEvent(new Event('superestrategico_config_updated'));
  } catch (err) {
    console.error('Erro ao salvar logs de tokens:', err);
  }
}

/**
 * Registra uma nova operação de consumo de tokens.
 */
export function registrarConsumoTokens(params: {
  feature: 'redacao' | 'diagnostico' | 'edital' | 'teste';
  featureName: string;
  model?: string;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
}): GeminiTokenLog {
  const promptTokens = Math.max(0, Number(params.promptTokens || 0));
  const candidatesTokens = Math.max(0, Number(params.candidatesTokens || 0));
  const totalTokens = Math.max(
    promptTokens + candidatesTokens,
    Number(params.totalTokens || 0)
  );

  const costUsd = calcularCustoEstimadoUsd(promptTokens, candidatesTokens);

  const novoLog: GeminiTokenLog = {
    id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    feature: params.feature,
    featureName: params.featureName,
    model: params.model || 'gemini-3.5-flash',
    promptTokens,
    candidatesTokens,
    totalTokens,
    costUsd
  };

  const logsAtuais = obterLogsTokens();
  const logsAtualizados = [novoLog, ...logsAtuais].slice(0, MAX_LOGS);

  definirLogsTokens(logsAtualizados);
  return novoLog;
}

/**
 * Limpa todo o histórico de consumo de tokens.
 */
export function limparHistoricoTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('superestrategico_tokens_updated'));
    window.dispatchEvent(new Event('superestrategico_config_updated'));
  } catch (err) {
    console.error('Erro ao limpar histórico de tokens:', err);
  }
}

/**
 * Calcula o resumo consolidado e distribuição de tokens por funcionalidade.
 */
export function obterResumoTokens(): TokenUsageSummary {
  const logs = obterLogsTokens();

  let totalTokens = 0;
  let totalPromptTokens = 0;
  let totalCandidatesTokens = 0;
  let totalCostUsd = 0;

  const porRecurso = {
    redacao: { tokens: 0, analises: 0, pct: 0 },
    diagnostico: { tokens: 0, analises: 0, pct: 0 },
    edital: { tokens: 0, analises: 0, pct: 0 },
    teste: { tokens: 0, analises: 0, pct: 0 }
  };

  for (const log of logs) {
    totalTokens += log.totalTokens;
    totalPromptTokens += log.promptTokens;
    totalCandidatesTokens += log.candidatesTokens;
    totalCostUsd += log.costUsd || 0;

    const feature = log.feature || 'teste';
    if (porRecurso[feature]) {
      porRecurso[feature].tokens += log.totalTokens;
      porRecurso[feature].analises += 1;
    }
  }

  const totalAnalises = logs.length;
  const mediaTokensPorAnalise = totalAnalises > 0 ? Math.round(totalTokens / totalAnalises) : 0;

  if (totalTokens > 0) {
    porRecurso.redacao.pct = Math.round((porRecurso.redacao.tokens / totalTokens) * 100);
    porRecurso.diagnostico.pct = Math.round((porRecurso.diagnostico.tokens / totalTokens) * 100);
    porRecurso.edital.pct = Math.round((porRecurso.edital.tokens / totalTokens) * 100);
    porRecurso.teste.pct = Math.round((porRecurso.teste.tokens / totalTokens) * 100);
  }

  return {
    totalTokens,
    totalPromptTokens,
    totalCandidatesTokens,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    totalAnalises,
    mediaTokensPorAnalise,
    porRecurso
  };
}
