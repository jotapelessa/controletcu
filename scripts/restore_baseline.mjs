// scripts/restore_baseline.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// src/data.ts
var TOPICOS_REALISTAS = {
  CEX: [
    "Entidades Fiscalizadoras Superiores (EFS). Sistemas de Controle na Administra\xE7\xE3o P\xFAblica Brasileira. Controle Interno.",
    "Tribunais de contas: fun\xE7\xF5es, natureza jur\xEDdica e efic\xE1cia.",
    "Aspectos constitucionais do controle da Administra\xE7\xE3o.",
    "Compet\xEAncias na legisla\xE7\xE3o e Organiza\xE7\xE3o constitucional dos TCs.",
    "Lei Org\xE2nica e Regimento Interno do TCU (Parte 1).",
    "Lei Org\xE2nica e Regimento Interno do TCU (Parte 2).",
    "Lei Org\xE2nica e Regimento Interno do TCU (Parte 3).",
    "Lei Org\xE2nica e Regimento Interno do TCU (Parte 4).",
    "Lei Org\xE2nica e Regimento Interno do TCU (Parte 5).",
    "Declara\xE7\xE3o de Lima, Declara\xE7\xE3o do M\xE9xico e ISSAI 20."
  ],
  AFO: [
    "Or\xE7amento na Constitui\xE7\xE3o de 1988: Plano Plurianual (PPA), Lei de Diretrizes Or\xE7ament\xE1rias (LDO), Lei Or\xE7ament\xE1ria Anual (LOA). Or\xE7amento p\xFAblico no Brasil: T\xEDtulos I, IV, V e VI.",
    "Or\xE7amento p\xFAblico: Princ\xEDpios or\xE7ament\xE1rios. Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964.",
    "Leis de Cr\xE9ditos Adicionais. Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964.",
    "Emendas parlamentares ao Or\xE7amento. Plano Plurianual (PPA): estrutura, base legal, objetivos, conte\xFAdo, tipos de programas. Lei de Diretrizes Or\xE7ament\xE1rias (LDO): objetivos, estrutura, base legal e conte\xFAdo, Anexos de Metas Fiscais, Anexos de Riscos Fiscais, crit\xE9rios para limita\xE7\xE3o de empenho. Ciclo or\xE7ament\xE1rio: elabora\xE7\xE3o da proposta, discuss\xE3o, vota\xE7\xE3o e aprova\xE7\xE3o da lei de or\xE7amento. Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964.",
    "Or\xE7amento p\xFAblico. Conceito. T\xE9cnicas or\xE7ament\xE1rias. Natureza jur\xEDdica.",
    "Classifica\xE7\xE3o da receita p\xFAblica: institucional, por categorias econ\xF4micas, por fontes e classifica\xE7\xF5es adicionais previstas no Manual T\xE9cnico de Or\xE7amento - MTO. Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964.",
    "Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964 (D\xEDvida ativa).",
    "Classifica\xE7\xF5es or\xE7ament\xE1rias. Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964.",
    "Classifica\xE7\xE3o da despesa p\xFAblica: institucional, funcional, program\xE1tica, pela natureza e classifica\xE7\xF5es adicionais previstas no Manual T\xE9cnico de Or\xE7amento - MTO.",
    "Execu\xE7\xE3o or\xE7ament\xE1ria e financeira: est\xE1gios e execu\xE7\xE3o da despesa p\xFAblica e da receita p\xFAblica.",
    "Or\xE7amento p\xFAblico no Brasil: Lei n\xBA 4.320/1964 (Restos a pagar e Despesas de exerc\xEDcios anteriores. Suprimento de fundos).",
    "Programa\xE7\xE3o de desembolso e mecanismos retificadores do or\xE7amento.",
    "Sistemas de informa\xE7\xE3o da Administra\xE7\xE3o P\xFAblica Federal: SIAFI.",
    "Conta \xDAnica do Tesouro Nacional: conceito e previs\xE3o legal.",
    "Gest\xE3o organizacional das finan\xE7as p\xFAblicas: sistema de planejamento e or\xE7amento e de programa\xE7\xE3o financeira constantes da Lei n\xBA 10.180/2001.",
    "Plano Plurianual (PPA): estrutura, base legal, objectives, conte\xFAdo, tipos de programas (PPA 2020-2023).",
    "T\xF3picos selecionados da Lei Complementar n\xBA 101/2000 (LRF) - Parte I: princ\xEDpios, conceitos, planejamento.",
    "T\xF3picos selecionados da Lei Complementar n\xBA 101/2000 (LRF) - Parte II: gera\xE7\xE3o de despesas.",
    "T\xF3picos selecionados da Lei Complementar n\xBA 101/2000 (LRF) - Parte III: ren\xFAncia de receitas, transfer\xEAncias volunt\xE1rias, destina\xE7\xE3o de recursos para o setor privado, transpar\xEAncia da gest\xE3o fiscal, presta\xE7\xE3o de contas e fiscaliza\xE7\xE3o da gest\xE3o fiscal.",
    "T\xF3picos selecionados da Lei Complementar n\xBA 101/2000 (LRF) - Parte IV: presta\xE7\xE3o de contas e fiscaliza\xE7\xE3o da gest\xE3o fiscal."
  ],
  AUD: [
    "Conceito, evolu\xE7\xE3o. Auditoria interna e externa: pap\xE9is (Conceitos iniciais de auditoria).",
    "T\xF3picos de Auditoria Interna.",
    "Planejamento de auditoria. Termos da auditoria e estrat\xE9gia global de auditoria. Escopo do trabalho. Documenta\xE7\xE3o da auditoria.",
    "T\xE9cnicas e procedimentos: inspe\xE7\xE3o documental, inspe\xE7\xE3o f\xEDsica, reexecu\xE7\xE3o, rec\xE1lculo, observa\xE7\xE3o direta, entrevista/indaga\xE7\xE3o, circulariza\xE7\xE3o, concilia\xE7\xE3o, procedimentos de revis\xE3o anal\xEDtica, cruzamento eletr\xF4nico de dados.",
    "Sufici\xEAncia e adequa\xE7\xE3o das evid\xEAncias.",
    "M\xE9todos de amostragem aplic\xE1veis \xE0s auditorias: por atributos e por unidade monet\xE1ria. Supervis\xE3o e Controle de Qualidade.",
    "Amostragem por atributos e por unidade monet\xE1ria (Aprofundamento).",
    "Auditorias de conformidade, financeira e operacional: conceitos, caracter\xEDsticas e finalidades. Outros instrumentos de fiscaliza\xE7\xE3o: levantamento, monitoramento, acompanhamento e inspe\xE7\xE3o (Auditoria governamental: tipos, formas e instrumentos).",
    "Auditoria governamental segundo a INTOSAI. Normas internacionais para o exerc\xEDcio profissional da auditoria. Normas da INTOSAI: princ\xEDpios fundamentais de auditoria e c\xF3digo de \xE9tica do setor p\xFAblico (ISSAIs 100, 130).",
    "Normas de auditoria do TCU (Portaria-TCU n\xBA 280/2010). Matriz de Planejamento. Matriz de Achados e Matriz de Responsabiliza\xE7\xE3o.",
    "Materialidade. Avalia\xE7\xE3o dos riscos gerais do trabalho, dos riscos inerentes e de controle. Modelo de risco de auditoria. Respostas do auditor aos riscos gerais do trabalho e aos riscos de distor\xE7\xE3o relevante ou residuais (natureza, \xE9poca e extens\xE3o).",
    "T\xE9cnicas para obten\xE7\xE3o do entendimento do objeto e de seu ambiente (Controle interno).",
    "Tipos de opini\xE3o de auditoria em trabalhos de assegura\xE7\xE3o razo\xE1vel.",
    "Normas para a tomada e presta\xE7\xE3o de contas dos administradores e respons\xE1veis da Administra\xE7\xE3o P\xFAblica Federal, para fins de julgamento pelo Tribunal de Contas da Uni\xE3o (IN-TCU n\xBA 84, de 22 de abril de 2020).",
    "Normas internacionais para o exerc\xEDcio profissional da auditoria (Normas do IIA).",
    "Manual de Auditoria Operacional do TCU (MAO).",
    "Trabalho de assegura\xE7\xE3o (NBC TA Estrutura Conceitual - Estrutura Conceitual para Trabalhos de Assegura\xE7\xE3o)."
  ],
  CON: [
    "Princ\xEDpios fundamentais. Aplicabilidade das normas constitucionais. Normas de efic\xE1cia plena, contida e limitada. Normas program\xE1ticas.",
    "Teoria Geral dos Direitos Fundamentais.",
    "Direitos e deveres individuais e coletivos \u2013 Parte I.",
    "Direitos e deveres individuais e coletivos \u2013 Parte II.",
    "Direitos sociais.",
    "Direitos de nacionalidade.",
    "Direitos pol\xEDticos.",
    "Partidos pol\xEDticos.",
    "Organiza\xE7\xE3o pol\xEDtico-administrativa do Estado. Estado federal brasileiro, Uni\xE3o, estados, Distrito Federal, munic\xEDpios e territ\xF3rios.",
    "Administra\xE7\xE3o P\xFAblica. Disposi\xE7\xF5es gerais, servidores p\xFAblicos.",
    "Poder Legislativo. Estrutura. Funcionamento e atribui\xE7\xF5es. Fiscaliza\xE7\xE3o cont\xE1bil, financeira e or\xE7ament\xE1ria. Comiss\xF5es Parlamentares de Inqu\xE9rito (CPIs).",
    "Processo legislativo; Reforma Constitucional.",
    "Poder Executivo. Atribui\xE7\xF5es e responsabilidades do Presidente da Rep\xFAblica.",
    "Poder Judici\xE1rio. Disposi\xE7\xF5es gerais. \xD3rg\xE3os do poder judici\xE1rio. Organiza\xE7\xE3o e compet\xEAncias. Conselho Nacional de Justi\xE7a (CNJ): composi\xE7\xE3o e compet\xEAncias.",
    "Fun\xE7\xF5es essenciais \xE0 justi\xE7a. Minist\xE9rio P\xFAblico e Advocacia P\xFAblica.",
    "Controle de Constitucionalidade.",
    "Constitui\xE7\xE3o: conceito, classifica\xE7\xF5es, normas constitucionais. (Nota: M\xF3dulo complementar/revis\xE3o).",
    "Poder constituinte origin\xE1rio, derivado e suas esp\xE9cies.",
    "T\xEDtulo I da CF. Teoria dos princ\xEDpios. Fundamentos, objetivos fundamentais, princ\xEDpios das rela\xE7\xF5es internacionais, separa\xE7\xE3o de poderes, forma de governo, sistema de governo, forma de estado.",
    "Teoria dos direitos fundamentais: conceito, fundamentos, caracter\xEDsticas, titularidade, aplica\xE7\xE3o, tratados internacionais de direitos humanos, fontes dos direitos fundamentais, restri\xE7\xF5es.",
    "Art. 5\xBA da CF, parte 1: direitos \xE0 vida, liberdade, igualdade, seguran\xE7a, propriedade e privacidade.",
    "Garantias processuais gerais, garantias penais, rem\xE9dios constitucionais.",
    "Direitos sociais e direitos de nacionalidade (Revis\xE3o/Aprofundamento).",
    "Direitos Pol\xEDticos positivos e negativos, ativos e passivos. Normas constitucionais sobre partidos pol\xEDticos.",
    "Organiza\xE7\xE3o pol\xEDtico-administrativa. Entes federativos. Bens P\xFAblicos. Interven\xE7\xE3o.",
    "Reparti\xE7\xE3o de compet\xEAncias federativas: teoria e casu\xEDstica.",
    "Poder Legislativo na CF. Congresso Nacional e suas casas. Estatuto dos parlamentares. CPIs. Fiscaliza\xE7\xE3o cont\xE1bil e financeira.",
    "Poder Executivo na CF (M\xF3dulo de aprofundamento).",
    "Disposi\xE7\xF5es gerais sobre o Poder Judici\xE1rio na CF (arts. 92 a 100).",
    "Regras sobre distribui\xE7\xE3o de compet\xEAncias entre os \xF3rg\xE3os jurisdicionais.",
    "Fun\xE7\xF5es essenciais \xE0 Justi\xE7a: Minist\xE9rio P\xFAblico, Defensoria P\xFAblica, Advocacia P\xFAblica e Advocacia Privada.",
    "Controle de constitucionalidade das leis e atos normativos. Esp\xE9cies de controles de validade. Esp\xE9cies de inconstitucionalidade. Sistemas de controle. Controle no Brasil: difuso e concentrado. A\xE7\xF5es de controle concentrado. Efeitos das decis\xF5es em controle de constitucionalidade.",
    "Arts. 136 a 144 da CF. Estados de emerg\xEAncia; for\xE7as armadas; seguran\xE7a p\xFAblica.",
    "Sistema Tribut\xE1rio na CF (arts. 145 a 162).",
    "Finan\xE7as P\xFAblicas e Or\xE7amento (Arts. 163 a 169 da CF).",
    "Ordem Econ\xF4mica e Financeira (Arts. 170 a 192 da CF)."
  ],
  ADM: [
    "Regime jur\xEDdico-administrativo. Conceito. Princ\xEDpios expressos e impl\xEDcitos da Administra\xE7\xE3o P\xFAblica.",
    "Estado, governo e Administra\xE7\xE3o P\xFAblica. Conceitos. Elementos. Direito administrativo. Conceito. Objeto. Fontes.",
    "Organiza\xE7\xE3o administrativa. Centraliza\xE7\xE3o, descentraliza\xE7\xE3o, concentra\xE7\xE3o e desconcentra\xE7\xE3o. Administra\xE7\xE3o direta e indireta. Autarquias.",
    "Funda\xE7\xF5es, empresas p\xFAblicas e sociedades de economia mista.",
    "Entidades paraestatais e terceiro setor: servi\xE7os sociais aut\xF4nomos, entidades de apoio, organiza\xE7\xF5es sociais, organiza\xE7\xF5es da sociedade civil de interesse p\xFAblico (OSCIP).",
    "Poderes da Administra\xE7\xE3o P\xFAblica. Hier\xE1rquico, disciplinar, regulamentar e de pol\xEDcia. Uso e abuso do poder.",
    "Ato administrativo. Conceito, requisitos, atributos, classifica\xE7\xE3o e esp\xE9cies.",
    "Extin\xE7\xE3o do ato administrativo: cassa\xE7\xE3o, anula\xE7\xE3o, revoga\xE7\xE3o e convalida\xE7\xE3o. Decad\xEAncia administrativa.",
    "Lei n\xBA 14.133/2021 (Nova Lei de Licita\xE7\xF5es e Contratos Administrativos) - Licita\xE7\xF5es (Parte 1).",
    "Lei n\xBA 14.133/2021 (Nova Lei de Licita\xE7\xF5es e Contratos Administrativos) - Licita\xE7\xF5es (Parte 2).",
    "Lei n\xBA 14.133/2021 (Nova Lei de Licita\xE7\xF5es e Contratos Administrativos) - Contratos.",
    "Servi\xE7os p\xFAblicos. Conceito. Elementos constitutivos. Formas de presta\xE7\xE3o e meios de execu\xE7\xE3o. Delega\xE7\xE3o: concess\xE3o, permiss\xE3o e autoriza\xE7\xE3o. Classifica\xE7\xE3o. Princ\xEDpios.",
    "Decreto n\xBA 11.531/2023 (Conv\xEAnios e instrumentos cong\xEAneres).",
    "Controle da Administra\xE7\xE3o P\xFAblica. Controle exercido pela Administra\xE7\xE3o P\xFAblica. Controle judicial. Controle legislativo.",
    "Responsabilidade civil do Estado. Evolu\xE7\xE3o hist\xF3rica. Responsabilidade civil do Estado no direito brasileiro. Responsabilidade por ato comissivo e omissivo do Estado. Requisitos para a demonstra\xE7\xE3o da responsabilidade, excludentes e atenuantes. Repara\xE7\xE3o do dano e direito de regresso.",
    "Lei n\xBA 8.112/1990. Provimento. Vac\xE2ncia. Efetividade, estabilidade e vitaliciedade.",
    "Lei n\xBA 8.112/1990. Remunera\xE7\xE3o. Direitos e deveres.",
    "Lei n\xBA 8.112/1990. Responsabilidade. Processo Administrativo Disciplinar (PAD).",
    "Agentes p\xFAblicos. Legisla\xE7\xE3o pertinente. Disposi\xE7\xF5es constitucionais aplic\xE1veis. Disposi\xE7\xF5es doutrin\xE1rias. Conceito. Esp\xE9cies. Cargo, emprego e fun\xE7\xE3o p\xFAblica.",
    "Processo administrativo. Lei n\xBA 9.784/1999.",
    "Improbidade administrativa: Lei n\xBA 8.429/1992.",
    "Lei de Acesso \xE0 Informa\xE7\xE3o (Lei n\xBA 12.527/2011): conceitos e aplica\xE7\xE3o.",
    "Apresenta\xE7\xE3o do curso. Princ\xEDpios expressos e impl\xEDcitos da Administra\xE7\xE3o P\xFAblica. (Nota: Bloco duplicado/revis\xE3o na sele\xE7\xE3o).",
    "Estado, governo e Administra\xE7\xE3o P\xFAblica. Conceitos. Elementos. Direito administrativo. Conceito. Objeto. Fontes. Regime jur\xEDdico-administrativo. Conceito.",
    "Poderes da Administra\xE7\xE3o P\xFAblica. Hier\xE1rquico, disciplinar, regulamentar e de pol\xEDcia. Uso e abuso do poder.",
    "Ato administrativo: conceito, requisitos, atributos, classifica\xE7\xE3o.",
    "Ato administrativo: esp\xE9cies. Extin\xE7\xE3o do ato administrativo: cassa\xE7\xE3o, anula\xE7\xE3o, revoga\xE7\xE3o e convalida\xE7\xE3o. Decad\xEAncia administrativa.",
    "Organiza\xE7\xE3o administrativa. Centraliza\xE7\xE3o, descentraliza\xE7\xE3o, concentra\xE7\xE3o e desconcentra\xE7\xE3o. Administra\xE7\xE3o direta e indireta. Autarquias, funda\xE7\xF5es, empresas p\xFAblicas e sociedades de economia mista.",
    "Cons\xF3rcios P\xFAblicos.",
    "Entidades paraestatais e terceiro setor: servi\xE7os sociais aut\xF4nomos, entidades de apoio, organiza\xE7\xF5es sociais, organiza\xE7\xF5es da sociedade civil de interesse p\xFAblico.",
    "Agentes p\xFAblicos. Legisla\xE7\xE3o pertinente. Disposi\xE7\xF5es constitucionais aplic\xE1veis. Disposi\xE7\xF5es doutrin\xE1rias. Conceito. Esp\xE9cies. Cargo, emprego e fun\xE7\xE3o p\xFAblica.",
    "Lei n\xBA 8.112/1990. Provimento. Vac\xE2ncia. Efetividade, estabilidade e vitaliciedade. Remunera\xE7\xE3o. Direitos e deveres. Responsabilidade. Processo administrativo disciplinar.",
    "Licita\xE7\xF5es \xE0 luz da Lei n\xBA 14.133/2021 - Parte I.",
    "Licita\xE7\xF5es \xE0 luz da Lei n\xBA 14.133/2021 - Parte II.",
    "Contratos administrativos (Lei n\xBA 14.133/2021).",
    "Sistema de Registro de Pre\xE7os. Decreto n\xBA 11.462/2023.",
    "Conv\xEAnios e Contratos de Repasse. Decreto n\xBA 11.531/2023 e Portaria Interministerial n\xBA 33/2023.",
    "Servi\xE7os p\xFAblicos. Conceito. Elementos constitutivos. Formas de presta\xE7\xE3o e meios de execu\xE7\xE3o. Delega\xE7\xE3o: concess\xE3o, permiss\xE3o e autoriza\xE7\xE3o. Classifica\xE7\xE3o. Princ\xEDpios.",
    "Parceria P\xFAblico-Privada (PPP).",
    "Processo Administrativo (Lei n\xBA 9.784/1999).",
    "Responsabilidade civil do Estado. Evolu\xE7\xE3o hist\xF3rica e aplica\xE7\xE3o no direito brasileiro (Atos comissivos, omissivos, requisitos, excludentes, atenuantes, repara\xE7\xE3o e regresso).",
    "Controle da Administra\xE7\xE3o P\xFAblica. Controle exercido pela Administra\xE7\xE3o P\xFAblica. Controle judicial. Controle legislativo.",
    "Improbidade administrativa: Lei n\xBA 8.429/1992.",
    "Lei de Acesso \xE0 Informa\xE7\xE3o (Lei n\xBA 12.527/2011).",
    "Lei Anticorrup\xE7\xE3o (Lei n\xBA 12.846/2013).",
    "Lei n\xBA 10.973/2004 - ETEC - Encomenda Tecnol\xF3gica - Artigos 19 a 21-A."
  ],
  CPB: [
    "Contabilidade P\xFAblica: aspectos introdut\xF3rios.",
    "MCASP: Procedimentos Cont\xE1beis Or\xE7ament\xE1rios (I).",
    "MCASP: Procedimentos Cont\xE1beis Or\xE7ament\xE1rios (II).",
    "MCASP: Procedimentos Cont\xE1beis Patrimoniais (I).",
    "MCASP: Procedimentos Cont\xE1beis Patrimoniais (II).",
    "MCASP: Procedimentos Cont\xE1beis Patrimoniais (III).",
    "MCASP: Plano de Contas Aplicado ao Setor P\xFAblico (PCASP).",
    "Balan\xE7o Or\xE7ament\xE1rio.",
    "Balan\xE7o Financeiro.",
    "Balan\xE7o Patrimonial.",
    "Demonstra\xE7\xE3o das Varia\xE7\xF5es Patrimoniais (DVP).",
    "Demonstra\xE7\xE3o dos Fluxos de Caixa (DFC). Demonstra\xE7\xE3o das Muta\xE7\xF5es do Patrim\xF4nio L\xEDquido (DMPL). Notas Explicativas.",
    "T\xEDtulo IX da Lei n\xBA 4.320/1964 (Sistemas de Contas).",
    "NBC TSP \u2013 Estrutura Conceitual.",
    "T\xF3picos das NBC TSP Vigentes (IPSAS convergidas) - Parte I.",
    "T\xF3picos das NBC TSP Vigentes (IPSAS convergidas) - Parte II.",
    "T\xF3picos da LRF (I): Relat\xF3rio Resumido da Execu\xE7\xE3o Or\xE7ament\xE1ria (RREO) e Relat\xF3rio de Gest\xE3o Fiscal (RGF).",
    "T\xF3picos da LRF (II): Conceitos de d\xEDvida p\xFAblica e restos a pagar, escritura\xE7\xE3o e consolida\xE7\xE3o das contas.",
    "Sistema de Contabilidade Federal: organiza\xE7\xE3o e compet\xEAncias (Lei n\xBA 10.180/2001 e Decreto n\xBA 6.976/2009).",
    "No\xE7\xF5es de Informa\xE7\xF5es de Custos no Setor P\xFAblico.",
    "Sistema Integrado de Administra\xE7\xE3o Financeira do Governo Federal (SIAFI): conceito, objetivos, usu\xE1rios e seguran\xE7a do sistema (princ\xEDpios e instrumentos)."
  ],
  CGE: [
    "No\xE7\xF5es Iniciais de Contabilidade.",
    "No\xE7\xF5es Iniciais de Demonstra\xE7\xF5es Cont\xE1beis.",
    "An\xE1lise das Demonstra\xE7\xF5es Cont\xE1beis: Conceitos, c\xE1lculos, vantagens e desvantagens dos indicadores \u2013 Parte I (Retorno sobre o Capital Empregado, Alavancagem Financeira, Economic Value Added \u2013 EVA, EBITDA, An\xE1lise da Lucratividade, An\xE1lise Horizontal e Vertical, An\xE1lise de Tend\xEAncias).",
    "An\xE1lise das Demonstra\xE7\xF5es Cont\xE1beis: Conceitos, c\xE1lculos, vantagens e desvantagens dos indicadores \u2013 Parte II (Indicadores de Liquidez).",
    "An\xE1lise das Demonstra\xE7\xF5es Cont\xE1beis: Conceitos, c\xE1lculos, vantagens e desvantagens dos indicadores \u2013 Parte III (Indicadores de estrutura de capital).",
    "An\xE1lise das Demonstra\xE7\xF5es Cont\xE1beis: Conceitos, c\xE1lculos, vantagens e desvantagens dos indicadores \u2013 Parte IV (An\xE1lise do Capital de Giro; Capital Circulante L\xEDquido).",
    "Informa\xE7\xF5es extra\xEDdas das Notas Explicativas."
  ],
  TI: [
    "Dados estruturados e n\xE3o estruturados. Dados abertos. Coleta, tratamento, armazenamento, integra\xE7\xE3o e recupera\xE7\xE3o de dados. Processos de ETL.",
    "Representa\xE7\xE3o de dados num\xE9ricos, textuais e estruturados; aritm\xE9tica computacional. Representa\xE7\xE3o de dados espaciais para georeferenciamento e geosensoriamento. Formatos e tecnologias: XML, JSON, CSV.",
    "Introdu\xE7\xE3o conceitual/leitura de apoio (Tema n\xE3o expl\xEDcito no edital - Pr\xE9-requisito).",
    "Bancos de dados relacionais: teoria e implementa\xE7\xE3o.",
    "Normaliza\xE7\xE3o de Bancos de Dados.",
    "Uso do SQL como DDL, DML, DCL. Processamento de transa\xE7\xF5es.",
    "Introdu\xE7\xE3o conceitual/leitura de apoio II (Tema n\xE3o expl\xEDcito no edital - Pr\xE9-requisito).",
    "Explora\xE7\xE3o de dados: conceitua\xE7\xE3o e caracter\xEDsticas. No\xE7\xF5es do modelo CRISP-DM. T\xE9cnicas para pr\xE9-processamento de dados. T\xE9cnicas e tarefas de minera\xE7\xE3o de dados. Classifica\xE7\xE3o. Regras de associa\xE7\xE3o. An\xE1lise de agrupamentos (clusteriza\xE7\xE3o). Detec\xE7\xE3o de anomalias. Modelagem preditiva.",
    "Conceitos de PLN (Processamento de Linguagem Natural): sem\xE2ntica vetorial, redu\xE7\xE3o de dimensionalidade, modelagem de t\xF3picos latentes, classifica\xE7\xE3o de textos, an\xE1lise de sentimentos, representa\xE7\xF5es com n-gramas.",
    "Conceitos de ML (Machine Learning): fontes de erro em modelos preditivos, valida\xE7\xE3o e avalia\xE7\xE3o de modelos preditivos, underfitting, overfitting e t\xE9cnicas de regulariza\xE7\xE3o, otimiza\xE7\xE3o de hiperpar\xE2metros, separabilidade de dados, redu\xE7\xE3o da dimensionalidade. Modelos lineares, \xE1rvores de decis\xE3o, redes neurais feed-forward, classificador Naive Bayes.",
    "Linguagem Python: sintaxe, vari\xE1veis, tipos de dados e estruturas de controle de fluxo. Estruturas de dados, fun\xE7\xF5es e arquivos.",
    "Bibliotecas Python: NLTK, TensorFlow, Pandas, NumPy, Arrow, Scikit-Learn, SciPy.",
    "No\xE7\xF5es da Linguagem R: Sintaxe, tipos de dados, operadores, comandos de repeti\xE7\xE3o, estruturas de dados, gr\xE1ficos, Data frames. Tidyverse.",
    "Lei de Acesso \xE0 Informa\xE7\xE3o (Lei n\xBA 12.527/2011): conceitos e aplica\xE7\xE3o.",
    "Lei n\xBA 13.709/2018 - Lei Geral de Prote\xE7\xE3o de Dados Pessoais (LGPD).",
    "Seguran\xE7a da informa\xE7\xE3o: Confidencialidade, integridade, availability, autenticidade e n\xE3o rep\xFAdio. Pol\xEDticas de seguran\xE7a. Pol\xEDticas de classifica\xE7\xE3o da informa\xE7\xE3o. Sistemas de gest\xE3o de seguran\xE7a da informa\xE7\xE3o. Tratamento de incidentes de seguran\xE7a.",
    "Pareamento de dados (Record Linkage): Processo e etapas. Classifica\xE7\xE3o. Qualidade de dados pareados. An\xE1lise de dados pareados."
  ],
  ECO: [
    "Conceitos introdut\xF3rios: oferta, demanda e equil\xEDbrio.",
    "Conceitos introdut\xF3rios: elasticidades.",
    "Introdu\xE7\xE3o \xE0s estruturas de mercado: teoria da produ\xE7\xE3o.",
    "Introdu\xE7\xE3o \xE0s estruturas de mercado: teoria dos custos.",
    "Estrutura de mercado: concorr\xEAncia perfeita.",
    "Estrutura de mercado: monop\xF3lio.",
    "Estrutura de mercado: concorr\xEAncia monopol\xEDstica e oligop\xF3lio.",
    "Falhas de mercado: externalidades, bens p\xFAblicos, assimetria de informa\xE7\xE3o (sele\xE7\xE3o adversa e perigo moral).",
    "Introdu\xE7\xE3o \xE0 Macroeconomia: o sistema de contas nacionais e as identidades macroecon\xF4micas b\xE1sicas. Produto agregado e os problemas de mensura\xE7\xE3o. Produto nominal x produto real.",
    "Balan\xE7o de pagamentos.",
    "Contas do sistema monet\xE1rio.",
    "O modelo keynesiano b\xE1sico: o multiplicador e o papel dos gastos do governo.",
    "O modelo IS/LM: impactos das pol\xEDticas monet\xE1ria e fiscal.",
    "Pol\xEDticas macroecon\xF4micas em diferentes regimes cambiais.",
    "O financiamento do setor p\xFAblico no Brasil. A avalia\xE7\xE3o do gasto p\xFAblico.",
    "Conceitos de regula\xE7\xE3o, desregula\xE7\xE3o e re-regula\xE7\xE3o. Teoria econ\xF4mica de ind\xFAstrias reguladas. Regula\xE7\xE3o e forma\xE7\xE3o de pre\xE7os para estruturas de mercado de concorr\xEAncia imperfeita. Conceitos b\xE1sicos sobre regimes tarif\xE1rios. Tarifa\xE7\xE3o por custo de servi\xE7o. Tarifa\xE7\xE3o por pre\xE7o teto. Regula\xE7\xE3o por incentivos. Regula\xE7\xE3o para competi\xE7\xE3o."
  ],
  POR: [
    "Ortografia. Acentua\xE7\xE3o gr\xE1fica.",
    "Morfologia: reconhecimento, emprego e sentido das classes gramaticais I \u2013 artigo, substantivo, adjetivo, numeral, adv\xE9rbio, interjei\xE7\xE3o. Mecanismos de flex\xE3o dos nomes.",
    "Morfologia: reconhecimento, emprego e sentido das classes gramaticais II - preposi\xE7\xE3o e conjun\xE7\xE3o.",
    "Morfologia: reconhecimento, emprego e sentido das classes gramaticais III - pronomes. Padr\xF5es gerais de coloca\xE7\xE3o pronominal no portugu\xEAs.",
    "Morfologia: reconhecimento, emprego e sentido das classes gramaticais III \u2013 verbo. Emprego de tempos e modos dos verbos em portugu\xEAs. Mecanismos de flex\xE3o dos verbs.",
    "Morfologia: corre\xE7\xE3o e vozes verbais.",
    "Morfologia: processos de forma\xE7\xE3o de palavras.",
    "Sintaxe: frase e ora\xE7\xE3o; termos da ora\xE7\xE3o.",
    "Sintaxe: processos de coordena\xE7\xE3o e subordina\xE7\xE3o.",
    "Pontua\xE7\xE3o.",
    "Concord\xE2ncia nominal e verbal.",
    "Transitividade e reg\xEAncia de nomes e verbos. Emprego do sinal indicativo de crase.",
    "Mecanismos de coes\xE3o textual. Reescrita de frases: substitui\xE7\xE3o, deslocamento, paralelismo.",
    "Sem\xE2ntica: sentido e emprego dos voc\xE1bulos; campos sem\xE2nticos. Figuras de linguagem.",
    "Elementos de constru\xE7\xE3o do texto e seu sentido: g\xEAnero do texto (liter\xE1rio e n\xE3o liter\xE1rio, narrativo, descritivo e argumentativo); interpreta\xE7\xE3o e organiza\xE7\xE3o interna.",
    "Varia\xE7\xE3o lingu\xEDstica: norma culta.",
    "Resumo da mat\xE9ria."
  ],
  ING: [
    "Interpreta\xE7\xE3o de textos, Cognatos e Resolu\xE7\xE3o de Provas.",
    "Substantivos, Artigos, Pronomes, Preposi\xE7\xF5es e Resolu\xE7\xE3o de Provas.",
    "Adjetivos, Adv\xE9rbios, Afixos e Resolu\xE7\xE3o de Provas.",
    "Verbos Frasais e Resolu\xE7\xE3o de provas.",
    "Tempos Verbais (Parte 1) e Resolu\xE7\xE3o de Provas.",
    "Tempos Verbais (Parte 2) e Resolu\xE7\xE3o Provas.",
    "Express\xF5es (Idioms) e Resolu\xE7\xE3o de Provas.",
    "Resolu\xE7\xE3o Geral de Provas."
  ],
  RLM: [
    "Fra\xE7\xF5es. Raz\xF5es e propor\xE7\xF5es. Escala. Proporcionalidade.",
    "Regra de Tr\xEAs Simples e Compostas.",
    "Porcentagem.",
    "Juros simples.",
    "Juros composto.",
    "Taxas.",
    "Opera\xE7\xF5es de Desconto.",
    "Equival\xEAncia de capitais.",
    "An\xE1lise de investimentos.",
    "Sistemas de Amortiza\xE7\xE3o - SAC.",
    "Sistemas de Amortiza\xE7\xE3o (Franc\xEAs, Misto e Americano)."
  ],
  EST: [
    "Apresenta\xE7\xE3o de dados.",
    "Medidas de Posi\xE7\xE3o: M\xE9dias.",
    "Medidas Separatrizes ou Quantis.",
    "Medidas de Posi\xE7\xE3o: Moda.",
    "Medidas de Variabilidade ou Dispers\xE3o.",
    "Aula resumo de probabilidade e an\xE1lise combinat\xF3ria.",
    "Vari\xE1veis Aleat\xF3rias Discretas - Distribui\xE7\xF5es.",
    "Distribui\xE7\xF5es Discretas de Probabilidade.",
    "Vari\xE1veis Aleat\xF3rias Cont\xEDnuas - Distribui\xE7\xF5es Cont\xEDnuas.",
    "Teoria da Amostragem / Estima\xE7\xE3o Pontual e Intervalar.",
    "Testes de Hip\xF3teses.",
    "An\xE1lise de Regress\xE3o Linear Simples.",
    "An\xE1lise multivariada: an\xE1lise de vari\xE2ncia (ANOVA).",
    "An\xE1lise multivariada: an\xE1lise de regress\xE3o m\xFAltipla.",
    "An\xE1lise multivariada: An\xE1lise de Agrupamentos (Cluster), An\xE1lise de Componentes Principais (PCA), An\xE1lise Fatorial.",
    "S\xE9ries Temporais."
  ],
  CIV: [
    "Lei de Introdu\xE7\xE3o \xE0s Normas do Direito Brasileiro (LINDB). Vig\xEAncia, aplica\xE7\xE3o, obrigatoriedade, interpreta\xE7\xE3o e integra\xE7\xE3o das leis. Conflito das leis no tempo. Efic\xE1cia das leis no espa\xE7o.",
    "Pessoas naturais. Conceito. In\xEDcio da pessoa natural. Personalidade. Capacidade. Direitos da personalidade. Domic\xEDlio.",
    "Pessoas jur\xEDdicas. Disposi\xE7\xF5es Gerais. Constitui\xE7\xE3o. Extin\xE7\xE3o. Sociedades de fato. Associa\xE7\xF5es. Funda\xE7\xF5es. Domic\xEDlio.",
    "Bens im\xF3veis, m\xF3veis e p\xFAblicos.",
    "Fato jur\xEDdico. Neg\xF3cio jur\xEDdico. Disposi\xE7\xF5es gerais. Invalidade.",
    "Prescri\xE7\xE3o e Decad\xEAncia. Disposi\xE7\xF5es gerais.",
    "Obriga\xE7\xF5es. Caracter\xEDsticas.",
    "Adimplemento pelo pagamento. Inadimplemento das obriga\xE7\xF5es - disposi\xE7\xF5es gerais e mora.",
    "Contratos. Princ\xEDpios. Contratos em geral. Disposi\xE7\xF5es gerais.",
    "Responsabilidade civil objetiva e subjetiva. Obriga\xE7\xE3o de indenizar. Dano material.",
    "Lei n\xBA 13.709/2018 - Lei Geral de Prote\xE7\xE3o de Dados Pessoais (LGPD)."
  ],
  CPC: [
    "Princ\xEDpios do processo. Princ\xEDpio do devido processo legal. Princ\xEDpios do contradit\xF3rio, da ampla defesa e do juiz natural.",
    "Jurisdi\xE7\xE3o. A\xE7\xE3o. Condi\xE7\xF5es da a\xE7\xE3o. Classifica\xE7\xE3o.",
    "Atos judiciais. Despachos, decis\xF5es interlocut\xF3rias e senten\xE7as.",
    "Senten\xE7as. Coisa julgada material.",
    "Controle judicial dos atos administrativos.",
    "Processo Estrutural. Problema Estrutural. Decis\xE3o Estrutural."
  ],
  PEN: [
    "Lei Anticorrup\xE7\xE3o (Lei n\xBA 12.846/2013).",
    "Lei n\xBA 12.850/2013 (Crime organizado).",
    "Lei n\xBA 9.613/1998 (Crimes de lavagem de dinheiro).",
    "Lei n\xBA 13.869/2019 (Lei de abuso de autoridade).",
    "Decreto-Lei n\xBA 2.848/1940 - Crimes contra a Administra\xE7\xE3o P\xFAblica (Parte I).",
    "Decreto-Lei n\xBA 2.848/1940 - Crimes contra a Administra\xE7\xE3o P\xFAblica (Parte II).",
    "Decreto-Lei n\xBA 2.848/1940 - Crimes contra a Administra\xE7\xE3o P\xFAblica (Parte III).",
    "Decreto-Lei n\xBA 2.848/1940 - Crimes contra a Administra\xE7\xE3o P\xFAblica (Parte IV).",
    "Conven\xE7\xE3o de M\xE9rida (Decreto n\xBA 5.687/2006) e Conven\xE7\xE3o de Palermo (Decreto n\xBA 5.015/2004)."
  ],
  PUB: [
    "Administra\xE7\xE3o P\xFAblica do modelo racional-legal ao paradigma p\xF3s-burocr\xE1tico (Parte I).",
    "Administra\xE7\xE3o P\xFAblica do modelo racional-legal ao paradigma p\xF3s-burocr\xE1tico (Parte II).",
    "Accountability. Governabilidade e governan\xE7a. Princ\xEDpios de governan\xE7a p\xFAblica.",
    "Transpar\xEAncia da administra\xE7\xE3o p\xFAblica. Controle social e cidadania.",
    "Governo eletr\xF4nico.",
    "Gest\xE3o por resultados na produ\xE7\xE3o de servi\xE7os p\xFAblicos.",
    "Intermedia\xE7\xE3o de interesses (clientelismo, corporativismo e neocorporativismo).",
    "Processos participativos de gest\xE3o p\xFAblica: conselhos de gest\xE3o, or\xE7amento participativo, parceria entre governo e sociedade.",
    "Mudan\xE7as institucionais. Conselhos, Organiza\xE7\xF5es Sociais (OS), Organiza\xE7\xE3o da Sociedade Civil de Interesse P\xFAblico (OSCIP), ag\xEAncia reguladora, ag\xEAncia executiva, cons\xF3rcios p\xFAblicos.",
    "Pol\xEDticas p\xFAblicas. O ciclo das pol\xEDticas p\xFAblicas (constru\xE7\xE3o de agenda, formula\xE7\xE3o da pol\xEDtica, processo decis\xF3rio, implementa\xE7\xE3o e avalia\xE7\xE3o).",
    "As pol\xEDticas p\xFAblicas no Estado brasileiro contempor\xE2neo. Descentraliza\xE7\xE3o e democracia. Participa\xE7\xE3o, atores sociais e controle social. Gest\xE3o local, cidadania e equidade social. Corrup\xE7\xE3o e pol\xEDticas p\xFAblicas: fatores que influenciam a incid\xEAncia de corrup\xE7\xE3o e fatores que promovem a qualidade das pol\xEDticas p\xFAblicas.",
    "Gest\xE3o de Pessoas por Compet\xEAncias.",
    "Planejamento nas organiza\xE7\xF5es p\xFAblicas. O ciclo do planejamento (an\xE1lise do ambiente, objetivos estrat\xE9gicos, miss\xE3o, vis\xE3o, valores). O ciclo do planejamento em organiza\xE7\xF5es (PDCA). Referencial Estrat\xE9gico das Organiza\xE7\xF5es. An\xE1lise de ambiente interno e externo. Ferramentas de an\xE1lise de ambiente: an\xE1lise SWOT, an\xE1lise de cen\xE1rios, matriz GUT (Parte I).",
    "Planejamento nas organiza\xE7\xF5es p\xFAblicas (Parte II).",
    "Indicadores de desempenho. Tipos de indicadores. Vari\xE1veis componentes dos indicadores.",
    "Gest\xE3o por resultados na produ\xE7\xE3o de servi\xE7os p\xFAblicos (Empreendedorismo governamental)."
  ]
};
var INFO_MATERIAS_17 = {
  controle_externo: { nome: "Controle Externo", sigla: "CEX", cor: "#2563eb" },
  afo_dir_financeiro: { nome: "AFO e Direito Financeiro", sigla: "AFO", cor: "#059669" },
  auditoria_gov: { nome: "Auditoria Governamental", sigla: "AUD", cor: "#7c3aed" },
  dir_constitucional: { nome: "Direito Constitucional", sigla: "CON", cor: "#dc2626" },
  dir_administrativo: { nome: "Direito Administrativo", sigla: "ADM", cor: "#d97706" },
  contabilidade_publica: { nome: "Contabilidade P\xFAblica (MCASP)", sigla: "CPB", cor: "#0d9488" },
  contabilidade_geral: { nome: "Contabilidade Geral", sigla: "CGE", cor: "#4f46e5" },
  analise_dados_ti: { nome: "An\xE1lise de Dados e TI", sigla: "TI", cor: "#0891b2" },
  economia_setor_p: { nome: "Economia e Finan\xE7as P\xFAblicas", sigla: "ECO", cor: "#4b5563" },
  portugues_redacao: { nome: "L\xEDngua Portuguesa", sigla: "POR", cor: "#db2777" },
  lingua_inglesa: { nome: "L\xEDngua Inglesa", sigla: "ING", cor: "#0ea5e9" },
  raciocinio_logico: { nome: "Racioc\xEDnio L\xF3gico e Mat. Financeira", sigla: "RLM", cor: "#84cc16" },
  estatistica: { nome: "Estat\xEDstica", sigla: "EST", cor: "#8b5cf6" },
  direito_civil: { nome: "Direito Civil", sigla: "CIV", cor: "#f43f5e" },
  direito_processual_civil: { nome: "Direito Processual Civil", sigla: "CPC", cor: "#d946ef" },
  direito_penal: { nome: "Direito Penal", sigla: "PEN", cor: "#10b981" },
  administracao_publica: { nome: "Administra\xE7\xE3o P\xFAblica", sigla: "PUB", cor: "#f97316" }
};
function gerarAulasParaMateria(sigla) {
  const titulos = TOPICOS_REALISTAS[sigla] || [];
  return titulos.map((titulo, idx) => {
    const numero = idx + 1;
    const id = `${sigla}_${numero.toString().padStart(2, "0")}`;
    return {
      id,
      numero,
      titulo: `Aula ${numero.toString().padStart(2, "0")} - ${titulo}`,
      status: "N\xE3o Iniciado" /* NaoIniciado */,
      questoesResolvidas: 0,
      questoesAcertadas: 0,
      questoesErradas: 0,
      horasEstudadas: 0
    };
  });
}
var MATERIAS_PADRAO = Object.keys(INFO_MATERIAS_17).map((id) => {
  const info = INFO_MATERIAS_17[id];
  const defaultMeta = ["CEX", "AFO", "AUD"].includes(info.sigla) ? 95 : 90;
  return {
    id,
    nome: info.nome,
    sigla: info.sigla,
    cor: info.cor,
    aulas: gerarAulasParaMateria(info.sigla),
    metaAcertos: defaultMeta
  };
});
var CICLO_PADRAO = {
  id: "ciclo_superestrategico_completo",
  nome: "Ciclo Estrat\xE9gia Completo (17 Disciplinas)",
  itens: Object.keys(INFO_MATERIAS_17).map((id, idx) => ({
    id: `ic_${idx + 1}`,
    materiaId: id,
    tempoMinutos: 90,
    Ordem: idx + 1
  })),
  itemAtualIndice: 0
};

// scripts/restore_baseline.ts
dotenv.config();
var SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
var SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
var TEST_EMAIL = process.env.SEED_TEST_EMAIL || "tcu.auditor.seed@gmail.com";
var TEST_PASSWORD = "TesteTCU@2026!";
async function restoreBaseline() {
  console.log(`Restaurando baseline limpo (17 mat\xE9rias, 0h) para ${TEST_EMAIL}...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (loginErr || !loginData?.session) {
    throw new Error(`Falha no login: ${loginErr?.message}`);
  }
  const userId = loginData.user.id;
  const token = loginData.session.access_token;
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const materias = JSON.parse(JSON.stringify(MATERIAS_PADRAO));
  const ciclo = JSON.parse(JSON.stringify(CICLO_PADRAO));
  materias.forEach((m) => {
    m.aulas.forEach((a) => {
      a.status = "N\xE3o Iniciado";
      a.questoesResolvidas = 0;
      a.questoesAcertadas = 0;
      a.questoesErradas = 0;
      a.horasEstudadas = 0;
      delete a.dataConclusao;
    });
  });
  const payload = {
    user_id: userId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    materias,
    ciclo,
    simulados: [],
    revisoes: [],
    historico: [],
    planejamento_semanal: null,
    configuracoes: {}
  };
  const { data, error } = await authedClient.from("user_data_sync").upsert(payload, { onConflict: "user_id" }).select("updated_at").single();
  if (error) {
    throw new Error(`Erro ao restaurar baseline: ${error.message}`);
  }
  await authedClient.from("historico_logs").delete().eq("user_id", userId);
  console.log(`\u2705 Baseline restaurado com sucesso para ${TEST_EMAIL}! Updated at: ${data.updated_at}`);
}
restoreBaseline().catch((err) => {
  console.error("\u274C Falha:", err);
  process.exit(1);
});
