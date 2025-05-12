import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitlabService } from '../../services/gitlab.service';
import { Issue } from '../../interfaces/models';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, CabecalhoComponent, RouterModule, FormsModule],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  isMenuOpen = false;
  subMenuStates: { [key: string]: boolean } = {
    cadastro: true,
    configuracoes: true,
  };

  projetos: Projeto[] = [];
  tarefas: Issue[] = [];
  pendentesTotal: number = 0;
  atrasadasTotal: number = 0;
  statusGeral: string = 'Estável'; // 🔹 Inicializando com um valor padrão
  periodoSelecionado: string = '7';
  dataInicio: string = '';
  dataFim: string = '';
  nomeProjeto: string = '';


  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.carregarProjetos();
  }

  atualizarFiltro() {
    if (this.periodoSelecionado !== 'personalizado') {
      const hoje = new Date();
      const dataInicial = new Date();
      dataInicial.setDate(hoje.getDate() - Number(this.periodoSelecionado));
  
      this.dataInicio = dataInicial.toISOString().split('T')[0];
      this.dataFim = hoje.toISOString().split('T')[0];
  
      // 🔹 Agora garantimos que a lista de tarefas seja atualizada corretamente
      this.carregarTarefasPorData(this.nomeProjeto, this.dataInicio, this.dataFim);
    }
  }

  carregarTarefasPorData(projeto: string, dataInicio: string, dataFim: string) {
    this.gitlabService.obterIssuesPorPeriodo(projeto, dataInicio, dataFim).subscribe(
      (dados) => {
        this.tarefas = dados;
      },
      (erro) => {
        console.error('Erro ao carregar tarefas:', erro);
      }
    );
  }
  
  carregarProjetos(): void {
    this.gitlabService.obterIssuesPorPeriodo(this.nomeProjeto, this.dataInicio, this.dataFim).subscribe((dados: any[]) => {
      this.projetos = dados.map(projeto => {
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
  
      this.pendentesTotal = this.projetos.reduce((total, projeto) => total + projeto.abertas, 0);
      this.atrasadasTotal = this.projetos.reduce((total, projeto) => total + projeto.abertasForaPrazo, 0);
      this.statusGeral = this.obterStatusGeral(this.pendentesTotal, this.atrasadasTotal);
    });
  }

  obterStatus(abertasDentroPrazo: number, abertasForaPrazo: number): string {
    const totalAbertas = abertasDentroPrazo + abertasForaPrazo;

    if (totalAbertas === 0) return 'Estável';
    if (abertasForaPrazo === 0) return 'Estável';
    if (abertasForaPrazo / totalAbertas > 0.2) return 'Crítico';

    return 'Instável';
  }

  obterStatusGeral(pendentesTotal: number, atrasadasTotal: number): string {
    if (pendentesTotal === 0) return 'Estável';
    if (atrasadasTotal === 0) return 'Estável';

    const proporcaoAtrasadas = atrasadasTotal / pendentesTotal;

    if (proporcaoAtrasadas > 0.2) return 'Crítico';

    return 'Instável';
  }

  removerAcentos(status: string): string {
    return status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSubMenu(menu: string): void {
    this.subMenuStates[menu] = !this.subMenuStates[menu];
  }

  calcularTotalAbertasComAtraso(): number {
    return this.projetos.reduce((sum, projeto) => sum + (projeto.abertas_com_atraso || 0), 0);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      flatpickr('#data-de', { dateFormat: 'd/m/Y', allowInput: false, locale: Portuguese });
      flatpickr('#data-ate', { dateFormat: 'd/m/Y', allowInput: false, locale: Portuguese });
    }, 0);
  }
}