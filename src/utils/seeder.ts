import { Materia, Aula, Simulado, RevisaoEspacada, LogSessao, StatusAula, CicloEstudo } from '../types';
import { MATERIAS_PADRAO, CICLO_PADRAO, INFO_MATERIAS_17 } from '../data';

// Taxas de acerto por matéria solicitadas pelo usuário (78% a 93%)
const TAXAS_ACERTO: { [materiaId: string]: number } = {
  controle_externo: 0.93,
  dir_constitucional: 0.91,
  dir_administrativo: 0.88,
  estatistica: 0.78, // Alerta de fraqueza
  contabilidade_publica: 0.79, // Alerta de fraqueza
  afo_dir_financeiro: 0.85,
  auditoria_gov: 0.86,
  contabilidade_geral: 0.83,
  analise_dados_ti: 0.84,
  economia_setor_p: 0.82,
  portugues_redacao: 0.81,
  lingua_inglesa: 0.87,
  raciocinio_logico: 0.84,
  direito_civil: 0.83,
  direito_processual_civil: 0.85,
  direito_penal: 0.86,
  administracao_publica: 0.84,
};

export function gerarDadosSimuladosExtrema(): {
  materias: Materia[];
  ciclo: CicloEstudo;
  simulados: Simulado[];
  revisoes: RevisaoEspacada[];
  historico: LogSessao[];
} {
  // Deep clone of standard materias
  const materias: Materia[] = JSON.parse(JSON.stringify(MATERIAS_PADRAO));
  const historico: LogSessao[] = [];
  const revisoes: RevisaoEspacada[] = [];

  // Mapear indices das aulas correntes de cada matéria para simular avanço sequencial
  const aulaCorrenteIndexPorMateria: { [materiaId: string]: number } = {};
  materias.forEach(m => {
    aulaCorrenteIndexPorMateria[m.id] = 0;
  });

  const materiasIds = Object.keys(INFO_MATERIAS_17);
  let materiaTurnoIndex = 0;

  // Gerar dados para 90 dias (12 semanas)
  // Meta extrema: 120h/semana -> ~17.14h por dia -> 11.4 sessões de 90 minutos por dia
  const totalDias = 90;
  const sessoesPorDia = 11;
  const duracaoSessaoMinutos = 90; // 1.5 horas
  const dataAtual = new Date();

  // Tipos de estudo sequenciais para cada aula
  const tiposEstudo: ('Teoria (PDF)' | 'Vídeo' | 'Questões' | 'Revisão')[] = [
    'Teoria (PDF)',
    'Vídeo',
    'Questões',
    'Revisão'
  ];

  // Map para controlar quantas sessões foram feitas em cada aula de cada matéria
  const sessoesPorAula: { [key: string]: number } = {};

  for (let d = totalDias; d >= 0; d--) {
    // Calcular data da sessão
    const dataSessao = new Date(dataAtual);
    dataSessao.setDate(dataAtual.getDate() - d);

    for (let s = 0; s < sessoesPorDia; s++) {
      // Rotacionar matérias
      const materiaId = materiasIds[materiaTurnoIndex % materiasIds.length];
      const materia = materias.find(m => m.id === materiaId)!;
      
      const aulaIndex = aulaCorrenteIndexPorMateria[materiaId];
      if (aulaIndex >= materia.aulas.length) {
        // Reinicia as aulas se tiver completado todo o edital (improvável em 3 meses, mas seguro)
        aulaCorrenteIndexPorMateria[materiaId] = 0;
      }
      
      const currentAulaIndex = aulaCorrenteIndexPorMateria[materiaId] % materia.aulas.length;
      const aula = materia.aulas[currentAulaIndex];
      const aulaChave = `${materiaId}_${aula.id}`;
      
      const sessaoNum = sessoesPorAula[aulaChave] || 0;
      sessoesPorAula[aulaChave] = sessaoNum + 1;

      const tipo = tiposEstudo[sessaoNum % tiposEstudo.length];

      // Simular questões e acertos
      let resolvidas = 0;
      let acertadas = 0;
      let erradas = 0;

      if (tipo === 'Questões' || tipo === 'Revisão') {
        resolvidas = 20; // 20 questões por rodada de exercícios
        const taxa = TAXAS_ACERTO[materiaId] || 0.85;
        // Adiciona pequena variação aleatória de +-5%
        const taxaVariada = Math.min(0.99, Math.max(0.4, taxa + (Math.random() * 0.1 - 0.05)));
        acertadas = Math.round(resolvidas * taxaVariada);
        erradas = resolvidas - acertadas;
      }

      // Adicionar log de sessão
      const logId = `log_sim_${d}_${s}_${materiaId}`;
      
      // Ajustar hora da sessão ao longo do dia para não sobrepor exatamente no mesmo minuto
      const dataSessaoComHora = new Date(dataSessao);
      dataSessaoComHora.setHours(7 + s, Math.floor(Math.random() * 60), 0, 0);

      historico.push({
        id: logId,
        data: dataSessaoComHora.toISOString(),
        materiaId,
        aulaId: aula.id,
        duracaoMinutos: duracaoSessaoMinutos,
        questoesResolvidas: resolvidas,
        questoesAcertadas: acertadas,
        questoesErradas: erradas,
        tipo,
        comentarios: `Simulação de estudo de ${tipo}. Foco total e ótimo rendimento na matéria de ${materia.nome}.`
      });

      // Atualizar a aula
      aula.horasEstudadas += duracaoSessaoMinutos / 60;
      aula.questoesResolvidas += resolvidas;
      aula.questoesAcertadas += acertadas;
      aula.questoesErradas += erradas;

      // Atualizar status da aula
      if (tipo === 'Teoria (PDF)') {
        aula.status = StatusAula.LendoPDF;
      } else if (tipo === 'Vídeo') {
        aula.status = StatusAula.AssistindoVideo;
      } else if (tipo === 'Revisão') {
        aula.status = StatusAula.Revisando;
      }

      // Se passou da rodada de questões e obteve boa taxa, marca como concluída e avança
      if (sessaoNum >= 3) {
        aula.status = StatusAula.Concluido;
        aula.dataConclusao = dataSessaoComHora.toISOString().split('T')[0];
        
        // Avançar para a próxima aula
        aulaCorrenteIndexPorMateria[materiaId] += 1;

        // Agendar uma revisão espaçada simulada
        const revId = `rev_sim_${d}_${s}_${materiaId}`;
        const dataRevisao = new Date(dataSessaoComHora);
        dataRevisao.setDate(dataRevisao.getDate() + 30); // simula que foi agendada para +30 dias

        revisoes.push({
          id: revId,
          materiaId,
          aulaId: aula.id,
          titulo: `Revisão Espaçada: ${materia.sigla} - Aula ${aula.numero.toString().padStart(2, '0')}`,
          dataCriacao: dataSessaoComHora.toISOString(),
          dataRevisaoAlvo: dataRevisao.toISOString(),
          intervaloDias: 30,
          concluida: Math.random() < 0.90, // 90% das revisões concluídas
          etapa: 3,
          historico: [
            { data: dataSessaoComHora.toISOString(), status: 'concluida' }
          ]
        });
      }

      materiaTurnoIndex++;
    }
  }

  // Ordenar o histórico cronologicamente (do mais recente para o mais antigo)
  historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Gerar Simulados (um a cada 3 semanas)
  const simulados: Simulado[] = [];
  const totalSimulados = 4;
  for (let i = 1; i <= totalSimulados; i++) {
    const dataSimulado = new Date(dataAtual);
    dataSimulado.setDate(dataAtual.getDate() - (totalDias - i * 22));

    const totalQuestoes = 100;
    const acertoMedio = i === 1 ? 0.72 : i === 2 ? 0.78 : i === 3 ? 0.83 : 0.87; // progressão
    const questoesAcertadas = Math.round(totalQuestoes * acertoMedio);
    const questoesErradas = totalQuestoes - questoesAcertadas;

    const desempenhoPorMateria: {
      [materiaId: string]: {
        questoes: number;
        acertos: number;
        erros: number;
      }
    } = {};

    materiasIds.forEach(mId => {
      const questoesMat = mId === 'controle_externo' || mId === 'afo_dir_financeiro' ? 10 : 5;
      const taxaBase = TAXAS_ACERTO[mId] || 0.85;
      const taxaSimulado = Math.min(0.98, Math.max(0.5, taxaBase - (0.08 - i * 0.02)));
      const acertos = Math.round(questoesMat * taxaSimulado);
      desempenhoPorMateria[mId] = {
        questoes: questoesMat,
        acertos,
        erros: questoesMat - acertos
      };
    });

    simulados.push({
      id: `sim_seeder_${i}`,
      titulo: `Simulado Nacional TCU FGV - Rodada ${i}`,
      data: dataSimulado.toISOString().split('T')[0],
      banca: 'FGV (Estratégia)',
      totalQuestoes,
      questoesAcertadas,
      questoesErradas,
      desempenhoPorMateria,
      observacoes: `Simulado número ${i} de monitoramento de progresso. Carga horária extrema de 120h/semana refletida no avanço de notas.`
    });
  }

  // Ordenar simulados por data decrescente
  simulados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return {
    materias,
    ciclo: CICLO_PADRAO,
    simulados,
    revisoes,
    historico
  };
}
