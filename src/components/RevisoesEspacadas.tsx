import React, { useState } from 'react';
import { Materia, RevisaoEspacada, StatusAula } from '../types';
import { Calendar, CheckCircle2, ChevronRight, Play, AlertCircle, PlusCircle, CheckCircle, Clock } from 'lucide-react';

interface RevisaoProps {
  materias: Materia[];
  revisoes: RevisaoEspacada[];
  onSalvarRevisoes: (novasRevisoes: RevisaoEspacada[]) => void;
}

export default function RevisoesEspacadas({ materias, revisoes, onSalvarRevisoes }: RevisaoProps) {
  const [tabAtiva, setTabAtiva] = useState<'pendentes' | 'futuras' | 'concluidas'>('pendentes');
  const [mostrarNovoForm, setMostrarNovoForm] = useState(false);

  // Form States
  const [materiaId, setMateriaId] = useState('');
  const [aulaId, setAulaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [intervaloInicial, setIntervaloInicial] = useState<number>(1); // 1 dia

  const hojeStrState = new Date().toISOString().split('T')[0];

  // Identificar matérias e aulas para o form
  const materiaSelecionada = materias.find(m => m.id === materiaId);

  // Filtragem de Revisões
  const revisoesProcessadas = revisoes.map(r => {
    const mat = materias.find(m => m.id === r.materiaId);
    const alvoDia = r.dataRevisaoAlvo.split('T')[0];
    const hojeDia = hojeStrState;

    const atrasada = !r.concluida && alvoDia < hojeDia;
    const paraHoje = !r.concluida && alvoDia === hojeDia;

    return {
      ...r,
      materiaNome: mat ? mat.nome : 'Geral',
      materiaCor: mat ? mat.cor : '#94a3b8',
      materiaSigla: mat ? mat.sigla : 'TCU',
      atrasada,
      paraHoje
    };
  });

  const pendentes = revisoesProcessadas.filter(r => !r.concluida && (r.atrasada || r.paraHoje));
  const futuras = revisoesProcessadas.filter(r => !r.concluida && !r.atrasada && !r.paraHoje);
  const concluidas = revisoesProcessadas.filter(r => r.concluida);

  // Avançar Etapa de Revisão Espaçada (24h -> 7d -> 30d -> Concluído)
  const handleRealizarRevisao = (id: string) => {
    const novasRevisoes = revisoes.map(r => {
      if (r.id !== id) return r;

      const hoje = new Date();
      let novoIntervalo = 1;
      let novaEtapa = r.etapa;
      let concluidaCompleta = false;

      if (r.etapa === 1) {
        // Estágio 24h feito -> Próxima revisão em 7 dias
        novoIntervalo = 7;
        novaEtapa = 2;
        hoje.setDate(hoje.getDate() + 7);
      } else if (r.etapa === 2) {
        // Estágio 7d feito -> Próxima revisão em 30 dias
        novoIntervalo = 30;
        novaEtapa = 3;
        hoje.setDate(hoje.getDate() + 30);
      } else {
        // Estágio 30d feito -> Conclui totalmente a repetição espaçada!
        concluidaCompleta = true;
      }

      const historicoAtualizado = [
        ...r.historico,
        { data: new Date().toISOString(), status: 'concluida' as const }
      ];

      return {
        ...r,
        concluida: concluidaCompleta,
        etapa: novaEtapa,
        intervaloDias: novoIntervalo,
        dataRevisaoAlvo: hoje.toISOString(),
        historico: historicoAtualizado
      };
    });

    onSalvarRevisoes(novasRevisoes);
    alert("Revisão registrada! Pelo método de repetição espaçada, o cérebro memorizou o conteúdo. O próximo ciclo de revisão foi agendado automaticamente!");
  };

  const handleExcluirRevisao = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta meta de revisão?")) {
      const novas = revisoes.filter(r => r.id !== id);
      onSalvarRevisoes(novas);
    }
  };

  const handleCadastrarRevisao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiaId || !aulaId) {
      alert("Por favor selecione a matéria e a respectiva aula do Estratégia.");
      return;
    }

    const dataAlvoStrObj = new Date();
    dataAlvoStrObj.setDate(dataAlvoStrObj.getDate() + intervaloInicial);

    const nova: RevisaoEspacada = {
      id: `rev_${Date.now()}`,
      materiaId,
      aulaId,
      titulo: titulo || `Revisão - ${materiaSelecionada?.sigla}: Aula cadastrada`,
      dataCriacao: new Date().toISOString(),
      dataRevisaoAlvo: dataAlvoStrObj.toISOString(),
      intervaloDias: intervaloInicial,
      concluida: false,
      etapa: intervaloInicial === 1 ? 1 : (intervaloInicial === 7 ? 2 : 3),
      historico: [
        { data: new Date().toISOString(), status: 'agendada' }
      ]
    };

    onSalvarRevisoes([...revisoes, nova]);
    setMostrarNovoForm(false);
    setMateriaId('');
    setAulaId('');
    setTitulo('');
    setIntervaloInicial(1);
  };

  const getEtapaNome = (etapa: number) => {
    switch (etapa) {
      case 1: return 'Etapa 1 (24 Horas)';
      case 2: return 'Etapa 2 (7 Dias)';
      case 3: return 'Etapa 3 (30 Dias)';
      default: return 'Fixado na memória';
    }
  };

  return (
    <div className="space-y-6" id="revisoes-root">
      
      {/* Botões Superiores e Tabuladores */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0F172A] border border-[#1E293B] rounded p-4 shadow-sm" id="revisions-toolbar">
        
        {/* Filtros tabs */}
        <div className="flex space-x-1 bg-[#0C0E12] p-1 rounded border border-[#1E293B]" id="tabs-repeticao">
          <button
            onClick={() => setTabAtiva('pendentes')}
            className={`px-4 py-2 rounded-sm text-xs font-semibold tracking-wide transition-all ${tabAtiva === 'pendentes' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
          >
            Para Hoje e Atrasadas ({pendentes.length})
          </button>
          <button
            onClick={() => setTabAtiva('futuras')}
            className={`px-4 py-2 rounded-sm text-xs font-semibold tracking-wide transition-all ${tabAtiva === 'futuras' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
          >
            Próximos Dias ({futuras.length})
          </button>
          <button
            onClick={() => setTabAtiva('concluidas')}
            className={`px-4 py-2 rounded-sm text-xs font-semibold tracking-wide transition-all ${tabAtiva === 'concluidas' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
          >
            Arquivadas / Feitas ({concluidas.length})
          </button>
        </div>

        {/* Criar nova revisão */}
        <button
          onClick={() => setMostrarNovoForm(!mostrarNovoForm)}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <PlusCircle size={15} /> Agendar Revisão Metódica
        </button>

      </div>

      {/* FORM DE CADASTRO DE REVISÃO ESPAÇADA MANUAL */}
      {mostrarNovoForm && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 shadow-sm animate-scale-up" id="novo-form-revisao">
          <h4 className="text-sm font-display font-medium text-white mb-4 flex items-center gap-2 border-b border-[#1E293B] pb-2.5">
            <Calendar size={16} className="text-[#C5A059]" />
            Configurar Nova Meta de Revisão Espaçada
          </h4>

          <form onSubmit={handleCadastrarRevisao} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Escolha Matéria */}
            <div className="md:col-span-1 space-y-1">
              <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-widest block">1. Curso Estratégia</label>
              <select
                value={materiaId}
                onChange={(e) => { setMateriaId(e.target.value); setAulaId(''); }}
                className="w-full bg-[#0C0E12] border border-[#2D3748] rounded px-3 py-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                required
              >
                <option value="">Selecione o Curso...</option>
                {materias.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#0F172A]">{m.sigla} - {m.nome}</option>
                ))}
              </select>
            </div>

            {/* Escolha Aula */}
            <div className="md:col-span-1 space-y-1">
              <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-widest block">2. Aula / Assunto</label>
              <select
                value={aulaId}
                onChange={(e) => {
                  setAulaId(e.target.value);
                  const selectedAul = materiaSelecionada?.aulas.find(a => a.id === e.target.value);
                  if (selectedAul) setTitulo(`Revisar - ${materiaSelecionada?.sigla}: Aula ${selectedAul.numero}`);
                }}
                disabled={!materiaId}
                className="w-full bg-[#0C0E12] border border-[#2D3748] rounded px-3 py-2 text-xs text-[#E2E8F0] outline-none disabled:opacity-30 focus:border-[#C5A059]"
                required
              >
                <option value="">Selecione o Tópico...</option>
                {materiaSelecionada?.aulas.map(a => (
                  <option key={a.id} value={a.id} className="bg-[#0F172A]">Aula {a.numero.toString().padStart(2, '0')} - {a.titulo}</option>
                ))}
              </select>
            </div>

            {/* Intervalo Inicial */}
            <div className="md:col-span-1 space-y-1">
              <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-widest block">3. Intervalo Inicial</label>
              <select
                value={intervaloInicial}
                onChange={(e) => setIntervaloInicial(parseInt(e.target.value))}
                className="w-full bg-[#0C0E12] border border-[#2D3748] rounded px-3 py-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
              >
                <option value={1} className="bg-[#0F172A]">24 Horas (Recomenda-se após teoria)</option>
                <option value={7} className="bg-[#0F172A]">7 Dias (Perfeito para fixação secundária)</option>
                <option value={30} className="bg-[#0F172A]">30 Dias (Blindagem contra curva de esquecimento)</option>
              </select>
            </div>

            {/* Salvar */}
            <div className="md:col-span-1 flex items-end gap-2">
              <button
                type="submit"
                className="w-full bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded py-2 text-xs font-semibold cursor-pointer"
              >
                Agendar e Ativar
              </button>
              <button
                type="button"
                onClick={() => setMostrarNovoForm(false)}
                className="bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#94A3B8] border border-[#2D3748] rounded py-2 px-3 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>

          </form>
        </div>
      )}

      {/* RENDERIZADOR DAS TABS */}
      <div className="space-y-3" id="spaced-cards-renderer">
        
        {/* TAB PENDENTES */}
        {tabAtiva === 'pendentes' && (
          pendentes.length > 0 ? (
            pendentes.map(r => (
              <div 
                key={r.id}
                className={`bg-[#0F172A] border p-5 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#C5A059]/30 shadow-sm ${r.atrasada ? 'border-rose-950 bg-rose-950/10' : 'border-[#1E293B]'}`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2.5 rounded shrink-0 border ${r.atrasada ? 'bg-rose-550/10 text-rose-400 border-rose-500/20' : 'bg-[#0C0E12] text-[#C5A059] border-[#1E293B]'}`}>
                    <Calendar size={22} className={r.atrasada ? 'animate-bounce' : ''} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: r.materiaCor }}>
                        {r.materiaSigla}
                      </span>
                      <span className="text-xs font-bold text-[#94A3B8]">{r.materiaNome}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1.5 font-sans leading-normal">{r.titulo}</h4>
                    
                    <div className="flex items-center gap-3 text-[10px] text-[#64748B] mt-1.5 pb-1">
                      <span className="font-mono flex items-center gap-1 text-[#94A3B8]">
                        <Clock size={11} /> Alvo: {new Date(r.dataRevisaoAlvo).toLocaleDateString('pt-BR')}
                      </span>
                      <span>•</span>
                      <span className="bg-[#1E293B] text-[#94A3B8] border border-[#2D3748] font-mono font-bold px-1.5 py-0.5 rounded text-[9px] tracking-wide">
                        {getEtapaNome(r.etapa)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#1E293B]/40">
                  {r.atrasada && (
                    <span className="text-[9px] font-mono font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 flex items-center gap-1 mr-2">
                      <AlertCircle size={12} /> Atrasado de Estudo
                    </span>
                  )}
                  {r.paraHoje && (
                    <span className="text-[9px] font-mono font-black uppercase text-[#C5A059] bg-[#C5A059]/10 px-2 py-1 rounded border border-[#C5A059]/30 flex items-center gap-1 mr-2">
                      ⭐ Fazer Hoje
                    </span>
                  )}

                  <button
                    onClick={() => handleRealizarRevisao(r.id)}
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 size={13} /> Marcar como Feita
                  </button>
                  <button
                    onClick={() => handleExcluirRevisao(r.id)}
                    className="p-1 px-2 hover:bg-[#1E293B] text-[#475569] hover:text-rose-450 rounded text-xs transition-colors cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded p-10 text-center text-slate-400 space-y-3" id="no-pending-revisions">
              <CheckCircle size={36} className="text-[#C5A059] mx-auto animate-pulse" />
              <p className="font-semibold text-white">Nenhuma revisão pendente para hoje!</p>
              <p className="text-xs text-[#94A3B8] leading-relaxed max-w-sm mx-auto">Sua mente está limpa e no ápice do aprendizado. Retorne ao Ciclo de Estudos e feche mais matérias do edital do Estratégia TCU!</p>
            </div>
          )
        )}

        {/* TAB FUTURAS */}
        {tabAtiva === 'futuras' && (
          futuras.length > 0 ? (
            futuras.map(r => (
              <div 
                key={r.id}
                className="bg-[#0F172A] border border-[#1E293B] p-5 rounded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#C5A059]/30"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 bg-[#0C0E12] border border-[#1E293B] text-[#64748B] rounded">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: r.materiaCor }}>
                        {r.materiaSigla}
                      </span>
                      <span className="text-xs font-bold text-[#94A3B8]">{r.materiaNome}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1.5 font-sans leading-normal">{r.titulo}</h4>
                    
                    <div className="flex items-center gap-3 text-[10px] text-[#64748B] mt-1.5">
                      <span className="font-mono flex items-center gap-1 text-[#94A3B8]">
                        <Clock size={11} /> Agendada para: {new Date(r.dataRevisaoAlvo).toLocaleDateString('pt-BR')}
                      </span>
                      <span>•</span>
                      <span className="bg-[#1E293B] text-[#94A3B8] border border-[#2D3748] font-mono font-bold px-1.5 py-0.5 rounded text-[9px] tracking-wide">
                        {getEtapaNome(r.etapa)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#1E293B]/45">
                  <button
                    onClick={() => handleRealizarRevisao(r.id)}
                    className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#C5A059] border border-[#2D3748] rounded text-xs font-semibold cursor-pointer"
                  >
                    Adiantar
                  </button>
                  <button
                    onClick={() => handleExcluirRevisao(r.id)}
                    className="p-1 px-2 hover:bg-[#1E293B] text-[#475569] hover:text-rose-450 rounded text-xs transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded p-10 text-center text-[#64748B]" id="no-future-revisions">
              <Calendar size={32} className="text-[#1E293B] mx-auto mb-2" />
              <p className="font-semibold text-white">Nenhuma revisão futura agendada no momento.</p>
              <p className="text-xs text-[#94A3B8]">Ative novas revisões após concluir aulas de teoria.</p>
            </div>
          )
        )}

        {/* TAB CONCLUIDAS */}
        {tabAtiva === 'concluidas' && (
          concluidas.length > 0 ? (
            concluidas.map(r => (
              <div 
                key={r.id}
                className="bg-[#0F172A]/50 border border-[#1E293B] p-5 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-60"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 bg-[#0C0E12] border border-[#1E293B] text-emerald-400 rounded">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: r.materiaCor }}>
                        {r.materiaSigla}
                      </span>
                      <span className="text-xs font-bold text-[#94A3B8]">{r.materiaNome}</span>
                    </div>

                    <h4 className="text-sm font-bold text-[#94A3B8] line-through mt-1.5 font-sans leading-normal">{r.titulo}</h4>
                    <p className="text-[9px] text-emerald-400 font-semibold font-mono mt-1">Assunto memorizado e blindado contra o esquecimento!</p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => handleExcluirRevisao(r.id)}
                    className="p-2 bg-[#1E293B]/40 hover:bg-rose-950/20 text-[#64748B] hover:text-rose-450 border border-[#1E293B] rounded text-xs cursor-pointer transition-colors"
                    title="Remover do histórico"
                  >
                    Excluir registro
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded p-10 text-center text-[#64748B]" id="no-completed-revisions">
              <p className="font-semibold text-white">Nenhum registro de revisão concluída.</p>
              <p className="text-xs text-[#94A3B8]">Suas revisões concluídas metódicas aparecerão listadas aqui eletronicamente.</p>
            </div>
          )
        )}

      </div>

    </div>
  );
}
