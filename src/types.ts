export enum StatusAula {
  NaoIniciado = 'Não Iniciado',
  LendoPDF = 'Lendo PDF',
  AssistindoVideo = 'Em Vídeo',
  Revisando = 'Em Revisão',
  Concluido = 'Concluído'
}

export interface Aula {
  id: string; // e.g., "DIR_CONST_00"
  numero: number; // e.g., 0, 1, 2...
  titulo: string; // e.g., "Aula 00 - Direitos Fundamentais"
  status: StatusAula;
  dataConclusao?: string;
  questoesResolvidas: number;
  questoesAcertadas: number;
  questoesErradas: number;
  horasEstudadas: number; // in hours (decimal)
}

export interface Materia {
  id: string; // e.g., "controle_externo"
  nome: string; // e.g., "Controle Externo"
  sigla: string; // e.g., "CEX"
  aulas: Aula[];
  cor: string; // tailwind color class e.g. "blue", "indigo"
}

export interface ItemCiclo {
  id: string;
  materiaId: string;
  tempoMinutos: number; // target minutes
  Ordem: number;
}

export interface CicloEstudo {
  id: string;
  nome: string;
  itens: ItemCiclo[];
  itemAtualIndice: number;
}

export interface RevisaoEspacada {
  id: string;
  materiaId: string;
  aulaId: string; // linking to specific lesson
  titulo: string; // e.g., "Revisão Aula 02 - Atos Administrativos"
  dataCriacao: string; // ISO date
  dataRevisaoAlvo: string; // ISO date when it is due
  intervaloDias: number; // 1 (24h), 7 (7d), 30 (30d), etc.
  concluida: boolean;
  etapa: number; // 1 = 24h, 2 = 7d, 3 = 30d, 4 = Concluída total
  historico: {
    data: string;
    status: 'agendada' | 'concluida' | 'atrasada';
  }[];
}

export interface Simulado {
  id: string;
  titulo: string; // e.g., "Simulado Especial TCU - Estratégia"
  data: string;
  banca: string; // default "FGV" or others
  totalQuestoes: number;
  questoesAcertadas: number;
  questoesErradas: number;
  desempenhoPorMateria: {
    [materiaId: string]: {
      questoes: number;
      acertos: number;
      erros: number;
    }
  };
  observacoes?: string;
}

export interface LogSessao {
  id: string;
  data: string;
  materiaId: string;
  aulaId: string;
  duracaoMinutos: number;
  questoesResolvidas: number;
  questoesAcertadas: number;
  questoesErradas: number;
  tipo: 'Teoria (PDF)' | 'Vídeo' | 'Questões' | 'Revisão';
  comentarios?: string;
}

export interface EstatisticasGerais {
  totalHoras: number;
  totalQuestoes: number;
  totalAcertos: number;
  totalErros: number;
}
