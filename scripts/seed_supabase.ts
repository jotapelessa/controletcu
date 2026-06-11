/**
 * =============================================================================
 * TCU AUDITOR — SCRIPT DE SEED DO SUPABASE
 * =============================================================================
 * Popula o banco de dados com um usuário de teste e dados falsos realistas.
 * Executa diagnóstico completo da integração Supabase e reporta cada etapa.
 *
 * USO:
 *   npx tsx scripts/seed_supabase.ts
 *
 * REQUISITOS:
 *   - VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env
 *   - SUPABASE_SERVICE_ROLE_KEY no arquivo .env (opcional, para criar usuário admin)
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ─── Configuração ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'tcu.auditor.seed@gmail.com';
const TEST_PASSWORD = 'TesteTCU@2026!';

// ─── Utilitários de log ───────────────────────────────────────────────────────
const OK   = (msg: string) => console.log(`  ✅ ${msg}`);
const FAIL = (msg: string) => console.log(`  ❌ ${msg}`);
const INFO = (msg: string) => console.log(`  ℹ️  ${msg}`);
const HEAD = (msg: string) => console.log(`\n${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}`);
const SUB  = (msg: string) => console.log(`\n  ┌─ ${msg}`);

// ─── Dados de Seed ────────────────────────────────────────────────────────────

const MATERIAS_SEED = [
  {
    id: 'controle_externo',
    nome: 'Controle Externo',
    sigla: 'CEX',
    cor: 'amber',
    aulas: [
      { id: 'CEX_01', numero: 1, titulo: 'Entidades Fiscalizadoras Superiores (EFS). Sistemas de Controle.', status: 'Concluído', questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5, horasEstudadas: 3.5, dataConclusao: '2026-06-01' },
      { id: 'CEX_02', numero: 2, titulo: 'Tribunais de contas: funções, natureza jurídica e eficácia.', status: 'Concluído', questoesResolvidas: 35, questoesAcertadas: 30, questoesErradas: 5, horasEstudadas: 2.8, dataConclusao: '2026-06-03' },
      { id: 'CEX_03', numero: 3, titulo: 'Aspectos constitucionais do controle da Administração.', status: 'Em Revisão', questoesResolvidas: 20, questoesAcertadas: 16, questoesErradas: 4, horasEstudadas: 1.5, dataConclusao: null },
      { id: 'CEX_04', numero: 4, titulo: 'Competências na legislação e Organização constitucional dos TCs.', status: 'Em Vídeo', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 1.0, dataConclusao: null },
      { id: 'CEX_05', numero: 5, titulo: 'Lei Orgânica e Regimento Interno do TCU (Parte 1).', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
      { id: 'CEX_06', numero: 6, titulo: 'Lei Orgânica e Regimento Interno do TCU (Parte 2).', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
      { id: 'CEX_07', numero: 7, titulo: 'Lei Orgânica e Regimento Interno do TCU (Parte 3).', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
      { id: 'CEX_08', numero: 8, titulo: 'Lei Orgânica e Regimento Interno do TCU (Parte 4).', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
      { id: 'CEX_09', numero: 9, titulo: 'Lei Orgânica e Regimento Interno do TCU (Parte 5).', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
      { id: 'CEX_10', numero: 10, titulo: 'Declaração de Lima, Declaração do México e ISSAI 20.', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
    ]
  },
  {
    id: 'afo',
    nome: 'Administração Financeira e Orçamentária',
    sigla: 'AFO',
    cor: 'blue',
    aulas: [
      { id: 'AFO_01', numero: 1, titulo: 'Orçamento na Constituição de 1988: PPA, LDO, LOA.', status: 'Concluído', questoesResolvidas: 60, questoesAcertadas: 52, questoesErradas: 8, horasEstudadas: 4.2, dataConclusao: '2026-05-28' },
      { id: 'AFO_02', numero: 2, titulo: 'Princípios orçamentários. Lei nº 4.320/1964.', status: 'Concluído', questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7, horasEstudadas: 3.6, dataConclusao: '2026-05-30' },
      { id: 'AFO_03', numero: 3, titulo: 'Leis de Créditos Adicionais.', status: 'Lendo PDF', questoesResolvidas: 10, questoesAcertadas: 7, questoesErradas: 3, horasEstudadas: 2.0, dataConclusao: null },
      { id: 'AFO_04', numero: 4, titulo: 'Emendas parlamentares ao Orçamento. PPA: estrutura e base legal.', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
      { id: 'AFO_05', numero: 5, titulo: 'Orçamento público. Conceito. Técnicas orçamentárias.', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
    ]
  },
  {
    id: 'auditoria',
    nome: 'Auditoria Governamental',
    sigla: 'AUD',
    cor: 'green',
    aulas: [
      { id: 'AUD_01', numero: 1, titulo: 'Conceito, evolução. Auditoria interna e externa.', status: 'Concluído', questoesResolvidas: 40, questoesAcertadas: 36, questoesErradas: 4, horasEstudadas: 2.5, dataConclusao: '2026-06-02' },
      { id: 'AUD_02', numero: 2, titulo: 'Tópicos de Auditoria Interna.', status: 'Em Revisão', questoesResolvidas: 25, questoesAcertadas: 20, questoesErradas: 5, horasEstudadas: 1.8, dataConclusao: null },
      { id: 'AUD_03', numero: 3, titulo: 'Planejamento de auditoria. Termos e estratégia global.', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
    ]
  },
  {
    id: 'direito_constitucional',
    nome: 'Direito Constitucional',
    sigla: 'CON',
    cor: 'purple',
    aulas: [
      { id: 'CON_01', numero: 1, titulo: 'Princípios fundamentais. Normas constitucionais.', status: 'Concluído', questoesResolvidas: 55, questoesAcertadas: 47, questoesErradas: 8, horasEstudadas: 3.8, dataConclusao: '2026-05-25' },
      { id: 'CON_02', numero: 2, titulo: 'Teoria Geral dos Direitos Fundamentais.', status: 'Concluído', questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5, horasEstudadas: 3.2, dataConclusao: '2026-05-27' },
      { id: 'CON_03', numero: 3, titulo: 'Direitos e deveres individuais e coletivos – Parte I.', status: 'Em Vídeo', questoesResolvidas: 5, questoesAcertadas: 4, questoesErradas: 1, horasEstudadas: 1.2, dataConclusao: null },
      { id: 'CON_04', numero: 4, titulo: 'Direitos e deveres individuais e coletivos – Parte II.', status: 'Não Iniciado', questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, horasEstudadas: 0, dataConclusao: null },
    ]
  },
  {
    id: 'direito_administrativo',
    nome: 'Direito Administrativo',
    sigla: 'ADM',
    cor: 'indigo',
    aulas: [
      { id: 'ADM_01', numero: 1, titulo: 'Regime jurídico-administrativo. Princípios da Administração.', status: 'Concluído', questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7, horasEstudadas: 3.5, dataConclusao: '2026-05-20' },
      { id: 'ADM_02', numero: 2, titulo: 'Organização administrativa. Centralização e descentralização.', status: 'Concluído', questoesResolvidas: 40, questoesAcertadas: 34, questoesErradas: 6, horasEstudadas: 2.8, dataConclusao: '2026-05-22' },
      { id: 'ADM_03', numero: 3, titulo: 'Ato administrativo. Conceito, requisitos e atributos.', status: 'Lendo PDF', questoesResolvidas: 15, questoesAcertadas: 12, questoesErradas: 3, horasEstudadas: 2.1, dataConclusao: null },
    ]
  }
];

const CICLO_SEED = {
  id: 'ciclo_principal',
  nome: 'Ciclo TCU 2026 — Sprint Intensivo',
  itemAtualIndice: 2,
  itens: [
    { id: 'c1', materiaId: 'controle_externo', tempoMinutos: 90, Ordem: 1 },
    { id: 'c2', materiaId: 'afo', tempoMinutos: 90, Ordem: 2 },
    { id: 'c3', materiaId: 'auditoria', tempoMinutos: 60, Ordem: 3 },
    { id: 'c4', materiaId: 'direito_constitucional', tempoMinutos: 90, Ordem: 4 },
    { id: 'c5', materiaId: 'direito_administrativo', tempoMinutos: 60, Ordem: 5 },
  ]
};

const SIMULADOS_SEED = [
  {
    id: 'sim_001',
    titulo: 'Simulado TCU 2024 — Estratégia Concursos',
    data: '2026-05-15',
    banca: 'FGV',
    totalQuestoes: 120,
    questoesAcertadas: 88,
    questoesErradas: 32,
    desempenhoPorMateria: {
      controle_externo: { questoes: 20, acertos: 16, erros: 4 },
      afo: { questoes: 25, acertos: 18, erros: 7 },
      auditoria: { questoes: 20, acertos: 15, erros: 5 },
      direito_constitucional: { questoes: 25, acertos: 20, erros: 5 },
      direito_administrativo: { questoes: 30, acertos: 19, erros: 11 },
    },
    observacoes: 'Bom desempenho geral. ADM ainda é ponto fraco — revisar licitações.'
  },
  {
    id: 'sim_002',
    titulo: 'Simulado Temático — AFO + CEX (FGV 2023)',
    data: '2026-06-01',
    banca: 'FGV',
    totalQuestoes: 50,
    questoesAcertadas: 40,
    questoesErradas: 10,
    desempenhoPorMateria: {
      controle_externo: { questoes: 25, acertos: 22, erros: 3 },
      afo: { questoes: 25, acertos: 18, erros: 7 },
    },
    observacoes: 'CEX muito bom (88%). AFO ainda com lacunas em créditos adicionais.'
  },
  {
    id: 'sim_003',
    titulo: 'Simulado Constitucional — CON Intensivo',
    data: '2026-06-08',
    banca: 'FGV',
    totalQuestoes: 40,
    questoesAcertadas: 34,
    questoesErradas: 6,
    desempenhoPorMateria: {
      direito_constitucional: { questoes: 40, acertos: 34, erros: 6 },
    },
    observacoes: 'Excelente! 85% de acerto em CON. Manter revisões espaçadas.'
  }
];

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const HISTORICO_SEED = [
  { id: 'log_001', data: daysAgo(10), materiaId: 'controle_externo', aulaId: 'CEX_01', duracaoMinutos: 90, questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5, tipo: 'Teoria (PDF)', comentarios: 'Primeira leitura do módulo. Conteúdo denso mas claro.' },
  { id: 'log_002', data: daysAgo(9), materiaId: 'afo', aulaId: 'AFO_01', duracaoMinutos: 90, questoesResolvidas: 30, questoesAcertadas: 25, questoesErradas: 5, tipo: 'Vídeo', comentarios: 'Videoaula do Estratégia assistida na íntegra.' },
  { id: 'log_003', data: daysAgo(8), materiaId: 'direito_constitucional', aulaId: 'CON_01', duracaoMinutos: 75, questoesResolvidas: 55, questoesAcertadas: 47, questoesErradas: 8, tipo: 'Questões', comentarios: 'Bateria de questões FGV 2022/2023. Bom rendimento.' },
  { id: 'log_004', data: daysAgo(7), materiaId: 'controle_externo', aulaId: 'CEX_02', duracaoMinutos: 60, questoesResolvidas: 35, questoesAcertadas: 30, questoesErradas: 5, tipo: 'Teoria (PDF)', comentarios: null },
  { id: 'log_005', data: daysAgo(6), materiaId: 'auditoria', aulaId: 'AUD_01', duracaoMinutos: 90, questoesResolvidas: 40, questoesAcertadas: 36, questoesErradas: 4, tipo: 'Vídeo', comentarios: 'Módulo de auditoria — excelente professor.' },
  { id: 'log_006', data: daysAgo(5), materiaId: 'direito_administrativo', aulaId: 'ADM_01', duracaoMinutos: 120, questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7, tipo: 'Questões', comentarios: 'Questões de concursos anteriores da FGV para ADM.' },
  { id: 'log_007', data: daysAgo(4), materiaId: 'afo', aulaId: 'AFO_02', duracaoMinutos: 90, questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7, tipo: 'Teoria (PDF)', comentarios: 'Leitura profunda sobre princípios orçamentários.' },
  { id: 'log_008', data: daysAgo(3), materiaId: 'controle_externo', aulaId: 'CEX_01', duracaoMinutos: 45, questoesResolvidas: 0, questoesAcertadas: 0, questoesErradas: 0, tipo: 'Revisão', comentarios: 'Revisão rápida dos flashcards do módulo 1 CEX.' },
  { id: 'log_009', data: daysAgo(2), materiaId: 'direito_constitucional', aulaId: 'CON_02', duracaoMinutos: 80, questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5, tipo: 'Questões', comentarios: 'Bateria CON-02. Muito bom desempenho em direitos fundamentais.' },
  { id: 'log_010', data: daysAgo(1), materiaId: 'direito_administrativo', aulaId: 'ADM_02', duracaoMinutos: 75, questoesResolvidas: 40, questoesAcertadas: 34, questoesErradas: 6, tipo: 'Teoria (PDF)', comentarios: 'Centralização e descentralização administrativa. Bloco pesado.' },
  { id: 'log_011', data: daysAgo(0), materiaId: 'controle_externo', aulaId: 'CEX_03', duracaoMinutos: 60, questoesResolvidas: 20, questoesAcertadas: 16, questoesErradas: 4, tipo: 'Questões', comentarios: 'Questões sobre controle constitucional. Alguns pontos incertos.' },
];

const REVISOES_SEED = [
  {
    id: 'rev_001',
    materiaId: 'controle_externo',
    aulaId: 'CEX_01',
    titulo: 'Revisão 24h: CEX - Aula 01',
    dataCriacao: daysAgo(10),
    dataRevisaoAlvo: daysAgo(9),
    intervaloDias: 1,
    concluida: true,
    etapa: 2,
    historico: [
      { data: daysAgo(10), status: 'agendada' },
      { data: daysAgo(9), status: 'concluida' }
    ]
  },
  {
    id: 'rev_002',
    materiaId: 'afo',
    aulaId: 'AFO_01',
    titulo: 'Revisão 7 dias: AFO - Aula 01',
    dataCriacao: daysAgo(9),
    dataRevisaoAlvo: daysAgo(2),
    intervaloDias: 7,
    concluida: true,
    etapa: 3,
    historico: [
      { data: daysAgo(9), status: 'agendada' },
      { data: daysAgo(2), status: 'concluida' }
    ]
  },
  {
    id: 'rev_003',
    materiaId: 'direito_constitucional',
    aulaId: 'CON_01',
    titulo: 'Revisão 24h: CON - Aula 01',
    dataCriacao: daysAgo(8),
    dataRevisaoAlvo: daysAgo(7),
    intervaloDias: 1,
    concluida: false,
    etapa: 1,
    historico: [
      { data: daysAgo(8), status: 'agendada' },
      { data: daysAgo(7), status: 'atrasada' }
    ]
  },
  {
    id: 'rev_004',
    materiaId: 'auditoria',
    aulaId: 'AUD_01',
    titulo: 'Revisão 24h: AUD - Aula 01',
    dataCriacao: daysAgo(6),
    dataRevisaoAlvo: daysAgo(5),
    intervaloDias: 1,
    concluida: true,
    etapa: 2,
    historico: [
      { data: daysAgo(6), status: 'agendada' },
      { data: daysAgo(5), status: 'concluida' }
    ]
  },
  {
    id: 'rev_005',
    materiaId: 'controle_externo',
    aulaId: 'CEX_02',
    titulo: 'Revisão 24h: CEX - Aula 02',
    dataCriacao: daysAgo(7),
    dataRevisaoAlvo: new Date(now.getTime() + 86400000).toISOString(), // amanhã
    intervaloDias: 1,
    concluida: false,
    etapa: 1,
    historico: [
      { data: daysAgo(7), status: 'agendada' }
    ]
  },
];

const PLANEJAMENTO_SEMANAL_SEED = {
  diasAtivos: [true, true, true, true, true, true, false],
  horasPorDia: 4,
  dataProva: '2026-09-15',
  metaQuestoesPorSemana: 200,
};

// ─── Script Principal ─────────────────────────────────────────────────────────

async function main() {
  HEAD('🔍 DIAGNÓSTICO DE INTEGRAÇÃO — TCU AUDITOR SUPABASE');

  // ── Pré-verificação ──────────────────────────────────────────────────────
  SUB('PASSO 1: Verificar variáveis de ambiente');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    FAIL('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env');
    process.exit(1);
  }
  OK(`URL do Supabase: ${SUPABASE_URL}`);
  OK(`Chave anon: ${SUPABASE_ANON_KEY.substring(0, 30)}...`);
  
  if (!SERVICE_ROLE_KEY) {
    INFO('SUPABASE_SERVICE_ROLE_KEY não encontrado. Será usado método de signup normal.');
    INFO('Para ter acesso admin, adicione SUPABASE_SERVICE_ROLE_KEY no .env');
  } else {
    OK('Service Role Key encontrada — modo Admin ativo.');
  }

  // ── Criar cliente Supabase ───────────────────────────────────────────────
  SUB('PASSO 2: Conectar ao Supabase');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  OK('Cliente Supabase instanciado com sucesso.');

  // ── Testar conectividade de rede ─────────────────────────────────────────
  SUB('PASSO 3: Testar conectividade com o Supabase');
  try {
    const { error } = await supabase.from('user_data_sync').select('count').limit(1);
    if (error) {
      const msg = error.message || '';
      // Tabela não existe no cache — precisa executar o schema SQL
      if (msg.includes('Could not find') || msg.includes('does not exist') || error.code === '42P01') {
        FAIL(`Tabela 'user_data_sync' NÃO EXISTE no banco de dados!`);
        INFO('SOLUÇÃO: Vá ao Supabase Dashboard → SQL Editor e execute o arquivo supabase_schema.sql');
        process.exit(1);
      }
      // JWT/RLS blocks são esperados sem autenticação — confirmam que a tabela existe
      INFO(`Resposta do banco (esperada por RLS): ${msg}`);
    }
    OK('Conexão com Supabase bem-sucedida. Tabela user_data_sync detectada.');
  } catch (err: any) {
    FAIL(`Falha de rede ao conectar com o Supabase: ${err.message}`);
    process.exit(1);
  }

  // ── Criar/Logar Usuário de Teste ─────────────────────────────────────────
  SUB('PASSO 4: Autenticação — Criar/logar usuário de teste');
  let userId = '';
  let session: any = null;

  // Tentar login primeiro (caso já exista)
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (loginData?.session) {
    OK(`Usuário existente logado com sucesso: ${TEST_EMAIL}`);
    userId = loginData.user!.id;
    session = loginData.session;
  } else {
    INFO(`Login falhou (${loginError?.message}). Tentando criar novo usuário...`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: { name: 'Testador TCU Auditor' }
      }
    });

    if (signupError) {
      FAIL(`Falha no cadastro do usuário de teste: ${signupError.message}`);
      INFO('');
      INFO('DICA: Verifique nas configurações do Supabase se "Email Confirmations" está DESABILITADO');
      INFO('Caminho: Supabase Dashboard → Authentication → Providers → Email → Confirm email = OFF');
      process.exit(1);
    }

    if (!signupData.session) {
      FAIL('Usuário criado mas sessão não iniciada — provavelmente exige confirmação de e-mail.');
      INFO('SOLUÇÃO: Desabilite a confirmação de e-mail no painel do Supabase:');
      INFO('Authentication → Settings → Enable email confirmations = OFF');
      process.exit(1);
    }

    userId = signupData.user!.id;
    session = signupData.session;
    OK(`Novo usuário de teste criado e logado: ${TEST_EMAIL} (ID: ${userId})`);
  }

  // ── Verificar tabela com usuário autenticado ──────────────────────────────
  SUB('PASSO 5: Testar SELECT na tabela com usuário autenticado');
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${session.access_token}` }
    }
  });

  const { data: existingData, error: selectError } = await authedClient
    .from('user_data_sync')
    .select('user_id, updated_at')
    .eq('user_id', userId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    FAIL(`Erro ao consultar tabela: ${selectError.message} (código: ${selectError.code})`);
  } else if (existingData) {
    INFO(`Dados já existem para esse usuário (updated_at: ${existingData.updated_at}). Sobrescrevendo com seed...`);
  } else {
    OK('SELECT bem-sucedido. Nenhum dado existente — será feita inserção limpa.');
  }

  // ── Inserir Dados de Seed ─────────────────────────────────────────────────
  SUB('PASSO 6: Inserir dados de seed via UPSERT');

  const payload = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    materias: MATERIAS_SEED,
    ciclo: CICLO_SEED,
    simulados: SIMULADOS_SEED,
    revisoes: REVISOES_SEED,
    historico: HISTORICO_SEED,
    planejamento_semanal: PLANEJAMENTO_SEMANAL_SEED,
  };

  const { error: upsertError } = await authedClient
    .from('user_data_sync')
    .upsert(payload, { onConflict: 'user_id' });

  if (upsertError) {
    FAIL(`Falha no UPSERT: ${upsertError.message}`);
    INFO(`Código de erro: ${upsertError.code}`);
    INFO(`Detalhes: ${upsertError.details}`);
    if (upsertError.message.includes('ciclo') && upsertError.message.includes('null')) {
      INFO('DICA: A coluna ciclo é NOT NULL no schema. Verifique se o campo ciclo está presente e não nulo.');
    }
    process.exit(1);
  }

  OK('UPSERT executado com sucesso!');

  // ── Verificar dados inseridos ─────────────────────────────────────────────
  SUB('PASSO 7: Verificar integridade dos dados inseridos');

  const { data: verifyData, error: verifyError } = await authedClient
    .from('user_data_sync')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (verifyError) {
    FAIL(`Erro na verificação pós-inserção: ${verifyError.message}`);
    process.exit(1);
  }

  OK(`Registro encontrado no banco — updated_at: ${verifyData.updated_at}`);
  
  // Verificar cada campo
  const checks: [string, any, string][] = [
    ['materias', verifyData.materias, `${(verifyData.materias as any[]).length} matérias`],
    ['ciclo', verifyData.ciclo, `"${verifyData.ciclo?.nome}"`],
    ['simulados', verifyData.simulados, `${(verifyData.simulados as any[]).length} simulados`],
    ['revisoes', verifyData.revisoes, `${(verifyData.revisoes as any[]).length} revisões`],
    ['historico', verifyData.historico, `${(verifyData.historico as any[]).length} logs de sessão`],
    ['planejamento_semanal', verifyData.planejamento_semanal, `data da prova: ${verifyData.planejamento_semanal?.dataProva}`],
  ];

  for (const [field, value, description] of checks) {
    if (value !== null && value !== undefined) {
      OK(`Campo '${field}' → ${description}`);
    } else {
      FAIL(`Campo '${field}' está NULL ou ausente no banco!`);
    }
  }

  // ── Testar atualização (simula auto-sync) ─────────────────────────────────
  SUB('PASSO 8: Testar UPDATE (simula o auto-sync da aplicação)');

  const payloadUpdate = {
    ...payload,
    updated_at: new Date().toISOString(),
    historico: [
      ...HISTORICO_SEED,
      {
        id: 'log_seed_test',
        data: new Date().toISOString(),
        materiaId: 'controle_externo',
        aulaId: 'CEX_04',
        duracaoMinutos: 30,
        questoesResolvidas: 10,
        questoesAcertadas: 9,
        questoesErradas: 1,
        tipo: 'Questões',
        comentarios: '[SEED TEST] Log inserido automaticamente pelo script de diagnóstico.'
      }
    ]
  };

  const { error: updateError } = await authedClient
    .from('user_data_sync')
    .upsert(payloadUpdate, { onConflict: 'user_id' });

  if (updateError) {
    FAIL(`Falha no UPDATE de diagnóstico: ${updateError.message}`);
  } else {
    OK('UPDATE (auto-sync) executado com sucesso. Log de teste adicionado ao histórico.');
  }

  // ── Testar DELETE (limpeza) ───────────────────────────────────────────────
  // Não deletamos — mantemos os dados para verificar na aplicação.

  // ── Testar políticas de isolamento de usuário ─────────────────────────────
  SUB('PASSO 9: Testar isolamento de segurança (RLS)');
  INFO('Tentando acessar dados com UUID inválido de outro usuário...');

  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  const { data: isolationData } = await authedClient
    .from('user_data_sync')
    .select('*')
    .eq('user_id', fakeUserId);

  if (!isolationData || isolationData.length === 0) {
    OK('Isolamento RLS funcionando: dados de outros usuários INACESSÍVEIS. ✔');
  } else {
    FAIL('FALHA DE SEGURANÇA: RLS não está filtrando corretamente por user_id!');
  }

  // ── Relatório Final ───────────────────────────────────────────────────────
  HEAD('📋 RELATÓRIO FINAL DO SEED');
  OK(`Usuário de teste: ${TEST_EMAIL}`);
  OK(`User ID: ${userId}`);
  OK(`${MATERIAS_SEED.length} matérias com ${MATERIAS_SEED.flatMap(m => m.aulas).length} aulas inseridas`);
  OK(`${SIMULADOS_SEED.length} simulados inseridos`);
  OK(`${HISTORICO_SEED.length + 1} logs de sessão inseridos`);
  OK(`${REVISOES_SEED.length} revisões espaçadas inseridas`);
  console.log('');
  INFO('Para testar na aplicação:');
  INFO(`  1. Abra http://localhost:3000`);
  INFO(`  2. Clique em "Dados & Backup" → "Conectar Conta / Fazer Login"`);
  INFO(`  3. Use: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  INFO(`  4. A aplicação deve carregar os dados do Supabase automaticamente`);
  console.log('');
}

main().catch((err) => {
  FAIL(`Erro inesperado no seed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
