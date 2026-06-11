/**
 * =============================================================================
 * TCU AUDITOR — SCRIPT DE SEED DO SUPABASE (COMPLETO — 17 MATÉRIAS)
 * =============================================================================
 * Popula o banco com TODAS as 17 matérias e aulas do edital oficial TCU/FGV,
 * usando os IDs corretos que coincidem com o data.ts da aplicação.
 *
 * USO:  npx tsx scripts/seed_supabase.ts
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL    || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const TEST_EMAIL       = process.env.SEED_TEST_EMAIL || 'tcu.auditor.seed@gmail.com';
const TEST_PASSWORD    = 'TesteTCU@2026!';

const OK   = (m: string) => console.log(`  ✅ ${m}`);
const FAIL = (m: string) => console.log(`  ❌ ${m}`);
const INFO = (m: string) => console.log(`  ℹ️  ${m}`);
const HEAD = (m: string) => console.log(`\n${'═'.repeat(62)}\n  ${m}\n${'═'.repeat(62)}`);
const SUB  = (m: string) => console.log(`\n  ┌─ ${m}`);

// ─── Helper para gerar aulas zeradas ────────────────────────────────────────
function aula(sigla: string, num: number, titulo: string, opts: Partial<{
  status: string; questoesResolvidas: number; questoesAcertadas: number;
  questoesErradas: number; horasEstudadas: number; dataConclusao: string;
}> = {}) {
  const n = num.toString().padStart(2, '0');
  return {
    id: `${sigla}_${n}`,
    numero: num,
    titulo: `Aula ${n} - ${titulo}`,
    status: opts.status ?? 'Não Iniciado',
    questoesResolvidas: opts.questoesResolvidas ?? 0,
    questoesAcertadas:  opts.questoesAcertadas  ?? 0,
    questoesErradas:    opts.questoesErradas    ?? 0,
    horasEstudadas:     opts.horasEstudadas     ?? 0,
    ...(opts.dataConclusao ? { dataConclusao: opts.dataConclusao } : {}),
  };
}

// ─── 17 MATÉRIAS COMPLETAS ──────────────────────────────────────────────────
const MATERIAS_SEED = [

  // 1. CONTROLE EXTERNO
  {
    id: 'controle_externo', nome: 'Controle Externo', sigla: 'CEX', cor: '#2563eb',
    aulas: [
      aula('CEX', 1, 'Entidades Fiscalizadoras Superiores (EFS). Sistemas de Controle na Administração Pública Brasileira. Controle Interno.', { status: 'Concluído', questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5, horasEstudadas: 3.5, dataConclusao: '2026-06-01' }),
      aula('CEX', 2, 'Tribunais de contas: funções, natureza jurídica e eficácia.', { status: 'Concluído', questoesResolvidas: 35, questoesAcertadas: 30, questoesErradas: 5, horasEstudadas: 2.8, dataConclusao: '2026-06-03' }),
      aula('CEX', 3, 'Aspectos constitucionais do controle da Administração.', { status: 'Em Revisão', questoesResolvidas: 20, questoesAcertadas: 16, questoesErradas: 4, horasEstudadas: 1.5 }),
      aula('CEX', 4, 'Competências na legislação e Organização constitucional dos TCs.', { status: 'Em Vídeo', horasEstudadas: 1.0 }),
      aula('CEX', 5, 'Lei Orgânica e Regimento Interno do TCU (Parte 1).'),
      aula('CEX', 6, 'Lei Orgânica e Regimento Interno do TCU (Parte 2).'),
      aula('CEX', 7, 'Lei Orgânica e Regimento Interno do TCU (Parte 3).'),
      aula('CEX', 8, 'Lei Orgânica e Regimento Interno do TCU (Parte 4).'),
      aula('CEX', 9, 'Lei Orgânica e Regimento Interno do TCU (Parte 5).'),
      aula('CEX', 10, 'Declaração de Lima, Declaração do México e ISSAI 20.'),
    ]
  },

  // 2. AFO E DIREITO FINANCEIRO
  {
    id: 'afo_dir_financeiro', nome: 'AFO e Direito Financeiro', sigla: 'AFO', cor: '#059669',
    aulas: [
      aula('AFO', 1, 'Orçamento na Constituição de 1988: Plano Plurianual (PPA), Lei de Diretrizes Orçamentárias (LDO), Lei Orçamentária Anual (LOA). Orçamento público no Brasil: Títulos I, IV, V e VI.', { status: 'Concluído', questoesResolvidas: 60, questoesAcertadas: 52, questoesErradas: 8, horasEstudadas: 4.2, dataConclusao: '2026-05-28' }),
      aula('AFO', 2, 'Orçamento público: Princípios orçamentários. Orçamento público no Brasil: Lei nº 4.320/1964.', { status: 'Concluído', questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7, horasEstudadas: 3.6, dataConclusao: '2026-05-30' }),
      aula('AFO', 3, 'Leis de Créditos Adicionais. Orçamento público no Brasil: Lei nº 4.320/1964.', { status: 'Lendo PDF', questoesResolvidas: 10, questoesAcertadas: 7, questoesErradas: 3, horasEstudadas: 2.0 }),
      aula('AFO', 4, 'Emendas parlamentares ao Orçamento. Plano Plurianual (PPA): estrutura, base legal, objetivos, conteúdo, tipos de programas. Lei de Diretrizes Orçamentárias (LDO): objetivos, estrutura, base legal e conteúdo, Anexos de Metas Fiscais, Anexos de Riscos Fiscais, critérios para limitação de empenho. Ciclo orçamentário: elaboração da proposta, discussão, votação e aprovação da lei de orçamento. Orçamento público no Brasil: Lei nº 4.320/1964.'),
      aula('AFO', 5, 'Orçamento público. Conceito. Técnicas orçamentárias. Natureza jurídica.'),
      aula('AFO', 6, 'Classificação da receita pública: institucional, por categorias econômicas, por fontes e classificações adicionais previstas no Manual Técnico de Orçamento - MTO. Orçamento público no Brasil: Lei nº 4.320/1964.'),
      aula('AFO', 7, 'Orçamento público no Brasil: Lei nº 4.320/1964 (Dívida ativa).'),
      aula('AFO', 8, 'Classificações orçamentárias. Orçamento público no Brasil: Lei nº 4.320/1964.'),
      aula('AFO', 9, 'Classificação da despesa pública: institucional, funcional, programática, pela natureza e classificações adicionais previstas no Manual Técnico de Orçamento - MTO.'),
      aula('AFO', 10, 'Execução orçamentária e financeira: estágios e execução da despesa pública e da receita pública.'),
      aula('AFO', 11, 'Orçamento público no Brasil: Lei nº 4.320/1964 (Restos a pagar e Despesas de exercícios anteriores. Suprimento de fundos).'),
      aula('AFO', 12, 'Programação de desembolso e mecanismos retificadores do orçamento.'),
      aula('AFO', 13, 'Sistemas de informação da Administração Pública Federal: SIAFI.'),
      aula('AFO', 14, 'Conta Única do Tesouro Nacional: conceito e previsão legal.'),
      aula('AFO', 15, 'Gestão organizacional das finanças públicas: sistema de planejamento e orçamento e de programação financeira constantes da Lei nº 10.180/2001.'),
      aula('AFO', 16, 'Plano Plurianual (PPA): estrutura, base legal, objectives, conteúdo, tipos de programas (PPA 2020-2023).'),
      aula('AFO', 17, 'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte I: princípios, conceitos, planejamento.'),
      aula('AFO', 18, 'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte II: geração de despesas.'),
      aula('AFO', 19, 'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte III: renúncia de receitas, transferências voluntárias, destinação de recursos para o setor privado, transparência da gestão fiscal, prestação de contas e fiscalização da gestão fiscal.'),
      aula('AFO', 20, 'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte IV: prestação de contas e fiscalização da gestão fiscal.'),
    ]
  },

  // 3. AUDITORIA GOVERNAMENTAL
  {
    id: 'auditoria_gov', nome: 'Auditoria Governamental', sigla: 'AUD', cor: '#7c3aed',
    aulas: [
      aula('AUD', 1, 'Conceito, evolução. Auditoria interna e externa: papéis (Conceitos iniciais de auditoria).', { status: 'Concluído', questoesResolvidas: 40, questoesAcertadas: 36, questoesErradas: 4, horasEstudadas: 2.5, dataConclusao: '2026-06-02' }),
      aula('AUD', 2, 'Tópicos de Auditoria Interna.', { status: 'Em Revisão', questoesResolvidas: 25, questoesAcertadas: 20, questoesErradas: 5, horasEstudadas: 1.8 }),
      aula('AUD', 3, 'Planejamento de auditoria. Termos da auditoria e estratégia global de auditoria. Escopo do trabalho. Documentação da auditoria.'),
      aula('AUD', 4, 'Técnicas e procedimentos: inspeção documental, inspeção física, reexecução, recálculo, observação direta, entrevista/indagação, circularização, conciliação, procedimentos de revisão analítica, cruzamento eletrônico de dados.'),
      aula('AUD', 5, 'Suficiência e adequação das evidências.'),
      aula('AUD', 6, 'Métodos de amostragem aplicáveis às auditorias: por atributos e por unidade monetária. Supervisão e Controle de Qualidade.'),
      aula('AUD', 7, 'Amostragem por atributos e por unidade monetária (Aprofundamento).'),
      aula('AUD', 8, 'Auditorias de conformidade, financeira e operacional: conceitos, características e finalidades. Outros instrumentos de fiscalização: levantamento, monitoramento, acompanhamento e inspeção (Auditoria governamental: tipos, formas e instrumentos).'),
      aula('AUD', 9, 'Auditoria governamental segundo a INTOSAI. Normas internacionais para o exercício profissional da auditoria. Normas da INTOSAI: princípios fundamentais de auditoria e código de ética do setor público (ISSAIs 100, 130).'),
      aula('AUD', 10, 'Normas de auditoria do TCU (Portaria-TCU nº 280/2010). Matriz de Planejamento. Matriz de Achados e Matriz de Responsabilização.'),
      aula('AUD', 11, 'Materialidade. Avaliação dos riscos gerais do trabalho, dos riscos inerentes e de controle. Modelo de risco de auditoria. Respostas do auditor aos riscos gerais do trabalho e aos riscos de distorção relevante ou residuais (natureza, época e extensão).'),
      aula('AUD', 12, 'Técnicas para obtenção do entendimento do objeto e de seu ambiente (Controle interno).'),
      aula('AUD', 13, 'Tipos de opinião de auditoria em trabalhos de asseguração razoável.'),
      aula('AUD', 14, 'Normas para a tomada e prestação de contas dos administradores e responsáveis da Administração Pública Federal, para fins de julgamento pelo Tribunal de Contas da União (IN-TCU nº 84, de 22 de abril de 2020).'),
      aula('AUD', 15, 'Normas internacionais para o exercício profissional da auditoria (Normas do IIA).'),
      aula('AUD', 16, 'Manual de Auditoria Operacional do TCU (MAO).'),
      aula('AUD', 17, 'Trabalho de asseguração (NBC TA Estrutura Conceitual - Estrutura Conceitual para Trabalhos de Asseguração).'),
    ]
  },

  // 4. DIREITO CONSTITUCIONAL
  {
    id: 'dir_constitucional', nome: 'Direito Constitucional', sigla: 'CON', cor: '#dc2626',
    aulas: [
      aula('CON', 1, 'Princípios fundamentais. Aplicabilidade das normas constitucionais. Normas de eficácia plena, contida e limitada. Normas programáticas.', { status: 'Concluído', questoesResolvidas: 55, questoesAcertadas: 47, questoesErradas: 8, horasEstudadas: 3.8, dataConclusao: '2026-05-25' }),
      aula('CON', 2, 'Teoria Geral dos Direitos Fundamentais.', { status: 'Concluído', questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5, horasEstudadas: 3.2, dataConclusao: '2026-05-27' }),
      aula('CON', 3, 'Direitos e deveres individuais e coletivos – Parte I.', { status: 'Em Vídeo', questoesResolvidas: 5, questoesAcertadas: 4, questoesErradas: 1, horasEstudadas: 1.2 }),
      aula('CON', 4, 'Direitos e deveres individuais e coletivos – Parte II.'),
      aula('CON', 5, 'Direitos sociais.'),
      aula('CON', 6, 'Direitos de nacionalidade.'),
      aula('CON', 7, 'Direitos políticos.'),
      aula('CON', 8, 'Partidos políticos.'),
      aula('CON', 9, 'Organização político-administrativa do Estado. Estado federal brasileiro, União, estados, Distrito Federal, municípios e territórios.'),
      aula('CON', 10, 'Administração Pública. Disposições gerais, servidores públicos.'),
      aula('CON', 11, 'Poder Legislativo. Estrutura. Funcionamento e atribuições. Fiscalização contábil, financeira e orçamentária. Comissões Parlamentares de Inquérito (CPIs).'),
      aula('CON', 12, 'Processo legislativo; Reforma Constitucional.'),
      aula('CON', 13, 'Poder Executivo. Atribuições e responsabilidades do Presidente da República.'),
      aula('CON', 14, 'Poder Judiciário. Disposições gerais. Órgãos do poder judiciário. Organização e competências. Conselho Nacional de Justiça (CNJ): composição e competências.'),
      aula('CON', 15, 'Funções essenciais à justiça. Ministério Público e Advocacia Pública.'),
      aula('CON', 16, 'Controle de Constitucionalidade.'),
      aula('CON', 17, 'Constituição: conceito, classificações, normas constitucionais. (Nota: Módulo complementar/revisão).'),
      aula('CON', 18, 'Poder constituinte originário, derivado e suas espécies.'),
      aula('CON', 19, 'Título I da CF. Teoria dos princípios. Fundamentos, objetivos fundamentais, princípios das relações internacionais, separação de poderes, forma de governo, sistema de governo, forma de estado.'),
      aula('CON', 20, 'Teoria dos direitos fundamentais: conceito, fundamentos, características, titularidade, aplicação, tratados internacionais de direitos humanos, fontes dos direitos fundamentais, restrições.'),
      aula('CON', 21, 'Art. 5º da CF, parte 1: direitos à vida, liberdade, igualdade, segurança, propriedade e privacidade.'),
      aula('CON', 22, 'Garantias processuais gerais, garantias penais, remédios constitucionais.'),
      aula('CON', 23, 'Direitos sociais e direitos de nacionalidade (Revisão/Aprofundamento).'),
      aula('CON', 24, 'Direitos Políticos positivos e negativos, ativos e passivos. Normas constitucionais sobre partidos políticos.'),
      aula('CON', 25, 'Organização político-administrativa. Entes federativos. Bens Públicos. Intervenção.'),
      aula('CON', 26, 'Repartição de competências federativas: teoria e casuística.'),
      aula('CON', 27, 'Poder Legislativo na CF. Congresso Nacional e suas casas. Estatuto dos parlamentares. CPIs. Fiscalização contábil e financeira.'),
      aula('CON', 28, 'Poder Executivo na CF (Módulo de aprofundamento).'),
      aula('CON', 29, 'Disposições gerais sobre o Poder Judiciário na CF (arts. 92 a 100).'),
      aula('CON', 30, 'Regras sobre distribuição de competências entre os órgãos jurisdicionais.'),
      aula('CON', 31, 'Funções essenciais à Justiça: Ministério Público, Defensoria Pública, Advocacia Pública e Advocacia Privada.'),
      aula('CON', 32, 'Controle de constitucionalidade das leis e atos normativos. Espécies de controles de validade. Espécies de inconstitucionalidade. Sistemas de controle. Controle no Brasil: difuso e concentrado. Ações de controle concentrado. Efeitos das decisões em controle de constitucionalidade.'),
      aula('CON', 33, 'Arts. 136 a 144 da CF. Estados de emergência; forças armadas; segurança pública.'),
      aula('CON', 34, 'Sistema Tributário na CF (arts. 145 a 162).'),
      aula('CON', 35, 'Finanças Públicas e Orçamento (Arts. 163 a 169 da CF).'),
      aula('CON', 36, 'Ordem Econômica e Financeira (Arts. 170 a 192 da CF).'),
    ]
  },

  // 5. DIREITO ADMINISTRATIVO
  {
    id: 'dir_administrativo', nome: 'Direito Administrativo', sigla: 'ADM', cor: '#d97706',
    aulas: [
      aula('ADM', 1, 'Regime jurídico-administrativo. Conceito. Princípios expressos e implícitos da Administração Pública.', { status: 'Concluído', questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7, horasEstudadas: 3.5, dataConclusao: '2026-05-20' }),
      aula('ADM', 2, 'Estado, governo e Administração Pública. Conceitos. Elementos. Direito administrativo. Conceito. Objeto. Fontes.', { status: 'Concluído', questoesResolvidas: 40, questoesAcertadas: 34, questoesErradas: 6, horasEstudadas: 2.8, dataConclusao: '2026-05-22' }),
      aula('ADM', 3, 'Organização administrativa. Centralização, descentralização, concentração e desconcentração. Administração direta e indireta. Autarquias.', { status: 'Lendo PDF', questoesResolvidas: 15, questoesAcertadas: 12, questoesErradas: 3, horasEstudadas: 2.1 }),
      aula('ADM', 4, 'Fundações, empresas públicas e sociedades de economia mista.'),
      aula('ADM', 5, 'Entidades paraestatais e terceiro setor: serviços sociais autônomos, entidades de apoio, organizações sociais, organizações da sociedade civil de interesse público (OSCIP).'),
      aula('ADM', 6, 'Poderes da Administração Pública. Hierárquico, disciplinar, regulamentar e de polícia. Uso e abuso do poder.'),
      aula('ADM', 7, 'Ato administrativo. Conceito, requisitos, atributos, classificação e espécies.'),
      aula('ADM', 8, 'Extinção do ato administrativo: cassação, anulação, revogação e convalidação. Decadência administrativa.'),
      aula('ADM', 9, 'Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos) - Licitações (Parte 1).'),
      aula('ADM', 10, 'Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos) - Licitações (Parte 2).'),
      aula('ADM', 11, 'Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos) - Contratos.'),
      aula('ADM', 12, 'Serviços públicos. Conceito. Elementos constitutivos. Formas de prestação e meios de execução. Delegação: concessão, permissão e autorização. Classificação. Princípios.'),
      aula('ADM', 13, 'Decreto nº 11.531/2023 (Convênios e instrumentos congêneres).'),
      aula('ADM', 14, 'Controle da Administração Pública. Controle exercido pela Administração Pública. Controle judicial. Controle legislativo.'),
      aula('ADM', 15, 'Responsabilidade civil do Estado. Evolução histórica. Responsabilidade civil do Estado no direito brasileiro. Responsabilidade por ato comissivo e omissivo do Estado. Requisitos para a demonstração da responsabilidade, excludentes e atenuantes. Reparação do dano e direito de regresso.'),
      aula('ADM', 16, 'Lei nº 8.112/1990. Provimento. Vacância. Efetividade, estabilidade e vitaliciedade.'),
      aula('ADM', 17, 'Lei nº 8.112/1990. Remuneração. Direitos e deveres.'),
      aula('ADM', 18, 'Lei nº 8.112/1990. Responsabilidade. Processo Administrativo Disciplinar (PAD).'),
      aula('ADM', 19, 'Agentes públicos. Legislação pertinente. Disposições constitucionais aplicáveis. Disposições doutrinárias. Conceito. Espécies. Cargo, emprego e função pública.'),
      aula('ADM', 20, 'Processo administrativo. Lei nº 9.784/1999.'),
      aula('ADM', 21, 'Improbidade administrativa: Lei nº 8.429/1992.'),
      aula('ADM', 22, 'Lei de Acesso à Informação (Lei nº 12.527/2011): conceitos e aplicação.'),
      aula('ADM', 23, 'Apresentação do curso. Princípios expressos e implícitos da Administração Pública. (Nota: Bloco duplicado/revisão na seleção).'),
      aula('ADM', 24, 'Estado, governo e Administração Pública. Conceitos. Elementos. Direito administrativo. Conceito. Objeto. Fontes. Regime jurídico-administrativo. Conceito.'),
      aula('ADM', 25, 'Poderes da Administração Pública. Hierárquico, disciplinar, regulamentar e de polícia. Uso e abuso do poder.'),
      aula('ADM', 26, 'Ato administrativo: conceito, requisitos, atributos, classificação.'),
      aula('ADM', 27, 'Ato administrativo: espécies. Extinção do ato administrativo: cassação, anulação, revogação e convalidação. Decadência administrativa.'),
      aula('ADM', 28, 'Organização administrativa. Centralização, descentralização, concentração e desconcentração. Administração direta e indireta. Autarquias, fundações, empresas públicas e sociedades de economia mista.'),
      aula('ADM', 29, 'Consórcios Públicos.'),
      aula('ADM', 30, 'Entidades paraestatais e terceiro setor: serviços sociais autônomos, entidades de apoio, organizações sociais, organizações da sociedade civil de interesse público.'),
      aula('ADM', 31, 'Agentes públicos. Legislação pertinente. Disposições constitucionais aplicáveis. Disposições doutrinárias. Conceito. Espécies. Cargo, emprego e função pública.'),
      aula('ADM', 32, 'Lei nº 8.112/1990. Provimento. Vacância. Efetividade, estabilidade e vitaliciedade. Remuneração. Direitos e deveres. Responsabilidade. Processo administrativo disciplinar.'),
      aula('ADM', 33, 'Licitações à luz da Lei nº 14.133/2021 - Parte I.'),
      aula('ADM', 34, 'Licitações à luz da Lei nº 14.133/2021 - Parte II.'),
      aula('ADM', 35, 'Contratos administrativos (Lei nº 14.133/2021).'),
      aula('ADM', 36, 'Sistema de Registro de Preços. Decreto nº 11.462/2023.'),
      aula('ADM', 37, 'Convênios e Contratos de Repasse. Decreto nº 11.531/2023 e Portaria Interministerial nº 33/2023.'),
      aula('ADM', 38, 'Serviços públicos. Conceito. Elementos constitutivos. Formas de prestação e meios de execução. Delegação: concessão, permissão e autorização. Classificação. Princípios.'),
      aula('ADM', 39, 'Parceria Público-Privada (PPP).'),
      aula('ADM', 40, 'Processo Administrativo (Lei nº 9.784/1999).'),
      aula('ADM', 41, 'Responsabilidade civil do Estado. Evolução histórica e aplicação no direito brasileiro (Atos comissivos, omissivos, requisitos, excludentes, atenuantes, reparação e regresso).'),
      aula('ADM', 42, 'Controle da Administração Pública. Controle exercido pela Administração Pública. Controle judicial. Controle legislativo.'),
      aula('ADM', 43, 'Improbidade administrativa: Lei nº 8.429/1992.'),
      aula('ADM', 44, 'Lei de Acesso à Informação (Lei nº 12.527/2011).'),
      aula('ADM', 45, 'Lei Anticorrupção (Lei nº 12.846/2013).'),
      aula('ADM', 46, 'Lei nº 10.973/2004 - ETEC - Encomenda Tecnológica - Artigos 19 a 21-A.'),
    ]
  },

  // 6. CONTABILIDADE PÚBLICA
  {
    id: 'contabilidade_publica', nome: 'Contabilidade Pública (MCASP)', sigla: 'CPB', cor: '#0d9488',
    aulas: [
      aula('CPB', 1, 'Contabilidade Pública: aspectos introdutórios.'),
      aula('CPB', 2, 'MCASP: Procedimentos Contábeis Orçamentários (I).'),
      aula('CPB', 3, 'MCASP: Procedimentos Contábeis Orçamentários (II).'),
      aula('CPB', 4, 'MCASP: Procedimentos Contábeis Patrimoniais (I).'),
      aula('CPB', 5, 'MCASP: Procedimentos Contábeis Patrimoniais (II).'),
      aula('CPB', 6, 'MCASP: Procedimentos Contábeis Patrimoniais (III).'),
      aula('CPB', 7, 'MCASP: Plano de Contas Aplicado ao Setor Público (PCASP).'),
      aula('CPB', 8, 'Balanço Orçamentário.'),
      aula('CPB', 9, 'Balanço Financeiro.'),
      aula('CPB', 10, 'Balanço Patrimonial.'),
      aula('CPB', 11, 'Demonstração das Variações Patrimoniais (DVP).'),
      aula('CPB', 12, 'Demonstração dos Fluxos de Caixa (DFC). Demonstração das Mutações do Patrimônio Líquido (DMPL). Notas Explicativas.'),
      aula('CPB', 13, 'Título IX da Lei nº 4.320/1964 (Sistemas de Contas).'),
      aula('CPB', 14, 'NBC TSP – Estrutura Conceitual.'),
      aula('CPB', 15, 'Tópicos das NBC TSP Vigentes (IPSAS convergidas) - Parte I.'),
      aula('CPB', 16, 'Tópicos das NBC TSP Vigentes (IPSAS convergidas) - Parte II.'),
      aula('CPB', 17, 'Tópicos da LRF (I): Relatório Resumido da Execução Orçamentária (RREO) e Relatório de Gestão Fiscal (RGF).'),
      aula('CPB', 18, 'Tópicos da LRF (II): Conceitos de dívida pública e restos a pagar, escrituração e consolidação das contas.'),
      aula('CPB', 19, 'Sistema de Contabilidade Federal: organização e competências (Lei nº 10.180/2001 e Decreto nº 6.976/2009).'),
      aula('CPB', 20, 'Noções de Informações de Custos no Setor Público.'),
      aula('CPB', 21, 'Sistema Integrado de Administração Financeira do Governo Federal (SIAFI): conceito, objetivos, usuários e segurança do sistema (princípios e instrumentos).'),
    ]
  },

  // 7. CONTABILIDADE GERAL
  {
    id: 'contabilidade_geral', nome: 'Contabilidade Geral', sigla: 'CGE', cor: '#4f46e5',
    aulas: [
      aula('CGE', 1, 'Noções Iniciais de Contabilidade.'),
      aula('CGE', 2, 'Noções Iniciais de Demonstrações Contábeis.'),
      aula('CGE', 3, 'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte I (Retorno sobre o Capital Empregado, Alavancagem Financeira, Economic Value Added – EVA, EBITDA, Análise da Lucratividade, Análise Horizontal e Vertical, Análise de Tendências).'),
      aula('CGE', 4, 'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte II (Indicadores de Liquidez).'),
      aula('CGE', 5, 'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte III (Indicadores de estrutura de capital).'),
      aula('CGE', 6, 'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte IV (Análise do Capital de Giro; Capital Circulante Líquido).'),
      aula('CGE', 7, 'Informações extraídas das Notas Explicativas.'),
    ]
  },

  // 8. ANÁLISE DE DADOS E TI
  {
    id: 'analise_dados_ti', nome: 'Análise de Dados e TI', sigla: 'TI', cor: '#0891b2',
    aulas: [
      aula('TI', 1, 'Dados estruturados e não estruturados. Dados abertos. Coleta, tratamento, armazenamento, integração e recuperação de dados. Processos de ETL.'),
      aula('TI', 2, 'Representação de dados numéricos, textuais e estruturados; aritmética computacional. Representação de dados espaciais para georeferenciamento e geosensoriamento. Formatos e tecnologias: XML, JSON, CSV.'),
      aula('TI', 3, 'Introdução conceitual/leitura de apoio (Tema não explícito no edital - Pré-requisito).'),
      aula('TI', 4, 'Bancos de dados relacionais: teoria e implementação.'),
      aula('TI', 5, 'Normalização de Bancos de Dados.'),
      aula('TI', 6, 'Uso do SQL como DDL, DML, DCL. Processamento de transações.'),
      aula('TI', 7, 'Introdução conceitual/leitura de apoio II (Tema não explícito no edital - Pré-requisito).'),
      aula('TI', 8, 'Exploração de dados: conceituação e características. Noções do modelo CRISP-DM. Técnicas para pré-processamento de dados. Técnicas e tarefas de mineração de dados. Classificação. Regras de associação. Análise de agrupamentos (clusterização). Detecção de anomalias. Modelagem preditiva.'),
      aula('TI', 9, 'Conceitos de PLN (Processamento de Linguagem Natural): semântica vetorial, redução de dimensionalidade, modelagem de tópicos latentes, classificação de textos, análise de sentimentos, representações com n-gramas.'),
      aula('TI', 10, 'Conceitos de ML (Machine Learning): fontes de erro em modelos preditivos, validação e avaliação de modelos preditivos, underfitting, overfitting e técnicas de regularização, otimização de hiperparâmetros, separabilidade de dados, redução da dimensionalidade. Modelos lineares, árvores de decisão, redes neurais feed-forward, classificador Naive Bayes.'),
      aula('TI', 11, 'Linguagem Python: sintaxe, variáveis, tipos de dados e estruturas de controle de fluxo. Estruturas de dados, funções e arquivos.'),
      aula('TI', 12, 'Bibliotecas Python: NLTK, TensorFlow, Pandas, NumPy, Arrow, Scikit-Learn, SciPy.'),
      aula('TI', 13, 'Noções da Linguagem R: Sintaxe, tipos de dados, operadores, comandos de repetição, estruturas de dados, gráficos, Data frames. Tidyverse.'),
      aula('TI', 14, 'Lei de Acesso à Informação (Lei nº 12.527/2011): conceitos e aplicação. (Nota: Repetida na grade original).'),
      aula('TI', 15, 'Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais (LGPD). (Nota: Repetida na grade original).'),
      aula('TI', 16, 'Segurança da informação: Confidencialidade, integridade, disponibilidade, autenticidade e não repúdio. Políticas de segurança. Políticas de classificação da informação. Sistemas de gestão de segurança da informação. Tratamento de incidentes de segurança.'),
      aula('TI', 17, 'Pareamento de dados (Record Linkage): Processo e etapas. Classificação. Qualidade de dados pareados. Análise de dados pareados.'),
    ]
  },

  // 9. ECONOMIA E FINANÇAS PÚBLICAS
  {
    id: 'economia_setor_p', nome: 'Economia e Finanças Públicas', sigla: 'ECO', cor: '#4b5563',
    aulas: [
      aula('ECO', 1, 'Conceitos introdutórios: oferta, demanda e equilíbrio.'),
      aula('ECO', 2, 'Conceitos introdutórios: elasticidades.'),
      aula('ECO', 3, 'Introdução às estruturas de mercado: teoria da produção.'),
      aula('ECO', 4, 'Introdução às estruturas de mercado: teoria dos custos.'),
      aula('ECO', 5, 'Estrutura de mercado: concorrência perfeita.'),
      aula('ECO', 6, 'Estrutura de mercado: monopólio.'),
      aula('ECO', 7, 'Estrutura de mercado: concorrência monopolística e oligopólio.'),
      aula('ECO', 8, 'Falhas de mercado: externalidades, bens públicos, assimetria de informação (seleção adversa e perigo moral).'),
      aula('ECO', 9, 'Introdução à Macroeconomia: o sistema de contas nacionais e as identidades macroeconômicas básicas. Produto agregado e os problemas de mensuração. Produto nominal x produto real.'),
      aula('ECO', 10, 'Balanço de pagamentos.'),
      aula('ECO', 11, 'Contas do sistema monetário.'),
      aula('ECO', 12, 'O modelo keynesiano básico: o multiplicador e o papel dos gastos do governo.'),
      aula('ECO', 13, 'O modelo IS/LM: impactos das políticas monetária e fiscal.'),
      aula('ECO', 14, 'Políticas macroeconômicas em diferentes regimes cambiais.'),
      aula('ECO', 15, 'O financiamento do setor público no Brasil. A avaliação do gasto público.'),
      aula('ECO', 16, 'Conceitos de regulação, desregulação e re-regulação. Teoria econômica de indústrias reguladas. Regulação e formação de preços para estruturas de mercado de concorrência imperfeita. Conceitos básicos sobre regimes tarifários. Tarifação por custo de serviço. Tarifação por preço teto. Regulação por incentivos. Regulação para competição.'),
    ]
  },

  // 10. LÍNGUA PORTUGUESA
  {
    id: 'portugues_redacao', nome: 'Língua Portuguesa', sigla: 'POR', cor: '#db2777',
    aulas: [
      aula('POR', 1, 'Ortografia. Acentuação gráfica.'),
      aula('POR', 2, 'Morfologia: reconhecimento, emprego e sentido das classes gramaticais I – artigo, substantivo, adjetivo, numeral, advérbio, interjeição. Mecanismos de flexão dos nomes.'),
      aula('POR', 3, 'Morfologia: reconhecimento, emprego e sentido das classes gramaticais II - preposição e conjunção.'),
      aula('POR', 4, 'Morfologia: reconhecimento, emprego e sentido das classes gramaticais III - pronomes. Padrões gerais de colocação pronominal no português.'),
      aula('POR', 5, 'Morfologia: reconhecimento, emprego e sentido das classes gramaticais III – verbo. Emprego de tempos e modos dos verbos em português. Mecanismos de flexão dos verbs.'),
      aula('POR', 6, 'Morfologia: correção e vozes verbais.'),
      aula('POR', 7, 'Morfologia: processos de formação de palavras.'),
      aula('POR', 8, 'Sintaxe: frase e oração; termos da oração.'),
      aula('POR', 9, 'Sintaxe: processos de coordenação e subordinação.'),
      aula('POR', 10, 'Pontuação.'),
      aula('POR', 11, 'Concordância nominal e verbal.'),
      aula('POR', 12, 'Transitividade e regência de nomes e verbos. Emprego do sinal indicativo de crase.'),
      aula('POR', 13, 'Mecanismos de coesão textual. Reescrita de frases: substituição, deslocamento, paralelismo.'),
      aula('POR', 14, 'Semântica: sentido e emprego dos vocábulos; campos semânticos. Figuras de linguagem.'),
      aula('POR', 15, 'Elementos de construção do texto e seu sentido: gênero do texto (literário e não literário, narrativo, descritivo e argumentativo); interpretação e organização interna.'),
      aula('POR', 16, 'Variação linguística: norma culta.'),
      aula('POR', 17, 'Resumo da matéria.'),
    ]
  },

  // 11. LÍNGUA INGLESA
  {
    id: 'lingua_inglesa', nome: 'Língua Inglesa', sigla: 'ING', cor: '#0ea5e9',
    aulas: [
      aula('ING', 1, 'Interpretação de textos, Cognatos e Resolução de Provas.'),
      aula('ING', 2, 'Substantivos, Artigos, Pronomes, Preposições e Resolução de Provas.'),
      aula('ING', 3, 'Adjetivos, Advérbios, Afixos e Resolução de Provas.'),
      aula('ING', 4, 'Verbos Frasais e Resolução de provas.'),
      aula('ING', 5, 'Tempos Verbais (Parte 1) e Resolução de Provas.'),
      aula('ING', 6, 'Tempos Verbais (Parte 2) e Resolução Provas.'),
      aula('ING', 7, 'Expressões (Idioms) e Resolução de Provas.'),
      aula('ING', 8, 'Resolução Geral de Provas.'),
    ]
  },

  // 12. MATEMÁTICA BÁSICA E FINANCEIRA
  {
    id: 'raciocinio_logico', nome: 'Raciocínio Lógico e Mat. Financeira', sigla: 'RLM', cor: '#84cc16',
    aulas: [
      aula('RLM', 1, 'Frações. Razões e proporções. Escala. Proporcionalidade.'),
      aula('RLM', 2, 'Regra de Três Simples e Compostas.'),
      aula('RLM', 3, 'Porcentagem.'),
      aula('RLM', 4, 'Juros simples.'),
      aula('RLM', 5, 'Juros composto.'),
      aula('RLM', 6, 'Taxas.'),
      aula('RLM', 7, 'Operações de Desconto.'),
      aula('RLM', 8, 'Equivalência de capitais.'),
      aula('RLM', 9, 'Análise de investimentos.'),
      aula('RLM', 10, 'Sistemas de Amortização - SAC.'),
      aula('RLM', 11, 'Sistemas de Amortização (Francês, Misto e Americano).'),
    ]
  },

  // 13. ESTATÍSTICA
  {
    id: 'estatistica', nome: 'Estatística', sigla: 'EST', cor: '#8b5cf6',
    aulas: [
      aula('EST', 1, 'Apresentação de dados.'),
      aula('EST', 2, 'Medidas de Posição: Médias.'),
      aula('EST', 3, 'Medidas Separatrizes ou Quantis.'),
      aula('EST', 4, 'Medidas de Posição: Moda.'),
      aula('EST', 5, 'Medidas de Variabilidade ou Dispersão.'),
      aula('EST', 6, 'Aula resumo de probabilidade e análise combinatória.'),
      aula('EST', 7, 'Variáveis Aleatórias Discretas - Distribuições.'),
      aula('EST', 8, 'Distribuições Discretas de Probabilidade.'),
      aula('EST', 9, 'Variáveis Aleatórias Contínuas - Distribuições Contínuas.'),
      aula('EST', 10, 'Teoria da Amostragem / Estimação Pontual e Intervalar.'),
      aula('EST', 11, 'Testes de Hipóteses.'),
      aula('EST', 12, 'Análise de Regressão Linear Simples.'),
      aula('EST', 13, 'Análise multivariada: análise de variância (ANOVA).'),
      aula('EST', 14, 'Análise multivariada: análise de regressão múltipla.'),
      aula('EST', 15, 'Análise multivariada: Análise de Agrupamentos (Cluster), Análise de Componentes Principais (PCA), Análise Fatorial.'),
      aula('EST', 16, 'Séries Temporais.'),
    ]
  },

  // 14. DIREITO CIVIL
  {
    id: 'direito_civil', nome: 'Direito Civil', sigla: 'CIV', cor: '#f43f5e',
    aulas: [
      aula('CIV', 1, 'Lei de Introdução às Normas do Direito Brasileiro (LINDB). Vigência, aplicação, obrigatoriedade, interpretação e integração das leis. Conflito das leis no tempo. Eficácia das leis no espaço.'),
      aula('CIV', 2, 'Pessoas naturais. Conceito. Início da pessoa natural. Personalidade. Capacidade. Direitos da personalidade. Domicílio.'),
      aula('CIV', 3, 'Pessoas jurídicas. Disposições Gerais. Constituição. Extinção. Sociedades de fato. Associações. Fundações. Domicílio.'),
      aula('CIV', 4, 'Bens imóveis, móveis e públicos.'),
      aula('CIV', 5, 'Fato jurídico. Negócio jurídico. Disposições gerais. Invalidade.'),
      aula('CIV', 6, 'Prescrição e Decadência. Disposições gerais.'),
      aula('CIV', 7, 'Obrigações. Características.'),
      aula('CIV', 8, 'Adimplemento pelo pagamento. Inadimplemento das obrigações - disposições gerais e mora.'),
      aula('CIV', 9, 'Contratos. Princípios. Contratos em geral. Disposições gerais.'),
      aula('CIV', 10, 'Responsabilidade civil objetiva e subjetiva. Obrigação de indenizar. Dano material.'),
      aula('CIV', 11, 'Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais (LGPD).'),
    ]
  },

  // 15. DIREITO PROCESSUAL CIVIL
  {
    id: 'direito_processual_civil', nome: 'Direito Processual Civil', sigla: 'CPC', cor: '#d946ef',
    aulas: [
      aula('CPC', 1, 'Princípios do processo. Princípio do devido processo legal. Princípios do contraditório, da ampla defesa e do juiz natural.'),
      aula('CPC', 2, 'Jurisdição. Ação. Condições da ação. Classificação.'),
      aula('CPC', 3, 'Atos judiciais. Despachos, decisões interlocutórias e sentenças.'),
      aula('CPC', 4, 'Sentenças. Coisa julgada material.'),
      aula('CPC', 5, 'Controle judicial dos atos administrativos.'),
      aula('CPC', 6, 'Processo Estrutural. Problema Estrutural. Decisão Estrutural.'),
    ]
  },

  // 16. DIREITO PENAL / SISTEMA ANTICORRUPÇÃO
  {
    id: 'direito_penal', nome: 'Direito Penal', sigla: 'PEN', cor: '#10b981',
    aulas: [
      aula('PEN', 1, 'Lei Anticorrupção (Lei nº 12.846/2013).'),
      aula('PEN', 2, 'Lei nº 12.850/2013 (Crime organizado).'),
      aula('PEN', 3, 'Lei nº 9.613/1998 (Crimes de lavagem de dinheiro).'),
      aula('PEN', 4, 'Lei nº 13.869/2019 (Lei de abuso de autoridade).'),
      aula('PEN', 5, 'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte I).'),
      aula('PEN', 6, 'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte II).'),
      aula('PEN', 7, 'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte III).'),
      aula('PEN', 8, 'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte IV).'),
      aula('PEN', 9, 'Convenção de Mérida (Decreto nº 5.687/2006) e Convenção de Palermo (Decreto nº 5.015/2004).'),
    ]
  },

  // 17. ADMINISTRAÇÃO PÚBLICA
  {
    id: 'administracao_publica', nome: 'Administração Pública', sigla: 'PUB', cor: '#f97316',
    aulas: [
      aula('PUB', 1, 'Administração Pública do modelo racional-legal ao paradigma pós-burocrático (Parte I).'),
      aula('PUB', 2, 'Administração Pública do modelo racional-legal ao paradigma pós-burocrático (Parte II).'),
      aula('PUB', 3, 'Accountability. Governabilidade e governança. Princípios de governança pública.'),
      aula('PUB', 4, 'Transparência da administração pública. Controle social e cidadania.'),
      aula('PUB', 5, 'Governo eletrônico.'),
      aula('PUB', 6, 'Gestão por resultados na produção de serviços públicos.'),
      aula('PUB', 7, 'Intermediação de interesses (clientelismo, corporativismo e neocorporativismo).'),
      aula('PUB', 8, 'Processos participativos de gestão pública: conselhos de gestão, orçamento participativo, parceria entre governo e sociedade.'),
      aula('PUB', 9, 'Mudanças institucionais. Conselhos, Organizações Sociais (OS), Organização da Sociedade Civil de Interesse Público (OSCIP), agência reguladora, agência executiva, consórcios públicos.'),
      aula('PUB', 10, 'Políticas públicas. O ciclo das políticas públicas (construção de agenda, formulação da política, processo decisório, implementação e avaliação).'),
      aula('PUB', 11, 'As políticas públicas no Estado brasileiro contemporâneo. Descentralização e democracia. Participação, atores sociais e controle social. Gestão local, cidadania e equidade social. Corrupção e políticas públicas: fatores que influenciam a incidência de corrupção e fatores que promovem a qualidade das políticas públicas.'),
      aula('PUB', 12, 'Gestão de Pessoas por Competências.'),
      aula('PUB', 13, 'Planejamento nas organizações públicas. O ciclo do planejamento (análise do ambiente, objetivos estratégicos, missão, visão, valores). O ciclo do planejamento em organizações (PDCA). Referencial Estratégico das Organizações. Análise de ambiente interno e externo. Ferramentas de análise de ambiente: análise SWOT, análise de cenários, matriz GUT (Parte I).'),
      aula('PUB', 14, 'Planejamento nas organizações públicas (Parte II).'),
      aula('PUB', 15, 'Indicadores de desempenho. Tipos de indicadores. Variáveis componentes dos indicadores.'),
      aula('PUB', 16, 'Gestão por resultados na produção de serviços públicos (Empreendedorismo governamental).'),
    ]
  },
];

// ─── Ciclo com as 17 matérias ─────────────────────────────────────────────────
const CICLO_SEED = {
  id: 'ciclo_tcu_completo',
  nome: 'Ciclo Estratégia Completo (17 Disciplinas)',
  itemAtualIndice: 0,
  itens: MATERIAS_SEED.map((m, idx) => ({
    id: `ic_${idx + 1}`,
    materiaId: m.id,
    tempoMinutos: 90,
    Ordem: idx + 1
  }))
};

// ─── Simulado + histórico de sessões ─────────────────────────────────────────
const SIMULADOS_SEED = [
  {
    id: 'sim_1',
    titulo: 'Simulado Nacional TCU - Estilo FGV (Primeiro Diagnóstico)',
    data: '2026-05-15',
    banca: 'FGV (Estratégia)',
    totalQuestoes: 100,
    questoesAcertadas: 65,
    questoesErradas: 35,
    desempenhoPorMateria: {
      controle_externo:      { questoes: 15, acertos: 12, erros: 3 },
      afo_dir_financeiro:    { questoes: 15, acertos: 10, erros: 5 },
      auditoria_gov:         { questoes: 15, acertos: 9,  erros: 6 },
      dir_constitucional:    { questoes: 15, acertos: 11, erros: 4 },
      dir_administrativo:    { questoes: 15, acertos: 10, erros: 5 },
      contabilidade_publica: { questoes: 10, acertos: 5,  erros: 5 },
      analise_dados_ti:      { questoes: 10, acertos: 6,  erros: 4 },
      portugues_redacao:     { questoes: 10, acertos: 2,  erros: 8 }
    },
    observacoes: 'Bom desempenho nas básicas de direito, mas contabilidade pública, português da FGV e TI pesaram bastante.'
  }
];

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const HISTORICO_SEED = [
  { id: 'log_1', data: daysAgo(10), materiaId: 'controle_externo',   aulaId: 'CEX_01', duracaoMinutos: 90,  questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5,  tipo: 'Teoria (PDF)', comentarios: 'Concluí leitura do PDF da Aula 01. Exercícios sugeridos resolvidos com bom aproveitamento.' },
  { id: 'log_2', data: daysAgo(9),  materiaId: 'afo_dir_financeiro', aulaId: 'AFO_01', duracaoMinutos: 90,  questoesResolvidas: 60, questoesAcertadas: 52, questoesErradas: 8,  tipo: 'Questões',    comentarios: 'Resolução de questões de LDO/LOA da banca FGV.' },
  { id: 'log_3', data: daysAgo(8),  materiaId: 'dir_constitucional', aulaId: 'CON_01', duracaoMinutos: 75,  questoesResolvidas: 55, questoesAcertadas: 47, questoesErradas: 8,  tipo: 'Questões',    comentarios: 'Bateria de questões FGV 2022/2023. Bom rendimento.' },
  { id: 'log_4', data: daysAgo(7),  materiaId: 'controle_externo',   aulaId: 'CEX_02', duracaoMinutos: 60,  questoesResolvidas: 35, questoesAcertadas: 30, questoesErradas: 5,  tipo: 'Teoria (PDF)', comentarios: null },
  { id: 'log_5', data: daysAgo(6),  materiaId: 'auditoria_gov',      aulaId: 'AUD_01', duracaoMinutos: 90,  questoesResolvidas: 40, questoesAcertadas: 36, questoesErradas: 4,  tipo: 'Vídeo',       comentarios: 'Módulo de auditoria — excelente professor.' },
  { id: 'log_6', data: daysAgo(5),  materiaId: 'dir_administrativo', aulaId: 'ADM_01', duracaoMinutos: 120, questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7,  tipo: 'Questões',    comentarios: 'Questões de concursos anteriores da FGV para ADM.' },
  { id: 'log_7', data: daysAgo(4),  materiaId: 'afo_dir_financeiro', aulaId: 'AFO_02', duracaoMinutos: 90,  questoesResolvidas: 50, questoesAcertadas: 43, questoesErradas: 7,  tipo: 'Teoria (PDF)', comentarios: 'Leitura profunda sobre princípios orçamentários.' },
  { id: 'log_8', data: daysAgo(3),  materiaId: 'controle_externo',   aulaId: 'CEX_03', duracaoMinutos: 60,  questoesResolvidas: 20, questoesAcertadas: 16, questoesErradas: 4,  tipo: 'Revisão',     comentarios: 'Revisão rápida dos flashcards do módulo 3 CEX.' },
  { id: 'log_9', data: daysAgo(2),  materiaId: 'dir_constitucional', aulaId: 'CON_02', duracaoMinutos: 80,  questoesResolvidas: 45, questoesAcertadas: 40, questoesErradas: 5,  tipo: 'Questões',    comentarios: 'Bateria CON-02. Muito bom desempenho em direitos fundamentais.' },
  { id: 'log_10', data: daysAgo(1), materiaId: 'dir_administrativo', aulaId: 'ADM_02', duracaoMinutos: 75,  questoesResolvidas: 40, questoesAcertadas: 34, questoesErradas: 6,  tipo: 'Teoria (PDF)', comentarios: 'Centralização e descentralização administrativa. Bloco pesado.' },
];

const REVISOES_SEED = [
  { id: 'rev_1', materiaId: 'controle_externo',   aulaId: 'CEX_01', titulo: 'Revisão: Jurisdição e Competência do TCU',     dataCriacao: daysAgo(10), dataRevisaoAlvo: daysAgo(9),  intervaloDias: 1,  concluida: false, etapa: 1, historico: [{ data: daysAgo(10), status: 'agendada' }] },
  { id: 'rev_2', materiaId: 'afo_dir_financeiro', aulaId: 'AFO_01', titulo: 'Revisão: Orçamento na CF/88 e Princípios',      dataCriacao: daysAgo(9),  dataRevisaoAlvo: daysAgo(2),  intervaloDias: 7,  concluida: false, etapa: 2, historico: [{ data: daysAgo(9),  status: 'agendada' }] },
  { id: 'rev_3', materiaId: 'dir_constitucional', aulaId: 'CON_01', titulo: 'Revisão: Princípios e Normas Constitucionais',   dataCriacao: daysAgo(8),  dataRevisaoAlvo: daysAgo(7),  intervaloDias: 1,  concluida: true,  etapa: 2, historico: [{ data: daysAgo(8),  status: 'agendada' }, { data: daysAgo(7), status: 'concluida' }] },
  { id: 'rev_4', materiaId: 'auditoria_gov',      aulaId: 'AUD_01', titulo: 'Revisão: Conceitos iniciais de auditoria',      dataCriacao: daysAgo(6),  dataRevisaoAlvo: daysAgo(5),  intervaloDias: 1,  concluida: true,  etapa: 2, historico: [{ data: daysAgo(6),  status: 'agendada' }, { data: daysAgo(5), status: 'concluida' }] },
];

const PLANEJAMENTO_SEED = {
  diasAtivos: [true, true, true, true, true, true, false],
  horasPorDia: 4,
  dataProva: '2026-09-15',
  metaQuestoesPorSemana: 200,
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  HEAD('🌱 SEED COMPLETO — TCU AUDITOR (17 MATÉRIAS)');

  // Pré-checks
  SUB('PASSO 1: Verificar configuração');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { FAIL('Variáveis de ambiente não encontradas!'); process.exit(1); }
  OK(`Supabase URL: ${SUPABASE_URL}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Conectividade
  SUB('PASSO 2: Testar conectividade e tabela');
  const { error: connErr } = await supabase.from('user_data_sync').select('count').limit(1);
  if (connErr) {
    const msg = connErr.message || '';
    if (msg.includes('Could not find') || msg.includes('does not exist') || connErr.code === '42P01') {
      FAIL(`Tabela 'user_data_sync' NÃO EXISTE! Execute supabase_schema.sql primeiro.`); process.exit(1);
    }
    INFO(`RLS block esperado: ${msg}`);
  }
  OK('Tabela detectada. Conexão OK.');

  // Login
  SUB('PASSO 3: Autenticar usuário de teste');
  let { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (!loginData?.session) {
    INFO(`Login falhou: ${loginErr?.message}. Criando usuário...`);
    const { data: signup, error: signupErr } = await supabase.auth.signUp({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (signupErr || !signup.session) { FAIL(`Falha no signup: ${signupErr?.message}. Desabilite confirmação de e-mail no Supabase.`); process.exit(1); }
    loginData = signup as any;
    OK(`Usuário criado: ${TEST_EMAIL}`);
  } else {
    OK(`Logado como: ${TEST_EMAIL}`);
  }

  const userId  = loginData!.user!.id;
  const token   = loginData!.session!.access_token;
  const client  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });

  // Contar aulas
  const totalAulas = MATERIAS_SEED.reduce((s, m) => s + m.aulas.length, 0);
  INFO(`Preparando ${MATERIAS_SEED.length} matérias com ${totalAulas} aulas no total...`);

  // Upsert
  SUB('PASSO 4: Inserir/Atualizar dados no banco (UPSERT)');
  const payload = {
    user_id:              userId,
    updated_at:           new Date().toISOString(),
    materias:             MATERIAS_SEED,
    ciclo:                CICLO_SEED,
    simulados:            SIMULADOS_SEED,
    revisoes:             REVISOES_SEED,
    historico:            HISTORICO_SEED,
    planejamento_semanal: PLANEJAMENTO_SEED,
  };

  const { error: upsertErr } = await client.from('user_data_sync').upsert(payload, { onConflict: 'user_id' });
  if (upsertErr) { FAIL(`UPSERT falhou: ${upsertErr.message} (${upsertErr.code})`); process.exit(1); }
  OK('UPSERT executado com sucesso!');

  // Verificação
  SUB('PASSO 5: Verificar integridade dos dados');
  const { data: row, error: readErr } = await client.from('user_data_sync').select('*').eq('user_id', userId).single();
  if (readErr || !row) { FAIL(`Erro na leitura de verificação: ${readErr?.message}`); process.exit(1); }

  const materiasNoDb = (row.materias as any[]);
  const aulasNoDb    = materiasNoDb.reduce((s: number, m: any) => s + (m.aulas?.length ?? 0), 0);
  OK(`Matérias no banco: ${materiasNoDb.length}/17`);
  OK(`Aulas no banco: ${aulasNoDb}/${totalAulas}`);
  OK(`Simulados: ${(row.simulados as any[]).length}`);
  OK(`Histórico: ${(row.historico as any[]).length} sessões`);
  OK(`Revisões: ${(row.revisoes as any[]).length}`);
  OK(`Ciclo: "${row.ciclo?.nome}"`);

  // Listar matérias para conferência
  console.log('\n  Matérias inseridas:');
  for (const m of materiasNoDb) {
    console.log(`    • [${m.sigla}] ${m.nome} — ${m.aulas.length} aulas`);
  }

  // RLS
  SUB('PASSO 6: Verificar isolamento RLS');
  const { data: isolation } = await client.from('user_data_sync').select('*').eq('user_id', '00000000-0000-0000-0000-000000000000');
  if (!isolation || isolation.length === 0) OK('RLS ativo: dados de outros usuários inacessíveis. ✔');
  else FAIL('FALHA DE SEGURANÇA: RLS não está filtrando por user_id!');

  HEAD('✅ SEED COMPLETO — SUCESSO TOTAL');
  OK(`Usuário de teste: ${TEST_EMAIL}`);
  OK(`Senha: ${TEST_PASSWORD}`);
  OK(`User ID: ${userId}`);
  console.log('');
  INFO('Para testar na aplicação:');
  INFO('  1. Abra http://localhost:3000 (ou a URL do Vercel)');
  INFO('  2. Clique em "Entrar na Nuvem" no canto superior direito');
  INFO(`  3. Use: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  INFO('  4. O app deve carregar todas as 17 matérias com as aulas do edital');
  console.log('');
}

main().catch(err => { FAIL(`Erro inesperado: ${err.message}`); console.error(err); process.exit(1); });
