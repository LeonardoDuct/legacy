import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import flatpickr from 'flatpickr'; // Importação do flatpickr
import { Portuguese } from 'flatpickr/dist/l10n/pt';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';

interface Projeto {
  nome: string;
  fechadasDentro: number;
  fechadasFora: number;
  status?: string; // Adiciona o status como opcional
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, CabecalhoComponent],
})
export class DashboardComponent implements AfterViewInit {
  isMenuOpen = false;
  subMenuStates: { [key: string]: boolean } = {
    cadastro: true,
    configuracoes: true,
  };

  // Dados fictícios para os projetos, incluindo "Fechadas Dentro do Prazo" e "Fechadas Fora do Prazo"
  projetos: Projeto[] = [
    {
      nome: 'Sustentação',
      fechadasDentro: 78,
      fechadasFora: 1,
    },
    {
      nome: 'Desenvolvimento',
      fechadasDentro: 50,
      fechadasFora: 0,
    },
    {
      nome: 'QA',
      fechadasDentro: 30,
      fechadasFora: 10,
    }
  ];

  // Método para determinar o status do projeto
  obterStatus(fechadasDentro: number, fechadasFora: number): string {
    if (fechadasFora === 0) {
      return 'estavel';  // Estável se não houver fechadas fora do prazo
    } else if (fechadasFora / (fechadasDentro + fechadasFora) > 0.2) {
      return 'critico';  // Crítico se mais de 20% estiverem fora do prazo
    } else {
      return 'instavel';  // Instável se menos de 20% estiverem fora do prazo
    }
  }

  // Método para obter a quantidade de pendências
  obterPendencias(fechadasDentro: number, fechadasFora: number): number {
    return fechadasDentro + fechadasFora;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSubMenu(menu: string): void {
    this.subMenuStates[menu] = !this.subMenuStates[menu];
  }

  ngAfterViewInit(): void {
    // Atrasar a inicialização do flatpickr até a renderização completa
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
  
    // Aplique o status dinamicamente aos projetos
    this.projetos.forEach(projeto => {
      const status = this.obterStatus(projeto.fechadasDentro, projeto.fechadasFora);
      projeto.status = status; // Adiciona o status ao objeto do projeto
    });
  }
  
}