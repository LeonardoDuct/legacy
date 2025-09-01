import { Projeto } from '../../components/dashboard/dashboard.component';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle } from 'ng-apexcharts';

export type ChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    title: ApexTitleSubtitle;
};

export function gerarChartOptionsParaProjeto(projeto: Projeto): ChartOptions {
    return {
        series: [
            {
                name: 'Tarefas',
                data: [
                    projeto.abertasDentroPrazo ?? 0,
                    projeto.abertasForaPrazo ?? 0,
                    projeto.fechadasDentro ?? 0,
                    projeto.fechadasFora ?? 0
                ]
            }
        ],
        chart: {
            type: 'bar',
            height: 350
        },
        xaxis: {
            categories: [
                'Abertas no Prazo',
                'Abertas Fora Prazo',
                'Fechadas no Prazo',
                'Fechadas Fora Prazo'
            ]
        },
        title: {
            text: `Analytics - ${projeto.nome}`
        }
    };
}