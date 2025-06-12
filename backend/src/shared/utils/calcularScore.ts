export interface ScoreBreakdown {
    categoria: string;
    peso: number;
    classificacao: string;
    score: number;
    subTotal: number;
}

export interface ScoreResult {
    score_total: number;
    score_breakdown: ScoreBreakdown[];
}

export function extrairClassificacao(labels: string[] | null, chave: string): string {
    if (!labels) return '';
    const found = labels.find(l => l.startsWith(chave + ' / '));
    return found ? found.replace(`${chave} / `, "") : '';
}

/**
 * Calcula o score total e o breakdown para uma issue.
 * 
 * @param issue O objeto da issue (pode vir do banco, pode ser ajustado conforme estrutura)
 * @param clientesMap Mapa de cliente -> nota
 * @param labelsMap Mapa de label -> nota
 * @param categoriaPesoMap Mapa de categoria -> peso
 * @returns Objeto com score_total e score_breakdown
 */
export function calcularScoreCompleto(
    issue: any,
    clientesMap: Record<string, number>,
    labelsMap: Record<string, number>,
    categoriaPesoMap: Record<string, number>
): ScoreResult {
    const labels = issue.labels || [];

    // CLIENTE
    const classificacaoCliente = issue.cliente || issue.sigla_cliente || '';
    const scoreCliente = clientesMap[classificacaoCliente] || 0;
    const pesoCliente = categoriaPesoMap['Cliente'] ?? 30;

    // PRAZO
    const classificacaoPrazo = issue.prazo || '';
    let scorePrazo = 0;
    if (issue.prazo) {
        const prazoDate = new Date(issue.prazo);
        const hoje = new Date();
        prazoDate.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);
        const diasAtraso = Math.floor((hoje.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAtraso > 0) {
            if (diasAtraso <= 10) scorePrazo = diasAtraso * 1;
            else if (diasAtraso <= 20) scorePrazo = 10 + (diasAtraso - 10) * 2;
            else if (diasAtraso <= 30) scorePrazo = 30 + (diasAtraso - 20) * 3;
            else scorePrazo = 60 + (diasAtraso - 30) * 5;
        }
    }
    const pesoPrazo = categoriaPesoMap['Prazo'] ?? 30;

    // URGÊNCIA
    const classificacaoUrgencia = extrairClassificacao(labels, 'Urgência');
    const labelUrgencia = classificacaoUrgencia ? `Urgência / ${classificacaoUrgencia}` : '';
    const scoreUrgencia = labelUrgencia && labelsMap[labelUrgencia] !== undefined ? labelsMap[labelUrgencia] : 0;
    const pesoUrgencia = categoriaPesoMap['Urgência'] ?? 20;

    // COMPLEXIDADE
    const classificacaoComplexidade = extrairClassificacao(labels, 'Complexidade');
    const labelComplexidade = classificacaoComplexidade ? `Complexidade / ${classificacaoComplexidade}` : '';
    const scoreComplexidade = labelComplexidade && labelsMap[labelComplexidade] !== undefined ? labelsMap[labelComplexidade] : 0;
    const pesoComplexidade = categoriaPesoMap['Complexidade'] ?? 15;

    // IMPACTO
    const classificacaoImpacto = extrairClassificacao(labels, 'Impacto');
    const labelImpacto = classificacaoImpacto ? `Impacto / ${classificacaoImpacto}` : '';
    const scoreImpacto = labelImpacto && labelsMap[labelImpacto] !== undefined ? labelsMap[labelImpacto] : 0;
    const pesoImpacto = categoriaPesoMap['Impacto'] ?? 5;

    const breakdown: ScoreBreakdown[] = [
        {
            categoria: 'Cliente',
            peso: pesoCliente,
            classificacao: classificacaoCliente,
            score: scoreCliente,
            subTotal: Number((scoreCliente * pesoCliente / 100).toFixed(2))
        },
        {
            categoria: 'Prazo',
            peso: pesoPrazo,
            classificacao: classificacaoPrazo,
            score: scorePrazo,
            subTotal: Number((scorePrazo * pesoPrazo / 100).toFixed(2))
        },
        {
            categoria: 'Urgência',
            peso: pesoUrgencia,
            classificacao: classificacaoUrgencia,
            score: scoreUrgencia,
            subTotal: Number((scoreUrgencia * pesoUrgencia / 100).toFixed(2))
        },
        {
            categoria: 'Complexidade',
            peso: pesoComplexidade,
            classificacao: classificacaoComplexidade,
            score: scoreComplexidade,
            subTotal: Number((scoreComplexidade * pesoComplexidade / 100).toFixed(2))
        },
        {
            categoria: 'Impacto',
            peso: pesoImpacto,
            classificacao: classificacaoImpacto,
            score: scoreImpacto,
            subTotal: Number((scoreImpacto * pesoImpacto / 100).toFixed(2))
        }
    ];

    const score_total = Number(breakdown.reduce((sum, cat) => sum + cat.subTotal, 0).toFixed(2));

    return { score_total, score_breakdown: breakdown };
}