import React, { useState, useEffect } from 'react';
import { Materia, Aula, StatusAula, LogSessao } from '../types';
import { Search, ChevronDown, ChevronUp, Save, Clock, HelpCircle, Check, Play, BookOpen, Layers } from 'lucide-react';

interface CursosProps {
  materias: Materia[];
  onAtualizarAula: (materiaId: string, aulaAtualizada: Aula) => void;
  materiaInicialAbertaId?: string;
  historico?: LogSessao[];
}

export default function CursosEstrategia({ materias, onAtualizarAula, materiaInicialAbertaId, historico = [] }: CursosProps) {
  const [pesquisa, setPesquisa] = useState('');
  const [materiaFiltro, setMateriaFiltro] = useState<string>('todos');
  const [abertosMaterias, setAbertosMaterias] = useState<{ [key: string]: boolean }>({
    'controle_externo': true, // default open
    'afo_dir_financeiro': true
  });

  // Editor Inline de Aula
  const [aulaEmEdicao, setAulaEmEdicao] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<StatusAula>(StatusAula.NaoIniciado);
  const [editQuestoes, setEditQuestoes] = useState(0);
  const [editAcertos, setEditAcertos] = useState(0);
  const [editErradas, setEditErradas] = useState(0);
  const [editHoras, setEditHoras] = useState(0);

  useEffect(() => {
    if (materiaInicialAbertaId) {
      setAbertosMaterias(prev => ({
        ...prev,
        [materiaInicialAbertaId]: true
      }));
      setMateriaFiltro('todos');
    }
  }, [materiaInicialAbertaId]);

  const toggleMateria = (materiaId: string) => {
    setAbertosMaterias(prev => ({
      ...prev,
      [materiaId]: !prev[materiaId]
    }));
  };

  const iniciarEdicao = (materiaId: string, aula: Aula) => {
    setAulaEmEdicao(`${materiaId}_${aula.id}`);
    setEditStatus(aula.status);
    setEditQuestoes(aula.questoesResolvidas || 0);
    setEditAcertos(aula.questoesAcertadas || 0);
    setEditErradas(aula.questoesErradas || 0);
    setEditHoras(aula.horasEstudadas || 0);
  };

  const salvarEdicao = (materiaId: string, aulaId: string) => {
    const originalMateria = materias.find(m => m.id === materiaId);
    if (!originalMateria) return;
    const originalAula = originalMateria.aulas.find(a => a.id === aulaId);
    if (!originalAula) return;

    const dataConclusao = editStatus === StatusAula.Concluido 
      ? (originalAula.dataConclusao || new Date().toISOString().split('T')[0])
      : undefined;

    const aulaAtualizada: Aula = {
      ...originalAula,
      status: editStatus,
      questoesResolvidas: editQuestoes,
      questoesAcertadas: editAcertos,
      questoesErradas: editErradas,
      horasEstudadas: editHoras,
      dataConclusao
    };

    onAtualizarAula(materiaId, aulaAtualizada);
    setAulaEmEdicao(null);
  };

  const handleAcertosChange = (val: number) => {
    setEditAcertos(val);
    if (editQuestoes >= val) {
      setEditErradas(editQuestoes - val);
    }
  };

  const handleQuestoesChange = (val: number) => {
    setEditQuestoes(val);
    if (val >= editAcertos) {
      setEditErradas(val - editAcertos);
    }
  };

  // Filtrar Matérias e Aulas
  const materiasFiltradas = materias.filter(m => {
    if (materiaFiltro !== 'todos' && m.id !== materiaFiltro) return false;
    return true;
  }).map(m => {
    // Filtrar aulas se houver termo de pesquisa
    const aulasFiltradas = m.aulas.filter(a => 
      a.titulo.toLowerCase().includes(pesquisa.toLowerCase()) ||
      `aula ${a.numero}`.includes(pesquisa.toLowerCase())
    );
    return {
      ...m,
      aulas: aulasFiltradas
    };
  }).filter(m => m.aulas.length > 0);

  const getStatusColor = (status: StatusAula) => {
    switch (status) {
      case StatusAula.NaoIniciado:
        return 'bg-[#1E293B]/50 text-[#64748B] border border-[#1E293B]';
      case StatusAula.LendoPDF:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case StatusAula.AssistindoVideo:
        return 'bg-sky-500/10 text-sky-450 border border-sky-500/20';
      case StatusAula.Revisando:
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case StatusAula.Concluido:
        return 'bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30';
      default:
        return 'bg-[#1E293B]/50 text-[#64748B] border border-[#1E293B]';
    }
  };

  return (
    <div className="space-y-6" id="cursos-estrategia-root">
      
      {/* Barra de Ações - Filtros e Pesquisa */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between" id="courses-filter-toolbar">
        
        {/* Pesquisa Livre de Assuntos */}
        <div className="relative w-full md:max-w-md" id="course-search-container">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input 
            type="text"
            placeholder="Pesquisar por assunto ou aula do Estratégia..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="w-full bg-[#0C0E12] border border-[#1E293B] rounded py-2 pl-10 pr-4 text-sm text-[#E2E8F0] outline-none focus:border-[#C5A059] font-sans transition-colors"
          />
        </div>

        {/* Filtro Dropdown por Matéria Principal */}
        <div className="flex items-center space-x-2 w-full md:w-auto" id="course-dropdown-filtering">
          <Layers size={16} className="text-[#64748B] shrink-0" />
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden sm:block">Matéria:</span>
          <select
            value={materiaFiltro}
            onChange={(e) => setMateriaFiltro(e.target.value)}
            className="w-full md:w-48 bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] font-bold font-sans transition-colors"
          >
            <option value="todos">Todos os Cursos</option>
            {materias.map(m => (
              <option key={m.id} value={m.id} className="bg-[#0F172A]">{m.sigla} - {m.nome}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Accordions de matérias */}
      <div className="space-y-4" id="courses-accordion-list">
        {materiasFiltradas.length > 0 ? (
          materiasFiltradas.map(m => {
            const aberto = abertosMaterias[m.id] !== false;
            const aulasConcluidas = m.aulas.filter(a => a.status === StatusAula.Concluido).length;
            const percConcluido = Math.round((aulasConcluidas / m.aulas.length) * 100) || 0;

            return (
              <div 
                key={m.id}
                className="bg-[#0F172A] border border-[#1E293B] rounded shadow-sm overflow-hidden animate-editorial-node"
              >
                {/* Accordion Cabeçalho */}
                <div 
                  onClick={() => toggleMateria(m.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#1E293B]/20 transition-colors select-none border-b border-[#1E293B]/50"
                  style={{ borderLeft: `4px solid ${m.cor}` }}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-black uppercase text-black px-2 py-1.5 rounded tracking-wide font-mono shadow-sm" style={{ backgroundColor: m.cor }}>
                      {m.sigla}
                    </span>
                    <div>
                      <h4 className="text-base font-display font-medium text-white">{m.nome}</h4>
                      <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-1">
                        <span>Aulas concluídas: <strong className="text-white">{aulasConcluidas}/{m.aulas.length}</strong></span>
                        <span>•</span>
                        <span className="font-semibold" style={{ color: m.cor }}>{percConcluido}% concluído</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Barra de Progresso Interna */}
                    <div className="w-24 bg-[#0C0E12] h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full" style={{ width: `${percConcluido}%`, backgroundColor: m.cor }} />
                    </div>
                    {aberto ? <ChevronUp className="text-[#64748B]" /> : <ChevronDown className="text-[#64748B]" />}
                  </div>
                </div>

                {/* Lista de Aulas e editor */}
                {aberto && (
                  <div className="divide-y divide-[#1E293B]/40 bg-[#0C0E12]/30 duration-300">
                    {m.aulas.map(a => {
                      const idEdicao = `${m.id}_${a.id}`;
                      const estaEditando = aulaEmEdicao === idEdicao;

                      return (
                        <div key={a.id} className="p-4 transition-all" id={`lecture-row-${a.id}`}>
                          {estaEditando ? (
                            /* DESIGN DO EDITOR INTEGRADO DE AULA */
                            <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-scale-up" id="editor-aula-inline">
                              
                              {/* Status e Horas */}
                              <div className="space-y-3 md:col-span-1">
                                <span className="text-[10px] font-mono font-bold uppercase text-[#64748B] tracking-wider block">Aula {a.numero.toString().padStart(2, '0')}</span>
                                <h5 className="text-xs font-bold text-white leading-tight block">{a.titulo}</h5>
                                
                                <div className="space-y-1.5 pt-1.5">
                                  <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase">Status do Estudo</label>
                                  <select
                                    value={editStatus}
                                    onChange={(e: any) => setEditStatus(e.target.value)}
                                    className="w-full bg-[#1E293B] border border-[#2D3748] rounded px-2 py-1.5 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] font-sans"
                                  >
                                    <option value={StatusAula.NaoIniciado} className="bg-[#0F172A]">Não Iniciado</option>
                                    <option value={StatusAula.LendoPDF} className="bg-[#0F172A]">Lendo PDF</option>
                                    <option value={StatusAula.AssistindoVideo} className="bg-[#0F172A]">Em Vídeo</option>
                                    <option value={StatusAula.Revisando} className="bg-[#0F172A]">Em Revisão</option>
                                    <option value={StatusAula.Concluido} className="bg-[#0F172A]">Concluído</option>
                                  </select>
                                </div>
                              </div>

                              {/* Horas estudadas e Questões */}
                              <div className="space-y-3 md:col-span-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase">Tempo (Decimal h)</label>
                                    <input 
                                      type="number" 
                                      step="0.1" 
                                      min="0"
                                      value={editHoras}
                                      onChange={(e) => setEditHoras(parseFloat(e.target.value) || 0)}
                                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2 text-xs font-bold font-mono text-white focus:border-[#C5A059] outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase">Questões Resolvidas</label>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={editQuestoes}
                                      onChange={(e) => handleQuestoesChange(parseInt(e.target.value) || 0)}
                                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2 text-xs font-bold font-mono text-white focus:border-[#C5A059] outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3" id="edit-questions-sub-row">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono font-bold text-emerald-400 uppercase">Acertos</label>
                                    <input 
                                      type="number" 
                                      min="0"
                                      max={editQuestoes}
                                      value={editAcertos}
                                      onChange={(e) => handleAcertosChange(parseInt(e.target.value) || 0)}
                                      className="w-full bg-[#1E293B] border border-[#2D3748] rounded p-2 text-xs font-bold font-mono text-emerald-400 focus:border-[#C5A059] outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono font-bold text-rose-400 uppercase">Erros</label>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={editErradas}
                                      readOnly
                                      className="w-full bg-[#1E293B]/40 border border-[#2D3748] rounded p-2 text-xs font-bold font-mono text-rose-400 outline-none select-none opacity-70"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Ações Guardar / Cancelar */}
                              <div className="flex flex-row md:flex-col justify-end items-end gap-2 md:col-span-1 border-t md:border-t-0 border-[#1E293B]/70 pt-3 md:pt-0" id="editor-actions">
                                <button
                                  type="button"
                                  onClick={() => setAulaEmEdicao(null)}
                                  className="w-full md:w-auto px-4 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-[#E2E8F0] border border-[#2D3748] rounded text-[11px] font-semibold transition-colors font-sans cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => salvarEdicao(m.id, a.id)}
                                  className="w-full md:w-auto px-4 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 font-sans cursor-pointer"
                                >
                                  <Save size={12} /> Salvar Aula
                                </button>
                              </div>

                            </div>
                          ) : (
                            /* VISUALIZAÇÃO PADRÃO DE DETALHE DE AULA */
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[#E2E8F0]" id="standard-lecture-view">
                              <div className="space-y-1.5 cursor-pointer flex-1" onClick={() => iniciarEdicao(m.id, a)}>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[10px] bg-[#1E293B] font-mono text-[#94A3B8] font-bold px-1.5 py-0.5 rounded border border-[#2D3748]">
                                    Aula {a.numero.toString().padStart(2, '0')}
                                  </span>
                                  <h5 className="font-semibold text-xs sm:text-sm text-white flex-1 hover:text-[#C5A059] transition-colors leading-normal">
                                    {a.titulo}
                                  </h5>
                                  {a.status === StatusAula.Concluido && (
                                    <span className="w-4 h-4 rounded-full bg-[#C5A059] text-black flex items-center justify-center shrink-0">
                                      <Check size={10} strokeWidth={4} />
                                    </span>
                                  )}
                                </div>
                                
                                {/* Estatísticas da Aula */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#64748B] font-sans" id="lecture-stats-badges">
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} /> <span className="text-[#94A3B8] font-mono font-semibold">{a.horasEstudadas.toFixed(1)}h</span> estudadas
                                  </span>

                                  <span className="flex items-center gap-1">
                                    <Layers size={12} className="text-[#C5A059]" /> <span className="text-[#94A3B8] font-mono font-semibold">{historico.filter(h => h.aulaId === a.id).length}x</span> revisões
                                  </span>
                                  
                                  {a.questoesResolvidas > 0 ? (
                                    <span className="flex items-center gap-1 font-mono text-[#64748B]">
                                      <HelpCircle size={12} /> <span className="text-[#94A3B8]">{a.questoesResolvidas} questões</span> (<span className={Math.round((a.questoesAcertadas / a.questoesResolvidas) * 100) >= 80 ? 'text-[#C5A059] font-bold' : 'text-[#94A3B8]'}>{Math.round((a.questoesAcertadas / a.questoesResolvidas) * 100)}% acerto</span>)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-[#475569]">Nenhuma questão vinculada</span>
                                  )}
                                  
                                  {a.dataConclusao && (
                                    <span className="text-emerald-400 font-semibold font-mono text-[10px]">Concluído {a.dataConclusao}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-[#1E293B]/40 pt-2 sm:pt-0">
                                {/* Badge de Status real */}
                                <span className={`text-[9px] font-mono font-bold rounded px-2.5 py-1 tracking-wider uppercase border ${getStatusColor(a.status)}`}>
                                  {a.status}
                                </span>
                                
                                <button
                                  onClick={() => iniciarEdicao(m.id, a)}
                                  className="px-3 py-1 bg-[#1E293B] hover:bg-[#1E293B]/80 hover:text-[#C5A059] border border-[#2D3748] rounded text-xs font-semibold text-[#94A3B8] transition-all font-sans cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded p-8 shadow-sm text-center font-sans space-y-4 text-[#64748B]" id="no-filtered-lessons-box">
            <Search size={32} className="mx-auto text-[#1E293B]" />
            <p className="font-semibold text-white mt-4">Nenhuma aula do Estratégia encontrada.</p>
            <p className="text-xs text-[#94A3B8]">Verifique os filtros de busca ou limpe o termo de busca para visualizar o edital.</p>
          </div>
        )}
      </div>

    </div>
  );
}
