import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitlabService } from '../../services/gitlab.service';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { RouterModule } from '@angular/router';

interface Projeto {
  nome: string; // Agora usamos "nome" em vez de "projeto_principal"
  fechadasDentro: number;
  fechadasFora: number;
  abertas: number;
  abertas_com_atraso: number; // 🔹 Adicionando a propriedade para evitar erro
  status?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, CabecalhoComponent, RouterModule],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  isMenuOpen = false;
  subMenuStates: { [key: string]: boolean } = {
    cadastro: true,
    configuracoes: true,
  };

  projetos: Projeto[] = []; // Agora vamos buscar os projetos via API

  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.carregarProjetos();
  }

  carregarProjetos(): void {
    this.gitlabService.obterIssuesPorProjeto().subscribe((dados: any[]) => {
      this.projetos = dados.map(projeto => ({
        nome: projeto.projeto_principal,
        abertas: Number(projeto.abertas), 
        fechadas: Number(projeto.fechadas), 
        fechadasDentro: Number(projeto.fechadas) - Number(projeto.fechadas_com_atraso), // 🔹 Ajustado
        fechadasFora: Number(projeto.fechadas_com_atraso), // 🔹 Mantendo o valor correto
        abertas_com_atraso: Number(projeto.abertas_com_atraso), // 🔹 Mantendo o valor correto
        status: this.obterStatus(Number(projeto.fechadasDentro), Number(projeto.fechadasFora)), // 🔹 Corrigindo lógica do status
      }));
    });
  }

  obterStatus(fechadasDentro: number, fechadasFora: number): string {
    if (fechadasFora === 0) {
      return 'estavel';
    } else if (fechadasFora / (fechadasDentro + fechadasFora) > 0.2) {
      return 'critico';
    } else {
      return 'instavel';
    }
  }

  obterPendencias(fechadasDentro: number, fechadasFora: number): number {
    return fechadasDentro + fechadasFora;
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
      flatpickr('#data-de', {
        dateFormat: 'd/m/Y',
        allowInput: false,
        locale: Portuguese,
      });

      flatpickr('#data-ate', {
        dateFormat: 'd/m/Y',
        allowInput: false,
        locale: Portuguese,
      });
    }, 0);
  }
}