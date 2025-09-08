import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { CommonModule } from '@angular/common';
import { VoltarComponent } from 'src/app/shared/utils/components/voltar/voltar.component';

// Modelo de dados com datas de entrada/saída por setor
interface FluxoSetor {
  entrada: string | null; // Data de entrada (ISO)
  saida: string | null;   // Data de saída (ISO)
}

interface FluxoIS {
  nome: string;
  kickOffDate: string; // Data da reunião de Kickoff (ISO)
  setores: {
    analise: FluxoSetor;
    dev: FluxoSetor;
    qa: FluxoSetor;
    prod: FluxoSetor;
  };
  historico?: Array<{
    setor: 'dev' | 'qa' | 'analise' | 'prod';
    tipo: 'entrada' | 'saida' | 'retorno';
    data: string;
  }>;
}

@Component({
  selector: 'app-fluxos',
  standalone: true,
  imports: [CabecalhoComponent, FormsModule, RouterModule, CommonModule, VoltarComponent],
  templateUrl: './fluxos.component.html',
  styleUrls: ['./fluxos.component.css']
})
export class FluxosComponent {
  totalKickoff = 0;
  totalEmAndamento = 0;
  totalConcluidas = 0;

  filtroColuna: string = '';
  filtroValor: string = '';

  isList: FluxoIS[] = [
    {
      nome: 'IS-001 - Sistema X',
      kickOffDate: '2025-03-10T15:00:00',
      setores: {
        analise: { entrada: '2025-03-11T09:00:00', saida: '2025-03-13T15:00:00' },
        dev: { entrada: '2025-03-13T16:00:00', saida: '2025-03-17T18:00:00' },
        qa: { entrada: '2025-03-17T18:30:00', saida: '2025-03-19T12:00:00' },
        prod: { entrada: '2025-03-20T09:00:00', saida: '2025-03-23T17:00:00' }
      },
      historico: [
        { setor: 'qa', tipo: 'saida', data: '2025-03-19T12:00:00' },
        { setor: 'dev', tipo: 'retorno', data: '2025-03-19T13:00:00' },
        { setor: 'dev', tipo: 'saida', data: '2025-03-20T08:00:00' },
        { setor: 'qa', tipo: 'entrada', data: '2025-03-20T08:30:00' }
      ]
    },
    {
      nome: 'IS-002 - App Financeiro',
      kickOffDate: '2025-04-02T10:00:00',
      setores: {
        analise: { entrada: '2025-04-03T08:30:00', saida: '2025-04-05T17:00:00' },
        dev: { entrada: '2025-04-06T09:00:00', saida: '2025-04-10T16:30:00' },
        qa: { entrada: '2025-04-11T10:00:00', saida: '2025-04-13T19:00:00' },
        prod: { entrada: '2025-04-14T14:00:00', saida: '2025-04-15T12:00:00' }
      },
      historico: [
        { setor: 'qa', tipo: 'retorno', data: '2025-04-12T09:30:00' },
        { setor: 'dev', tipo: 'entrada', data: '2025-04-12T10:00:00' },
        { setor: 'dev', tipo: 'saida', data: '2025-04-13T08:00:00' },
        { setor: 'qa', tipo: 'entrada', data: '2025-04-13T08:30:00' }
      ]
    },
    {
      nome: 'IS-003 - Portal RH',
      kickOffDate: '2025-05-07T14:00:00',
      setores: {
        analise: { entrada: '2025-05-08T10:00:00', saida: '2025-05-10T13:00:00' },
        dev: { entrada: '2025-05-10T14:00:00', saida: '2025-05-14T11:00:00' },
        qa: { entrada: '2025-05-14T13:30:00', saida: '2025-05-16T18:00:00' },
        prod: { entrada: '2025-05-17T09:30:00', saida: '2025-05-18T15:00:00' }
      },
      historico: [
        { setor: 'dev', tipo: 'retorno', data: '2025-05-15T10:00:00' },
        { setor: 'qa', tipo: 'entrada', data: '2025-05-15T14:30:00' }
      ]
    }
  ];

  // Lista filtrada (exibição na tabela)
  get isListFiltrada(): FluxoIS[] {
    if (!this.filtroColuna || !this.filtroValor) return this.isList;
    // Permite filtro por nome ou por datas (entrada/saída de setores)
    return this.isList.filter((is) => {
      if (this.filtroColuna === 'nome') {
        return is.nome.toLowerCase().includes(this.filtroValor.toLowerCase());
      }
      // Para setores: analise, dev, qa, prod
      const [setor, tipo] = this.filtroColuna.split('.');
      if (is.setores[setor as keyof typeof is.setores]) {
        const value = is.setores[setor as keyof typeof is.setores][tipo as keyof FluxoSetor];
        return value && value.toLowerCase().includes(this.filtroValor.toLowerCase());
      }
      return false;
    });
  }

  voltar() {
    window.history.back();
  }

  onFiltroColunaChange(event: any) {
    this.filtroValor = '';
  }

  abrirDetalhe(is: FluxoIS) {
    alert(`Detalhes de ${is.nome}`);
  }

  // Calcula dias entre duas datas
  calcularDias(entrada: string | null, saida: string | null): number {
    if (!entrada || !saida) return 0;
    const e = new Date(entrada);
    const s = new Date(saida);
    return Math.round((s.getTime() - e.getTime()) / (1000 * 60 * 60 * 24));
  }

  calcularTotalDias(is: FluxoIS): number {
    let total = 0;
    for (const setor of Object.values(is.setores)) {
      if (setor.entrada && setor.saida) {
        total += this.calcularDias(setor.entrada, setor.saida);
      }
    }
    return total;
  }

  getTotalInteracoes(is: FluxoIS): number {
    return is.historico ? is.historico.length : 0;
  }

  getInteracoes(is: FluxoIS, setor: 'dev' | 'qa' | 'analise' | 'prod'): number {
    return is.historico
      ? is.historico.filter(h => h.setor === setor).length
      : 0;
  }
}