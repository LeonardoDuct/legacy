export interface Issue {
  codigo_issue: number;
  repositorio: string;
  cliente: string;
  status: string;
  prazo: string;
  responsavel: string;
  prioridade?: number;
  score_total?: number;
}