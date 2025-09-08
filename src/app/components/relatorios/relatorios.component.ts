import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { GitlabService } from 'src/app/services/gitlab.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexDataLabels,
  ApexPlotOptions,
  ApexTooltip,
  ApexFill,
  ApexGrid
} from 'ng-apexcharts';
import { VoltarComponent } from 'src/app/shared/utils/components/voltar/voltar.component';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  fill: ApexFill;
  grid: ApexGrid;
  colors?: string[];
};

@Component({
  selector: 'app-relatorios',
  imports: [CommonModule, CabecalhoComponent, NgApexchartsModule, VoltarComponent],
  templateUrl: './relatorios.component.html',
  styleUrls: ['./relatorios.component.css'],
  standalone: true
})
export class RelatoriosComponent implements OnInit {

  meses = [
    { nome: 'Jan', valor: 1 },
    { nome: 'Fev', valor: 2 },
    { nome: 'Mar', valor: 3 },
    { nome: 'Abr', valor: 4 },
    { nome: 'Mai', valor: 5 },
    { nome: 'Jun', valor: 6 },
    { nome: 'Jul', valor: 7 },
    { nome: 'Ago', valor: 8 },
    { nome: 'Set', valor: 9 },
    { nome: 'Out', valor: 10 },
    { nome: 'Nov', valor: 11 },
    { nome: 'Dez', valor: 12 },
  ];
  mesesSelecionados: number[] = [];
  // Projetos e anos disponíveis para seleção
  projetos = [
    'Desenvolvimento', 'QA', 'Sustentação', 'Projetos', 'Processos', 'Produtos', 'RNC', 'CMO'
  ];
  anos = [2023, 2024, 2025];

  projetoSelecionado = 'Desenvolvimento';
  anoSelecionado = 2025;

  // Relatórios
  issuesFechadas: any[] = [];
  relatorioPorCliente: any[] = [];
  relatorioPorResponsavel: { series: any[], responsaveis: string[], complexidades: string[] } = {
    series: [],
    responsaveis: [],
    complexidades: []
  };
  loading = false;
  erro = '';

  // Chart principal (por cliente)
  chartOptions: ChartOptions = {
    series: [],
    chart: {
      type: 'bar',
      width: '100%',
      height: 450,
      stacked: false,
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    colors: ['#0090FF'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 3
      }
    },
    dataLabels: {
      enabled: true,
      style: { colors: ['#fff'] },
      formatter: (val: number) => `${val}`
    },
    legend: {
      show: true,
      labels: { colors: '#fff' }
    },
    fill: { opacity: 1 },
    tooltip: {
      y: { formatter: val => `${val} fechadas` }
    },
    grid: {
      borderColor: "#8c8c8c",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      categories: [],
      labels: {
        rotate: -45,
        trim: true,
        hideOverlappingLabels: true,
        style: { fontSize: '14px', colors: '#fff' }
      },
      title: { text: 'Cliente', style: { color: '#fff' } }
    },
    title: {
      text: 'Issues Fechadas por Cliente',
      align: 'left',
      style: { fontSize: "22px", color: '#fff' }
    }
  };

  // Chart por responsável (agora: empilhado por complexidade)
  chartOptionsResponsavel: ChartOptions = {
    series: [],
    chart: {
      type: 'bar',
      width: '100%',
      height: 350,
      stacked: false, // Ativa empilhamento!
      toolbar: { show: false }
    },
    colors: ['#FF8C00', '#2196F3', '#4CAF50', '#E53935'],
    plotOptions: {
      bar: { horizontal: false, columnWidth: '60%', borderRadius: 3 }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        colors: ['#fff']
      },
      formatter: (val: number) => `${val}`
    },
    legend: { show: true, labels: { colors: '#fff' } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: val => `${val} fechadas` } },
    grid: {
      borderColor: "#8c8c8c",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      categories: [],
      labels: {
        rotate: -45,
        trim: true,
        hideOverlappingLabels: true,
        style: {
          fontSize: '16px', // <-- aumente aqui (ex: '16px', '20px', etc)
          colors: '#fff'
        }
      },
      title: { text: 'Responsável', style: { color: '#fff' } }
    },
    title: {
      text: 'Issues Fechadas por Responsável e Complexidade',
      align: 'left',
      style: { fontSize: "22px", color: '#fff' }
    }
  };

  constructor(
    private gitlabService: GitlabService,
    private location: Location
  ) { }

  ngOnInit() {
    this.carregarRelatorio();
  }

  selecionarProjeto(projeto: string) {
    if (this.projetoSelecionado !== projeto) {
      this.projetoSelecionado = projeto;
      this.carregarRelatorio();
    }
  }

  selecionarAno(ano: number) {
    if (this.anoSelecionado !== ano) {
      this.anoSelecionado = ano;
      this.carregarRelatorio();
    }
  }

  selecionarMes(mes: number) {
    const idx = this.mesesSelecionados.indexOf(mes);
    if (idx > -1) {
      this.mesesSelecionados.splice(idx, 1); // Remove
    } else {
      this.mesesSelecionados.push(mes); // Adiciona
    }
    this.carregarRelatorio(); // <-- ATUALIZA!
  }

  carregarRelatorio() {
    this.loading = true;
    this.erro = '';
    const dataInicio = `${this.anoSelecionado}-01-01`;
    const dataFim = `${this.anoSelecionado}-12-31`;

    this.gitlabService.obterRelatorioIssuesFechadas(this.projetoSelecionado, dataInicio, dataFim)
      .subscribe({
        next: (dados) => {
          let issues = dados || [];
          // Se algum mês foi selecionado, filtra as issues por mês
          if (this.mesesSelecionados.length) {
            issues = issues.filter(issue => {
              if (!issue.data_fechamento) return false;
              const mes = Number(issue.data_fechamento.substr(5, 2));
              return this.mesesSelecionados.includes(mes);
            });
          }
          this.issuesFechadas = issues;
          this.relatorioPorCliente = this.agruparPorCliente(issues);
          this.relatorioPorResponsavel = this.agruparPorResponsavelEComplexidade(issues);
          this.atualizarGraficos();
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar relatório';
          this.loading = false;
        }
      });
  }

  agruparPorCliente(issues: any[]) {
    const mapa = new Map<string, number>();
    for (const issue of issues) {
      const cli = issue.cliente || 'Indefinido';
      mapa.set(cli, (mapa.get(cli) || 0) + 1);
    }
    // Ordena clientes pelo total de fechadas (desc)
    return Array.from(mapa.entries())
      .map(([cliente, fechadas]) => ({ cliente, fechadas }))
      .sort((a, b) => b.fechadas - a.fechadas)
      .slice(0, 10); // Top 10 clientes
  }

  // Agrupamento por responsável + complexidade (para gráfico empilhado)
  agruparPorResponsavelEComplexidade(issues: any[]) {
    const complexidadesSet = new Set<string>();
    const responsaveisSet = new Set<string>();
    issues.forEach(issue => {
      complexidadesSet.add(issue.complexidade || 'Não definida');
      responsaveisSet.add(issue.responsavel || 'Indefinido');
    });
    const complexidades = Array.from(complexidadesSet);
    const responsaveis = Array.from(responsaveisSet);

    // Monta mapa: responsavel -> complexidade -> count
    const mapa: { [responsavel: string]: { [complexidade: string]: number } } = {};
    for (const issue of issues) {
      const resp = issue.responsavel || 'Indefinido';
      const comp = issue.complexidade || 'Não definida';
      if (!mapa[resp]) mapa[resp] = {};
      if (!mapa[resp][comp]) mapa[resp][comp] = 0;
      mapa[resp][comp]++;
    }

    // Top 10 responsáveis pelo total de issues de todas as complexidades
    const topResponsaveis = responsaveis
      .map(resp => ({
        responsavel: resp,
        total: complexidades.reduce((sum, comp) => sum + (mapa[resp]?.[comp] || 0), 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(e => e.responsavel);

    // Series para gráfico stacked
    const series = complexidades.map(complexidade => ({
      name: complexidade,
      data: topResponsaveis.map(resp => mapa[resp]?.[complexidade] || 0)
    }));

    return { series, responsaveis: topResponsaveis, complexidades };
  }

  atualizarGraficos() {
    // Gráfico por cliente
    this.chartOptions = {
      ...this.chartOptions,
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: this.relatorioPorCliente.map(c => c.cliente)
      },
      series: [
        { name: `${this.anoSelecionado}`, data: this.relatorioPorCliente.map(c => c.fechadas) }
      ]
    };

    // Gráfico por responsável + complexidade (empilhado)
    this.chartOptionsResponsavel = {
      ...this.chartOptionsResponsavel,
      xaxis: {
        ...this.chartOptionsResponsavel.xaxis,
        categories: this.relatorioPorResponsavel.responsaveis
      },
      series: this.relatorioPorResponsavel.series
    };
  }

  exportarCSV() {
    if (!this.issuesFechadas.length) return;
    const csvRows = [];
    const headers = Object.keys(this.issuesFechadas[0]);
    csvRows.push(headers.join(','));
    this.issuesFechadas.forEach(row => {
      csvRows.push(headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const csvContent = csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${this.projetoSelecionado}-${this.anoSelecionado}.csv`;
    link.click();
  }

  exportarExcel() {
    if (!this.issuesFechadas.length) return;
    const headers = Object.keys(this.issuesFechadas[0]);
    let xls = '<table><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    this.issuesFechadas.forEach(row => {
      xls += '<tr>' + headers.map(h => `<td>${row[h] ?? ''}</td>`).join('') + '</tr>';
    });
    xls += '</table>';
    const blob = new Blob(
      [`\ufeff<html><head><meta charset="UTF-8"></head><body>${xls}</body></html>`],
      { type: 'application/vnd.ms-excel' }
    );
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${this.projetoSelecionado}-${this.anoSelecionado}.xls`;
    link.click();
  }

  expandirFullScreen(element: HTMLElement) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) { /* Safari */
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) { /* IE11 */
      (element as any).msRequestFullscreen();
    }
  }

  voltar(): void {
    this.location.back();
  }
}