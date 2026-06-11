import React, { useState } from 'react';
import { Materia, Simulado } from '../types';
import { Award, PlusCircle, Check, Trash2, Calendar, Target, AlertTriangle, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface SimuladoProps {
  materias: Materia[];
  simulados: Simulado[];
  onSalvarSimulados: (novosSimulados: Simulado[]) => void;
}

export default function SimuladosBanca({ materias, simulados, onSalvarSimulados }: SimuladoProps) {
  const [mostrarNovoForm, setMostrarNovoForm] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>('sim_1');

  // Form States
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [banca, setBanca] = useState('FGV (Estratégia)');
  const [observacoes, setObservacoes] = useState('');

  // Performance por matéria - Dicionário local
  const [perfMateria, setPerfMateria] = useState<{
    [materiaId: string]: { questoes: number; acertos: number }
  }>({});

  const handleMateriaChange = (materiaId: string, campo: 'questoes' | 'acertos', valor: number) => {
    setPerfMateria(prev => {
      const materiaPerf = prev[materiaId] || { questoes: 0, acertos: 0 };
      const novaPerf = { ...materiaPerf, [campo]: valor };
      
      // Validação: Acertos não podem superar total de questões
      if (campo === 'questoes' && novaPerf.acertos > valor) {
        novaPerf.acertos = valor;
      }
      if (campo === 'acertos' && valor > novaPerf.questoes) {
        novaPerf.questoes = valor; 
      }

      return {
        ...prev,
        [materiaId]: novaPerf
      };
    });
  };

  const handleExcluirSimulado = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza de que deseja expurgar este simulado do seu histórico?")) {
      const novos = simulados.filter(s => s.id !== id);
      onSalvarSimulados(novos);
    }
  };

  const handleCadastrarSimulado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo) {
      alert("Por favor defina o título do Simulado.");
      return;
    }

    // Calcular totais gerais baseados nas matérias inseridas
    let totalQuestoes = 0;
    let totalAcertos = 0;
    const desempenhoPorMateria: Simulado['desempenhoPorMateria'] = {};

    (Object.entries(perfMateria) as [string, { questoes: number; acertos: number }][]).forEach(([materiaId, perf]) => {
      if (perf.questoes > 0) {
        totalQuestoes += perf.questoes;
        totalAcertos += perf.acertos;
        desempenhoPorMateria[materiaId] = {
          questoes: perf.questoes,
          acertos: perf.acertos,
          erros: perf.questoes - perf.acertos
        };
      }
    });

    if (totalQuestoes === 0) {
      alert("Por favor insira pelo menos o desempenho de 1 matéria.");
      return;
    }

    const novo: Simulado = {
      id: `sim_${Date.now()}`,
      titulo,
      data,
      banca,
      totalQuestoes,
      questoesAcertadas: totalAcertos,
      questoesErradas: totalQuestoes - totalAcertos,
      desempenhoPorMateria,
      observacoes: observacoes || undefined
    };

    onSalvarSimulados([novo, ...simulados]);
    setMostrarNovoForm(false);
    setTitulo('');
    setObservacoes('');
    setPerfMateria({});
    setExpandidoId(novo.id);
  };

  const toggleExpandido = (id: string) => {
    setExpandidoId(expandidoId === id ? null : id);
  };

  return (
    <div className="space-y-6" id="simulados-root">
      
      {/* Barra de título do painel */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="simulados-toolbar">
        <div>
          <h3 className="text-base font-display font-medium text-white flex items-center gap-2">
            <Award size={18} className="text-[#C5A059]" />
            Controle de Simulados de Auditoria (FGV)
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">Lance o espelho de notas do Estratégia e trackeie seu percentual de corte real.</p>
        </div>

        <button
          onClick={() => setMostrarNovoForm(!mostrarNovoForm)}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all font-sans cursor-pointer"
        >
          <PlusCircle size={15} /> Registrar Gabarito de Simulado
        </button>
      </div>

      {/* FORM DE NOVO SIMULADO */}
      {mostrarNovoForm && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-6 shadow-md border-l-4 border-l-[#C5A059] animate-scale-up" id="novo-form-simulado">
          <h4 className="text-sm font-display font-medium text-white mb-4 flex items-center gap-1.5 pb-2 border-b border-[#1E293B]">
            📝 Lançar Gabarito de Novo Simulado
          </h4>

          <form onSubmit={handleCadastrarSimulado} className="space-y-6">
            
            {/* Header Dados Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="simulado-general-inputs">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Título do Simulado</label>
                <input 
                  type="text" 
                  placeholder="Ex: Simulado Excl. TCU Auditor - Estratégia"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Data Realização</label>
                <input 
                  type="date" 
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Banca Reguladora</label>
                <input 
                  type="text" 
                  value={banca}
                  onChange={(e) => setBanca(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                  required
                />
              </div>
            </div>

            {/* Performance detalhada por Matérias */}
            <div className="space-y-3" id="simulado-subject-performance-editor">
              <h5 className="text-[11px] font-mono font-bold uppercase text-[#94A3B8] tracking-widest pl-1 border-l-2 border-[#C5A059]">Insira as Questões e Acertos de cada Matéria:</h5>
              <p className="text-[11px] text-[#64748B] font-sans">Deixe em branco ou zerado as matérias que não participaram deste simulado.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="subject-fields-grid">
                {materias.map(m => {
                  const perf = perfMateria[m.id] || { questoes: 0, acertos: 0 };
                  const errosNum = perf.questoes - perf.acertos;
                  const taxa = perf.questoes > 0 ? Math.round((perf.acertos / perf.questoes) * 100) : 0;

                  return (
                    <div 
                      key={m.id} 
                      className="bg-[#0C0E12] border border-[#1E293B] p-3.5 rounded space-y-2.5 border-l-2"
                      style={{ borderLeftColor: m.cor }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#E2E8F0]">{m.nome}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded text-black font-mono" style={{ backgroundColor: m.cor }}>
                          {m.sigla}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2" id={`fields-${m.id}`}>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-semibold text-[#64748B]">Questoes</label>
                          <input 
                            type="number"
                            min="0"
                            placeholder="0"
                            value={perf.questoes || ''}
                            onChange={(e) => handleMateriaChange(m.id, 'questoes', parseInt(e.target.value) || 0)}
                            className="w-full bg-[#1E293B]/70 border border-[#2D3748] rounded p-1.5 text-xs text-center font-mono font-bold text-white focus:border-[#C5A059] outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-semibold text-emerald-400">Acertos</label>
                          <input 
                            type="number"
                            min="0"
                            max={perf.questoes}
                            placeholder="0"
                            value={perf.acertos || ''}
                            onChange={(e) => handleMateriaChange(m.id, 'acertos', parseInt(e.target.value) || 0)}
                            className="w-full bg-[#1E293B]/70 border border-[#2D3748] rounded p-1.5 text-xs text-center font-mono font-bold text-emerald-400 focus:border-[#C5A059] outline-none"
                          />
                        </div>
                      </div>

                      {perf.questoes > 0 && (
                        <div className="flex justify-between text-[10px] text-[#64748B] pt-1 font-mono">
                          <span>Erros: {errosNum}</span>
                          <span className={taxa >= 80 ? 'text-[#C5A059] font-bold' : taxa >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                            Acertos: {taxa}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Anotações e Próximos Passos</label>
              <textarea 
                placeholder="Insira as principais falhas ocorridas e metas para o próximo ciclo de estudos do Estratégia."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-[#0C0E12] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] h-20 resize-none font-sans outline-none focus:border-[#C5A059] transition-colors"
              />
            </div>

            {/* Ações */}
            <div className="flex justify-end space-x-2 pt-2" id="simulado-form-footer">
              <button
                type="button"
                onClick={() => setMostrarNovoForm(false)}
                className="px-4 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] border border-[#2D3748] rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Check size={14} /> Registrar Simulado
              </button>
            </div>

          </form>
        </div>
      )}

      {/* LISTA DE SIMULADOS CADASTRADOS */}
      <div className="space-y-3" id="simulados-accordion-list">
        {simulados.length > 0 ? (
          simulados.map(sim => {
            const exp = expandidoId === sim.id;
            const percentual = Math.round((sim.questoesAcertadas / sim.totalQuestoes) * 100) || 0;

            return (
              <div 
                key={sim.id}
                className={`bg-[#0F172A] border rounded shadow-sm overflow-hidden transition-all ${exp ? 'border-[#C5A059]/50 shadow-md' : 'border-[#1E293B]'}`}
              >
                {/* Accordion Cabeçalho do Simulado */}
                <div 
                  onClick={() => toggleExpandido(sim.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#1E293B]/25 transition-colors select-none"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded shrink-0 border ${percentual >= 80 ? 'bg-[#0E1B1E] text-[#C5A059] border-[#C5A059]/20' : 'bg-[#0C0E12] text-[#64748B] border-[#1E293B]'}`}>
                      <Star size={18} className={percentual >= 80 ? 'fill-current' : ''} />
                    </div>
                    <div>
                      <h4 className="text-sm font-display font-semibold text-white leading-tight">{sim.titulo}</h4>
                      
                      <div className="flex items-center gap-3 text-[10px] text-[#64748B] mt-1.5">
                        <span className="flex items-center gap-1 font-mono text-[#94A3B8]">
                          <Calendar size={11} /> {new Date(sim.data).toLocaleDateString('pt-BR')}
                        </span>
                        <span>•</span>
                        <span className="bg-[#1E293B] border border-[#2D3748] px-1.5 py-0.5 rounded text-[#94A3B8] font-mono text-[9px] font-semibold uppercase">{sim.banca}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#94A3B8]">{sim.totalQuestoes} questões</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes de Score Geral */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-[#1E293B]/40 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[9px] font-mono font-bold text-[#64748B] block uppercase tracking-wider">Aproveitamento</span>
                      <span className={`text-sm sm:text-base font-black font-mono ${percentual >= 80 ? 'text-[#C5A059]' : percentual >= 70 ? 'text-amber-450' : 'text-rose-400'}`}>
                        {percentual}% acertos
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleExcluirSimulado(sim.id, e)}
                        className="p-2 hover:bg-rose-950/20 text-[#475569] hover:text-rose-455 rounded transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                      {exp ? <ChevronUp className="text-[#64748B]" /> : <ChevronDown className="text-[#64748B]" />}
                    </div>
                  </div>
                </div>

                {/* VISUALIZAÇÃO INTERNA DETALHADA POR MATÉRIA NO SIMULADO */}
                {exp && (
                  <div className="p-5 bg-[#0C0E12] border-t border-[#1E293B] leading-normal animate-slide-up space-y-4 font-sans" id={`simulated-breakdowns-${sim.id}`}>
                    
                    <h5 className="text-[10px] font-mono font-bold uppercase text-[#64748B] tracking-wider flex items-center gap-1.5">
                      <Target size={13} className="text-[#C5A059]" /> Detalhes do Acerto por Assunto e Matéria:
                    </h5>

                    {/* Grid de matérias */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="mock-subject-performance-grid">
                      {Object.entries(sim.desempenhoPorMateria).map(([materiaId, perf]) => {
                        const mat = materias.find(m => m.id === materiaId);
                        const matPerc = perf.questoes > 0 ? Math.round((perf.acertos / perf.questoes) * 100) : 0;
                        if (!mat) return null;

                        return (
                          <div key={materiaId} className="bg-[#0F172A] border border-[#1E293B] rounded p-3.5 space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-white">
                              <span className="truncate max-w-[100px]">{mat.sigla} - {mat.nome}</span>
                              <span className="font-mono text-[#94A3B8] font-normal text-[10px]">({perf.acertos}/{perf.questoes})</span>
                            </div>
                            
                            {/* Medidor progressivo */}
                            <div className="w-full bg-[#0C0E12] h-1 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${matPerc}%`, backgroundColor: mat.cor }} />
                            </div>

                            <div className="flex justify-between items-center text-[10px] pt-0.5">
                              <span className="text-[#64748B] font-mono">Erros: {perf.erros}</span>
                              <span className={`font-bold font-mono ${matPerc >= 85 ? 'text-[#C5A059]' : matPerc >= 70 ? 'text-emerald-450' : 'text-rose-450'}`}>
                                {matPerc}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Observações */}
                    {sim.observacoes && (
                      <div className="bg-[#1E293B]/30 border border-[#C5A059]/20 p-4 rounded text-xs text-[#C5A059] leading-relaxed space-y-1.5" id="mock-observation-bubble">
                        <span className="font-bold flex items-center gap-1 text-[#E2E8F0]">
                          <AlertTriangle size={13} className="text-[#C5A059]" />
                          Autoanálise do Aluno:
                        </span>
                        <p className="font-normal font-sans italic text-[#E2E8F0]/90">"{sim.observacoes}"</p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded p-10 text-center text-[#64748B]" id="no-simulated-records">
            <Award size={32} className="text-[#1E293B] mx-auto mb-2" />
            <p className="font-semibold text-white">Nenhum simulado registrado no histórico.</p>
            <p className="text-xs text-[#94A3B8]">Clique em "Registrar Gabarito" acima para lançar suas métricas de simulados TCU/FGV.</p>
          </div>
        )}
      </div>

    </div>
  );
}
