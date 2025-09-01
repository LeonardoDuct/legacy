import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitlabService } from '../../services/gitlab.service';
import { obterStatusGeral } from 'src/app/shared/utils/functions';
import { removerAcentos } from 'src/app/shared/utils/functions';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChartOptions } from 'src/app/shared/utils/graficos-utils';
import { NgApexchartsModule } from 'ng-apexcharts';

export interface Projeto {
  nome: string;
  abertas: number;
  abertasDentroPrazo: number;
  abertasForaPrazo: number;
  fechadas: number;
  fechadasDentroPrazo: number;
  fechadasForaPrazo: number;
  abertas_com_atraso: number;
  fechadasDentro: number;
  fechadasFora: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, CabecalhoComponent, RouterModule, FormsModule, NgApexchartsModule],
})
export class DashboardComponent implements OnInit {
  isMenuOpen = false;
  subMenuStates: { [key: string]: boolean } = { cadastro: true, configuracoes: true };
  analyticsProjeto: Projeto | null = null;
  chartOptions: ChartOptions | null = null;
  projetos: Projeto[] = [];
  pendentesTotal = 0;
  atrasadasTotal = 0;
  statusGeral = 'Estável';
  periodoSelecionado = '';
  dataInicio = '';
  dataFim = '';
  nomeProjeto = '';
  mostrarTodosGraficos = false;
  removerAcentos = removerAcentos;

  showAnalytics: { [nomeProjeto: string]: boolean } = {};
  tipoGrafico: { [nomeProjeto: string]: 'bar' | 'pie' } = {};

  private flatpickrInicializado = false;

  constructor(private gitlabService: GitlabService) { }

  ngOnInit(): void {
    this.carregarProjetos();
  }

  ngAfterViewChecked(): void {
    if (this.periodoSelecionado === 'personalizado' && !this.flatpickrInicializado) {
      this.inicializarFlatpickrDatas();
      this.flatpickrInicializado = true;
    }
    if (this.periodoSelecionado !== 'personalizado' && this.flatpickrInicializado) {
      this.flatpickrInicializado = false;
    }
  }

  carregarProjetos(): void {
    this.gitlabService.obterIssuesPorProjeto().subscribe((dados: any[]) => {
      this.projetos = this.processarProjetos(dados);
      this.atualizarTotais();
    });
  }

  carregarTarefasPorData(dataInicio: string, dataFim: string) {
    this.gitlabService.obterIssuesPorPeriodo(dataInicio, dataFim).subscribe((dados: any[]) => {
      this.projetos = this.processarProjetos(dados);
      this.atualizarTotais();
    });
  }

  get detalhesQueryParams() {
    const params: any = {};
    if (this.dataInicio && this.dataInicio.trim() !== '') params.dataInicio = this.dataInicio;
    if (this.dataFim && this.dataFim.trim() !== '') params.dataFim = this.dataFim;
    return params;
  }

  private processarProjetos(dados: any[]): Projeto[] {
    return dados.map(projeto => {
      const abertasDentroPrazo = Number(projeto.abertas_dentro_prazo) || 0;
      const abertasForaPrazo = Number(projeto.abertas_com_atraso) || 0;
      return {
        nome: projeto.projeto_principal,
        abertas: Number(projeto.abertas) || 0,
        abertasDentroPrazo,
        abertasForaPrazo,
        fechadas: Number(projeto.fechadas) || 0,
        fechadasDentroPrazo: Number(projeto.fechadas_dentro_prazo) || 0,
        fechadasForaPrazo: Number(projeto.fechadas_com_atraso) || 0,
        abertas_com_atraso: abertasForaPrazo,
        fechadasDentro: Number(projeto.fechadas_dentro_prazo) || 0,
        fechadasFora: Number(projeto.fechadas_com_atraso) || 0,
        status: this.obterStatus(abertasDentroPrazo, abertasForaPrazo),
      };
    });
  }

  private atualizarTotais() {
    this.pendentesTotal = this.projetos.reduce((total, projeto) => total + projeto.abertas, 0);
    this.atrasadasTotal = this.projetos.reduce((total, projeto) => total + projeto.abertasForaPrazo, 0);
    this.statusGeral = obterStatusGeral(this.pendentesTotal, this.atrasadasTotal);
  }

  atualizarFiltro() {
    const hoje = new Date();
    let dataInicial: Date;
    let dataFinal: Date;

    switch (this.periodoSelecionado) {
      case 'hoje':
        this.dataInicio = hoje.toISOString().split('T')[0];
        this.dataFim = hoje.toISOString().split('T')[0];
        break;
      case 'ontem':
        dataInicial = new Date(hoje);
        dataInicial.setDate(hoje.getDate() - 1);
        this.dataInicio = dataInicial.toISOString().split('T')[0];
        this.dataFim = dataInicial.toISOString().split('T')[0];
        break;
      case '7d':
        dataInicial = new Date(hoje);
        dataInicial.setDate(hoje.getDate() - 6);
        this.dataInicio = dataInicial.toISOString().split('T')[0];
        this.dataFim = hoje.toISOString().split('T')[0];
        break;
      case '30d':
        dataInicial = new Date(hoje);
        dataInicial.setDate(hoje.getDate() - 29);
        this.dataInicio = dataInicial.toISOString().split('T')[0];
        this.dataFim = hoje.toISOString().split('T')[0];
        break;
      case 'este-mes':
        dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        this.dataInicio = dataInicial.toISOString().split('T')[0];
        this.dataFim = hoje.toISOString().split('T')[0];
        break;
      case 'ultimo-mes':
        dataInicial = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dataFinal = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        this.dataInicio = dataInicial.toISOString().split('T')[0];
        this.dataFim = dataFinal.toISOString().split('T')[0];
        break;
      case 'personalizado':
        if (!this.dataInicio || !this.dataFim) {
          alert('Selecione as duas datas para o período personalizado.');
          return;
        }
        break;
      default:
        this.dataInicio = '';
        this.dataFim = '';
    }

    this.carregarTarefasPorData(this.dataInicio, this.dataFim);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSubMenu(menu: string): void {
    this.subMenuStates[menu] = !this.subMenuStates[menu];
  }

  toggleTodosGraficos() {
    this.mostrarTodosGraficos = !this.mostrarTodosGraficos;
  }

  private safeLogValue(val: any): number {
    const n = Number(val);
    return (!isNaN(n) && isFinite(n) && n > 0) ? n : 0.1;
  }

  gerarGroupedBarSeries(projeto: any) {
    return [
      {
        name: 'Dentro do Prazo',
        data: [
          this.safeLogValue(projeto?.abertasDentroPrazo),
          this.safeLogValue(projeto?.fechadasDentro)
        ]
      },
      {
        name: 'Fora do Prazo',
        data: [
          this.safeLogValue(projeto?.abertasForaPrazo),
          this.safeLogValue(projeto?.fechadasFora)
        ]
      }
    ];
  }


  obterStatus(abertasDentroPrazo: number, abertasForaPrazo: number): string {
    const totalAbertas = abertasDentroPrazo + abertasForaPrazo;
    if (totalAbertas === 0) return 'Estável';
    if (abertasForaPrazo === 0) return 'Estável';
    if (abertasForaPrazo / totalAbertas > 0.2) return 'Crítico';
    return 'Instável';
  }

  private inicializarFlatpickrDatas() {
    setTimeout(() => {
      flatpickr('#data-de', { dateFormat: 'Y-m-d', allowInput: true, locale: Portuguese });
      flatpickr('#data-ate', { dateFormat: 'Y-m-d', allowInput: true, locale: Portuguese });
    }, 0);
  }
}