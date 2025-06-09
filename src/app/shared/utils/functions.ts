export function getScoreClass(score: number | null | undefined): string {
    if (score === null || score === undefined) return ''; 
    if (score < 25) return 'score verde';
    if (score < 50) return 'score amarelo';
    if (score < 75) return 'score vermelho-claro';
    return 'score vermelho-escuro';
}

export function removerAcentos(status: string | undefined | null): string {
    if (!status) return '';
    return status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function obterStatusGeral(pendentesTotal: number, atrasadasTotal: number): string {
    if (pendentesTotal === 0) return 'Estável';
    if (atrasadasTotal === 0) return 'Estável';

    const proporcaoAtrasadas = atrasadasTotal / pendentesTotal;

    if (proporcaoAtrasadas > 0.2) return 'Crítico';

    return 'Instável';
}

export function prazoAtrasado(data: string | Date): boolean {
    const hoje = new Date();
    const prazo = new Date(data);
    return prazo < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}


