import React, { useState, useEffect } from 'react';
import { Materia, LogSessao } from '../types';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Percent, 
  ThumbsUp, 
  HelpCircle,
  Calendar,
  Hourglass,
  Gauge,
  RotateCcw,
  Sliders,
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
  ArrowLeft,
  Search,
  Filter
} from 'lucide-react';

interface StatsProps {
  materias: Materia[];
  historico: LogSessao[];
  onSelectMateria: (materiaId: string) => void;
}

export default function DashboardStats({ materias, historico, onSelectMateria }: StatsProps) {
  // --- 1. ESTADOS DO TIMER DA PROVA & PROJEÇÃO ---
  const [dataProva, setDataProva] = useState<string>(() => {
    return localStorage.getItem('tcu_data_prova') || '2026-10-18T13:00:00';
  });
  const [showEditDate, setShowEditDate] = useState(false);
  const [tempDate, setTempDate] = useState(dataProva.split('T')[0]);
  const [countdownStr, setCountdownStr] = useState('');
  
  // Meta de aulas concluídas por semana para simulação (padrão: 6 aulas)
  const [metaAulasSemana, setMetaAulasSemana] = useState<number>(() => {
    const saved = localStorage.getItem('tcu_meta_aulas_semana');
    return saved ? parseInt(saved) : 6;
  });

  // --- ESTADOS DO HISTÓRICO EXPANDIDO ---
  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);
  const [abaHistorico, setAbaHistorico] = useState<'semanas' | 'materias' | 'logs'>('semanas');
  const [materiaFiltro, setMateriaFiltro] = useState<string>('all');
  const [tipoFiltro, setTipoFiltro] = useState<string>('all');

  // Atualizar contagem regressiva ao vivo
  useEffect(() => {
    const tick = () => {
      const probe = new Date(dataProva);
      const agora = new Date();
      const diff = probe.getTime() - agora.getTime();

      if (diff <= 0) {
        setCountdownStr('PROVA EM ANDAMENTO / CONCLUÍDA');
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownStr(`${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dataProva]);

  const handleSalvarNovaData = () => {
    const novaDataComHora = `${tempDate}T13:00:00`;
    setDataProva(novaDataComHora);
    localStorage.setItem('tcu_data_prova', novaDataComHora);
    setShowEditDate(false);
  };

  const handleSalvarMetaAulas = (val: number) => {
    setMetaAulasSemana(val);
    localStorage.setItem('tcu_meta_aulas_semana', val.toString());
  };

  // --- 2. CÁLCULO DE ESTATÍSTICAS GERAIS ---
  let totalHoras = 0;
  let totalQuestoes = 0;
  let totalAcertos = 0;
  let totalErros = 0;

  // Total de aulas e concluídas
  let totalAulas = 0;
  let concluidasAulas = 0;

  const materiasPerformance = materias.map(m => {
    let horas = 0;
    let questoes = 0;
    let acertos = 0;
    let erros = 0;
    
    m.aulas.forEach(a => {
      totalAulas++;
      if (a.status === 'Concluído') concluidasAulas++;
      
      questoes += (a.questoesResolvidas || 0);
      acertos += (a.questoesAcertadas || 0);
      erros += (a.questoesErradas || 0);
      horas += (a.horasEstudadas || 0);
    });

    const histMateria = historico.filter(h => h.materiaId === m.id);
    const mHorasHist = histMateria.reduce((acc, curr) => acc + (curr.duracaoMinutos / 60), 0);
    const mQuestHist = histMateria.reduce((acc, curr) => acc + (curr.questoesResolvidas || 0), 0);
    const mAcertHist = histMateria.reduce((acc, curr) => acc + (curr.questoesAcertadas || 0), 0);
    const mErrHist = histMateria.reduce((acc, curr) => acc + (curr.questoesErradas || 0), 0);

    return {
      id: m.id,
      nome: m.nome,
      sigla: m.sigla,
      cor: m.cor,
      horas: Math.max(horas, mHorasHist),
      questoes: Math.max(questoes, mQuestHist),
      acertos: Math.max(acertos, mAcertHist),
      erros: Math.max(erros, mErrHist),
      aulasQuantidade: m.aulas.length,
      aulasConcluidas: m.aulas.filter(a => a.status === 'Concluído').length,
      // Contagem de ciclos da matéria (mínimo de estudos/revisões entre todas as aulas)
      ciclosContagem: m.aulas.length > 0
        ? Math.min(...m.aulas.map(aula => histMateria.filter(h => h.aulaId === aula.id).length))
        : 0
    };
  });

  materiasPerformance.forEach(m => {
    totalHoras += m.horas;
    totalQuestoes += m.questoes;
    totalAcertos += m.acertos;
    totalErros += m.erros;
  });

  const percentualGeralAcertos = totalQuestoes > 0 
    ? Math.round((totalAcertos / totalQuestoes) * 100) 
    : 0;

  const percentualEdital = totalAulas > 0 
    ? Math.round((concluidasAulas / totalAulas) * 100) 
    : 0;

  // --- 3. REPARTIÇÃO INTEGRAL DE TEMPO (Hoje, Semana, Mês) ---
  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

  let horasHoje = 0;
  let horasSemana = 0;
  let horasMes = 0;

  let questoesHoje = 0;
  let acertosHoje = 0;
  let questoesSemana = 0;
  let acertosSemana = 0;

  historico.forEach(log => {
    const dataLog = new Date(log.data);
    const logH = log.duracaoMinutos / 60;
    
    // Hoje
    if (log.data.substring(0, 10) === hojeStr) {
      horasHoje += logH;
      questoesHoje += log.questoesResolvidas;
      acertosHoje += log.questoesAcertadas;
    }
    // Semana (últimos 7 dias)
    if (dataLog >= seteDiasAtras) {
      horasSemana += logH;
      questoesSemana += log.questoesResolvidas;
      acertosSemana += log.questoesAcertadas;
    }
    // Mês (últimos 30 dias)
    if (dataLog >= trintaDiasAtras) {
      horasMes += logH;
    }
  });

  const percentualAcertosSemana = questoesSemana > 0 ? Math.round((acertosSemana / questoesSemana) * 100) : 0;

  // --- 4. VELOCIDADE DE CONCLUSÃO DO EDITAL (REAL VS SIMULADO) ---
  // Aulas concluídas nos últimos 7 dias
  let concluidoNaSemanaReal = 0;
  materias.forEach(m => {
    m.aulas.forEach(a => {
      if (a.status === 'Concluído' && a.dataConclusao) {
        const cDate = new Date(a.dataConclusao);
        if (cDate >= seteDiasAtras) {
          concluidoNaSemanaReal++;
        }
      }
    });
  });

  const aulasRestantes = Math.max(0, totalAulas - concluidasAulas);

  // Projeção baseada em Ritmo Real dos últimos 7 dias
  const semanasFaltantesReal = concluidoNaSemanaReal > 0 ? (aulasRestantes / concluidoNaSemanaReal) : 0;
  const mesesFaltantesReal = semanasFaltantesReal / 4.345;
  const dataEstimadaEditalReal = new Date();
  if (semanasFaltantesReal > 0) {
    dataEstimadaEditalReal.setDate(dataEstimadaEditalReal.getDate() + Math.round(semanasFaltantesReal * 7));
  }

  // Projeção baseada em Ritmo Simulado
  const semanasFaltantesSimulado = metaAulasSemana > 0 ? (aulasRestantes / metaAulasSemana) : 0;
  const mesesFaltantesSimulado = semanasFaltantesSimulado / 4.345;
  const dataEstimadaEditalSimulado = new Date();
  if (semanasFaltantesSimulado > 0) {
    dataEstimadaEditalSimulado.setDate(dataEstimadaEditalSimulado.getDate() + Math.round(semanasFaltantesSimulado * 7));
  }

  // Seleção ativa para exibição geral (usa velocidade real se houver progresso, senão simulação)
  const usandoRitmoReal = concluidoNaSemanaReal > 0;
  const semanasFaltantesProjecao = usandoRitmoReal ? semanasFaltantesReal : semanasFaltantesSimulado;
  const mesesFaltantesProjecao = usandoRitmoReal ? mesesFaltantesReal : mesesFaltantesSimulado;
  const dataEstimadaEdital = usandoRitmoReal ? dataEstimadaEditalReal : dataEstimadaEditalSimulado;

  // --- 5. ESTATÍSTICA DE CICLOS DO EDITAL COMPLETO ---
  // Um ciclo ideal do edital consiste em 17 disciplinas cicladas.
  // Podemos expressar que o edital foi "ciclado" à medida que as matérias tiveram logs associados.
  const totalGeralCiclosSessoes = historico.length;
  // Quantas vezes o edital completo foi ciclado (mínimo de ciclos entre todas as disciplinas)
  const vezesEditalCiclado = materiasPerformance.length > 0
    ? Math.min(...materiasPerformance.map(m => m.ciclosContagem))
    : 0;

  // Encontrar matérias mais vs menos cicladas e controle das não estudadas
  const performanceOrdenadaPorCiclos = [...materiasPerformance].sort((a, b) => b.ciclosContagem - a.ciclosContagem);
  const maisCiclada = performanceOrdenadaPorCiclos[0];
  const menosCiclada = performanceOrdenadaPorCiclos[performanceOrdenadaPorCiclos.length - 1];

  const materiasNaoSincronizadas = materiasPerformance.filter(m => m.ciclosContagem === 0);
  const numMateriasNaoSincronizadas = materiasNaoSincronizadas.length;

  // --- CÁLCULOS DO HISTÓRICO COMPLETO ---
  // Agrupar logs por semana (segunda a domingo)
  const logsPorSemana: { 
    [semanaStr: string]: { 
      logs: LogSessao[]; 
      inicio: Date; 
      fim: Date; 
      horasTotal: number;
      questoesResolvidas: number;
      questoesAcertadas: number;
      materiasEstudadas: { [materiaId: string]: { sessions: number; sigla: string; cor: string; nome: string } }
    } 
  } = {};

  historico.forEach(log => {
    // Tentar converter data
    const dateObj = new Date(log.data);
    if (isNaN(dateObj.getTime())) return;

    // Calcular o início da semana (segunda-feira)
    const diaSemana = dateObj.getDay();
    const diffParaSegunda = dateObj.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const segunda = new Date(dateObj);
    segunda.setDate(diffParaSegunda);
    segunda.setHours(0, 0, 0, 0);

    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    const f = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const semanaKey = `Semana de ${f(segunda)} a ${f(domingo)}`;

    if (!logsPorSemana[semanaKey]) {
      logsPorSemana[semanaKey] = {
        logs: [],
        inicio: segunda,
        fim: domingo,
        horasTotal: 0,
        questoesResolvidas: 0,
        questoesAcertadas: 0,
        materiasEstudadas: {}
      };
    }

    const item = logsPorSemana[semanaKey];
    item.logs.push(log);
    item.horasTotal += log.duracaoMinutos / 60;
    item.questoesResolvidas += log.questoesResolvidas || 0;
    item.questoesAcertadas += log.questoesAcertadas || 0;

    // Achar matéria
    const mat = materias.find(m => m.id === log.materiaId);
    if (mat) {
      if (!item.materiasEstudadas[log.materiaId]) {
        item.materiasEstudadas[log.materiaId] = {
          sessions: 0,
          sigla: mat.sigla,
          cor: mat.cor,
          nome: mat.nome
        };
      }
      item.materiasEstudadas[log.materiaId].sessions++;
    }
  });

  // Ordenar semanas decrescente
  const semanasGerais = Object.keys(logsPorSemana).sort((a, b) => {
    return logsPorSemana[b].inicio.getTime() - logsPorSemana[a].inicio.getTime();
  });

  // Filtro de logs brutos
  const logsFiltrados = historico.filter(log => {
    if (materiaFiltro !== 'all' && log.materiaId !== materiaFiltro) return false;
    if (tipoFiltro !== 'all' && log.tipo !== tipoFiltro) return false;
    return true;
  });

  // Se o histórico completo carregar, renderiza este painel dedicado imperial:
  if (mostrarHistoricoCompleto) {
    return (
      <div className="space-y-6 animate-editorial-node" id="historico-completo-root">
        {/* CABEÇALHO IMPERIAL DO HISTÓRICO */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded relative overflow-hidden" id="historico-header-imperial">
          <div className="absolute right-0 top-0 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button
              onClick={() => setMostrarHistoricoCompleto(false)}
              className="text-xs text-[#C5A059] hover:text-white bg-[#1E293B] border border-[#1E293B] hover:border-[#C5A059]/40 px-3 py-1.5 rounded transition-all flex items-center gap-2 cursor-pointer font-sans"
            >
              <ArrowLeft size={14} /> Voltar ao Cockpit Geral
            </button>
            <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-2.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
              Relatório Geral Retroativo
            </span>
          </div>

          <div className="mt-4">
            <h1 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
              <RotateCcw size={22} className="text-[#C5A059]" /> Histórico & Controle de Ciclos Completo
            </h1>
            <p className="text-xs text-[#94A3B8] max-w-3xl mt-1 leading-relaxed">
              Analise de forma agregada a evolução dos seus ciclos semanais do TCU. Controle o aproveitamento de questões por bloco, rastreie o cumprimento do edital por matéria e confira cada sessão retroativamente de forma sincronizada com o material Estratégia.
            </p>
          </div>

          {/* GRID DE STATS RESUMIDAS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-mono">Sessões Realizadas</span>
              <span className="text-sm font-bold text-white font-mono mt-1 block">{totalGeralCiclosSessoes} blocos</span>
              <span className="text-[9px] text-[#C5A059] mt-0.5 block">acumulado histórico</span>
            </div>
            
            <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-mono">Edital Completo Ciclado</span>
              <span className="text-sm font-bold text-[#C5A059] font-mono mt-1 block">{vezesEditalCiclado}x</span>
              <span className="text-[9px] text-[#94A3B8] mt-0.5 block">média das 17 disciplinas</span>
            </div>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-mono">Aproveitamento Médio</span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
                {percentualGeralAcertos > 0 ? `${percentualGeralAcertos}%` : 'N/A'}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">{totalQuestoes} Q resolvidas</span>
            </div>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded text-center border-l-2 border-l-[#C5A059]">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-mono">Carga Horária Acumulada</span>
              <span className="text-sm font-bold text-white font-mono mt-1 block">{totalHoras.toFixed(1)}h</span>
              <span className="text-[9px] text-emerald-500 mt-0.5 block">sessões de no máximo 90m</span>
            </div>
          </div>
        </div>

        {/* INTEGRATED TABS SELECTOR */}
        <div className="border-b border-[#1E293B] flex gap-2 overflow-x-auto pb-px" id="historico-tabs">
          <button
            onClick={() => setAbaHistorico('semanas')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${abaHistorico === 'semanas' ? 'border-[#C5A059] text-white bg-[#0F172A]' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
          >
            📅 Evolução por Semanas
          </button>
          
          <button
            onClick={() => setAbaHistorico('materias')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${abaHistorico === 'materias' ? 'border-[#C5A059] text-white bg-[#0F172A]' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
          >
            🧪 Ciclos por Disciplina
          </button>

          <button
            onClick={() => setAbaHistorico('logs')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${abaHistorico === 'logs' ? 'border-[#C5A059] text-white bg-[#0F172A]' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
          >
            📝 Histórico de Logs Individuais
          </button>
        </div>

        {/* TAB 1: EVOLUÇÃO POR SEMANAS */}
        {abaHistorico === 'semanas' && (
          <div className="space-y-4" id="aba-historico-semanas">
            <h3 className="text-xs font-display font-medium text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-[#C5A059]" /> Histórico de Estudos Agrupado por Semana
            </h3>
            
            {semanasGerais.length === 0 ? (
              <div className="bg-[#0F172A] border border-[#1E293B] p-8 rounded text-center">
                <p className="text-xs text-[#94A3B8]">Nenhuma sessão de estudo registrada até o momento.</p>
                <p className="text-[11px] text-[#64748B] mt-1">Abra o cronômetro no menu "Ciclo de Estudo" e realize sessões para registrar ciclos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {semanasGerais.map(weekStr => {
                  const item = logsPorSemana[weekStr];
                  const acertosPct = item.questoesResolvidas > 0 ? Math.round((item.questoesAcertadas / item.questoesResolvidas) * 100) : 0;
                  
                  return (
                    <div key={weekStr} className="bg-[#0F172A] border border-[#1E293B] p-5 rounded hover:border-[#C5A059]/35 transition-colors duration-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#1E293B]/60 pb-3 mb-4">
                        <div>
                          <h4 className="text-xs font-bold text-white font-mono">{weekStr}</h4>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            Período de segunda a domingo
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 font-mono text-[9px]">
                          <span className="bg-[#1E293B] text-slate-300 px-2 py-1 border border-[#2D3748] rounded">
                            ⏱️ {item.horasTotal.toFixed(1)}h líquidas
                          </span>
                          <span className="bg-[#1E293B] text-slate-300 px-2 py-1 border border-[#2D3748] rounded">
                            🔄 {item.logs.length} blocos focados
                          </span>
                          <span className="bg-[#1E293B] text-emerald-400 px-2 py-1 border border-emerald-500/20 rounded">
                            🎯 {item.questoesResolvidas} Q ({acertosPct}% acertos)
                          </span>
                        </div>
                      </div>

                      {/* DISCIPLINAS ESTUDADAS NA SEMANA */}
                      <div>
                        <h5 className="text-[10px] text-[#64748B] uppercase font-mono tracking-widest mb-2 font-bold">Matérias cicle-avançadas nesta Semana:</h5>
                        <div className="flex flex-wrap gap-2.5">
                          {Object.values(item.materiasEstudadas).map(matStudied => (
                            <div 
                              key={matStudied.sigla}
                              className="px-2.5 py-1.5 bg-[#0C0E12] border border-[#1E293B] hover:border-[#C5A059]/30 rounded flex items-center gap-2 text-xs font-mono transition-colors"
                              title={matStudied.nome}
                            >
                              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: matStudied.cor }} />
                              <span className="font-bold text-white">{matStudied.sigla}</span>
                              <span className="text-[#64748B] font-black bg-[#1E293B] px-1.5 py-0.5 rounded text-[9px]">
                                {matStudied.sessions}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CICLOS POR DISCIPLINA */}
        {abaHistorico === 'materias' && (
          <div className="space-y-4" id="aba-historico-materias">
            <h3 className="text-xs font-display font-medium text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#C5A059]" /> Estatísticas de Ciclos Detalhadas por Disciplina
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materiasPerformance.map(m => {
                const mPerc = m.questoes > 0 ? Math.round((m.acertos / m.questoes) * 100) : 0;
                // Filtrar logs e ordená-los por data decrescente
                const logsMateria = historico
                  .filter(l => l.materiaId === m.id)
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

                return (
                  <div key={m.id} className="bg-[#0F172A] border border-[#1E293B] p-5 rounded hover:border-[#C5A059]/35 transition-all">
                    {/* Linha superior */}
                    <div className="flex justify-between items-start gap-2 border-b border-[#1E293B]/60 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-black rounded text-white" style={{ backgroundColor: m.cor }}>
                            {m.sigla}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate max-w-[200px]">{m.nome}</h4>
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5 font-mono">
                          Progresso do Edital: <strong className="text-white">{m.aulasConcluidas}/{m.aulasQuantidade} aulas ({m.aulasQuantidade > 0 ? Math.round((m.aulasConcluidas / m.aulasQuantidade) * 100) : 0}%)</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/20 px-2 py-0.5 rounded">
                          {m.ciclosContagem}x Ciclos
                        </span>
                      </div>
                    </div>

                    {/* Resumão da performance */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-[#0C0E12] border border-[#1E293B]/60 p-2 rounded font-mono text-[10px] mb-4">
                      <div>
                        <span className="text-[#64748B] block text-[9px] uppercase tracking-wider">Líquidas</span>
                        <span className="text-white font-bold">{m.horas.toFixed(1)}h</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[9px] uppercase tracking-wider">Questões</span>
                        <span className="text-slate-300 font-bold">{m.questoes} Q</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[9px] uppercase tracking-wider">Precisão</span>
                        <span className={`font-bold ${mPerc >= 80 ? 'text-emerald-400' : 'text-amber-500'}`}>
                          {m.questoes > 0 ? `${mPerc}%` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Ciclos por Aula */}
                    <div className="mb-4">
                      <h5 className="text-[9px] font-mono font-bold text-[#64748B] mb-2 uppercase tracking-wide">Ciclos por Aula:</h5>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1 no-scrollbar">
                        {m.aulasQuantidade > 0 ? (
                          // Find default material corresponding to this performance subject to map over its actual structure
                          (() => {
                            const fullMateria = materias.find(x => x.id === m.id);
                            return (fullMateria?.aulas || []).map(aula => {
                              const contagemAula = logsMateria.filter(l => l.aulaId === aula.id).length;
                              return (
                                <span 
                                  key={aula.id} 
                                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all ${contagemAula > 0 ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]' : 'bg-[#0C0E12] border-[#1E293B] text-[#64748B]'}`}
                                  title={`${aula.titulo}: ${contagemAula} vezes estudada`}
                                >
                                  A{aula.numero.toString().padStart(2, '0')}: {contagemAula}x
                                </span>
                              );
                            });
                          })()
                        ) : (
                          <span className="text-[9px] italic text-[#64748B]">Nenhuma aula vinculada.</span>
                        )}
                      </div>
                    </div>

                    {/* Historial de logs dessa matéria (Últimos 3) */}
                    <div>
                      <h5 className="text-[9px] font-mono font-bold text-[#64748B] mb-2 uppercase tracking-wide">Logs Recentes do Ciclo:</h5>
                      {logsMateria.length === 0 ? (
                        <p className="text-[9px] italic text-[#64748B]">Nenhuma sessão de estudo cadastrada nesta matéria.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                          {logsMateria.slice(0, 3).map(log => (
                            <div key={log.id} className="text-[10px] bg-[#1E293B]/30 border border-[#1E293B] p-2 rounded flex justify-between items-center gap-2">
                              <div>
                                <span className="bg-[#1D4ED8]/40 border border-[#1D4ED8]/60 text-sky-300 text-[8px] font-bold px-1 py-0.2 rounded uppercase mr-1.5 whitespace-nowrap">
                                  {log.tipo}
                                </span>
                                <span className="text-slate-300">
                                  {new Date(log.data).toLocaleDateString('pt-BR')} • {log.duracaoMinutos} min
                                </span>
                              </div>
                              {log.questoesResolvidas > 0 && (
                                <span className="text-emerald-400 font-mono text-[9px] shrink-0">
                                  +{log.questoesAcertadas}/{log.questoesResolvidas}Q
                                </span>
                              )}
                            </div>
                          ))}
                          {logsMateria.length > 3 && (
                            <div className="text-center text-[9px] text-[#64748B] mt-1">
                              e mais {logsMateria.length - 3} sessões registradas...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HISTÓRICO DE LOGS INDIVIDUAIS */}
        {abaHistorico === 'logs' && (
          <div className="space-y-4" id="aba-historico-logs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-display font-medium text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={14} className="text-[#C5A059]" /> Registros de logs individuais filtrados
              </h3>
              
              {/* Filtros em linha */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {/* Filtro de matéria */}
                <select
                  value={materiaFiltro}
                  onChange={(e) => setMateriaFiltro(e.target.value)}
                  className="bg-[#0C0E12] border border-[#1E293B] rounded text-xs text-white px-2.5 py-1.5 outline-none focus:border-[#C5A059] font-mono cursor-pointer"
                >
                  <option value="all">Todas as Matérias</option>
                  {materias.map(m => (
                    <option key={m.id} value={m.id}>{m.sigla} - {m.nome}</option>
                  ))}
                </select>

                {/* Filtro de tipo */}
                <select
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  className="bg-[#0C0E12] border border-[#1E293B] rounded text-xs text-white px-2.5 py-1.5 outline-none focus:border-[#C5A059] font-mono cursor-pointer"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="Teoria (PDF)">Teoria (PDF)</option>
                  <option value="Vídeo">Vídeo</option>
                  <option value="Questões">Questões</option>
                  <option value="Revisão">Revisão</option>
                </select>
              </div>
            </div>

            {logsFiltrados.length === 0 ? (
              <div className="bg-[#0F172A] border border-[#1E293B] p-10 rounded text-center">
                <p className="text-xs text-[#94A3B8]">Nenhum registro de ciclo corresponde aos filtros selecionados.</p>
              </div>
            ) : (
              <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-[#E2E8F0]">
                    <thead>
                      <tr className="border-b border-[#1E293B] bg-[#0C0E12] text-[#64748B] text-[10px] text-left uppercase tracking-widest font-mono">
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Matéria</th>
                        <th className="py-3 px-4">Recurso/Tipo</th>
                        <th className="py-3 px-4 text-center">Duração</th>
                        <th className="py-3 px-4 text-center">Questões (FGV)</th>
                        <th className="py-3 px-4">Comentários anotados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/60 font-mono font-medium">
                      {logsFiltrados.map(log => {
                        const mat = materias.find(m => m.id === log.materiaId);
                        
                        return (
                          <tr key={log.id} className="hover:bg-[#1E293B]/20 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                              {new Date(log.data).toLocaleDateString('pt-BR')} {new Date(log.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black text-white" style={{ backgroundColor: mat?.cor }}>
                                  {mat?.sigla || 'TCU'}
                                </span>
                                <span className="text-white text-xs font-sans font-semibold">{mat?.nome}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-[#1E293B] border border-[#2D3748] rounded text-[10px] text-[#A3E635] font-bold">
                                {log.tipo}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap text-white font-bold">
                              {log.duracaoMinutos} min
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap font-bold">
                              {log.questoesResolvidas > 0 ? (
                                <span className="text-emerald-400">
                                  {log.questoesAcertadas} acf / {log.questoesResolvidas} res.
                                </span>
                              ) : (
                                <span className="text-[#64748B] italic text-[10px]">Sem questões</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-sans text-[#94A3B8] max-w-sm truncate" title={log.comentarios}>
                              {log.comentarios || <span className="text-[#64748B] italic">Nenhuma anotação</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-editorial-node" id="dashboard-stats-root">
      
      {/* ----------------- SEÇÃO 1: BANNER IMPERIAL DE BOAS-VINDAS & TIMER DA PROVA ----------------- */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-6" id="welcome-countdown-banner">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 px-2.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
              PLANO DE ESTUDOS AUDITOR TCU
            </span>
          </div>
          <h2 className="text-xl font-display font-medium text-white tracking-tight mt-1">Bem-vindo ao seu Cockpit de Alta Performance</h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Seu progresso é consolidado com base na bibliografia do Estratégia e critérios da banca FGV.
          </p>
        </div>

        {/* TIMER REGRESSIVO ATÉ A PROVA */}
        <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded flex flex-col items-center justify-center min-w-[260px] relative hover:border-[#C5A059]/30 transition-all">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
              <Hourglass size={10} className="text-[#C5A059]" /> Regressiva até a Prova
            </span>
            <button 
              onClick={() => setShowEditDate(!showEditDate)}
              className="text-[9px] text-[#C5A059] hover:underline cursor-pointer flex items-center gap-1 font-mono hover:text-white"
            >
              [Editar Data]
            </button>
          </div>

          {showEditDate ? (
            <div className="flex items-center gap-1.5 mt-1.5 w-full">
              <input 
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="bg-[#1E293B] text-white text-xs p-1 rounded border border-[#C5A059]/40 w-full outline-none focus:border-[#C5A059]"
              />
              <button 
                onClick={handleSalvarNovaData}
                className="bg-[#C5A059] text-black font-bold text-[10px] px-2 py-1 rounded hover:bg-white"
              >
                Salvar
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold font-mono tracking-widest text-[#C5A059] mt-0.5" id="prova-live-countdown">
                {countdownStr}
              </h3>
              <p className="text-[9px] text-[#64748B] font-mono text-center leading-none mt-1">
                Data do exame cadastrada: {new Date(dataProva).toLocaleDateString('pt-BR')} às 13h
              </p>
            </>
          )}
        </div>
      </div>

      {/* ----------------- SEÇÃO 2: GRID DE MÉTRICAS PRINCIPAIS (4 CARDS) ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metric-cards-grid">
        
        {/* Card Horas */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 shadow-sm flex items-center space-x-4 hover:border-[#C5A059]/40 transition-colors duration-200" id="card-horas">
          <div className="p-3 bg-[#1E293B] text-[#C5A059] border border-[#C5A059]/30 rounded">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Tempo de Estudo</p>
            <h3 className="text-3xl font-display font-bold text-[#C5A059] mt-1">{totalHoras.toFixed(1)}<span className="text-xs font-sans text-[#94A3B8] ml-0.5">h</span></h3>
            <span className="text-[10px] text-[#475569] font-mono uppercase tracking-wider">Acumulado das Planilhas</span>
          </div>
        </div>

        {/* Card Percentual de Edital */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 shadow-sm flex items-center space-x-4 hover:border-[#C5A059]/40 transition-colors duration-200" id="card-edital">
          <div className="p-3 bg-[#1E293B] text-[#C5A059] border border-[#C5A059]/30 rounded">
            <BookOpen size={22} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Progresso do Edital</p>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <h3 className="text-3xl font-display font-bold text-white mt-1">{percentualEdital}%</h3>
              <span className="text-[10px] text-[#94A3B8] font-mono">({concluidasAulas}/{totalAulas} aulas)</span>
            </div>
            <div className="w-full bg-[#1E293B] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#C5A059] to-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${percentualEdital}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Questões Resolvidas */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 shadow-sm flex items-center space-x-4 hover:border-[#C5A059]/40 transition-colors duration-200" id="card-questoes">
          <div className="p-3 bg-[#1E293B] text-[#C5A059] border border-[#C5A059]/30 rounded">
            <HelpCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Desempenho de Questões</p>
            <h3 className="text-3xl font-display font-bold text-[#C5A059] mt-1">{totalQuestoes}</h3>
            <span className="text-[10px] text-[#94A3B8] flex items-center gap-1 font-mono mt-1">
              <ThumbsUp size={10} className="text-emerald-500" /> {totalAcertos} acertos | {totalErros} erros
            </span>
          </div>
        </div>

        {/* Card Taxa de Acertos */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 shadow-sm flex items-center space-x-4 hover:border-[#C5A059]/40 transition-colors duration-200" id="card-taxa">
          <div className="p-3 bg-[#1E293B] text-[#C5A059] border border-[#C5A059]/30 rounded">
            <Percent size={22} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Média Geral Acertos</p>
            <h3 className="text-3xl font-display font-bold text-[#C5A059] mt-1">{percentualGeralAcertos}%</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${percentualGeralAcertos >= 80 ? 'text-emerald-400' : 'text-amber-500'}`}>
              {percentualGeralAcertos >= 80 ? '🎯 Meta TCU Atingida' : '⚠️ Meta TCU: > 80%'}
            </span>
          </div>
        </div>

      </div>

      {/* ----------------- SEÇÃO 3: NOVO GRID DE PROJEÇÕES E CICLOS (MECANISMO NOVO) ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="novos-graficos-projecoes-seccao">
        
        {/* CARD PROJEÇÃO DE CONCLUSÃO (RITMO SEMANAL) */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded flex flex-col justify-between" id="card-projecao-fechamento">
          <div>
            <div className="flex justify-between items-center border-b border-[#1E293B] pb-2.5 mb-3.5">
              <span className="text-xs font-display font-medium text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                <Gauge size={14} /> Projeção de Fechamento do Edital
              </span>
              <span className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-1.5 py-0.5 rounded uppercase font-bold">
                PROJEÇÃO DUPLA
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              Aulas restantes para fechar todo o edital do TCU: <strong className="text-white">{aulasRestantes} aulas</strong>.
            </p>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-3 rounded space-y-2.5 shadow-inner">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#64748B]">Ritmo Real (últimos 7 dias):</span>
                <span className="font-mono font-bold text-white">{concluidoNaSemanaReal} aulas/semana</span>
              </div>
              
              <div className="flex justify-between items-start text-xs pt-2 border-t border-[#1E293B]/40 gap-2">
                <span className="text-[#64748B]">Previsão pelo Ritmo Real:</span>
                <span className="font-mono font-bold text-right">
                  {concluidoNaSemanaReal > 0 ? (
                    <span className="text-emerald-400">
                      ~{semanasFaltantesReal.toFixed(1)} sem ({mesesFaltantesReal.toFixed(1)} meses)
                      <span className="block text-[9px] text-[#94A3B8] font-normal">Data: {dataEstimadaEditalReal.toLocaleDateString('pt-BR')}</span>
                    </span>
                  ) : (
                    <span className="text-amber-500 italic block">Indeterminada (Estude para calcular)</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-start text-xs pt-2 border-t border-[#1E293B]/40 gap-2">
                <span className="text-[#64748B]">Previsão pelo Simulador:</span>
                <span className="font-mono font-bold text-sky-400 text-right">
                  ~{semanasFaltantesSimulado.toFixed(1)} sem ({mesesFaltantesSimulado.toFixed(1)} meses)
                  <span className="block text-[9px] text-[#94A3B8] font-normal">Data: {dataEstimadaEditalSimulado.toLocaleDateString('pt-BR')}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1E293B]/60 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#64748B] uppercase">
              <span>Simulado de Ritmo Semanal:</span>
              <span className="text-[#C5A059]">{metaAulasSemana} aulas por semana</span>
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                type="range"
                min="1"
                max="500"
                value={metaAulasSemana}
                onChange={(e) => handleSalvarMetaAulas(parseInt(e.target.value))}
                className="w-full accent-[#C5A059] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* CARD INTEGRAÇÃO DE CICLOS DO EDITAL */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded flex flex-col justify-between" id="card-controle-de-ciclos">
          <div>
            <div className="flex justify-between items-center border-b border-[#1E293B] pb-2.5 mb-3.5">
              <span className="text-xs font-display font-medium text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={14} /> Ciclos Realizados do Edital
              </span>
              <button 
                onClick={() => setMostrarHistoricoCompleto(true)}
                className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 hover:bg-[#C5A059]/30 hover:text-white px-2 py-0.5 rounded uppercase font-bold cursor-pointer transition-all"
                title="Ver Histórico Completo de Ciclos"
              >
                Histórico
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              Cada log de 90 minutos de foco se reverte no avanço dos ciclos individuais de matérias.
            </p>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-3.5 rounded space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#64748B]">Sessões de Estudo Coordenadas:</span>
                <span className="text-xs font-mono font-bold text-white">{totalGeralCiclosSessoes} blocos</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1E293B]/60 pt-1.5" title="Soma total de logs dividido pelas 17 matérias do TCU">
                <span className="text-xs text-[#64748B]">Vezes que Ciclei o Edital:</span>
                <span className="text-xs font-mono font-bold text-[#C5A059]">{vezesEditalCiclado}x do edital</span>
              </div>
            </div>
          </div>

          {maisCiclada && (
            <div className="space-y-1.5 text-[10px] pt-3 border-t border-[#1E293B]/60 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Disciplina Mais Sincronizada:</span>
                <span className="text-emerald-400 font-bold">{maisCiclada.sigla} ({maisCiclada.ciclosContagem}x)</span>
              </div>
              {numMateriasNaoSincronizadas > 0 ? (
                <div className="flex justify-between items-start gap-1 pb-0.5">
                  <span className="text-[#64748B] shrink-0">Disciplinas sem Ciclo ({numMateriasNaoSincronizadas}):</span>
                  <span className="text-rose-400 font-bold text-right truncate max-w-[130px]" title={materiasNaoSincronizadas.map(m => m.sigla).join(', ')}>
                    {materiasNaoSincronizadas.slice(0, 3).map(m => m.sigla).join(', ')}
                    {numMateriasNaoSincronizadas > 3 ? '...' : ''}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Disciplina Menos Sincronizada:</span>
                  <span className="text-rose-400 font-bold">{menosCiclada ? `${menosCiclada.sigla} (${menosCiclada.ciclosContagem}x)` : '0x'}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setMostrarHistoricoCompleto(true)}
            className="mt-4 w-full bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#C5A059]/30 text-[#C5A059] hover:text-white transition-all rounded py-2 text-xs font-display font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RotateCcw size={13} /> Ver Painel Detalhado de Ciclos →
          </button>
        </div>

        {/* CARD DISTRIBUIÇÃO COMPARATIVA DE TEMPO */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded flex flex-col justify-between" id="card-distribuicao-tempo-periodizado">
          <div>
            <div className="flex justify-between items-center border-b border-[#1E293B] pb-2.5 mb-3.5">
              <span className="text-xs font-display font-medium text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} /> Distribuição de Horas Periodizadas
              </span>
              <span className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-1.5 py-0.5 rounded uppercase">
                Período
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
              Gráfico comparativo horizontal de tempo estudado em diferentes janelas de foco ativo:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Hoje */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white font-bold flex items-center gap-1"><Zap size={10} className="text-amber-500" /> Hoje</span>
                  <span className="text-[#C5A059]">{horasHoje.toFixed(1)}h</span>
                </div>
                <div className="w-full bg-[#1E293B] h-1.5 rounded overflow-hidden">
                  <div className="bg-amber-500 h-full rounded transition-all duration-300" style={{ width: `${Math.min(100, (horasHoje / 4) * 100)}%` }} />
                </div>
              </div>

              {/* Semana */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#94A3B8]">Últimos 7 dias</span>
                  <span className="text-white">{horasSemana.toFixed(1)}h</span>
                </div>
                <div className="w-full bg-[#1E293B] h-1.5 rounded overflow-hidden">
                  <div className="bg-[#C5A059] h-full rounded transition-all duration-300" style={{ width: `${Math.min(100, (horasSemana / 24) * 100)}%` }} />
                </div>
              </div>

              {/* Mes */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#64748B]">Últimos 30 dias</span>
                  <span className="text-white">{horasMes.toFixed(1)}h</span>
                </div>
                <div className="w-full bg-[#1E293B] h-1.5 rounded overflow-hidden">
                  <div className="bg-sky-500 h-full rounded transition-all duration-300" style={{ width: `${Math.min(100, (horasMes / 100) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#64748B] font-mono pt-3 border-t border-[#1E293B]/60 text-center flex items-center justify-between">
            <span>Resolvidas esta semana:</span>
            {questoesSemana > 0 ? (
              <span className="text-emerald-400 font-bold">{questoesSemana} Q ({percentualAcertosSemana}% acertos)</span>
            ) : (
              <span className="text-rose-400 font-bold">Nenhuma questão</span>
            )}
          </div>
        </div>

      </div>

      {/* ----------------- SEÇÃO 4: GRID DE DETALHAMENTO DE MATÉRIAS E TABELA DE ACERTOS ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-details-section">
        
        {/* Gráfico / Quadro de Cobertura do Edital (Estratégia) */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-sm lg:col-span-1 flex flex-col" id="materia-progress-panel">
          <h4 className="text-sm font-display font-bold uppercase tracking-widest text-[#E2E8F0] mb-5 border-b border-[#1E293B] pb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-[#C5A059]" />
            Progresso por Matéria
          </h4>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px] pr-1" id="materia-progress-list">
            {materiasPerformance.map(m => {
              const percMateria = m.aulasQuantidade > 0 
                ? Math.round((m.aulasConcluidas / m.aulasQuantidade) * 100) 
                : 0;

              return (
                <div 
                  key={m.id} 
                  className="space-y-1.5 cursor-pointer hover:bg-[#1E293B]/40 p-2 rounded transition-colors"
                  onClick={() => onSelectMateria(m.id)}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#E2E8F0] flex items-center gap-2 text-[11px] sm:text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.cor }} />
                      {m.sigla} - <span className="font-normal text-[#94A3B8] truncate max-w-[130px]">{m.nome}</span>
                    </span>
                    <span className="font-medium font-mono text-[#C5A059]">
                      {m.aulasConcluidas}/{m.aulasQuantidade} ({percMateria}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#1E293B]/80 h-2 rounded overflow-hidden border border-[#1E293B]">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${percMateria}%`, 
                        backgroundColor: m.cor 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estatísticas de Exercícios por Matéria (Questões Acertadas e Erradas) */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-sm lg:col-span-2" id="materia-accuracy-panel">
          <h4 className="text-sm font-display font-bold uppercase tracking-widest text-[#E2E8F0] mb-5 border-b border-[#1E293B] pb-3 flex items-center gap-2">
            <Percent size={16} className="text-[#C5A059]" />
            Índice de Acertos e Erros por Disciplina (FGV/TCU Target)
          </h4>
          <div className="overflow-x-auto" id="accuracy-table-container">
            <table className="min-w-full text-[#E2E8F0] text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#1E293B] text-[#64748B] text-[10px] sm:text-xs text-left uppercase tracking-widest font-mono">
                  <th className="py-3 px-3">Matéria</th>
                  <th className="py-3 px-3 text-center">Resolvidas</th>
                  <th className="py-3 px-3 text-center text-emerald-400">Acertos</th>
                  <th className="py-3 px-3 text-center text-rose-400">Erros</th>
                  <th className="py-3 px-3 text-right">Índice</th>
                  <th className="py-3 px-3 text-center">Contagem de Ciclos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/50 font-medium">
                {materiasPerformance.map(m => {
                  const mPerc = m.questoes > 0 ? Math.round((m.acertos / m.questoes) * 100) : 0;
                  
                  return (
                    <tr 
                      key={m.id} 
                      className="hover:bg-[#1E293B]/30 transition-colors cursor-pointer"
                      onClick={() => onSelectMateria(m.id)}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-black rounded text-white" style={{ backgroundColor: m.cor }}>
                            {m.sigla}
                          </span>
                          <span className="font-semibold text-white truncate max-w-[150px] sm:max-w-xs">{m.nome}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-[#94A3B8]">{m.questoes}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-emerald-400">+{m.acertos}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-rose-400">-{m.erros}</td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[#C5A059] text-[13px]">
                        {m.questoes > 0 ? `${mPerc}%` : '-'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold">
                        <span className="px-2.5 py-1 bg-[#1E293B] text-slate-300 border border-[#2D3748] rounded text-[10px]">
                          {m.ciclosContagem}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="bg-[#0C0E12] border border-[#1E293B] p-4 rounded mt-4 text-[11px] text-[#94A3B8] leading-relaxed flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-[#C5A059] shrink-0 mt-0.5" />
            <p>
              <strong>Critério TCU/FGV de Desempenho</strong>: Devido ao nível extremo do concurso e rigor da banca FGV, o índice mínimo recomendado para aprovação é de <strong className="text-white">80% de acertos</strong> nas matérias básicas e de <strong className="text-white">85%</strong> no bloco de Auditoria, Controle Externo (CEX) e AFO. Matérias marcadas com <span className="text-rose-400 font-bold">Atenção</span> devem ser repensadas no ciclo de revisão ativa e diagnósticos da IA.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
