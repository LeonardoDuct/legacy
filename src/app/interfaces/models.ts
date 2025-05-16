export interface Issue {
  id: number;
  numero_is: number;
  id_projeto: number;
  sigla_cliente: string;
  prazo: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  responsavel: string | null;
  autor: string;
  labels: string[];
  status: 'opened' | 'closed';
  link: string;
  avatar_responsavel: string | null;
  avatar_author: string;
  projeto_principal: string;
}
