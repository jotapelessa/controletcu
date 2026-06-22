import React, { useState } from 'react';
import { 
  Shield, Play, Layers, Award, Sparkles, CheckCircle2, 
  Clock, Calendar, MessageSquare, Send, RotateCcw, 
  ThumbsUp, ArrowRight, BookOpen, AlertCircle, Check, X, ChevronRight,
  BarChart3, ListTodo, FileText
} from 'lucide-react';

interface HomepageProps {
  onLoginClick: () => void;
  cmsContent?: any;
}

export const DEFAULT_CMS_CONTENT = {
  promoBanner: "🔥 Promoção de Lançamento: Assine hoje e garanta o acesso premium com 30% de desconto!",
  heroTitle: "Domine o Edital do seu Concurso com o Estratégia",
  heroSubtitle: "A plataforma definitiva de planejamento, cronômetros inteligentes e ciclos integrados com inteligência artificial para otimizar seus estudos no Estratégia Concursos.",
  heroBtnText: "Acessar Área do Aluno",
  features: [
    { 
      title: "Cronômetro & Gabarito Ativo", 
      desc: "Timer com modo livre e temporizador alvo, acoplado a um gabarito de acertos/erros em tempo real." 
    },
    { 
      title: "Ciclos de Estudo Dinâmicos", 
      desc: "Roteiro sequencial automatizado que distribui as disciplinas de acordo com o peso configurado." 
    },
    { 
      title: "IA Coach Tutor", 
      desc: "Diagnósticos profundos e planos de ação semanais gerados por Inteligência Artificial (Gemini) sobre seus erros." 
    },
    { 
      title: "Análise Foco na Aprovação", 
      desc: "Monitoramento de taxas de acertos voltado a notas de corte exigentes de grandes concursos do país." 
    }
  ],
  sections: [
    {
      id: "painel-geral",
      badge: "Métricas Inteligentes",
      title: "Seu Progresso Mapeado em Alta Resolução",
      desc: "A preparação para concursos exige precisão cirúrgica. Com o nosso Dashboard consolidado, você monitora suas horas líquidas, quantidade de questões respondidas e o seu aproveitamento cumulativo. Tudo desenhado para manter você focado rumo à nomeação.",
      bullets: [
        "Percentual Geral de Cobertura do Edital",
        "Horas estudadas por dia e por disciplina",
        "Indicadores automáticos de aproveitamento e aprovação"
      ]
    },
    {
      id: "ciclos",
      badge: "Engenharia de Roteamento",
      title: "Ciclos de Estudo Dinâmicos",
      desc: "Planilhas rígidas baseadas em dias de calendário quebram no primeiro imprevisto. A nossa fila circular adapta-se ao seu tempo disponível: se você parar no meio de um assunto hoje, você continua exatamente de onde parou amanhã, sem bagunçar as outras matérias. As disciplinas avançam de forma contínua seguindo os pesos pré-definidos do seu edital.",
      bullets: [
        "Estudo fluído sem culpa por dias perdidos",
        "Avanço automático após logar o tempo cumprido",
        "Visualização rápida das próximas disciplinas da fila"
      ]
    },
    {
      id: "cronometro",
      badge: "Ação Prática",
      title: "Cronômetro & Gabarito Ativo Integrados",
      desc: "O cronômetro inteligente permite registrar sessões de teoria ou vídeo, enquanto o gabarito ativo de acertos e erros funciona em paralelo. Ao registrar cada questão em tempo real, o app calcula suas estatísticas na hora e armazena os dados de desempenho que alimentam a Inteligência Artificial.",
      bullets: [
        "Controle de foco livre ou com alvos regressivos",
        "Painel de gabarito para marcar acertos/erros no ato",
        "Gravação direta no histórico de estudos ao salvar"
      ]
    },
    {
      id: "cronograma",
      badge: "Carga Horária Semanal",
      title: "Cronograma Semanal Ajustado",
      desc: "O cronograma semanal atua como a sua bússola diária. Ao definir quais dias você deseja estudar e o total de horas semanais (ex: 28h), o planejador divide essa carga de forma ideal. A grade serve como um guia visual para equilibrar sua vida pessoal com a dedicação necessária para passar.",
      bullets: [
        "Distribuição proporcional entre teoria e questões",
        "Flexibilidade de dias ativos (Segunda a Domingo)",
        "Cálculo automático de metas diárias de horas"
      ]
    },
    {
      id: "estrategia",
      badge: "Syllabus Integrado",
      title: "Acompanhamento de Aulas do Estratégia",
      desc: "Toda a grade programática do curso do Estratégia Concursos já vem pré-configurada na plataforma. Você tem o controle individualizado do status de cada aula de cada uma das disciplinas (sabendo se já concluiu a leitura do PDF, se está assistindo aos vídeos ou se a aula ainda não foi iniciada).",
      bullets: [
        "Checklist completo de aulas do edital",
        "Status coloridos de fácil escaneamento visual",
        "Acoplado às horas estudadas por aula"
      ]
    },
    {
      id: "simulados",
      badge: "Prevenção do Esquecimento",
      title: "Revisões Espaçadas & Histórico de Simulados",
      desc: "O agendamento científico de revisões (24 horas, 7 dias e 30 dias) é criado de forma 100% automatizada pelo aplicativo assim que você encerra uma sessão de teoria. Em paralelo, a ferramenta permite registrar os seus resultados em simulados autorais ou de cursinhos, monitorando a evolução de notas sob a régua rígida exigida pelas principais bancas examinadoras.",
      bullets: [
        "Automação completa das datas de revisão",
        "Gráficos de evolução de aproveitamento na banca",
        "Gestão inteligente da curva de esquecimento"
      ]
    },
    {
      id: "ia-coach",
      badge: "Inteligência Artificial Ativa",
      title: "IA Tutor Coach Exclusiva",
      desc: "Equipado com Inteligência Artificial (Gemini), o Tutor Coach analisa silenciosamente o seu histórico de desempenho e o seu diário de erros. Ele gera automaticamente diagnósticos profundos identificando as disciplinas fracas e prescreve o plano de ação exato que você deve seguir na próxima semana.",
      bullets: [
        "Diagnósticos detalhados por assunto",
        "Detecção proativa de fraquezas de estudo",
        "Planos semanais práticos para acelerar pontos"
      ]
    }
  ],
  methodologyTitle: "Como a Engenharia de Estudos Te Ajuda",
  methodologySubtitle: "Esqueça horários de estudo engessados e planilhas manuais que desatualizam. Nosso motor coordena ciclos dinâmicos baseados no peso das disciplinas do edital.",
  methodologyCards: [
    {
      title: "1. Configuração do Edital",
      desc: "Você define a importância e o peso de cada uma das disciplinas exigidas para o seu concurso. Informe quantas horas por semana você tem livres para estudar e o motor adaptativo calcula as metas individuais de carga horária para cada matéria automaticamente."
    },
    {
      title: "2. Ciclos Dinâmicos de Estudo",
      desc: "Em vez de definir \"Direito na Segunda às 14h\", você estuda por meio de uma fila circular inteligente. Quando você termina de estudar uma matéria no cronômetro, ela passa para o fim da fila e a próxima assume a prioridade. Seu estudo nunca para se você perder um dia específico da semana."
    },
    {
      title: "3. Cronograma Semanal Ajustado",
      desc: "Para manter uma rotina saudável, integramos o ciclo dinâmico com um cronograma semanal de distribuição. A plataforma distribui as metas calculadas ao longo dos dias ativos que você escolheu, combinando a flexibilidade da fila com a disciplina de um cronograma tradicional."
    }
  ],
  plans: [
    { 
      name: "Plano Mensal", 
      price: "R$ 29,90", 
      period: "por mês", 
      popular: false,
      features: [
        "Acesso completo ao ciclo de estudos",
        "Cronômetro de foco e log",
        "Gabarito inteligente sem limites",
        "Sincronização em nuvem (Supabase)"
      ] 
    },
    { 
      name: "Plano Gold Premium", 
      price: "R$ 19,90", 
      period: "por mês (promocional)", 
      popular: true,
      features: [
        "Tudo do plano básico",
        "Diagnósticos com Inteligência Artificial ilimitados",
        "Relatórios de fraquezas por disciplina",
        "Suporte prioritário por email",
        "Salvar chaves personalizadas no perfil"
      ] 
    },
    { 
      name: "Plano Anual", 
      price: "R$ 179,90", 
      period: "por ano (economia de 50%)", 
      popular: false,
      features: [
        "Acesso completo por 12 meses",
        "Todos os recursos da IA Tutor Coach",
        "Garantia de atualização pós-edital",
        "Importação/Exportação física de backups"
      ] 
    }
  ]
};

export function mergeCmsContent(dbContent: any): typeof DEFAULT_CMS_CONTENT {
  if (!dbContent) return DEFAULT_CMS_CONTENT;
  return {
    promoBanner: typeof dbContent.promoBanner === 'string' ? dbContent.promoBanner : DEFAULT_CMS_CONTENT.promoBanner,
    heroTitle: typeof dbContent.heroTitle === 'string' ? dbContent.heroTitle : DEFAULT_CMS_CONTENT.heroTitle,
    heroSubtitle: typeof dbContent.heroSubtitle === 'string' ? dbContent.heroSubtitle : DEFAULT_CMS_CONTENT.heroSubtitle,
    heroBtnText: typeof dbContent.heroBtnText === 'string' ? dbContent.heroBtnText : DEFAULT_CMS_CONTENT.heroBtnText,
    features: Array.isArray(dbContent.features) ? dbContent.features.map((f: any, i: number) => ({
      title: f?.title ?? DEFAULT_CMS_CONTENT.features[i]?.title ?? '',
      desc: f?.desc ?? DEFAULT_CMS_CONTENT.features[i]?.desc ?? ''
    })) : DEFAULT_CMS_CONTENT.features,
    sections: Array.isArray(dbContent.sections) ? dbContent.sections.map((s: any, i: number) => {
      const defSec = DEFAULT_CMS_CONTENT.sections[i] || { id: '', badge: '', title: '', desc: '', bullets: [] };
      return {
        id: s?.id ?? defSec.id,
        badge: s?.badge ?? defSec.badge,
        title: s?.title ?? defSec.title,
        desc: s?.desc ?? defSec.desc,
        bullets: Array.isArray(s?.bullets) ? s.bullets.map((b: any, j: number) => b ?? defSec.bullets[j] ?? '') : defSec.bullets
      };
    }) : DEFAULT_CMS_CONTENT.sections,
    methodologyTitle: typeof dbContent.methodologyTitle === 'string' ? dbContent.methodologyTitle : DEFAULT_CMS_CONTENT.methodologyTitle,
    methodologySubtitle: typeof dbContent.methodologySubtitle === 'string' ? dbContent.methodologySubtitle : DEFAULT_CMS_CONTENT.methodologySubtitle,
    methodologyCards: Array.isArray(dbContent.methodologyCards) ? dbContent.methodologyCards.map((c: any, i: number) => ({
      title: c?.title ?? DEFAULT_CMS_CONTENT.methodologyCards[i]?.title ?? '',
      desc: c?.desc ?? DEFAULT_CMS_CONTENT.methodologyCards[i]?.desc ?? ''
    })) : DEFAULT_CMS_CONTENT.methodologyCards,
    plans: Array.isArray(dbContent.plans) ? dbContent.plans.map((p: any, i: number) => {
      const defPlan = DEFAULT_CMS_CONTENT.plans[i] || { name: '', price: '', period: '', popular: false, features: [] };
      return {
        name: p?.name ?? defPlan.name,
        price: p?.price ?? defPlan.price,
        period: p?.period ?? defPlan.period,
        popular: typeof p?.popular === 'boolean' ? p.popular : defPlan.popular,
        features: Array.isArray(p?.features) ? p.features : defPlan.features
      };
    }) : DEFAULT_CMS_CONTENT.plans
  };
}

export default function Homepage({ onLoginClick, cmsContent }: HomepageProps) {
  const content = mergeCmsContent(cmsContent);
  
  // Estado para tornar o gabarito do showroom clicável e divertido para o usuário testar!
  const [mockGabarito, setMockGabarito] = useState<('neutro' | 'acerto' | 'erro')[]>([
    'acerto', 'erro', 'acerto', 'neutro', 'acerto', 'neutro', 'erro', 'neutro', 'acerto', 'neutro', 'neutro', 'neutro'
  ]);

  const handleToggleMockQuestao = (index: number) => {
    const updated = [...mockGabarito];
    if (updated[index] === 'neutro') updated[index] = 'acerto';
    else if (updated[index] === 'acerto') updated[index] = 'erro';
    else updated[index] = 'neutro';
    setMockGabarito(updated);
  };

  return (
    <div className="min-h-screen bg-[#0C0E12] text-[#E2E8F0] flex flex-col font-sans antialiased">
      {/* 1. Promo Ribbon */}
      {content.promoBanner && (
        <div className="bg-[#C5A059] text-black text-center text-xs py-2 font-bold px-4 tracking-wide z-50">
          {content.promoBanner}
        </div>
      )}

      {/* 2. Top Header Nav */}
      <header className="bg-[#0F172A]/85 backdrop-blur-md border-b border-[#1E293B] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4.5 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-[#1E293B] border border-[#C5A059] text-[#C5A059] rounded flex items-center justify-center shadow-md">
              <Shield size={22} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-bold tracking-wider leading-none text-[#C5A059]">SuperEstrategico</h1>
                <span className="text-[8px] bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase font-mono">
                  SaaS Premium
                </span>
              </div>
              <p className="text-[9px] text-[#64748B] uppercase tracking-[0.22em] font-sans mt-0.5 hidden sm:block">
                Controle de Estudos para Concursos
              </p>
            </div>
          </div>

          {/* Login Action */}
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded text-xs font-extrabold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            Entrar no Painel
          </button>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 border-b border-[#1E293B]/60 bg-radial-gradient">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(197,160,89,0.02)_1px,transparent_1px)] bg-[size:100%_40px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1E293B] border border-[#C5A059]/30 rounded-full text-xs text-[#C5A059] font-mono tracking-wider">
            <Sparkles size={13} /> Planejamento de Estudos para Concursos
          </div>
          
          <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-white leading-tight">
            {content.heroTitle}
          </h2>
          
          <p className="text-base md:text-lg text-[#94A3B8] max-w-3xl mx-auto leading-relaxed font-sans">
            {content.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button
              onClick={onLoginClick}
              className="px-8 py-4 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-extrabold rounded text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg shadow-[#C5A059]/10"
            >
              <Play size={16} fill="black" />
              {content.heroBtnText}
            </button>
            <a
              href="#precos"
              className="px-8 py-4 bg-[#1E293B] hover:bg-[#1E293B]/80 text-white font-bold border border-[#2D3748] rounded text-sm tracking-wider uppercase flex items-center justify-center transition-colors"
            >
              Ver Planos de Assinatura
            </a>
          </div>
        </div>
      </section>


      {/* =========================================================================
          4. SEÇÕES DETALHADAS E ESPAÇADAS DA PLATAFORMA (NOVO)
          ========================================================================= */}

      {/* SEÇÃO 1: PAINEL GERAL (DASHBOARD METRICAS) - Direita: Mockup */}
      <section className="py-24 bg-[#080A0D] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Texto Explicativo (Esquerda) */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[0]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[0]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[0]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[0]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup do Dashboard (Direita) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/painel-geral
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Total Estudado</span>
                  <span className="text-xl font-bold text-white font-mono block mt-1">142h 15m</span>
                  <span className="text-[8px] text-emerald-400 font-mono block mt-1">📈 Ativo</span>
                </div>
                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Questões Feitas</span>
                  <span className="text-xl font-bold text-white font-mono block mt-1">1.840</span>
                  <span className="text-[8px] text-[#C5A059] font-mono block mt-1">Geral / Bancas</span>
                </div>
                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Aproveitamento</span>
                  <span className="text-xl font-bold text-[#C5A059] font-mono block mt-1">82.4%</span>
                  <span className="text-[8px] text-emerald-400 font-mono block mt-1">Meta: 90%</span>
                </div>
              </div>

              <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">Cobertura do Edital</span>
                  <span className="font-mono text-[#C5A059]">48% Concluído</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C5A059] h-full rounded-full" style={{ width: '48%' }} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SEÇÃO 2: CICLOS DE ESTUDOS - Esquerda: Mockup, Direita: Texto */}
      <section className="py-24 bg-[#0C0E12] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Mockup do Ciclo (Esquerda no desktop, topo no mobile) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl order-last lg:order-first">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/ciclos
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-5">
              <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#E2E8F0]">Fila Sequencial: Ciclo 01</span>
                  <span className="font-mono text-[#C5A059]">65% Concluído</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C5A059] h-full rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-[#0F172A] border-2 border-[#C5A059] p-4 rounded text-center space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#C5A059] text-black font-extrabold text-[8px] uppercase px-1 py-0.5 tracking-wider font-mono">Foco</div>
                  <span className="text-xs bg-[#C5A059]/15 text-[#C5A059] px-2 py-0.5 rounded font-mono font-bold uppercase block">CONTR</span>
                  <h5 className="text-[11px] font-bold text-white pt-1 truncate">Controle Ext.</h5>
                  <p className="text-[9px] text-[#94A3B8]">Meta: 1h30</p>
                </div>

                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center space-y-2 opacity-80">
                  <span className="text-xs bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded font-mono uppercase block">CONST</span>
                  <h5 className="text-[11px] font-bold text-white pt-1 truncate">Constitucional</h5>
                  <p className="text-[9px] text-[#64748B]">Meta: 2h00</p>
                </div>

                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center space-y-2 opacity-80">
                  <span className="text-xs bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded font-mono uppercase block">AUDI</span>
                  <h5 className="text-[11px] font-bold text-white pt-1 truncate">Auditoria</h5>
                  <p className="text-[9px] text-[#64748B]">Meta: 1h30</p>
                </div>

                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center space-y-2 opacity-80">
                  <span className="text-xs bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded font-mono uppercase block">ESTAT</span>
                  <h5 className="text-[11px] font-bold text-white pt-1 truncate">Estatística</h5>
                  <p className="text-[9px] text-[#64748B]">Meta: 1h00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Texto Explicativo (Direita) */}
          <div className="lg:col-span-5 space-y-6 order-first lg:order-last">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[1]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[1]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[1]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[1]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* SEÇÃO 3: CRONÔMETRO & GABARITO - Direita: Mockup */}
      <section className="py-24 bg-[#080A0D] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Texto Explicativo (Esquerda) */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[2]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[2]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[2]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[2]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup do Gabarito (Direita) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/estudo-ativo
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Timer Mock */}
                <div className="md:col-span-5 bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center space-y-3">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Foco da Sessão</span>
                  <span className="text-2xl font-mono text-white font-bold block">00:<span className="text-[#C5A059] animate-pulse">42</span>:18</span>
                  <div className="flex justify-center gap-1.5">
                    <button className="p-1.5 bg-[#1E293B] border border-[#2D3748] rounded text-[#64748B]"><RotateCcw size={12} /></button>
                    <button className="px-3 py-1 bg-[#C5A059] text-black text-[10px] font-extrabold uppercase rounded">Pausar</button>
                  </div>
                </div>

                {/* Gabarito Mock */}
                <div className="md:col-span-7 bg-[#0C0E12] border border-[#1E293B] p-4 rounded space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#64748B]">
                    <span className="font-bold text-[#94A3B8]">Gabarito Rápido</span>
                    <span className="text-emerald-400">OK: {mockGabarito.filter(v => v === 'acerto').length}</span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {mockGabarito.map((status, index) => (
                      <button
                        key={index}
                        onClick={() => handleToggleMockQuestao(index)}
                        className={`py-1.5 rounded font-mono text-[10px] font-bold transition-all border flex flex-col items-center justify-center cursor-pointer ${
                          status === 'acerto'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : status === 'erro'
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                            : 'bg-[#1E293B]/60 border-[#2D3748] text-[#94A3B8] hover:border-[#C5A059]/40'
                        }`}
                      >
                        <span>{(index + 1).toString().padStart(2, '0')}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-[#64748B] text-center italic">
                    💡 Clique nos botões para testar a interatividade do gabarito!
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SEÇÃO 4: CRONOGRAMA SEMANAL - Esquerda: Mockup, Direita: Texto */}
      <section className="py-24 bg-[#0C0E12] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Mockup do Cronograma (Esquerda) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl order-last lg:order-first">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/planejamento
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                {[
                  { dia: 'Seg', m1: 'CONTR', h1: '2h', m2: 'CONST', h2: '2h' },
                  { dia: 'Ter', m1: 'AUDI', h1: '2.5h', m2: 'PORT', h2: '1.5h' },
                  { dia: 'Qua', m1: 'DIREIT', h1: '2h', m2: 'CONTAB', h2: '2h' },
                  { dia: 'Qui', m1: 'AFO', h1: '3h', m2: 'INGL', h2: '1h' },
                  { dia: 'Sex', m1: 'ESTAT', h1: '2.5h', m2: 'CONST', h2: '1.5h' },
                  { dia: 'Sáb', m1: 'SIMUL', h1: '4h', m2: 'REVIS', h2: '1h' },
                  { dia: 'Dom', m1: 'REVIS', h2: '2h', m2: 'FOLGA', h1: '' }
                ].map((item, index) => (
                  <div key={index} className="bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-center space-y-1">
                    <span className="text-[9px] text-[#C5A059] font-bold uppercase font-mono block">{item.dia}</span>
                    <div className="space-y-1">
                      {item.m1 && (
                        <div className="bg-[#1E293B] text-white text-[8px] font-bold p-1 rounded font-mono">
                          {item.m1} <span className="text-[#C5A059] font-normal">{item.h1}</span>
                        </div>
                      )}
                      {item.m2 && (
                        <div className="bg-[#1E293B]/50 text-[#94A3B8] text-[8px] font-bold p-1 rounded font-mono">
                          {item.m2} <span className="text-[#C5A059] font-normal">{item.h2}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Texto Explicativo (Direita) */}
          <div className="lg:col-span-5 space-y-6 order-first lg:order-last">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[3]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[3]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[3]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[3]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* SEÇÃO 5: MATERIAL ESTRATÉGIA (EDITAL) - Direita: Mockup */}
      <section className="py-24 bg-[#080A0D] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Texto Explicativo (Esquerda) */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[4]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[4]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[4]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[4]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup do Checklist (Direita) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/cursos
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-3">
              <div className="bg-[#0C0E12] border border-[#1E293B] rounded overflow-hidden">
                <div className="bg-[#1E293B]/40 p-3 flex justify-between items-center text-xs font-bold text-[#E2E8F0] font-mono">
                  <span>Direito Constitucional (CONST)</span>
                  <span className="text-[#C5A059] font-normal text-[10px]">2 de 4 Aulas Concluídas</span>
                </div>

                <div className="p-3 divide-y divide-[#1E293B]/60 text-xs">
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[#E2E8F0]">Aula 00: Direitos Fundamentais</span>
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold">Concluído</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[#E2E8F0]">Aula 01: Organização do Estado</span>
                    <span className="bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] px-2 py-0.5 rounded text-[9px] font-bold">Lendo PDF</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[#E2E8F0]">Aula 02: Poder Legislativo & Controle</span>
                    <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded text-[9px] font-bold">Assistindo Vídeo</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[#E2E8F0]">Aula 03: Fiscalização Contábil & Fin.</span>
                    <span className="bg-[#1E293B] text-[#64748B] px-2 py-0.5 rounded text-[9px]">Não Iniciado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SEÇÃO 6: SIMULADOS & REVISÕES - Esquerda: Mockup, Direita: Texto */}
      <section className="py-24 bg-[#0C0E12] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Mockup do Histórico de Simulados (Esquerda) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl order-last lg:order-first">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/revisoes-simulados
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Simulados Card */}
                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded space-y-3">
                  <h5 className="text-[10px] font-bold text-white border-b border-[#1E293B]/60 pb-1.5 uppercase tracking-wider font-mono">Histórico de Simulados</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Simulado 01</span>
                      <span className="font-mono text-emerald-400 font-bold">82.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Simulado 02</span>
                      <span className="font-mono text-emerald-400 font-bold">85.0% 📈</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Simulado 03 (Concurso Anterior)</span>
                      <span className="font-mono text-amber-500 font-bold">78.5%</span>
                    </div>
                  </div>
                </div>

                {/* Revisoes Card */}
                <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded space-y-3">
                  <h5 className="text-[10px] font-bold text-white border-b border-[#1E293B]/60 pb-1.5 uppercase tracking-wider font-mono">Próximas Revisões</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-[#94A3B8] truncate flex-1">Revisão 24h: CONTR - Aula 03</span>
                      <span className="text-[9px] text-amber-400 font-mono">Amanhã</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] shrink-0" />
                      <span className="text-[#94A3B8] truncate flex-1">Revisão 7d: CONST - Aula 01</span>
                      <span className="text-[9px] text-[#64748B] font-mono">Em 3 dias</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] shrink-0" />
                      <span className="text-[#94A3B8] truncate flex-1">Revisão 30d: PORT - Aula 00</span>
                      <span className="text-[9px] text-[#64748B] font-mono">Em 8 dias</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Texto Explicativo (Direita) */}
          <div className="lg:col-span-5 space-y-6 order-first lg:order-last">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[5]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[5]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[5]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[5]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* SEÇÃO 7: IA TUTOR COACH - Direita: Mockup */}
      <section className="py-24 bg-[#080A0D] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Texto Explicativo (Esquerda) */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase block">
              {content.sections[6]?.badge}
            </span>
            <h3 className="text-3xl font-display font-bold text-white leading-tight">
              {content.sections[6]?.title}
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {content.sections[6]?.desc}
            </p>
            <ul className="space-y-3 text-xs text-[#E2E8F0] font-mono">
              {content.sections[6]?.bullets?.map((bullet: string, idx: number) => bullet && (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#C5A059]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup da IA (Direita) */}
          <div className="lg:col-span-7 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0A0C10] border-b border-[#1E293B] px-4 py-3 flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
              <div className="bg-[#1E293B] text-[#64748B] text-[10px] px-8 py-0.5 rounded font-mono truncate">
                superestrategico.com/ia-coach
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-4">
              <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#1E293B]/60 pb-2 text-[9px] text-[#64748B] uppercase font-mono">
                  <span>Análise de Fraquezas</span>
                  <span>•</span>
                  <span className="text-emerald-400">Pronto para Enviar Plano</span>
                </div>

                <div className="space-y-3 text-[11px] leading-relaxed text-[#94A3B8]">
                  <p>
                    Olá! Com base nos dados acumulados de seus estudos e simulados do Estratégia, detectei uma vulnerabilidade crítica em <strong className="text-white">Auditoria Governamental (Tema: Normas da INTOSAI e ISSAI)</strong>. Sua taxa de acertos atual é de <span className="text-rose-400 font-bold font-mono">62%</span>, enquanto a nota de corte estimada está em <span className="text-[#C5A059] font-bold font-mono">88%</span>.
                  </p>
                  
                  <div className="bg-[#0F172A] border border-[#C5A059]/20 p-3.5 rounded text-[11px] space-y-2 text-[#E2E8F0]">
                    <h5 className="font-bold text-[#C5A059] uppercase tracking-wider text-[10px]">📋 Plano de Ação Recomendado:</h5>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Foque no estudo da teoria (PDF) da Aula 02 de Auditoria antes de avançar o ciclo.</li>
                      <li>Execute um lote isolado de 25 questões da banca do concurso filtrado por "Normas Internacionais".</li>
                      <li>Agendei uma revisão automática reforçada no seu painel para daqui a 3 dias.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          FIM DAS SEÇÕES DETALHADAS
          ========================================================================= */}


      {/* 5. SEÇÃO EXPLICATIVA: COMO FUNCIONA A METODOLOGIA (Instruções Adicionais) */}
      <section className="py-20 bg-[#0C0E12] border-b border-[#1E293B]/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(197,160,89,0.01)_1px,transparent_1px)] bg-[size:40px_100%] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 space-y-16 relative z-10">
          
          <div className="text-center space-y-3">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase">Metodologia Científica</span>
            <h3 className="text-2xl md:text-4xl font-display font-bold text-white">{content.methodologyTitle}</h3>
            <p className="text-xs md:text-sm text-[#94A3B8] max-w-2xl mx-auto">
              {content.methodologySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Pilar 1 */}
            <div className="bg-[#0F172A]/80 border border-[#1E293B] p-7 rounded space-y-4 hover:border-[#C5A059]/20 transition-colors">
              <div className="w-12 h-12 rounded bg-[#1E293B] border border-[#C5A059]/20 text-[#C5A059] flex items-center justify-center shadow-md">
                <BookOpen size={20} />
              </div>
              <h4 className="text-base font-bold text-white uppercase tracking-wider font-display">{content.methodologyCards[0]?.title}</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
                {content.methodologyCards[0]?.desc}
              </p>
              <div className="pt-2 text-[10px] text-[#64748B] font-mono flex items-center gap-1.5">
                <Check size={12} className="text-[#C5A059]" /> Totalmente personalizado
              </div>
            </div>

            {/* Pilar 2 */}
            <div className="bg-[#0F172A]/80 border border-[#1E293B] p-7 rounded space-y-4 hover:border-[#C5A059]/20 transition-colors">
              <div className="w-12 h-12 rounded bg-[#1E293B] border border-[#C5A059]/20 text-[#C5A059] flex items-center justify-center shadow-md">
                <Layers size={20} />
              </div>
              <h4 className="text-base font-bold text-white uppercase tracking-wider font-display">{content.methodologyCards[1]?.title}</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
                {content.methodologyCards[1]?.desc}
              </p>
              <div className="pt-2 text-[10px] text-[#64748B] font-mono flex items-center gap-1.5">
                <Check size={12} className="text-[#C5A059]" /> Flexibilidade e produtividade
              </div>
            </div>

            {/* Pilar 3 */}
            <div className="bg-[#0F172A]/80 border border-[#1E293B] p-7 rounded space-y-4 hover:border-[#C5A059]/20 transition-colors">
              <div className="w-12 h-12 rounded bg-[#1E293B] border border-[#C5A059]/20 text-[#C5A059] flex items-center justify-center shadow-md">
                <Sparkles size={20} />
              </div>
              <h4 className="text-base font-bold text-white uppercase tracking-wider font-display">{content.methodologyCards[2]?.title}</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
                {content.methodologyCards[2]?.desc}
              </p>
              <div className="pt-2 text-[10px] text-[#64748B] font-mono flex items-center gap-1.5">
                <Check size={12} className="text-[#C5A059]" /> Otimização de tempo extrema
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Features Bento Grid */}
      <section className="py-20 bg-[#0A0C10] border-b border-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase">Funcionalidades</span>
            <h3 className="text-2xl md:text-4xl font-display font-bold text-white">Arquitetura de Alta Performance para Concursos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(content.features || []).map((feature: any, idx: number) => (
              <div 
                key={idx}
                className="bg-[#0F172A] border border-[#1E293B] p-6 rounded hover:border-[#C5A059]/30 transition-all duration-300 flex flex-col space-y-3"
              >
                <div className="w-10 h-10 rounded bg-[#1E293B] border border-[#C5A059]/20 text-[#C5A059] flex items-center justify-center shadow-inner">
                  {idx === 0 && <Layers size={18} />}
                  {idx === 1 && <Play size={18} />}
                  {idx === 2 && <Sparkles size={18} />}
                  {idx === 3 && <Award size={18} />}
                </div>
                <h4 className="text-sm font-display font-bold text-white uppercase tracking-wider">{feature.title}</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed font-sans flex-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Pricing Section */}
      <section id="precos" className="py-20 max-w-7xl mx-auto px-4 space-y-16">
        <div className="text-center space-y-2">
          <span className="text-xs text-[#C5A059] font-mono tracking-widest uppercase">Planos Disponíveis</span>
          <h3 className="text-2xl md:text-4xl font-display font-bold text-white">Escolha sua Rota para a Aceleração de Resultados</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {(content.plans || []).map((plan: any, idx: number) => (
            <div 
              key={idx}
              className={`bg-[#0F172A] border rounded p-8 flex flex-col space-y-6 relative transition-all duration-300 ${
                plan.popular 
                  ? 'border-[#C5A059] shadow-xl shadow-[#C5A059]/5 lg:scale-105 z-10' 
                  : 'border-[#1E293B] hover:border-[#C5A059]/30'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C5A059] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-sm shadow-md">
                  Mais Recomendado
                </span>
              )}

              <div className="space-y-2">
                <h4 className="text-base font-display font-bold text-white uppercase tracking-wider">{plan.name}</h4>
                <div className="flex items-baseline gap-1.5 pt-2">
                  <span className="text-3xl md:text-4xl font-display font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-[#64748B] font-mono">/ {plan.period}</span>
                </div>
              </div>

              <button
                onClick={onLoginClick}
                className={`w-full py-3.5 rounded text-xs font-extrabold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-md ${
                  plan.popular 
                    ? 'bg-[#C5A059] hover:bg-[#C5A059]/90 text-black' 
                    : 'bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#E2E8F0] border border-[#2D3748]'
                }`}
              >
                Assinar Agora
              </button>

              <div className="border-t border-[#1E293B]/60 pt-6 flex-1">
                <ul className="space-y-3.5 text-xs text-[#94A3B8] font-sans">
                  {plan.features.map((feat: string, fIdx: number) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className="text-[#C5A059] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-[#0A0C10] border-t border-[#1E293B] text-[#64748B] py-12 text-center text-xs shrink-0 font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <p className="font-serif italic text-[#C5A059] text-base font-semibold tracking-wide">
            Plataforma de Alta Performance para Alunos do Estratégia Concursos
          </p>
          <p className="font-normal text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            Metodologia focada na aceleração de revisões, gestão de ciclo de estudos adaptativa e laudos diagnósticos automáticos integrados com o portal de cursos.
          </p>
          <p className="font-mono text-[9px] text-[#64748B] pt-4 border-t border-[#1E293B]/40 max-w-md mx-auto">
            © 2026 SuperEstrategico Planner SaaS. Direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
