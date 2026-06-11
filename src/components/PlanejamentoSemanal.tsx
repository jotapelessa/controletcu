import React, { useState, useEffect } from 'react';
import { Materia, StatusAula, Aula, LogSessao } from '../types';
import { 
  Calendar, 
  Clock, 
  Sliders, 
  Sparkles, 
  BookOpen, 
  Info, 
  Layers, 
  CheckCircle2, 
  Calculator, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Check, 
  Play, 
  HelpCircle, 
  AlertTriangle, 
  Settings, 
  Shuffle, 
  FileText 
} from 'lucide-react';

interface PlanejamentoProps {
  materias: Materia[];
  onAtualizarAula: (materiaId: string, aulaAtualizada: Aula) => void;
  onAdicionarLog: (novoLog: Omit<LogSessao, 'id'>) => void;
}

interface PlanejamentoConfig {
  cargaHorariaSemanal: number;
  tipoMeta: 'semanal' | 'diaria';
  metaHorasDiaria: number;
  diasAtivos: boolean[]; // 7 itens, Segunda=0, Domingo=6
  tipoDivisao: 'igual' | 'peso' | 'blocos';
  tamanhoBlocoMinutos: number; // 60, 90, 120
  pesoMaterias: { [materiaId: string]: number };
  materiasAtivas: string[];
  distribuicaoDias: { [diaIndex: number]: string[] }; // dia (0-6) -> lista de materiaId
  maxMateriasPorDia?: number;
  tempoPorDia?: { [diaIndex: number]: number };
  // Override manual por matéria (minutos/semana). Se presente, sobrepõe o cálculo automático.
  minutosCustomizados?: { [materiaId: string]: number };
}

const DIAS_NOMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

export default function PlanejamentoSemanal({ materias, onAtualizarAula, onAdicionarLog }: PlanejamentoProps) {
  // Configuração inicial com localStorage ou padrões inteligentes
  const [config, setConfig] = useState<PlanejamentoConfig>(() => {
    const saved = localStorage.getItem('tcu_planejamento_semanal');
    
    // Padrões iniciais de pesos
    const pesosIniciais: { [materiaId: string]: number } = {};
    materias.forEach(m => {
      if (m.id === 'controle_externo' || m.id === 'afo_dir_financeiro') pesosIniciais[m.id] = 5;
      else if (m.id === 'analise_dados_ti' || m.id === 'auditoria_gov' || m.id === 'contabilidade_publica') pesosIniciais[m.id] = 4;
      else if (m.id === 'dir_constitucional' || m.id === 'dir_administrativo' || m.id === 'contabilidade_geral') pesosIniciais[m.id] = 3;
      else pesosIniciais[m.id] = 2;
    });

    const temposIniciais: { [diaIndex: number]: number } = {
      0: 300, 1: 300, 2: 300, 3: 300, 4: 300, 5: 300, 6: 0
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.diasAtivos || !Array.isArray(parsed.diasAtivos) || parsed.diasAtivos.length !== 7) {
          parsed.diasAtivos = [true, true, true, true, true, true, false];
        }
        // Garantias de migração de esquema
        if (!parsed.distribuicaoDias) parsed.distribuicaoDias = {};
        if (!parsed.pesoMaterias) parsed.pesoMaterias = pesosIniciais;
        if (!parsed.materiasAtivas) parsed.materiasAtivas = materias.map(m => m.id);
        if (parsed.maxMateriasPorDia === undefined) parsed.maxMateriasPorDia = 17;
        if (!parsed.minutosCustomizados) parsed.minutosCustomizados = {};
        if (!parsed.tempoPorDia) {
          parsed.tempoPorDia = {};
          const totalAtivos = parsed.diasAtivos ? parsed.diasAtivos.filter(Boolean).length : 6;
          const minsPorDia = totalAtivos > 0 ? Math.round((parsed.cargaHorariaSemanal || 30) * 60 / totalAtivos) : 300;
          parsed.diasAtivos?.forEach((ativo: boolean, idx: number) => {
            parsed.tempoPorDia[idx] = ativo ? minsPorDia : 0;
          });
        }
        return parsed;
      } catch (e) {
        // Fallback se corrompido
      }
    }

    // Distribuição inicial recomendada (Segunda a Sábado ativa)
    const distribuicaoInicial: { [diaIndex: number]: string[] } = {
      0: ['controle_externo', 'dir_constitucional'],
      1: ['afo_dir_financeiro', 'dir_administrativo'],
      2: ['auditoria_gov', 'analise_dados_ti'],
      3: ['contabilidade_publica', 'portugues_redacao'],
      4: ['controle_externo', 'afo_dir_financeiro'],
      5: ['contabilidade_geral', 'economia_setor_p'],
      6: [] // Domingo livre ou simulados
    };

    return {
      cargaHorariaSemanal: 30,
      tipoMeta: 'semanal',
      metaHorasDiaria: 5,
      diasAtivos: [true, true, true, true, true, true, false], // Seg a Sáb
      tipoDivisao: 'peso',
      tamanhoBlocoMinutos: 90,
      pesoMaterias: pesosIniciais,
      materiasAtivas: materias.map(m => m.id),
      distribuicaoDias: distribuicaoInicial,
      maxMateriasPorDia: 17,
      tempoPorDia: temposIniciais,
      minutosCustomizados: {}
    };
  });

  // Salvar configurações sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem('tcu_planejamento_semanal', JSON.stringify(config));
  }, [config]);

  // Estados locais para interatividades
  const [diaAtivoEdicao, setDiaAtivoEdicao] = useState<number | null>(null);
  const [aulaParaLog, setAulaParaLog] = useState<{ materiaId: string; aula: Aula } | null>(null);
  const [numAcertos, setNumAcertos] = useState(0);
  const [numErros, setNumErros] = useState(0);
  const [tempoMinutosLog, setTempoMinutosLog] = useState(90);
  const [tipoEstudoLog, setTipoEstudoLog] = useState<'Teoria (PDF)' | 'Vídeo' | 'Questões' | 'Revisão'>('Teoria (PDF)');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  // Estado para edição inline de horas manuais (materiaId -> valor digitado em minutos/sem)
  const [editandoMinutos, setEditandoMinutos] = useState<{ [materiaId: string]: string }>({});
  const [flashOK, setFlashOK] = useState<{ [materiaId: string]: boolean }>({});

  // 1. CÁLCULO GERAL DO TEMPO DISPONÍVEL
  const totalDiasEstudo = config.diasAtivos.filter(Boolean).length;
  
  // Garantir sincronização perfeita do buffer tempoPorDia com os dias ativos
  const tempoPorDiaCorreto = { ...(config.tempoPorDia || {}) };
  let totalMinutosSemanaisCalculados = 0;
  
  config.diasAtivos.forEach((ativo, idx) => {
    if (!ativo) {
      tempoPorDiaCorreto[idx] = 0;
    } else {
      if (tempoPorDiaCorreto[idx] === undefined || tempoPorDiaCorreto[idx] === 0) {
        const defaultMinutos = config.tipoMeta === 'semanal'
          ? Math.round((config.cargaHorariaSemanal * 60) / (totalDiasEstudo || 1))
          : Math.round(config.metaHorasDiaria * 60);
        tempoPorDiaCorreto[idx] = defaultMinutos || 300;
      }
      totalMinutosSemanaisCalculados += tempoPorDiaCorreto[idx];
    }
  });

  const minutosSemanaisTotais = totalMinutosSemanaisCalculados;
  const horasSemanaisCalculadas = minutosSemanaisTotais / 60;
  const horasDiariasCalculadas = totalDiasEstudo > 0 ? (horasSemanaisCalculadas / totalDiasEstudo) : 0;

  // 2. DISTRIBUIÇÃO DO TEMPO ENTRE AS MATÉRIAS ATIVAS
  const materiasSelecionadas = materias.filter(m => config.materiasAtivas.includes(m.id));
  
  interface MateriaCalculada {
    materia: Materia;
    minutosSemanais: number;
    minutosDiarios: number;
    porcentagem: number;
    peso: number;
    sessoesSemanais: number;
    isCustom: boolean; // override manual ativo?
  }

  // Calcula os minutos automáticos (sem overrides)
  let materiasComTempoAuto: Omit<MateriaCalculada, 'isCustom'>[] = [];

  if (materiasSelecionadas.length > 0 && minutosSemanaisTotais > 0) {
    if (config.tipoDivisao === 'igual') {
      const minutosPorMateria = minutosSemanaisTotais / materiasSelecionadas.length;
      materiasComTempoAuto = materiasSelecionadas.map(m => ({
        materia: m,
        minutosSemanais: minutosPorMateria,
        minutosDiarios: minutosPorMateria / (totalDiasEstudo || 1),
        porcentagem: 100 / materiasSelecionadas.length,
        peso: config.pesoMaterias[m.id] || 3,
        sessoesSemanais: Math.max(1, Math.round(minutosPorMateria / config.tamanhoBlocoMinutos))
      }));
    } else if (config.tipoDivisao === 'peso') {
      const somaPesos = materiasSelecionadas.reduce((acc, m) => acc + (config.pesoMaterias[m.id] || 3), 0);
      materiasComTempoAuto = materiasSelecionadas.map(m => {
        const peso = config.pesoMaterias[m.id] || 3;
        const proporcao = peso / (somaPesos || 1);
        const minutosMateria = minutosSemanaisTotais * proporcao;
        return ({
          materia: m,
          minutosSemanais: minutosMateria,
          minutosDiarios: minutosMateria / (totalDiasEstudo || 1),
          porcentagem: proporcao * 100,
          peso,
          sessoesSemanais: Math.max(1, Math.round(minutosMateria / config.tamanhoBlocoMinutos))
        });
      });
    } else { // Por Blocos de tempo fixos
      const totalBlocos = Math.floor(minutosSemanaisTotais / config.tamanhoBlocoMinutos);
      const somaPesos = materiasSelecionadas.reduce((acc, m) => acc + (config.pesoMaterias[m.id] || 3), 0);
      
      let blocosAtribuidos = 0;
      const blocosBrutos = materiasSelecionadas.map(m => {
        const peso = config.pesoMaterias[m.id] || 3;
        const proporcao = peso / (somaPesos || 1);
        const blocosIdeal = totalBlocos * proporcao;
        const blocosArredondado = Math.floor(blocosIdeal);
        blocosAtribuidos += blocosArredondado;
        return { m, peso, ideal: blocosIdeal, real: blocosArredondado };
      });

      let blocosRestantes = totalBlocos - blocosAtribuidos;
      const blocosOrdenados = [...blocosBrutos].sort((a, b) => (b.ideal - b.real) - (a.ideal - a.real));
      for (let i = 0; i < blocosRestantes; i++) {
        const item = blocosOrdenados[i % blocosOrdenados.length];
        if (item) item.real += 1;
      }

      materiasComTempoAuto = blocosBrutos.map(item => {
        const minsMateria = item.real * config.tamanhoBlocoMinutos;
        return ({
          materia: item.m,
          minutosSemanais: minsMateria,
          minutosDiarios: minsMateria / (totalDiasEstudo || 1),
          porcentagem: (minsMateria / (minutosSemanaisTotais || 1)) * 100,
          peso: item.peso,
          sessoesSemanais: item.real
        });
      });
    }
  }

  // Aplica overrides manuais por matéria
  const minutosCustomizados = config.minutosCustomizados || {};
  const materiasComTempo: MateriaCalculada[] = materiasComTempoAuto.map(mc => {
    const custom = minutosCustomizados[mc.materia.id];
    const mins = (custom !== undefined && custom >= 0) ? custom : mc.minutosSemanais;
    return {
      ...mc,
      minutosSemanais: mins,
      minutosDiarios: mins / (totalDiasEstudo || 1),
      porcentagem: mins, // Será recalculado abaixo com base no total real
      isCustom: custom !== undefined
    };
  });

  // Recalcular porcentagens com base no total efetivo (com overrides)
  const totalMinutosEfetivos = materiasComTempo.reduce((s, mc) => s + mc.minutosSemanais, 0);
  materiasComTempo.forEach(mc => {
    mc.porcentagem = totalMinutosEfetivos > 0 ? (mc.minutosSemanais / totalMinutosEfetivos) * 100 : 0;
  });

  // Funções de controle de override manual
  const setMinutosCustom = (materiaId: string, valor: number) => {
    setConfig(prev => ({
      ...prev,
      minutosCustomizados: { ...(prev.minutosCustomizados || {}), [materiaId]: Math.max(0, Math.min(10080, valor)) }
    }));
    setFlashOK(prev => ({ ...prev, [materiaId]: true }));
    setTimeout(() => setFlashOK(prev => ({ ...prev, [materiaId]: false })), 1200);
  };

  const resetMinutosCustom = () => {
    setConfig(prev => ({ ...prev, minutosCustomizados: {} }));
    setEditandoMinutos({});
  };

  const temAlgumCustom = Object.keys(minutosCustomizados).length > 0;
  const diferencaMinutos = totalMinutosEfetivos - minutosSemanaisTotais;

  // 3. INTELIGÊNCIA DE AUTO-DISTRIBUIÇÃO DOS DIAS
  const handleAutoDistribuir = () => {
    if (materiasSelecionadas.length === 0 || totalDiasEstudo === 0) {
      alert("Selecione pelo menos um dia ativo de estudo e uma matéria.");
      return;
    }

    interface CupomSessao {
      materiaId: string;
      prioridade: number;
    }

    const sessoesPool: CupomSessao[] = [];
    materiasComTempo.forEach(mc => {
      const contSessoes = Math.ceil(mc.minutosSemanais / config.tamanhoBlocoMinutos);
      for (let s = 0; s < contSessoes; s++) {
        sessoesPool.push({
          materiaId: mc.materia.id,
          prioridade: mc.peso * 10 - s * 2
        });
      }
    });

    sessoesPool.sort((a, b) => b.prioridade - a.prioridade);

    const novaDistribuicao: { [diaIndex: number]: string[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    const diasAtivosIndices: number[] = [];
    config.diasAtivos.forEach((ativo, idx) => {
      if (ativo) diasAtivosIndices.push(idx);
    });

    let diaPoolIndice = 0;
    sessoesPool.forEach(sessao => {
      let diaEscolhido = -1;
      for (let i = 0; i < diasAtivosIndices.length; i++) {
        const testDia = diasAtivosIndices[(diaPoolIndice + i) % diasAtivosIndices.length];
        if (!novaDistribuicao[testDia].includes(sessao.materiaId)) {
          diaEscolhido = testDia;
          break;
        }
      }

      if (diaEscolhido === -1) {
        diaEscolhido = diasAtivosIndices[diaPoolIndice % diasAtivosIndices.length];
      }

      novaDistribuicao[diaEscolhido].push(sessao.materiaId);
      
      const indexAtual = diasAtivosIndices.indexOf(diaEscolhido);
      diaPoolIndice = (indexAtual + 1) % diasAtivosIndices.length;
    });

    // Limitar dias com o limite definido pelo usuário maxMateriasPorDia (padrão é 17)
    const limiteMaterias = config.maxMateriasPorDia || 17;
    diasAtivosIndices.forEach(dia => {
      if (novaDistribuicao[dia].length > limiteMaterias) {
        novaDistribuicao[dia] = novaDistribuicao[dia].slice(0, limiteMaterias);
      }
    });

    setConfig(prev => ({
      ...prev,
      distribuicaoDias: novaDistribuicao
    }));

    setMensagemSucesso("📆 Cronograma distribuído inteligentemente de acordo com os pesos e cargas semanais!");
    setTimeout(() => setMensagemSucesso(''), 5000);
  };

  // Funções de controle auxiliares
  const toggleDiaAtivo = (index: number) => {
    const novosDias = [...config.diasAtivos];
    novosDias[index] = !novosDias[index];
    
    const novaDist = { ...config.distribuicaoDias };
    if (!novosDias[index]) {
      novaDist[index] = [];
    }

    setConfig(prev => ({
      ...prev,
      diasAtivos: novosDias,
      distribuicaoDias: novaDist
    }));
  };

  const toggleMateriaAtiva = (id: string) => {
    const novasMat = config.materiasAtivas.includes(id)
      ? config.materiasAtivas.filter(mId => mId !== id)
      : [...config.materiasAtivas, id];
    
    setConfig(prev => ({
      ...prev,
      materiasAtivas: novasMat
    }));
  };

  const setPesoMateria = (id: string, peso: number) => {
    setConfig(prev => ({
      ...prev,
      pesoMaterias: {
        ...prev.pesoMaterias,
        [id]: peso
      }
    }));
  };

  // Editar as matérias de um dia específico manualmente
  const abrirEdicaoDia = (diaIndex: number) => {
    setDiaAtivoEdicao(diaIndex === diaAtivoEdicao ? null : diaIndex);
  };

  const toggleMateriaNoDia = (diaIndex: number, materiaId: string) => {
    const listaAtual = config.distribuicaoDias[diaIndex] || [];
    const novaLista = listaAtual.includes(materiaId)
      ? listaAtual.filter(id => id !== materiaId)
      : [...listaAtual, materiaId];

    setConfig(prev => ({
      ...prev,
      distribuicaoDias: {
        ...prev.distribuicaoDias,
        [diaIndex]: novaLista.slice(0, config.maxMateriasPorDia || 17)
      }
    }));
  };

  // Obter o tempo planejado de uma matéria em um dia específico de forma matematicamente sincronizada com o total do dia
  const obterTempoMateriaNoDia = (materiaId: string, diaIdx: number, materiasDiaIds: string[]): number => {
    if (!config.diasAtivos[diaIdx]) return 0;
    if (!materiasDiaIds.includes(materiaId)) return 0;
    
    const tempoDiaMinutos = tempoPorDiaCorreto[diaIdx] || 0;
    if (tempoDiaMinutos <= 0) return 0;

    if (config.tipoDivisao === 'igual') {
      return tempoDiaMinutos / (materiasDiaIds.length || 1);
    } else {
      // Para 'peso' e 'blocos', alocamos proporcionalmente de acordo com o peso de cada disciplina no dia
      const pesoMateria = config.pesoMaterias[materiaId] || 3;
      const somaPesosDia = materiasDiaIds.reduce((acc, id) => acc + (config.pesoMaterias[id] || 3), 0);
      return (pesoMateria / (somaPesosDia || 1)) * tempoDiaMinutos;
    }
  };

  // Obter a primeira aula não concluída
  const obterProximaAula = (materiaId: string): Aula | null => {
    const m = materias.find(x => x.id === materiaId);
    if (!m) return null;
    return m.aulas.find(a => a.status !== StatusAula.Concluido) || null;
  };

  // Helper para formatar tempo amigável
  const formatarTempo = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Lógica para registrar uma sessão rápida diretamente do cronograma
  const abrirSessaoRapidaLog = (materiaId: string, aula: Aula, tempoMinutosDefault?: number) => {
    setAulaParaLog({ materiaId, aula });
    setNumAcertos(0);
    setNumErros(0);
    setTempoMinutosLog(tempoMinutosDefault || config.tamanhoBlocoMinutos);
    setTipoEstudoLog('Teoria (PDF)');
  };

  const handleSalvarSessaoRapida = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aulaParaLog) return;

    onAdicionarLog({
      data: new Date().toISOString(),
      materiaId: aulaParaLog.materiaId,
      aulaId: aulaParaLog.aula.id,
      duracaoMinutos: tempoMinutosLog,
      questoesResolvidas: numAcertos + numErros,
      questoesAcertadas: numAcertos,
      questoesErradas: numErros,
      tipo: tipoEstudoLog,
      comentarios: `Estudo concluído via Planejador Semanal.`
    });

    setAulaParaLog(null);
    setMensagemSucesso(`✅ Sessão de estudo para "${aulaParaLog.aula.titulo}" registrada com sucesso!`);
    setTimeout(() => setMensagemSucesso(''), 4000);
  };

  const concluirDefinitivamente = (materiaId: string, aula: Aula) => {
    if (confirm(`Deseja marcar a Aula "${aula.titulo}" como CONCLUÍDA de forma definitiva no seu edital Estratégia?`)) {
      const aulaAtualizada: Aula = {
        ...aula,
        status: StatusAula.Concluido,
        dataConclusao: new Date().toISOString().split('T')[0]
      };
      onAtualizarAula(materiaId, aulaAtualizada);
      
      setMensagemSucesso(`🏆 Aula marcada como concluída com sucesso!`);
      setTimeout(() => setMensagemSucesso(''), 4000);
    }
  };

  return (
    <div className="space-y-8" id="planejador-root">
      
      {/* ALERTA DE SUCESSO FLUTUANTE DE RÁPIDO DISMISS */}
      {mensagemSucesso && (
        <div className="bg-[#1E293B] border border-[#C5A059] p-4 rounded text-xs text-[#C5A059] flex items-center gap-2.5 shadow-xl animate-scale-up" id="planejador-notif-success">
          <CheckCircle2 size={16} />
          <span className="font-semibold text-white">{mensagemSucesso}</span>
        </div>
      )}

      {/* QUADRO GERAL: CONFIGURAÇÃO DO MODELO DE ESTUDO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="planning-dashboard-container">
        
        {/* PARTE ESQUERDA: CONTROLADORES GERAIS */}
        <div className="lg:col-span-5 space-y-6" id="planning-inputs-column">
          
          {/* CARD 1: CARGA HORÁRIA E METAS */}
          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-sm shadow-sm space-y-5" id="card-horaria-config">
            <h3 className="text-sm font-display font-medium text-[#C5A059] border-b border-[#1E293B] pb-3 flex items-center gap-2">
              <Calculator size={18} /> Configure sua Rotina Semanal
            </h3>

            <div className="space-y-4">
              {/* Seletor de Tipo de Meta */}
              <div className="grid grid-cols-2 gap-2 bg-[#0C0E12] p-1 rounded border border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, tipoMeta: 'semanal' }))}
                  className={`py-2 text-xs font-semibold rounded-sm transition-all ${config.tipoMeta === 'semanal' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
                >
                  Meta por Semana (Carga total)
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, tipoMeta: 'diaria' }))}
                  className={`py-2 text-xs font-semibold rounded-sm transition-all ${config.tipoMeta === 'diaria' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
                >
                  Meta Foco por Dia
                </button>
              </div>

              {/* Slider da Carga Horária */}
              {config.tipoMeta === 'semanal' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A3B8] font-medium">Carga Horária Semanal:</span>
                    <strong className="text-white text-sm font-mono">{config.cargaHorariaSemanal} horas / semana</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="168"
                    step="1"
                    value={config.cargaHorariaSemanal}
                    onChange={(e) => {
                      const novaCarga = parseInt(e.target.value);
                      const totalAtivos = config.diasAtivos.filter(Boolean).length;
                      const novosMinutosPorDia = totalAtivos > 0 ? Math.round(novaCarga * 60 / totalAtivos) : 0;
                      const novoTempoPorDia = { ...config.tempoPorDia };
                      config.diasAtivos.forEach((ativo, idx) => {
                        novoTempoPorDia[idx] = ativo ? novosMinutosPorDia : 0;
                      });
                      setConfig(prev => ({
                        ...prev,
                        cargaHorariaSemanal: novaCarga,
                        tempoPorDia: novoTempoPorDia
                      }));
                    }}
                    className="w-full h-1.5 bg-[#0C0E12] rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
                  />
                  <div className="flex gap-2 justify-between text-[10px] text-[#64748B]">
                    <span>Trabalho/Pouco Tempo (15h)</span>
                    <span>Regular (40h)</span>
                    <span>Meta Monstro Máxima (168h)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A3B8] font-medium">Meta diária de estudos:</span>
                    <strong className="text-white text-sm font-mono">{config.metaHorasDiaria} horas / dia</strong>
                  </div>
                  <input
                     type="range"
                     min="1"
                     max="24"
                     step="0.5"
                     value={config.metaHorasDiaria}
                     onChange={(e) => {
                       const novaMeta = parseFloat(e.target.value);
                       const novosMinutos = Math.round(novaMeta * 60);
                       const novoTempoPorDia = { ...config.tempoPorDia };
                       config.diasAtivos.forEach((ativo, idx) => {
                         novoTempoPorDia[idx] = ativo ? novosMinutos : 0;
                       });
                       setConfig(prev => ({
                         ...prev,
                         metaHorasDiaria: novaMeta,
                         tempoPorDia: novoTempoPorDia
                       }));
                     }}
                     className="w-full h-1.5 bg-[#0C0E12] rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
                   />
                  <div className="flex gap-2 justify-between text-[10px] text-[#64748B]">
                    <span>Concurseiro Trabalhador (3h)</span>
                    <span>Padrão Exclusivo (8h)</span>
                    <span>Foco Extremo Máximo (24h)</span>
                  </div>
                </div>
              )}

              {/* Checkboxes de Dias de Estudo */}
              <div className="space-y-2 pt-2">
                <span className="text-xs text-[#94A3B8] font-medium block">Dias Ativos que Você Vai Estudar:</span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                  {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((letra, idx) => {
                    const ativo = config.diasAtivos[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDiaAtivo(idx)}
                        className={`py-1.5 rounded-sm border font-mono font-bold text-xs flex flex-col items-center justify-center cursor-pointer transition-all ${ativo ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/40 shadow-xs' : 'bg-[#0C0E12] text-[#475569] border-[#1E293B]'}`}
                        title={DIAS_NOMES[idx]}
                      >
                        <span>{letra}</span>
                        <span className="text-[7px] uppercase mt-0.5 font-sans font-light">
                          {idx === 0 ? 'Seg' : idx === 1 ? 'Ter' : idx === 2 ? 'Qui' : idx === 3 ? 'Qua' : idx === 4 ? 'Sex' : idx === 5 ? 'Sáb' : 'Dom'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informações Calculadas Diárias */}
              <div className="bg-[#0C0E12] border border-[#1E293B] p-3 text-xs flex gap-3 items-center justify-between" id="calcs-box">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#C5A059] shrink-0" />
                  <span className="text-[#94A3B8] font-sans">Ritmo Planejado:</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-xs block">{formatarTempo(minutosSemanaisTotais)} por semana</span>
                  <span className="text-[10px] text-[#64748B] block">Media diária: {horasDiariasCalculadas.toFixed(1)} horas</span>
                </div>
              </div>

            </div>
          </div>

          {/* CARD 2: ASSUNTOS, ESCOPO E PESOS DAS MATÉRIAS */}
          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-sm shadow-sm space-y-4" id="card-pesos-config">
            <h3 className="text-sm font-display font-medium text-[#C5A059] border-b border-[#1E293B] pb-3 flex items-center gap-2">
              <Sliders size={18} /> Escopo & Peso das Disciplinas
            </h3>

            {/* Selector de Modo de Divisão */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Método de Distribuição de Carga:</label>
              <select
                value={config.tipoDivisao}
                onChange={(e: any) => setConfig(prev => ({ ...prev, tipoDivisao: e.target.value }))}
                className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] transition-colors"
              >
                <option value="igual">Divisão Igualitária (Tempo idêntico para todas)</option>
                <option value="peso">Por Importância/Peso (Foca mais no que cai mais)</option>
                <option value="blocos">Por Blocos Fixos (Sessões segmentadas e rotativas)</option>
              </select>
            </div>

            {/* Se for Blocos, configurar o tamanho do Bloco */}
            {config.tipoDivisao === 'blocos' && (
              <div className="space-y-1 pt-1.5 animate-slide-up">
                <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Tamanho fixo de cada Bloco (minutos):</label>
                <select
                  value={config.tamanhoBlocoMinutos}
                  onChange={(e: any) => setConfig(prev => ({ ...prev, tamanhoBlocoMinutos: parseInt(e.target.value) }))}
                  className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none"
                >
                  <option value={45}>45 minutos (Sessões rápidas)</option>
                  <option value={60}>60 minutos (1 hora / padrão de foco)</option>
                  <option value={90}>90 minutos (1.5 horas / recomendado Estratégia)</option>
                  <option value={120}>120 minutos (2 horas / simulação de prova)</option>
                </select>
              </div>
            )}

            {/* NOVO: Limite Máximo de Matérias por Dia */}
            <div className="space-y-1.5 pt-1.5 border-t border-[#1E293B]/60">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Máximo de Matérias/Dia na Auto-distribuição:</label>
                <span className="text-[#C5A059] text-xs font-mono font-bold">{config.maxMateriasPorDia || 17} disciplinas</span>
              </div>
              <input
                type="range"
                min="1"
                max="17"
                step="1"
                value={config.maxMateriasPorDia || 17}
                onChange={(e) => setConfig(prev => ({ ...prev, maxMateriasPorDia: parseInt(e.target.value) }))}
                className="w-full h-1 bg-[#0C0E12] rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
              />
              <p className="text-[9px] text-[#64748B] leading-normal">
                Permite focar em poucas matérias ou em até todas as 17 matérias ativas ao mesmo tempo por dia (nem que seja 50 minutos para cada).
              </p>
            </div>

            {/* Checkbox de Matérias Ativas com Slides de Pesos */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold text-[#94A3B8]">
                <span>Selecione as Matérias Ativas:</span>
                <span>Peso (De 1 a 5)</span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 select-none" id="materias-weight-list">
                {materias.map(m => {
                  const ativa = config.materiasAtivas.includes(m.id);
                  const peso = config.pesoMaterias[m.id] || 3;
                  return (
                    <div 
                      key={m.id} 
                      className={`p-2 rounded border flex flex-col gap-2 transition-all ${ativa ? 'bg-[#0C0E12]/50 border-[#1E293B]' : 'bg-[#0C0E12]/10 border-[#1E293B]/30 opacity-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ativa}
                            onChange={() => toggleMateriaAtiva(m.id)}
                            className="rounded border-[#1E293B] text-[#C5A059] focus:ring-[#C5A059] bg-[#0C0E12]"
                          />
                          <span className="text-[10px] uppercase font-black px-1 py-0.5 rounded text-black font-mono shadow-xs" style={{ backgroundColor: m.cor }}>
                            {m.sigla}
                          </span>
                          <span className="text-xs font-bold text-white max-w-[170px] truncate">{m.nome}</span>
                        </label>

                        {ativa && (
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((estrela) => (
                              <button
                                key={estrela}
                                type="button"
                                onClick={() => setPesoMateria(m.id, estrela)}
                                className={`text-[11px] font-bold ${estrela <= peso ? 'text-[#C5A059]' : 'text-[#475569]'} hover:scale-125 transition-transform`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* PARTE DIREITA: DEMONSTRATIVO DE REPARTIÇÃO & CRONOGRAMA SEMANAL */}
        <div className="lg:col-span-7 space-y-6" id="planning-results-column">
          
          {/* CARD 3: REPARTIÇÃO DOS MINUTOS E HORAS — COM EDIÇÃO MANUAL */}
          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-sm shadow-sm space-y-4" id="card-distribuicao-graficos">
            <h3 className="text-sm font-display font-medium text-white flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <span className="flex items-center gap-2"><TrendingUp size={18} className="text-[#C5A059]" /> Repartição Matemática do Tempo</span>
              <span className="text-xs text-[#94A3B8] font-mono">{materiasSelecionadas.length} de {materias.length} Ativas</span>
            </h3>

            {/* BARRA DE STATUS: tempo total personalizado vs disponível */}
            {materiasComTempo.length > 0 && (
              <div className={`flex items-center justify-between text-[11px] px-3 py-2 rounded border ${
                temAlgumCustom
                  ? diferencaMinutos > 30
                    ? 'bg-red-950/40 border-red-800/50 text-red-400'
                    : diferencaMinutos < -30
                      ? 'bg-blue-950/40 border-blue-800/50 text-blue-400'
                      : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                  : 'bg-[#0C0E12] border-[#1E293B] text-[#64748B]'
              }`}>
                <span className="font-mono">
                  {temAlgumCustom ? '✏️ Ajuste manual ativo —' : '⚙️ Automático —'} Total distribuído:{' '}
                  <strong className="text-white">{formatarTempo(totalMinutosEfetivos)}</strong>
                </span>
                <span className="font-mono">
                  Disponível: <strong className="text-white">{formatarTempo(minutosSemanaisTotais)}</strong>
                  {temAlgumCustom && (
                    <span className={`ml-2 font-bold ${
                      Math.abs(diferencaMinutos) <= 30 ? 'text-emerald-400' :
                      diferencaMinutos > 0 ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      ({diferencaMinutos > 0 ? '+' : ''}{formatarTempo(Math.abs(diferencaMinutos))}{diferencaMinutos > 0 ? ' excede' : ' sobra'})
                    </span>
                  )}
                </span>
              </div>
            )}

            {materiasComTempo.length > 0 ? (
              <div className="space-y-1" id="visual-repartition-grid">
                {/* Cabeçalho */}
                <div className="grid grid-cols-[1fr_auto] gap-2 text-[10px] font-mono border-b border-[#1E293B] pb-2 text-[#64748B] uppercase tracking-wider">
                  <span>Matéria Selecionada</span>
                  <span className="text-right pr-1">Tempo Semana / Dia</span>
                </div>

                <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1 pt-1">
                  {materiasComTempo.map(mc => {
                    const isEdit = editandoMinutos[mc.materia.id] !== undefined;
                    const isFlash = flashOK[mc.materia.id];
                    return (
                      <div
                        key={mc.materia.id}
                        className={`space-y-1 p-2 rounded border transition-all ${
                          isFlash
                            ? 'border-emerald-500/60 bg-emerald-950/20'
                            : mc.isCustom
                              ? 'border-[#C5A059]/30 bg-[#C5A059]/5'
                              : 'border-transparent'
                        }`}
                        id={`row-repart-${mc.materia.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {/* Matéria Info */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: mc.materia.cor }} />
                            <span className="font-bold text-white text-xs shrink-0">{mc.materia.sigla}</span>
                            <span className="text-[#94A3B8] text-[11px] truncate">{mc.materia.nome}</span>
                            {mc.isCustom && (
                              <span className="text-[9px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-[#C5A059]/20 text-[#C5A059] shrink-0">Manual</span>
                            )}
                          </div>

                          {/* Controle de tempo — toggle entre display e input */}
                          {isEdit ? (
                            <form
                              className="flex items-center gap-1 shrink-0"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const val = parseInt(editandoMinutos[mc.materia.id] || '0', 10);
                                if (!isNaN(val)) setMinutosCustom(mc.materia.id, val);
                                setEditandoMinutos(prev => { const n = {...prev}; delete n[mc.materia.id]; return n; });
                              }}
                            >
                              <input
                                type="number"
                                min="0"
                                max="10080"
                                step="5"
                                autoFocus
                                value={editandoMinutos[mc.materia.id]}
                                onChange={(e) => setEditandoMinutos(prev => ({ ...prev, [mc.materia.id]: e.target.value }))}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value || '0', 10);
                                  if (!isNaN(val)) setMinutosCustom(mc.materia.id, val);
                                  setEditandoMinutos(prev => { const n = {...prev}; delete n[mc.materia.id]; return n; });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditandoMinutos(prev => { const n = {...prev}; delete n[mc.materia.id]; return n; });
                                  }
                                }}
                                className="w-[72px] bg-[#0C0E12] border border-[#C5A059] rounded px-2 py-1 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-[#C5A059]"
                                placeholder="min/sem"
                                title="Minutos por semana"
                              />
                              <span className="text-[#64748B] text-[10px] font-mono">min/sem</span>
                              <button type="submit" className="text-emerald-400 hover:text-emerald-300 transition-colors" title="Confirmar">
                                <Check size={13} />
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              className="flex items-center gap-1.5 group cursor-pointer shrink-0"
                              title="Clique para ajustar manualmente"
                              onClick={() => setEditandoMinutos(prev => ({
                                ...prev,
                                [mc.materia.id]: String(Math.round(mc.minutosSemanais))
                              }))}
                            >
                              <div className="font-mono text-xs text-right">
                                <span className="text-[#C5A059] font-semibold">{formatarTempo(mc.minutosSemanais)}/sem</span>
                                <span className="text-[#64748B] block text-[10px]">({formatarTempo(mc.minutosDiarios)}/dia)</span>
                              </div>
                              <span className="text-[#475569] group-hover:text-[#C5A059] transition-colors" title="Editar">
                                <Settings size={12} />
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full bg-[#0C0E12] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, mc.porcentagem)}%`, backgroundColor: mc.materia.cor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé: botão de reset */}
                {temAlgumCustom && (
                  <div className="pt-2 border-t border-[#1E293B] flex justify-end">
                    <button
                      type="button"
                      onClick={resetMinutosCustom}
                      className="flex items-center gap-1.5 text-[11px] text-[#64748B] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} /> Resetar todos os ajustes manuais
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-[#64748B] text-xs">
                Selecione matérias ativas ao lado para simular a divisão de minutos.
              </div>
            )}
          </div>

          {/* CARD 4: CRONOGRAMA DE ESCALA DE ESTUDOS DE 7 DIAS */}
          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-sm shadow-sm space-y-4" id="card-cronograma-semanal">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-[#1E293B]">
              <div>
                <h3 className="text-sm font-display font-medium text-white flex items-center gap-2">
                  <Calendar size={18} className="text-[#C5A059]" /> Calendário Semanal Integrado
                </h3>
                <p className="text-[11px] text-[#64748B]">Organize o que estudar cada dia de acordo com as aulas reais pendentes.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAutoDistribuir}
                  className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-semibold text-xs flex items-center justify-center gap-1.5 rounded cursor-pointer transition-colors"
                  title="Alocar com algoritmo com base nos pesos das matérias"
                >
                  <Shuffle size={13} /> Auto-Distribuir
                </button>
              </div>
            </div>

            {/* GRID SEMANAL DOS 7 DIAS */}
            <div className="space-y-4" id="7-days-selector-grid">
              {DIAS_NOMES.map((nomeDia, diaIdx) => {
                const ativo = config.diasAtivos[diaIdx];
                const materiasDiaIds = config.distribuicaoDias[diaIdx] || [];
                const editandoEsteDia = diaAtivoEdicao === diaIdx;

                return (
                  <div 
                    key={diaIdx} 
                    className={`border transition-all rounded overflow-hidden shadow-xs ${ativo ? 'bg-[#0C0E12]/40 border-[#1E293B]' : 'bg-[#000000]/10 border-[#1E293B]/20 opacity-40'}`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div className="p-3.5 flex justify-between items-center bg-[#0F172A]/80 border-b border-[#1E293B]/50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${ativo ? 'bg-[#C5A059]' : 'bg-[#475569]'}`} />
                        <h4 className={`text-xs font-bold leading-none ${ativo ? 'text-white' : 'text-[#64748B]'}`}>{nomeDia}</h4>
                        {ativo && (
                          <span className="text-[9px] font-mono text-[#64748B] bg-[#1E293B] px-1.5 py-0.5 rounded border border-[#1E293B]">
                            {materiasDiaIds.length} matérias
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {ativo && (
                          <button
                            type="button"
                            onClick={() => abrirEdicaoDia(diaIdx)}
                            className={`px-2.5 py-1 rounded text-[10px] font-serif italic border transition-colors cursor-pointer ${editandoEsteDia ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/40' : 'bg-[#1E293B] text-[#94A3B8] border-[#2D3748] hover:text-white'}`}
                          >
                            {editandoEsteDia ? 'Fechar' : 'Ajustar Matérias'}
                          </button>
                        )}
                        <span className="text-[10px] font-mono font-bold text-[#64748B]">
                          {ativo ? 'Ativo' : 'Folga/Revisão'}
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo do Dia: Editar Matérias (Checklist manual de Atribuição) */}
                    {editandoEsteDia && ativo && (
                      <div className="p-3 bg-[#0C0E12] border-b border-[#1E293B]/50 animate-slide-up">
                        <p className="text-[10px] text-[#94A3B8] mb-2 font-sans">Selecione quais disciplinas agendar para o seu estudo de {nomeDia}:</p>
                        <div className="flex flex-wrap gap-2">
                          {materiasSelecionadas.map(m => {
                            const inserida = materiasDiaIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleMateriaNoDia(diaIdx, m.id)}
                                className={`px-2 py-1.5 rounded-sm text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${inserida ? 'bg-white text-black border-white' : 'bg-[#1E293B] text-[#94A3B8] border-[#2D3748] hover:text-white'}`}
                                style={{ borderLeft: inserida ? `3px solid ${m.cor}` : `3px solid ${m.cor}` }}
                              >
                                {inserida && <Check size={10} />}
                                {m.sigla}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* NOVO: Ajuste de Tempo Diário Manual */}
                    {ativo && (
                      <div className="px-3.5 py-2.5 bg-[#0C0E12]/80 border-b border-[#1E293B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-[#C5A059]" />
                          <span className="text-[11px] font-sans text-[#94A3B8]">Carga diária deste dia:</span>
                          <strong className="text-white text-xs font-mono">{formatarTempo(tempoPorDiaCorreto[diaIdx] || 0)}</strong>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <input
                            type="range"
                            min="30"
                            max="1440"
                            step="15"
                            value={tempoPorDiaCorreto[diaIdx] || 300}
                            onChange={(e) => {
                              const novosMinutos = parseInt(e.target.value);
                              const novosTempos = { ...tempoPorDiaCorreto, [diaIdx]: novosMinutos };
                              
                              let somaCargaMinutos = 0;
                              config.diasAtivos.forEach((a, index) => {
                                somaCargaMinutos += a ? (index === diaIdx ? novosMinutos : (tempoPorDiaCorreto[index] || 300)) : 0;
                              });
                              
                              setConfig(prev => ({
                                ...prev,
                                tempoPorDia: novosTempos,
                                cargaHorariaSemanal: Math.round(somaCargaMinutos / 60)
                              }));
                            }}
                            className="h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#C5A059] flex-1 sm:w-40"
                          />
                          <div className="flex gap-1 shrink-0">
                            {[120, 240, 360, 480].map((mins) => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => {
                                  const novosTempos = { ...tempoPorDiaCorreto, [diaIdx]: mins };
                                  let somaCargaMinutos = 0;
                                  config.diasAtivos.forEach((a, index) => {
                                    somaCargaMinutos += a ? (index === diaIdx ? mins : (tempoPorDiaCorreto[index] || 300)) : 0;
                                  });
                                  setConfig(prev => ({
                                    ...prev,
                                    tempoPorDia: novosTempos,
                                    cargaHorariaSemanal: Math.round(somaCargaMinutos / 60)
                                  }));
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer ${tempoPorDiaCorreto[diaIdx] === mins ? 'bg-[#C5A059] text-black border-[#C5A059] font-bold' : 'bg-[#1E293B] text-[#64748B] border-[#2D3748] hover:text-[#94A3B8]'}`}
                              >
                                {mins / 60}h
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Matérias Listadas no Dia */}
                    {ativo && (
                      <div className="divide-y divide-[#1E293B]/30 bg-[#0C0E12]/10">
                        {materiasDiaIds.length > 0 ? (
                          materiasDiaIds.map(mId => {
                            const mc = materiasComTempo.find(x => x.materia.id === mId);
                            const m = mc?.materia || materias.find(x => x.id === mId);
                            if (!m) return null;

                            // Pesquisa da proxima aula real pendente no edital do Estratégia
                            const proximaAula = obterProximaAula(m.id);

                            return (
                              <div key={m.id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                
                                {/* Info da Matéria */}
                                <div className="space-y-1.5 md:max-w-xs xl:max-w-md">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded text-black shadow-xs" style={{ backgroundColor: m.cor }}>
                                      {m.sigla}
                                    </span>
                                    <h5 className="font-bold text-white truncate max-w-[165px]">{m.nome}</h5>
                                    <span className="text-[10px] text-[#C5A059] font-mono font-bold font-sans">
                                      ⏱️ {formatarTempo(obterTempoMateriaNoDia(m.id, diaIdx, materiasDiaIds))}
                                    </span>
                                  </div>

                                  {/* PRÓXIMA AULA DETALHE */}
                                  {proximaAula ? (
                                    <div className="flex flex-col gap-0.5 pl-1.5 border-l-2 border-[#1E293B]">
                                      <span className="text-[10px] text-[#64748B] font-mono">PRÓXIMA META DO EDITAL:</span>
                                      <p className="text-[11px] text-[#E2E8F0] font-sans truncate font-medium max-w-[300px]" title={proximaAula.titulo}>
                                        Aula {proximaAula.numero.toString().padStart(2, '0')} - {proximaAula.titulo}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#64748B]">
                                        <span className="uppercase text-[8px] bg-[#1E293B] px-1 rounded font-mono font-bold text-[#94A3B8]">{proximaAula.status}</span>
                                        <span>•</span>
                                        <span>{proximaAula.horasEstudadas.toFixed(1)}h acumuladas</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-emerald-400 font-sans pl-1.5 border-l-2 border-emerald-950/20 font-bold flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Matéria 100% Concluída no Estratégia!
                                    </p>
                                  )}
                                </div>

                                {/* Ações rápidas de Estudo */}
                                {proximaAula && (
                                  <div className="flex items-center gap-1.5 self-end md:self-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const tempoPla = obterTempoMateriaNoDia(m.id, diaIdx, materiasDiaIds);
                                        abrirSessaoRapidaLog(m.id, proximaAula, Math.round(tempoPla));
                                      }}
                                      className="px-2.5 py-1.5 bg-[#1E293B] hover:bg-[#1E293B]/90 text-[#C5A059] hover:text-[#C5A059]/90 border border-[#2D3748] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                      title="Lançar horas estudadas nesta aula"
                                    >
                                      <Play size={10} className="fill-current text-[#C5A059]" /> Registrar Estudo
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => concluirDefinitivamente(m.id, proximaAula)}
                                      className="p-1.5 hover:bg-[#1E293B] text-[#475569] hover:text-[#C5A059] border border-transparent hover:border-[#1E293B] rounded cursor-pointer transition-colors"
                                      title="Marcar como CONCLUÍDO diretamente"
                                    >
                                      <Check size={14} className="stroke-[3]" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-[#64748B]">
                            Nenhuma aula agendada. Clique em "Ajustar Matérias" para montar o cronograma do dia.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL DE REGISTRO RÁPIDO DO CRONOGRAMA */}
      {aulaParaLog && (
        <div className="fixed inset-0 bg-[#0C0E12]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="cronograma-rapido-modal">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-scale-up">
            
            <div className="flex justify-between items-start border-b border-[#1E293B] pb-3">
              <div>
                <span className="text-[9px] uppercase font-mono font-bold bg-[#1E293B] border border-[#2D3748] text-[#C5A059] px-1.5 py-0.5 rounded">Sessão Direta</span>
                <h3 className="text-sm font-display font-bold text-white mt-1.5">Registrar Estudo do Cronograma</h3>
              </div>
              <button 
                onClick={() => setAulaParaLog(null)}
                className="text-[#64748B] hover:text-white font-bold font-sans cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#64748B] font-mono block">CONTEÚDO ALVO:</span>
              <p className="text-xs font-bold text-white font-sans">{aulaParaLog.aula.titulo}</p>
            </div>

            <form onSubmit={handleSalvarSessaoRapida} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase block">Duração (Minutos)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={tempoMinutosLog}
                    onChange={(e) => setTempoMinutosLog(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0C0E12] border border-[#2D3748] rounded px-3 py-2 text-xs font-bold font-mono text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase block">Formato de Estudo</label>
                  <select
                    value={tipoEstudoLog}
                    onChange={(e: any) => setTipoEstudoLog(e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#2D3748] rounded px-3 py-2 text-xs text-[#E2E8F0] outline-none"
                  >
                    <option value="Teoria (PDF)">Teoria (PDF)</option>
                    <option value="Vídeo">Vídeo Aula</option>
                    <option value="Questões">Questões de Fixação</option>
                    <option value="Revisão">Revisão Periódica</option>
                  </select>
                </div>
              </div>

              {/* Se for questões, permitir adicionar acertos / erros */}
              {tipoEstudoLog === 'Questões' && (
                <div className="grid grid-cols-2 gap-3 bg-[#0C0E12] p-3 rounded border border-[#1E293B] animate-slide-up">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-400 uppercase block">Acertos</label>
                    <input 
                      type="number" 
                      min="0"
                      value={numAcertos}
                      onChange={(e) => setNumAcertos(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-1.5 text-xs text-center font-bold font-mono text-emerald-400 focus:border-[#C5A059] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-rose-400 uppercase block">Erros</label>
                    <input 
                      type="number" 
                      min="0"
                      value={numErros}
                      onChange={(e) => setNumErros(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-1.5 text-xs text-center font-bold font-mono text-rose-400 focus:border-[#C5A059] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="bg-[#0C0E12] p-3 text-[10px] text-[#64748B] border border-[#1E293B] rounded font-sans leading-relaxed flex items-start gap-1.5">
                <Info size={14} className="text-[#C5A059] shrink-0 mt-0.5" />
                <p>Salvar este registro atualizará suas estatísticas gerais no Painel, somará horas estudadas no material e lançará o log de histórico local.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAulaParaLog(null)}
                  className="px-4 py-2 bg-[#1E293B] border border-[#2D3748] text-[#94A3B8] hover:text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Confirmar Estudo
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
