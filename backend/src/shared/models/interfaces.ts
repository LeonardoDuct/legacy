export interface Issue {
    codigo_issue: number;
    projeto_principal: string;
    repositorio: string;
    cliente: string;
    labels: string[] | null;
    status: string;
    prazo: string | null;
    responsavel: string;
    link: string;
    score_total?: number;
    prioridade?: number;
    titulo: string;
}

export interface UsuarioBody {
    nome: string;
    email: string;
    senha: string;
    admin: boolean;
}

export interface Cliente {
    sigla_cliente: string;
    nota: string;
}

export interface Label {
    label: string;
    nota: string;
}

export interface ClassificacaoParams {
    categoria: string;
    classificacao: string;
}

export interface ClassificacaoBody {
    descricao?: string;
    score?: number | string;
}

export interface CategoriaParams {
    nome_categoria: string;
}

export interface CategoriaBody {
    titulo: string;
    porcentagem: number;
}
