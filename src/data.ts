import { Materia, Aula, StatusAula, CicloEstudo, Simulado, LogSessao, RevisaoEspacada } from './types';

// Dicionário com lista de tópicos ultra-realistas para as 17 matérias da FGV/Estratégia TCU
const TOPICOS_REALISTAS: { [sigla: string]: string[] } = {
  CEX: [
    'Entidades Fiscalizadoras Superiores (EFS). Sistemas de Controle na Administração Pública Brasileira. Controle Interno.',
    'Tribunais de contas: funções, natureza jurídica e eficácia.',
    'Aspectos constitucionais do controle da Administração.',
    'Competências na legislação e Organização constitucional dos TCs.',
    'Lei Orgânica e Regimento Interno do TCU (Parte 1).',
    'Lei Orgânica e Regimento Interno do TCU (Parte 2).',
    'Lei Orgânica e Regimento Interno do TCU (Parte 3).',
    'Lei Orgânica e Regimento Interno do TCU (Parte 4).',
    'Lei Orgânica e Regimento Interno do TCU (Parte 5).',
    'Declaração de Lima, Declaração do México e ISSAI 20.'
  ],
  AFO: [
    'Orçamento na Constituição de 1988: Plano Plurianual (PPA), Lei de Diretrizes Orçamentárias (LDO), Lei Orçamentária Anual (LOA). Orçamento público no Brasil: Títulos I, IV, V e VI.',
    'Orçamento público: Princípios orçamentários. Orçamento público no Brasil: Lei nº 4.320/1964.',
    'Leis de Créditos Adicionais. Orçamento público no Brasil: Lei nº 4.320/1964.',
    'Emendas parlamentares ao Orçamento. Plano Plurianual (PPA): estrutura, base legal, objetivos, conteúdo, tipos de programas. Lei de Diretrizes Orçamentárias (LDO): objetivos, estrutura, base legal e conteúdo, Anexos de Metas Fiscais, Anexos de Riscos Fiscais, critérios para limitação de empenho. Ciclo orçamentário: elaboração da proposta, discussão, votação e aprovação da lei de orçamento. Orçamento público no Brasil: Lei nº 4.320/1964.',
    'Orçamento público. Conceito. Técnicas orçamentárias. Natureza jurídica.',
    'Classificação da receita pública: institucional, por categorias econômicas, por fontes e classificações adicionais previstas no Manual Técnico de Orçamento - MTO. Orçamento público no Brasil: Lei nº 4.320/1964.',
    'Orçamento público no Brasil: Lei nº 4.320/1964 (Dívida ativa).',
    'Classificações orçamentárias. Orçamento público no Brasil: Lei nº 4.320/1964.',
    'Classificação da despesa pública: institucional, funcional, programática, pela natureza e classificações adicionais previstas no Manual Técnico de Orçamento - MTO.',
    'Execução orçamentária e financeira: estágios e execução da despesa pública e da receita pública.',
    'Orçamento público no Brasil: Lei nº 4.320/1964 (Restos a pagar e Despesas de exercícios anteriores. Suprimento de fundos).',
    'Programação de desembolso e mecanismos retificadores do orçamento.',
    'Sistemas de informação da Administração Pública Federal: SIAFI.',
    'Conta Única do Tesouro Nacional: conceito e previsão legal.',
    'Gestão organizacional das finanças públicas: sistema de planejamento e orçamento e de programação financeira constantes da Lei nº 10.180/2001.',
    'Plano Plurianual (PPA): estrutura, base legal, objectives, conteúdo, tipos de programas (PPA 2020-2023).',
    'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte I: princípios, conceitos, planejamento.',
    'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte II: geração de despesas.',
    'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte III: renúncia de receitas, transferências voluntárias, destinação de recursos para o setor privado, transparência da gestão fiscal, prestação de contas e fiscalização da gestão fiscal.',
    'Tópicos selecionados da Lei Complementar nº 101/2000 (LRF) - Parte IV: prestação de contas e fiscalização da gestão fiscal.'
  ],
  AUD: [
    'Conceito, evolução. Auditoria interna e externa: papéis (Conceitos iniciais de auditoria).',
    'Tópicos de Auditoria Interna.',
    'Planejamento de auditoria. Termos da auditoria e estratégia global de auditoria. Escopo do trabalho. Documentação da auditoria.',
    'Técnicas e procedimentos: inspeção documental, inspeção física, reexecução, recálculo, observação direta, entrevista/indagação, circularização, conciliação, procedimentos de revisão analítica, cruzamento eletrônico de dados.',
    'Suficiência e adequação das evidências.',
    'Métodos de amostragem aplicáveis às auditorias: por atributos e por unidade monetária. Supervisão e Controle de Qualidade.',
    'Amostragem por atributos e por unidade monetária (Aprofundamento).',
    'Auditorias de conformidade, financeira e operacional: conceitos, características e finalidades. Outros instrumentos de fiscalização: levantamento, monitoramento, acompanhamento e inspeção (Auditoria governamental: tipos, formas e instrumentos).',
    'Auditoria governamental segundo a INTOSAI. Normas internacionais para o exercício profissional da auditoria. Normas da INTOSAI: princípios fundamentais de auditoria e código de ética do setor público (ISSAIs 100, 130).',
    'Normas de auditoria do TCU (Portaria-TCU nº 280/2010). Matriz de Planejamento. Matriz de Achados e Matriz de Responsabilização.',
    'Materialidade. Avaliação dos riscos gerais do trabalho, dos riscos inerentes e de controle. Modelo de risco de auditoria. Respostas do auditor aos riscos gerais do trabalho e aos riscos de distorção relevante ou residuais (natureza, época e extensão).',
    'Técnicas para obtenção do entendimento do objeto e de seu ambiente (Controle interno).',
    'Tipos de opinião de auditoria em trabalhos de asseguração razoável.',
    'Normas para a tomada e prestação de contas dos administradores e responsáveis da Administração Pública Federal, para fins de julgamento pelo Tribunal de Contas da União (IN-TCU nº 84, de 22 de abril de 2020).',
    'Normas internacionais para o exercício profissional da auditoria (Normas do IIA).',
    'Manual de Auditoria Operacional do TCU (MAO).',
    'Trabalho de asseguração (NBC TA Estrutura Conceitual - Estrutura Conceitual para Trabalhos de Asseguração).'
  ],
  CON: [
    'Princípios fundamentais. Aplicabilidade das normas constitucionais. Normas de eficácia plena, contida e limitada. Normas programáticas.',
    'Teoria Geral dos Direitos Fundamentais.',
    'Direitos e deveres individuais e coletivos – Parte I.',
    'Direitos e deveres individuais e coletivos – Parte II.',
    'Direitos sociais.',
    'Direitos de nacionalidade.',
    'Direitos políticos.',
    'Partidos políticos.',
    'Organização político-administrativa do Estado. Estado federal brasileiro, União, estados, Distrito Federal, municípios e territórios.',
    'Administração Pública. Disposições gerais, servidores públicos.',
    'Poder Legislativo. Estrutura. Funcionamento e atribuições. Fiscalização contábil, financeira e orçamentária. Comissões Parlamentares de Inquérito (CPIs).',
    'Processo legislativo; Reforma Constitucional.',
    'Poder Executivo. Atribuições e responsabilidades do Presidente da República.',
    'Poder Judiciário. Disposições gerais. Órgãos do poder judiciário. Organização e competências. Conselho Nacional de Justiça (CNJ): composição e competências.',
    'Funções essenciais à justiça. Ministério Público e Advocacia Pública.',
    'Controle de Constitucionalidade.',
    'Constituição: conceito, classificações, normas constitucionais. (Nota: Módulo complementar/revisão).',
    'Poder constituinte originário, derivado e suas espécies.',
    'Título I da CF. Teoria dos princípios. Fundamentos, objetivos fundamentais, princípios das relações internacionais, separação de poderes, forma de governo, sistema de governo, forma de estado.',
    'Teoria dos direitos fundamentais: conceito, fundamentos, características, titularidade, aplicação, tratados internacionais de direitos humanos, fontes dos direitos fundamentais, restrições.',
    'Art. 5º da CF, parte 1: direitos à vida, liberdade, igualdade, segurança, propriedade e privacidade.',
    'Garantias processuais gerais, garantias penais, remédios constitucionais.',
    'Direitos sociais e direitos de nacionalidade (Revisão/Aprofundamento).',
    'Direitos Políticos positivos e negativos, ativos e passivos. Normas constitucionais sobre partidos políticos.',
    'Organização político-administrativa. Entes federativos. Bens Públicos. Intervenção.',
    'Repartição de competências federativas: teoria e casuística.',
    'Poder Legislativo na CF. Congresso Nacional e suas casas. Estatuto dos parlamentares. CPIs. Fiscalização contábil e financeira.',
    'Poder Executivo na CF (Módulo de aprofundamento).',
    'Disposições gerais sobre o Poder Judiciário na CF (arts. 92 a 100).',
    'Regras sobre distribuição de competências entre os órgãos jurisdicionais.',
    'Funções essenciais à Justiça: Ministério Público, Defensoria Pública, Advocacia Pública e Advocacia Privada.',
    'Controle de constitucionalidade das leis e atos normativos. Espécies de controles de validade. Espécies de inconstitucionalidade. Sistemas de controle. Controle no Brasil: difuso e concentrado. Ações de controle concentrado. Efeitos das decisões em controle de constitucionalidade.',
    'Arts. 136 a 144 da CF. Estados de emergência; forças armadas; segurança pública.',
    'Sistema Tributário na CF (arts. 145 a 162).',
    'Finanças Públicas e Orçamento (Arts. 163 a 169 da CF).',
    'Ordem Econômica e Financeira (Arts. 170 a 192 da CF).'
  ],
  ADM: [
    'Regime jurídico-administrativo. Conceito. Princípios expressos e implícitos da Administração Pública.',
    'Estado, governo e Administração Pública. Conceitos. Elementos. Direito administrativo. Conceito. Objeto. Fontes.',
    'Organização administrativa. Centralização, descentralização, concentração e desconcentração. Administração direta e indireta. Autarquias.',
    'Fundações, empresas públicas e sociedades de economia mista.',
    'Entidades paraestatais e terceiro setor: serviços sociais autônomos, entidades de apoio, organizações sociais, organizações da sociedade civil de interesse público (OSCIP).',
    'Poderes da Administração Pública. Hierárquico, disciplinar, regulamentar e de polícia. Uso e abuso do poder.',
    'Ato administrativo. Conceito, requisitos, atributos, classificação e espécies.',
    'Extinção do ato administrativo: cassação, anulação, revogação e convalidação. Decadência administrativa.',
    'Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos) - Licitações (Parte 1).',
    'Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos) - Licitações (Parte 2).',
    'Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos) - Contratos.',
    'Serviços públicos. Conceito. Elementos constitutivos. Formas de prestação e meios de execução. Delegação: concessão, permissão e autorização. Classificação. Princípios.',
    'Decreto nº 11.531/2023 (Convênios e instrumentos congêneres).',
    'Controle da Administração Pública. Controle exercido pela Administração Pública. Controle judicial. Controle legislativo.',
    'Responsabilidade civil do Estado. Evolução histórica. Responsabilidade civil do Estado no direito brasileiro. Responsabilidade por ato comissivo e omissivo do Estado. Requisitos para a demonstração da responsabilidade, excludentes e atenuantes. Reparação do dano e direito de regresso.',
    'Lei nº 8.112/1990. Provimento. Vacância. Efetividade, estabilidade e vitaliciedade.',
    'Lei nº 8.112/1990. Remuneração. Direitos e deveres.',
    'Lei nº 8.112/1990. Responsabilidade. Processo Administrativo Disciplinar (PAD).',
    'Agentes públicos. Legislação pertinente. Disposições constitucionais aplicáveis. Disposições doutrinárias. Conceito. Espécies. Cargo, emprego e função pública.',
    'Processo administrativo. Lei nº 9.784/1999.',
    'Improbidade administrativa: Lei nº 8.429/1992.',
    'Lei de Acesso à Informação (Lei nº 12.527/2011): conceitos e aplicação.',
    'Apresentação do curso. Princípios expressos e implícitos da Administração Pública. (Nota: Bloco duplicado/revisão na seleção).',
    'Estado, governo e Administração Pública. Conceitos. Elementos. Direito administrativo. Conceito. Objeto. Fontes. Regime jurídico-administrativo. Conceito.',
    'Poderes da Administração Pública. Hierárquico, disciplinar, regulamentar e de polícia. Uso e abuso do poder.',
    'Ato administrativo: conceito, requisitos, atributos, classificação.',
    'Ato administrativo: espécies. Extinção do ato administrativo: cassação, anulação, revogação e convalidação. Decadência administrativa.',
    'Organização administrativa. Centralização, descentralização, concentração e desconcentração. Administração direta e indireta. Autarquias, fundações, empresas públicas e sociedades de economia mista.',
    'Consórcios Públicos.',
    'Entidades paraestatais e terceiro setor: serviços sociais autônomos, entidades de apoio, organizações sociais, organizações da sociedade civil de interesse público.',
    'Agentes públicos. Legislação pertinente. Disposições constitucionais aplicáveis. Disposições doutrinárias. Conceito. Espécies. Cargo, emprego e função pública.',
    'Lei nº 8.112/1990. Provimento. Vacância. Efetividade, estabilidade e vitaliciedade. Remuneração. Direitos e deveres. Responsabilidade. Processo administrativo disciplinar.',
    'Licitações à luz da Lei nº 14.133/2021 - Parte I.',
    'Licitações à luz da Lei nº 14.133/2021 - Parte II.',
    'Contratos administrativos (Lei nº 14.133/2021).',
    'Sistema de Registro de Preços. Decreto nº 11.462/2023.',
    'Convênios e Contratos de Repasse. Decreto nº 11.531/2023 e Portaria Interministerial nº 33/2023.',
    'Serviços públicos. Conceito. Elementos constitutivos. Formas de prestação e meios de execução. Delegação: concessão, permissão e autorização. Classificação. Princípios.',
    'Parceria Público-Privada (PPP).',
    'Processo Administrativo (Lei nº 9.784/1999).',
    'Responsabilidade civil do Estado. Evolução histórica e aplicação no direito brasileiro (Atos comissivos, omissivos, requisitos, excludentes, atenuantes, reparação e regresso).',
    'Controle da Administração Pública. Controle exercido pela Administração Pública. Controle judicial. Controle legislativo.',
    'Improbidade administrativa: Lei nº 8.429/1992.',
    'Lei de Acesso à Informação (Lei nº 12.527/2011).',
    'Lei Anticorrupção (Lei nº 12.846/2013).',
    'Lei nº 10.973/2004 - ETEC - Encomenda Tecnológica - Artigos 19 a 21-A.'
  ],
  CPB: [
    'Contabilidade Pública: aspectos introdutórios.',
    'MCASP: Procedimentos Contábeis Orçamentários (I).',
    'MCASP: Procedimentos Contábeis Orçamentários (II).',
    'MCASP: Procedimentos Contábeis Patrimoniais (I).',
    'MCASP: Procedimentos Contábeis Patrimoniais (II).',
    'MCASP: Procedimentos Contábeis Patrimoniais (III).',
    'MCASP: Plano de Contas Aplicado ao Setor Público (PCASP).',
    'Balanço Orçamentário.',
    'Balanço Financeiro.',
    'Balanço Patrimonial.',
    'Demonstração das Variações Patrimoniais (DVP).',
    'Demonstração dos Fluxos de Caixa (DFC). Demonstração das Mutações do Patrimônio Líquido (DMPL). Notas Explicativas.',
    'Título IX da Lei nº 4.320/1964 (Sistemas de Contas).',
    'NBC TSP – Estrutura Conceitual.',
    'Tópicos das NBC TSP Vigentes (IPSAS convergidas) - Parte I.',
    'Tópicos das NBC TSP Vigentes (IPSAS convergidas) - Parte II.',
    'Tópicos da LRF (I): Relatório Resumido da Execução Orçamentária (RREO) e Relatório de Gestão Fiscal (RGF).',
    'Tópicos da LRF (II): Conceitos de dívida pública e restos a pagar, escrituração e consolidação das contas.',
    'Sistema de Contabilidade Federal: organização e competências (Lei nº 10.180/2001 e Decreto nº 6.976/2009).',
    'Noções de Informações de Custos no Setor Público.',
    'Sistema Integrado de Administração Financeira do Governo Federal (SIAFI): conceito, objetivos, usuários e segurança do sistema (princípios e instrumentos).'
  ],
  CGE: [
    'Noções Iniciais de Contabilidade.',
    'Noções Iniciais de Demonstrações Contábeis.',
    'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte I (Retorno sobre o Capital Empregado, Alavancagem Financeira, Economic Value Added – EVA, EBITDA, Análise da Lucratividade, Análise Horizontal e Vertical, Análise de Tendências).',
    'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte II (Indicadores de Liquidez).',
    'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte III (Indicadores de estrutura de capital).',
    'Análise das Demonstrações Contábeis: Conceitos, cálculos, vantagens e desvantagens dos indicadores – Parte IV (Análise do Capital de Giro; Capital Circulante Líquido).',
    'Informações extraídas das Notas Explicativas.'
  ],
  TI: [
    'Dados estruturados e não estruturados. Dados abertos. Coleta, tratamento, armazenamento, integração e recuperação de dados. Processos de ETL.',
    'Representação de dados numéricos, textuais e estruturados; aritmética computacional. Representação de dados espaciais para georeferenciamento e geosensoriamento. Formatos e tecnologias: XML, JSON, CSV.',
    'Introdução conceitual/leitura de apoio (Tema não explícito no edital - Pré-requisito).',
    'Bancos de dados relacionais: teoria e implementação.',
    'Normalização de Bancos de Dados.',
    'Uso do SQL como DDL, DML, DCL. Processamento de transações.',
    'Introdução conceitual/leitura de apoio II (Tema não explícito no edital - Pré-requisito).',
    'Exploração de dados: conceituação e características. Noções do modelo CRISP-DM. Técnicas para pré-processamento de dados. Técnicas e tarefas de mineração de dados. Classificação. Regras de associação. Análise de agrupamentos (clusterização). Detecção de anomalias. Modelagem preditiva.',
    'Conceitos de PLN (Processamento de Linguagem Natural): semântica vetorial, redução de dimensionalidade, modelagem de tópicos latentes, classificação de textos, análise de sentimentos, representações com n-gramas.',
    'Conceitos de ML (Machine Learning): fontes de erro em modelos preditivos, validação e avaliação de modelos preditivos, underfitting, overfitting e técnicas de regularização, otimização de hiperparâmetros, separabilidade de dados, redução da dimensionalidade. Modelos lineares, árvores de decisão, redes neurais feed-forward, classificador Naive Bayes.',
    'Linguagem Python: sintaxe, variáveis, tipos de dados e estruturas de controle de fluxo. Estruturas de dados, funções e arquivos.',
    'Bibliotecas Python: NLTK, TensorFlow, Pandas, NumPy, Arrow, Scikit-Learn, SciPy.',
    'Noções da Linguagem R: Sintaxe, tipos de dados, operadores, comandos de repetição, estruturas de dados, gráficos, Data frames. Tidyverse.',
    'Lei de Acesso à Informação (Lei nº 12.527/2011): conceitos e aplicação.',
    'Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais (LGPD).',
    'Segurança da informação: Confidencialidade, integridade, availability, autenticidade e não repúdio. Políticas de segurança. Políticas de classificação da informação. Sistemas de gestão de segurança da informação. Tratamento de incidentes de segurança.',
    'Pareamento de dados (Record Linkage): Processo e etapas. Classificação. Qualidade de dados pareados. Análise de dados pareados.'
  ],
  ECO: [
    'Conceitos introdutórios: oferta, demanda e equilíbrio.',
    'Conceitos introdutórios: elasticidades.',
    'Introdução às estruturas de mercado: teoria da produção.',
    'Introdução às estruturas de mercado: teoria dos custos.',
    'Estrutura de mercado: concorrência perfeita.',
    'Estrutura de mercado: monopólio.',
    'Estrutura de mercado: concorrência monopolística e oligopólio.',
    'Falhas de mercado: externalidades, bens públicos, assimetria de informação (seleção adversa e perigo moral).',
    'Introdução à Macroeconomia: o sistema de contas nacionais e as identidades macroeconômicas básicas. Produto agregado e os problemas de mensuração. Produto nominal x produto real.',
    'Balanço de pagamentos.',
    'Contas do sistema monetário.',
    'O modelo keynesiano básico: o multiplicador e o papel dos gastos do governo.',
    'O modelo IS/LM: impactos das políticas monetária e fiscal.',
    'Políticas macroeconômicas em diferentes regimes cambiais.',
    'O financiamento do setor público no Brasil. A avaliação do gasto público.',
    'Conceitos de regulação, desregulação e re-regulação. Teoria econômica de indústrias reguladas. Regulação e formação de preços para estruturas de mercado de concorrência imperfeita. Conceitos básicos sobre regimes tarifários. Tarifação por custo de serviço. Tarifação por preço teto. Regulação por incentivos. Regulação para competição.'
  ],
  POR: [
    'Ortografia. Acentuação gráfica.',
    'Morfologia: reconhecimento, emprego e sentido das classes gramaticais I – artigo, substantivo, adjetivo, numeral, advérbio, interjeição. Mecanismos de flexão dos nomes.',
    'Morfologia: reconhecimento, emprego e sentido das classes gramaticais II - preposição e conjunção.',
    'Morfologia: reconhecimento, emprego e sentido das classes gramaticais III - pronomes. Padrões gerais de colocação pronominal no português.',
    'Morfologia: reconhecimento, emprego e sentido das classes gramaticais III – verbo. Emprego de tempos e modos dos verbos em português. Mecanismos de flexão dos verbs.',
    'Morfologia: correção e vozes verbais.',
    'Morfologia: processos de formação de palavras.',
    'Sintaxe: frase e oração; termos da oração.',
    'Sintaxe: processos de coordenação e subordinação.',
    'Pontuação.',
    'Concordância nominal e verbal.',
    'Transitividade e regência de nomes e verbos. Emprego do sinal indicativo de crase.',
    'Mecanismos de coesão textual. Reescrita de frases: substituição, deslocamento, paralelismo.',
    'Semântica: sentido e emprego dos vocábulos; campos semânticos. Figuras de linguagem.',
    'Elementos de construção do texto e seu sentido: gênero do texto (literário e não literário, narrativo, descritivo e argumentativo); interpretação e organização interna.',
    'Variação linguística: norma culta.',
    'Resumo da matéria.'
  ],
  ING: [
    'Interpretação de textos, Cognatos e Resolução de Provas.',
    'Substantivos, Artigos, Pronomes, Preposições e Resolução de Provas.',
    'Adjetivos, Advérbios, Afixos e Resolução de Provas.',
    'Verbos Frasais e Resolução de provas.',
    'Tempos Verbais (Parte 1) e Resolução de Provas.',
    'Tempos Verbais (Parte 2) e Resolução Provas.',
    'Expressões (Idioms) e Resolução de Provas.',
    'Resolução Geral de Provas.'
  ],
  RLM: [
    'Frações. Razões e proporções. Escala. Proporcionalidade.',
    'Regra de Três Simples e Compostas.',
    'Porcentagem.',
    'Juros simples.',
    'Juros composto.',
    'Taxas.',
    'Operações de Desconto.',
    'Equivalência de capitais.',
    'Análise de investimentos.',
    'Sistemas de Amortização - SAC.',
    'Sistemas de Amortização (Francês, Misto e Americano).'
  ],
  EST: [
    'Apresentação de dados.',
    'Medidas de Posição: Médias.',
    'Medidas Separatrizes ou Quantis.',
    'Medidas de Posição: Moda.',
    'Medidas de Variabilidade ou Dispersão.',
    'Aula resumo de probabilidade e análise combinatória.',
    'Variáveis Aleatórias Discretas - Distribuições.',
    'Distribuições Discretas de Probabilidade.',
    'Variáveis Aleatórias Contínuas - Distribuições Contínuas.',
    'Teoria da Amostragem / Estimação Pontual e Intervalar.',
    'Testes de Hipóteses.',
    'Análise de Regressão Linear Simples.',
    'Análise multivariada: análise de variância (ANOVA).',
    'Análise multivariada: análise de regressão múltipla.',
    'Análise multivariada: Análise de Agrupamentos (Cluster), Análise de Componentes Principais (PCA), Análise Fatorial.',
    'Séries Temporais.'
  ],
  CIV: [
    'Lei de Introdução às Normas do Direito Brasileiro (LINDB). Vigência, aplicação, obrigatoriedade, interpretação e integração das leis. Conflito das leis no tempo. Eficácia das leis no espaço.',
    'Pessoas naturais. Conceito. Início da pessoa natural. Personalidade. Capacidade. Direitos da personalidade. Domicílio.',
    'Pessoas jurídicas. Disposições Gerais. Constituição. Extinção. Sociedades de fato. Associações. Fundações. Domicílio.',
    'Bens imóveis, móveis e públicos.',
    'Fato jurídico. Negócio jurídico. Disposições gerais. Invalidade.',
    'Prescrição e Decadência. Disposições gerais.',
    'Obrigações. Características.',
    'Adimplemento pelo pagamento. Inadimplemento das obrigações - disposições gerais e mora.',
    'Contratos. Princípios. Contratos em geral. Disposições gerais.',
    'Responsabilidade civil objetiva e subjetiva. Obrigação de indenizar. Dano material.',
    'Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais (LGPD).'
  ],
  CPC: [
    'Princípios do processo. Princípio do devido processo legal. Princípios do contraditório, da ampla defesa e do juiz natural.',
    'Jurisdição. Ação. Condições da ação. Classificação.',
    'Atos judiciais. Despachos, decisões interlocutórias e sentenças.',
    'Sentenças. Coisa julgada material.',
    'Controle judicial dos atos administrativos.',
    'Processo Estrutural. Problema Estrutural. Decisão Estrutural.'
  ],
  PEN: [
    'Lei Anticorrupção (Lei nº 12.846/2013).',
    'Lei nº 12.850/2013 (Crime organizado).',
    'Lei nº 9.613/1998 (Crimes de lavagem de dinheiro).',
    'Lei nº 13.869/2019 (Lei de abuso de autoridade).',
    'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte I).',
    'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte II).',
    'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte III).',
    'Decreto-Lei nº 2.848/1940 - Crimes contra a Administração Pública (Parte IV).',
    'Convenção de Mérida (Decreto nº 5.687/2006) e Convenção de Palermo (Decreto nº 5.015/2004).'
  ],
  PUB: [
    'Administração Pública do modelo racional-legal ao paradigma pós-burocrático (Parte I).',
    'Administração Pública do modelo racional-legal ao paradigma pós-burocrático (Parte II).',
    'Accountability. Governabilidade e governança. Princípios de governança pública.',
    'Transparência da administração pública. Controle social e cidadania.',
    'Governo eletrônico.',
    'Gestão por resultados na produção de serviços públicos.',
    'Intermediação de interesses (clientelismo, corporativismo e neocorporativismo).',
    'Processos participativos de gestão pública: conselhos de gestão, orçamento participativo, parceria entre governo e sociedade.',
    'Mudanças institucionais. Conselhos, Organizações Sociais (OS), Organização da Sociedade Civil de Interesse Público (OSCIP), agência reguladora, agência executiva, consórcios públicos.',
    'Políticas públicas. O ciclo das políticas públicas (construção de agenda, formulação da política, processo decisório, implementação e avaliação).',
    'As políticas públicas no Estado brasileiro contemporâneo. Descentralização e democracia. Participação, atores sociais e controle social. Gestão local, cidadania e equidade social. Corrupção e políticas públicas: fatores que influenciam a incidência de corrupção e fatores que promovem a qualidade das políticas públicas.',
    'Gestão de Pessoas por Competências.',
    'Planejamento nas organizações públicas. O ciclo do planejamento (análise do ambiente, objetivos estratégicos, missão, visão, valores). O ciclo do planejamento em organizações (PDCA). Referencial Estratégico das Organizações. Análise de ambiente interno e externo. Ferramentas de análise de ambiente: análise SWOT, análise de cenários, matriz GUT (Parte I).',
    'Planejamento nas organizações públicas (Parte II).',
    'Indicadores de desempenho. Tipos de indicadores. Variáveis componentes dos indicadores.',
    'Gestão por resultados na produção de serviços públicos (Empreendedorismo governamental).'
  ]
};

// Mapeamento de Cores e Nomes
export const INFO_MATERIAS_17: { [id: string]: { nome: string; sigla: string; cor: string } } = {
  controle_externo: { nome: 'Controle Externo', sigla: 'CEX', cor: '#2563eb' },
  afo_dir_financeiro: { nome: 'AFO e Direito Financeiro', sigla: 'AFO', cor: '#059669' },
  auditoria_gov: { nome: 'Auditoria Governamental', sigla: 'AUD', cor: '#7c3aed' },
  dir_constitucional: { nome: 'Direito Constitucional', sigla: 'CON', cor: '#dc2626' },
  dir_administrativo: { nome: 'Direito Administrativo', sigla: 'ADM', cor: '#d97706' },
  contabilidade_publica: { nome: 'Contabilidade Pública (MCASP)', sigla: 'CPB', cor: '#0d9488' },
  contabilidade_geral: { nome: 'Contabilidade Geral', sigla: 'CGE', cor: '#4f46e5' },
  analise_dados_ti: { nome: 'Análise de Dados e TI', sigla: 'TI', cor: '#0891b2' },
  economia_setor_p: { nome: 'Economia e Finanças Públicas', sigla: 'ECO', cor: '#4b5563' },
  portugues_redacao: { nome: 'Língua Portuguesa', sigla: 'POR', cor: '#db2777' },
  lingua_inglesa: { nome: 'Língua Inglesa', sigla: 'ING', cor: '#0ea5e9' },
  raciocinio_logico: { nome: 'Raciocínio Lógico e Mat. Financeira', sigla: 'RLM', cor: '#84cc16' },
  estatistica: { nome: 'Estatística', sigla: 'EST', cor: '#8b5cf6' },
  direito_civil: { nome: 'Direito Civil', sigla: 'CIV', cor: '#f43f5e' },
  direito_processual_civil: { nome: 'Direito Processual Civil', sigla: 'CPC', cor: '#d946ef' },
  direito_penal: { nome: 'Direito Penal', sigla: 'PEN', cor: '#10b981' },
  administracao_publica: { nome: 'Administração Pública', sigla: 'PUB', cor: '#f97316' }
};

// Gerador sistemático de Aulas
function gerarAulasParaMateria(sigla: string): Aula[] {
  const titulos = TOPICOS_REALISTAS[sigla] || [];
  return titulos.map((titulo, idx) => {
    const numero = idx + 1;
    const id = `${sigla}_${numero.toString().padStart(2, '0')}`;
    return {
      id,
      numero,
      titulo: `Aula ${numero.toString().padStart(2, '0')} - ${titulo}`,
      status: StatusAula.NaoIniciado,
      questoesResolvidas: 0,
      questoesAcertadas: 0,
      questoesErradas: 0,
      horasEstudadas: 0
    };
  });
}

// 17 MATÉRIAS OFICIAIS
export const MATERIAS_PADRAO: Materia[] = Object.keys(INFO_MATERIAS_17).map(id => {
  const info = INFO_MATERIAS_17[id];
  return {
    id,
    nome: info.nome,
    sigla: info.sigla,
    cor: info.cor,
    aulas: gerarAulasParaMateria(info.sigla)
  };
});

// CICLO INTEGRADO PARA AS 17 DISCIPLINAS
export const CICLO_PADRAO: CicloEstudo = {
  id: 'ciclo_tcu_completo',
  nome: 'Ciclo Estratégia Completo (17 Disciplinas)',
  itens: Object.keys(INFO_MATERIAS_17).map((id, idx) => ({
    id: `ic_${idx + 1}`,
    materiaId: id,
    tempoMinutos: 90,
    Ordem: idx + 1
  })),
  itemAtualIndice: 0
};

// Histórico do primeiro simulado
export const SIMULADOS_ESTATICOS: Simulado[] = [
  {
    id: 'sim_1',
    titulo: 'Simulado Nacional TCU - Estilo FGV (Primeiro Diagnóstico)',
    data: '2026-05-15',
    banca: 'FGV (Estratégia)',
    totalQuestoes: 100,
    questoesAcertadas: 65,
    questoesErradas: 35,
    desempenhoPorMateria: {
      'controle_externo': { questoes: 15, acertos: 12, erros: 3 },
      'afo_dir_financeiro': { questoes: 15, acertos: 10, erros: 5 },
      'auditoria_gov': { questoes: 15, acertos: 9, erros: 6 },
      'dir_constitucional': { questoes: 15, acertos: 11, erros: 4 },
      'dir_administrativo': { questoes: 15, acertos: 10, erros: 5 },
      'contabilidade_publica': { questoes: 10, acertos: 5, erros: 5 },
      'analise_dados_ti': { questoes: 10, acertos: 6, erros: 4 },
      'portugues_redacao': { questoes: 10, acertos: 2, erros: 8 }
    },
    observacoes: 'Bom desempenho nas básicas de direito, mas contabilidade pública, português da FGV e TI pesaram bastante. Metodologia precisa de ajustes.'
  }
];

// Dados Iniciais de Revisão
export const REVISOES_MOCK: RevisaoEspacada[] = [
  {
    id: 'rev_1',
    materiaId: 'controle_externo',
    aulaId: 'CEX_01',
    titulo: 'Revisão: Jurisdição e Competência do TCU',
    dataCriacao: '2026-06-10T10:00:00Z',
    dataRevisaoAlvo: '2026-06-11T10:00:00Z',
    intervaloDias: 1,
    concluida: false,
    etapa: 1,
    historico: [{ data: '2026-06-10T10:00:00Z', status: 'agendada' }]
  },
  {
    id: 'rev_2',
    materiaId: 'afo_dir_financeiro',
    aulaId: 'AFO_01',
    titulo: 'Revisão: Orçamento na CF/88 e Princípios',
    dataCriacao: '2026-06-04T10:00:00Z',
    dataRevisaoAlvo: '2026-06-11T10:00:00Z',
    intervaloDias: 7,
    concluida: false,
    etapa: 2,
    historico: [{ data: '2026-06-04T10:00:00Z', status: 'agendada' }]
  }
];

export const HISTORICO_MOCK: LogSessao[] = [
  {
    id: 'log_1',
    data: '2026-06-09T14:30:00Z',
    materiaId: 'controle_externo',
    aulaId: 'CEX_01',
    duracaoMinutos: 90,
    questoesResolvidas: 15,
    questoesAcertadas: 12,
    questoesErradas: 3,
    tipo: 'Teoria (PDF)',
    comentarios: 'Concluí leitura do PDF da Aula 01. Exercícios sugeridos resolvidos com bom aproveitamento.'
  },
  {
    id: 'log_2',
    data: '2026-06-10T16:00:00Z',
    materiaId: 'afo_dir_financeiro',
    aulaId: 'AFO_02',
    duracaoMinutos: 90,
    questoesResolvidas: 20,
    questoesAcertadas: 15,
    questoesErradas: 5,
    tipo: 'Questões',
    comentarios: 'Resolução de questões de LDO/LOA da banca FGV.'
  }
];

// Carregar dados iniciais mesclando e atualizando para as 17 matérias de forma elegante e persistente
export function carregarDadosIniciais() {
  const initialized = localStorage.getItem('tcu_initialized');
  const materiasRaw = localStorage.getItem('tcu_materias');
  const cicloRaw = localStorage.getItem('tcu_ciclo');
  const simuladosRaw = localStorage.getItem('tcu_simulados');
  const revisoesRaw = localStorage.getItem('tcu_revisoes');
  const historicoRaw = localStorage.getItem('tcu_historico');

  const isFirstRun = !initialized;

  let materias: Materia[] = MATERIAS_PADRAO;
  if (materiasRaw) {
    try {
      const userMateriasParsed = JSON.parse(materiasRaw) as Materia[];
      
      // Upgrade inteligente das matérias do usuário
      // 1. Garante que todas as 17 materias de MATERIAS_PADRAO existem no array do usuário
      materias = MATERIAS_PADRAO.map(defaultMat => {
        const userMat = userMateriasParsed.find(m => m.id === defaultMat.id);
        if (!userMat) {
          // Se o usuário não tem essa matéria (p. ex. Estatística ou Direito Civil novo), traz ela inteira do padrão
          return defaultMat;
        }

        // Se o usuário tem essa matéria, vamos garantir que ela tenha TODAS as aulas corretas.
        // Preservando o status de progresso das aulas que o usuário já estudou.
        const aulasConcatenadas = defaultMat.aulas.map(defaultAula => {
          // Busca exata pelo id ou número da aula para preservar o progresso (questoes, status, horas)
          const userAula = userMat.aulas.find(a => 
            a.id === defaultAula.id || 
            a.numero === defaultAula.numero
          );
          // O titulo oficial do defaultAula SEMPRE prevalece sobre o do userAula para corrigir bugs antigos
          return userAula ? { ...defaultAula, ...userAula, id: defaultAula.id, numero: defaultAula.numero, titulo: defaultAula.titulo } : defaultAula;
        });

        return {
          ...userMat,
          sigla: defaultMat.sigla,
          nome: defaultMat.nome,
          cor: defaultMat.cor,
          aulas: aulasConcatenadas
        };
      });

    } catch (e) {
      materias = MATERIAS_PADRAO;
    }
  }

  // Garantir ciclo atualizado com as matérias novas
  let ciclo: CicloEstudo = CICLO_PADRAO;
  if (cicloRaw) {
    try {
      const userCicloParsed = JSON.parse(cicloRaw) as CicloEstudo;
      // Garante que o ciclo tenha os itens correspondentes às matérias ativas
      ciclo = userCicloParsed;
      
      // Se houver discrepância no tamanho ou matérias antigas, readequar
      const materiasIdsNoCiclo = ciclo.itens.map(it => it.materiaId);
      const materiasFaltantes = materias.filter(m => !materiasIdsNoCiclo.includes(m.id));

      if (materiasFaltantes.length > 0) {
        // Enxertar as novas matérias no ciclo atual do usuário
        materiasFaltantes.forEach((m, index) => {
          ciclo.itens.push({
            id: `ic_new_${index}`,
            materiaId: m.id,
            tempoMinutos: 90,
            Ordem: ciclo.itens.length + 1
          });
        });
      }
    } catch (e) {
      ciclo = CICLO_PADRAO;
    }
  }

  const dados = {
    materias: materias,
    ciclo: ciclo,
    simulados: (() => {
      if (simuladosRaw) {
        try {
          return JSON.parse(simuladosRaw);
        } catch (e) {
          console.error("Erro ao parsear simulados:", e);
        }
      }
      return isFirstRun ? SIMULADOS_ESTATICOS : [];
    })(),
    revisoes: (() => {
      if (revisoesRaw) {
        try {
          return JSON.parse(revisoesRaw);
        } catch (e) {
          console.error("Erro ao parsear revisoes:", e);
        }
      }
      return isFirstRun ? REVISOES_MOCK : [];
    })(),
    historico: (() => {
      if (historicoRaw) {
        try {
          return JSON.parse(historicoRaw);
        } catch (e) {
          console.error("Erro ao parsear historico:", e);
        }
      }
      return isFirstRun ? HISTORICO_MOCK : [];
    })()
  };

  // Salvar atualizações no localStorage para fixar as novas matérias
  salvarMaterias(dados.materias);
  salvarCiclo(dados.ciclo);
  try {
    localStorage.setItem('tcu_initialized', 'true');
  } catch (e) {
    console.error("Erro ao salvar initialized no localStorage:", e);
  }
  if (!simuladosRaw) salvarSimulados(dados.simulados);
  if (!revisoesRaw) salvarRevisoes(dados.revisoes);
  if (!historicoRaw) salvarHistorico(dados.historico);

  return dados;
}

export function salvarMaterias(materias: Materia[]) {
  try {
    localStorage.setItem('tcu_materias', JSON.stringify(materias));
  } catch (e) {
    console.error("Erro ao salvar materias no localStorage:", e);
  }
}

export function salvarCiclo(ciclo: CicloEstudo) {
  try {
    localStorage.setItem('tcu_ciclo', JSON.stringify(ciclo));
  } catch (e) {
    console.error("Erro ao salvar ciclo no localStorage:", e);
  }
}

export function salvarSimulados(simulados: Simulado[]) {
  try {
    localStorage.setItem('tcu_simulados', JSON.stringify(simulados));
  } catch (e) {
    console.error("Erro ao salvar simulados no localStorage:", e);
  }
}

export function salvarRevisoes(revisoes: RevisaoEspacada[]) {
  try {
    localStorage.setItem('tcu_revisoes', JSON.stringify(revisoes));
  } catch (e) {
    console.error("Erro ao salvar revisoes no localStorage:", e);
  }
}

export function salvarHistorico(historico: LogSessao[]) {
  try {
    localStorage.setItem('tcu_historico', JSON.stringify(historico));
  } catch (e) {
    console.error("Erro ao salvar historico no localStorage:", e);
  }
}
