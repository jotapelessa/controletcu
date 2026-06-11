import React, { useState, useEffect } from 'react';
import { carregarDadosIniciais, salvarMaterias, salvarCiclo, salvarSimulados, salvarRevisoes, salvarHistorico } from './data';
import { Materia, CicloEstudo, Simulado, RevisaoEspacada, LogSessao, StatusAula, Aula } from './types';
import DashboardStats from './components/DashboardStats';
import CicloEstudoSeccao from './components/CicloEstudoSeccao';
import PlanejamentoSemanal from './components/PlanejamentoSemanal';
import CursosEstrategia from './components/CursosEstrategia';
import RevisoesEspacadas from './components/RevisoesEspacadas';
import SimuladosBanca from './components/SimuladosBanca';
import IADiagnostico from './components/IADiagnostico';
import DadosEBackup from './components/DadosEBackup';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BookOpen, Clock, Calendar, Award, Sparkles, LogOut, CheckCircle, Flame, User, ListCollapse } from 'lucide-react';

export default function App() {
  // Estados Globais da Aplicação
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [ciclo, setCiclo] = useState<CicloEstudo | null>(null);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [revisoes, setRevisoes] = useState<RevisaoEspacada[]>([]);
  const [historico, setHistorico] = useState<LogSessao[]>([]);
  const [materiaEditalAtivaId, setMateriaEditalAtivaId] = useState<string | undefined>(undefined);

  // Carregar dados no mount
  useEffect(() => {
    const dados = carregarDadosIniciais();
    setMaterias(dados.materias);
    setCiclo(dados.ciclo);
    setSimulados(dados.simulados);
    setRevisoes(dados.revisoes);
    setHistorico(dados.historico);
  }, []);

  // Monitorar abas
  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'ciclo' | 'planejamento' | 'edital' | 'revisoes' | 'simulados' | 'coach' | 'dados'>('painel');

  // Sincronizadores e Triggers de Salvamento
  const handleAtualizarAula = (materiaId: string, aulaAtualizada: Aula) => {
    const novasMaterias = materias.map(m => {
      if (m.id !== materiaId) return m;
      return {
        ...m,
        aulas: m.aulas.map(a => a.id === aulaAtualizada.id ? aulaAtualizada : a)
      };
    });

    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);
  };

  const handleSalvarCiclo = (novoCiclo: CicloEstudo) => {
    setCiclo(novoCiclo);
    salvarCiclo(novoCiclo);
  };

  const handleSalvarSimulados = (novosSimulados: Simulado[]) => {
    setSimulados(novosSimulados);
    salvarSimulados(novosSimulados);
  };

  const handleSalvarRevisoes = (novasRevisoes: RevisaoEspacada[]) => {
    setRevisoes(novasRevisoes);
    salvarRevisoes(novasRevisoes);
  };

  // ADICIONAR LOG SESSÃO (Chocado na Sessão do Cronômetro)
  const handleAdicionarLogSessao = (novoLogNoId: Omit<LogSessao, 'id'>) => {
    const logId = `log_${Date.now()}`;
    const novoLog: LogSessao = {
      ...novoLogNoId,
      id: logId
    };

    const historicoAtualizado = [novoLog, ...historico];
    setHistorico(historicoAtualizado);
    salvarHistorico(historicoAtualizado);

    // AUTOMATIZAÇÃO PREMIUM DE STATUS DO EDITAL:
    // Atualizar a aula correspondente nas matérias
    const novasMaterias = materias.map(m => {
      if (m.id !== novoLog.materiaId) return m;

      return {
        ...m,
        aulas: m.aulas.map(a => {
          if (a.id !== novoLog.aulaId) return a;

          // Somar horas e questões ao lesson tracker
          const novasHoras = (a.horasEstudadas || 0) + (novoLog.duracaoMinutos / 60);
          const novasQuestResolv = (a.questoesResolvidas || 0) + novoLog.questoesResolvidas;
          const novasQuestAcertadas = (a.questoesAcertadas || 0) + novoLog.questoesAcertadas;
          const novasQuestErradas = (a.questoesErradas || 0) + novoLog.questoesErradas;
          
          let novoStatus = a.status;
          if (novoLog.tipo === 'Teoria (PDF)') {
            novoStatus = StatusAula.LendoPDF;
          } else if (novoLog.tipo === 'Vídeo') {
            novoStatus = StatusAula.AssistindoVideo;
          } else if (novoLog.tipo === 'Revisão') {
            novoStatus = StatusAula.Revisando;
          } else if (novoLog.tipo === 'Questões' && novasQuestResolv >= 10) {
            novoStatus = StatusAula.Concluido;
          }

          // Se concluiu as questões de forma geral, marcar como Concluido
          if (novoLog.questoesResolvidas > 0 && novasQuestResolv >= 15 && novasQuestAcertadas / novasQuestResolv >= 0.7) {
            novoStatus = StatusAula.Concluido;
          }

          return {
            ...a,
            horasEstudadas: novasHoras,
            questoesResolvidas: novasQuestResolv,
            questoesAcertadas: novasQuestAcertadas,
            questoesErradas: novasQuestErradas,
            status: novoStatus,
            dataConclusao: novoStatus === StatusAula.Concluido ? new Date().toISOString().split('T')[0] : a.dataConclusao
          };
        })
      };
    });

    setMaterias(novasMaterias);
    salvarMaterias(novasMaterias);

    // AUTOMATIZAÇÃO PREMIUM DE REVISÃO ESPAÇADA AUTOMÁTICA:
    // Se a sessão foi de Teoria (PDF) ou Vídeo, agendar uma revisão de 24 horas para o conteúdo!
    if (novoLog.tipo === 'Teoria (PDF)' || novoLog.tipo === 'Vídeo') {
      const materiaInfo = materias.find(m => m.id === novoLog.materiaId);
      const aulaInfo = materiaInfo?.aulas.find(a => a.id === novoLog.aulaId);

      const alvoAmanha = new Date();
      alvoAmanha.setDate(alvoAmanha.getDate() + 1);

      const novaRevisaoAuto: RevisaoEspacada = {
        id: `rev_auto_${Date.now()}`,
        materiaId: novoLog.materiaId,
        aulaId: novoLog.aulaId,
        titulo: `Revisão de 24h: ${materiaInfo?.sigla} - Aula ${aulaInfo?.numero.toString().padStart(2, '0')}`,
        dataCriacao: new Date().toISOString(),
        dataRevisaoAlvo: alvoAmanha.toISOString(),
        intervaloDias: 1,
        concluida: false,
        etapa: 1,
        historico: [
          { data: new Date().toISOString(), status: 'agendada' }
        ]
      };

      const novasRevisoes = [...revisoes, novaRevisaoAuto];
      setRevisoes(novasRevisoes);
      salvarRevisoes(novasRevisoes);
    }
  };

  // Navegar direto para matéria do Edital quando clica no Dashboard
  const handleNavegarParaMateriaEdital = (materiaId: string) => {
    setMateriaEditalAtivaId(materiaId);
    setAbaAtiva('edital');
  };

  // Limpar os dados e resetar para recomeçar o edital
  const handleResetarGeral = (solicitarConfirmacao = true) => {
    if (!solicitarConfirmacao || confirm("⚠️ ATENÇÃO: Deseja redefinir todo o progresso dos seus estudos para o estado inicial padrão? Isso apagará suas horas estudadas e simulados.")) {
      // Deletar apenas dados de progresso e histórico
      localStorage.removeItem('tcu_materias');
      localStorage.removeItem('tcu_ciclo');
      localStorage.removeItem('tcu_simulados');
      localStorage.removeItem('tcu_revisoes');
      localStorage.removeItem('tcu_historico');
      localStorage.removeItem('tcu_planejamento_semanal');
      localStorage.removeItem('tcu_last_sync_time');
      localStorage.removeItem('tcu_ia_diagnostico_recente');
      
      // Marcar como inicializado para evitar carregar o mock data novamente
      localStorage.setItem('tcu_initialized', 'true');
      
      window.location.reload();
    }
  };

  // Importar backup completo de Dados e configurações
  const handleImportarBackupTotal = (backup: any) => {
    setMaterias(backup.materias);
    salvarMaterias(backup.materias);

    if (backup.ciclo) {
      setCiclo(backup.ciclo);
      salvarCiclo(backup.ciclo);
    }
    
    setSimulados(backup.simulados);
    salvarSimulados(backup.simulados);

    setRevisoes(backup.revisoes);
    salvarRevisoes(backup.revisoes);

    setHistorico(backup.historico);
    salvarHistorico(backup.historico);

    if (backup.planejamentoSemanal) {
      const ps = backup.planejamentoSemanal;
      if (ps && typeof ps === 'object') {
        if (!ps.diasAtivos || !Array.isArray(ps.diasAtivos) || ps.diasAtivos.length !== 7) {
          ps.diasAtivos = [true, true, true, true, true, true, false];
        }
        localStorage.setItem('tcu_planejamento_semanal', JSON.stringify(ps));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0E12] text-[#E2E8F0] flex flex-col font-sans antialiased" id="tcu-app-layout">
      
      {/* HEADER DE MARCA COMPREENSIVO */}
      <header className="bg-[#0F172A] text-[#E2E8F0] border-b border-[#1E293B] shrink-0" id="tcu-header-brand">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3.5" id="brand-logo-area">
            <div className="p-2.5 bg-[#1E293B] border border-[#C5A059] text-[#C5A059] rounded flex items-center justify-center shadow-md">
              <Shield size={24} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-display font-bold tracking-wider leading-none text-[#C5A059]">TCU Auditor</h1>
                <span className="text-[9px] bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase font-mono">
                  Estratégia Sync
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-[0.25em] font-sans mt-1">
                Área de Controle Externo • Controle de Ciclos e Revisões
              </p>
            </div>
          </div>

          {/* User Welcome and resets */}
          <div className="flex items-center space-x-4" id="brand-user-area">
            <div className="text-right hidden md:block">
              <span className="text-[10px] text-[#64748B] tracking-widest uppercase block font-mono">Assinante Premium</span>
              <span className="text-xs font-serif italic text-[#C5A059]">Plano TCU Auditor de Controle</span>
            </div>
            
            <div className="w-8 h-8 rounded-full border border-[#C5A059] bg-[#1E293B] text-[#C5A059] flex items-center justify-center font-serif text-xs font-semibold">
              JP
            </div>

            <button
              onClick={handleResetarGeral}
              className="text-[10px] text-[#94A3B8] hover:text-rose-400 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-[#1E293B] px-2.5 rounded py-1.5 transition-colors flex items-center gap-1.5 font-sans"
              title="Redefinir planilhas"
            >
              <LogOut size={11} className="text-[#C5A059]" /> Redefinir Planilha
            </button>
          </div>

        </div>
      </header>

      {/* PAINEL DE NAVEGAÇÃO DE PÁGINAS (TABS) */}
      <nav className="bg-[#0C0E12] border-b border-[#1E293B] sticky top-0 z-40" id="tcu-navigation-rail">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-2 overflow-x-auto py-2 no-scrollbar scroll-smooth" id="nav-group-scroll">
            
            <button
              onClick={() => setAbaAtiva('painel')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'painel' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              📊 Painel Geral
            </button>

            <button
              onClick={() => setAbaAtiva('ciclo')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'ciclo' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              ⏱️ Ciclo de Estudo
            </button>

            <button
              onClick={() => setAbaAtiva('planejamento')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'planejamento' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              📅 Cronograma Semanal
            </button>

            <button
              onClick={() => {
                setMateriaEditalAtivaId(undefined);
                setAbaAtiva('edital');
              }}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'edital' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              📚 Material Estratégia
            </button>

            <button
              onClick={() => setAbaAtiva('revisoes')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'revisoes' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              📅 Revisões Espaçadas
            </button>

            <button
              onClick={() => setAbaAtiva('simulados')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'simulados' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              🏆 Simulados FGV/Banca
            </button>

            <button
              onClick={() => setAbaAtiva('coach')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'coach' ? 'border-[#C5A059] text-[#C5A059] bg-[#0F172A]/80' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              ✨ IA Tutor Coach
            </button>

            <button
              onClick={() => setAbaAtiva('dados')}
              className={`px-4.5 py-3 rounded-none text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all border-b-2 ${abaAtiva === 'dados' ? 'border-[#C5A059] text-white bg-[#0F172A]/60' : 'border-transparent text-[#64748B] hover:text-[#C5A059]'}`}
            >
              ⚙️ Dados & Backup
            </button>

          </div>
        </div>
      </nav>

      {/* CORPO DA PÁGINA COM RENDERIZAÇÃO ANIMADA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8" id="tcu-content-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="focus:outline-none"
          >
            
            {/* RENDERIZAÇÃO SELETIVA DE ABAS */}
            {abaAtiva === 'painel' && materias.length > 0 && (
              <DashboardStats 
                materias={materias} 
                historico={historico} 
                onSelectMateria={handleNavegarParaMateriaEdital}
              />
            )}

            {abaAtiva === 'ciclo' && ciclo && materias.length > 0 && (
              <CicloEstudoSeccao
                materias={materias}
                ciclo={ciclo}
                historico={historico}
                onSalvarCiclo={handleSalvarCiclo}
                onAdicionarLog={handleAdicionarLogSessao}
              />
            )}

            {abaAtiva === 'planejamento' && materias.length > 0 && (
              <PlanejamentoSemanal
                materias={materias}
                onAtualizarAula={handleAtualizarAula}
                onAdicionarLog={handleAdicionarLogSessao}
              />
            )}

            {abaAtiva === 'edital' && materias.length > 0 && (
              <CursosEstrategia
                materias={materias}
                onAtualizarAula={handleAtualizarAula}
                materiaInicialAbertaId={materiaEditalAtivaId}
                historico={historico}
              />
            )}

            {abaAtiva === 'revisoes' && materias.length > 0 && (
              <RevisoesEspacadas
                materias={materias}
                revisoes={revisoes}
                onSalvarRevisoes={handleSalvarRevisoes}
              />
            )}

            {abaAtiva === 'simulados' && materias.length > 0 && (
              <SimuladosBanca
                materias={materias}
                simulados={simulados}
                onSalvarSimulados={handleSalvarSimulados}
              />
            )}

            {abaAtiva === 'coach' && materias.length > 0 && (
              <IADiagnostico
                materias={materias}
                simulados={simulados}
                historico={historico}
              />
            )}

            {abaAtiva === 'dados' && (
              <DadosEBackup
                materias={materias}
                ciclo={ciclo}
                simulados={simulados}
                revisoes={revisoes}
                historico={historico}
                onImportBackup={handleImportarBackupTotal}
                onResetGeral={handleResetarGeral}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0C0E12] border-t border-[#1E293B] text-[#64748B] py-8 text-center text-[10px] sm:text-xs shrink-0 font-sans" id="tcu-footer">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-serif italic text-[#C5A059] text-base font-semibold tracking-wide">Plataforma de Alta Performance para TCU Auditor de Controle Externo</p>
          <p className="font-normal text-[#94A3B8]">Desenvolvido com foco no material programático do Estratégia Concursos e metodologia de ciclos integrados com revisões científicas espaçadas.</p>
          <p className="font-mono text-[9px] text-[#64748B] mt-2">© 2026 TCU Auditor Planner - Conteúdo 100% persistido e criptografado localmente no navegador.</p>
        </div>
      </footer>

    </div>
  );
}
