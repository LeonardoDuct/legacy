import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { CommonModule } from '@angular/common';

export interface Badge {
  label: string;
  type?: 'success' | 'warning' | 'error' | '';
}

export interface KanbanCard {
  id: string;
  titulo: string;
  owner: string;
  avatar: string;
  status: Badge;
  descricao?: string;
  badges?: Badge[];
  score?: number | string;
  expectativa?: string;
}

export interface KanbanColumn {
  nome: string;
  status: Badge;
  cards: KanbanCard[];
  highlights?: Highlight[];
}

export interface Highlight {
  label: string;
  value: string | number;
  type?: 'success' | 'warning' | 'error' | '';
}

interface FluxoSetor {
  entrada: string | null;
  saida: string | null;
}
interface FluxoIS {
  nome: string;
  kickOffDate: string;
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
  imports: [CabecalhoComponent, FormsModule, RouterModule, CommonModule],
  templateUrl: './fluxos.component.html',
  styleUrls: ['./fluxos.component.css']
})
export class FluxosComponent {
  tabs: Array<{ value: 'geral' | 'eventos'; label: string }> = [
    { value: 'geral', label: 'Geral' },
    { value: 'eventos', label: 'Eventos' }
  ];
  abaSelecionada: 'geral' | 'eventos' = 'geral';

  highlightsGeral: Highlight[] = [
    { label: 'Ligadas', value: 7 },
    { label: 'Concluídas', value: 3, type: 'success' }
  ];
  highlightsEventos: Highlight[] = [
    { label: 'Em andamento', value: '112h' },
    { label: 'Aguardando', value: '104h', type: 'error' }
  ];

  kanbanGeral: KanbanColumn[] = [
    {
      nome: 'Projetos',
      status: { label: 'Liberado', type: 'success' },
      cards: [
        {
          id: '#4',
          titulo: 'JAL - Sistema de priorização de tarefas',
          owner: 'Matheus Petruka',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Liberado', type: 'success' },
          descricao: 'Sem expectativa de conclusão'
        }
      ]
    },
    {
      nome: 'Análise',
      status: { label: 'Concluído', type: 'success' },
      cards: [
        {
          id: '#1442',
          titulo: 'JAL - Sistema de priorização de tarefas: API para coleta de dados via Git',
          owner: 'Wrayan Bontorin',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Concluído', type: 'success' },
          descricao: 'Concluído em 02/05/2025'
        },
        {
          id: '#1444',
          titulo: 'JAL - Sistema de priorização de tarefas: estruturação de banco de dados',
          owner: 'Wrayan Bontorin',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Concluído', type: 'success' },
          descricao: 'Concluído em 10/05/2025'
        }
      ]
    },
    {
      nome: 'Produtos',
      status: { label: 'Em andamento', type: '' },
      cards: [
        {
          id: '#3',
          titulo: 'JAL - Sistema de priorização de tarefas: tela de dashboard',
          owner: 'Lucas Bueno',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Concluído', type: 'success' },
          descricao: 'Concluído em 20/04/2025'
        },
        {
          id: '#4',
          titulo: 'JAL - Sistema de priorização de tarefas: telas de priorização e cadastro',
          owner: 'Lucas Bueno',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Em andamento', type: '' },
          expectativa: 'Expectativa de conclusão em 06/05/2025',
          badges: [
            { label: 'Em andamento', type: '' },
            { label: '79.0', type: 'error' }
          ]
        },
        {
          id: '#5',
          titulo: 'JAL - Sistema de priorização de tarefas: tela de tarefas relacionadas',
          owner: 'Lucas Bueno',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Em andamento', type: '' },
          expectativa: 'Expectativa de conclusão em 10/05/2025',
          badges: [
            { label: 'Em andamento', type: '' },
            { label: '9.0', type: 'success' }
          ]
        }
      ]
    },
    {
      nome: 'Desenvolvimento',
      status: { label: 'Em andamento', type: '' },
      cards: [
        {
          id: '#4903',
          titulo: 'JAL - Sistema de priorização de tarefas: desenvolvimento e integração com banco de dados',
          owner: 'Leonardo Campos',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: 'Em andamento', type: '' },
          expectativa: 'Expectativa de conclusão em 30/05/2025',
          badges: [
            { label: 'Em andamento', type: '' },
            { label: '57.5', type: 'warning' }
          ]
        }
      ]
    },
    {
      nome: 'QA',
      status: { label: '-', type: '' },
      cards: [
        {
          id: '#860',
          titulo: 'JAL - Sistema de priorização de tarefas',
          owner: 'Jeniffer Marcondes',
          avatar: 'assets/images/icon_primary_text/default.svg',
          status: { label: '-', type: '' },
          descricao: 'Sem expectativa de conclusão'
        }
      ]
    }
  ];

  kanbanEventos: KanbanColumn[] = [
    {
      nome: 'Projetos',
      status: { label: 'Liberado', type: 'success' },
      highlights: [
        { label: 'Em andamento', value: '25h' },
        { label: 'Aguardando', value: '81h', type: 'error' }
      ],
      cards: [
        { id: '#4', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, score: '15h', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, score: '4h', descricao: '10/09/2025 - 10/09/2025' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Liberado', type: 'success' }, descricao: '10/09/2025' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025 - 10/09/2025', badges: [{ label: '19min' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Aguardando Cliente', type: 'error' }, descricao: '10/09/2025 - 12/09/2025', badges: [{ label: '18h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '12/09/2025 - 14/09/2025', badges: [{ label: '20h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Liberado', type: 'success' }, descricao: '14/09/2025' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '14/09/2025 - 14/09/2025', badges: [{ label: '1h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Liberado', type: 'success' }, descricao: '14/09/2025' }
      ]
    },
    {
      nome: 'Análise',
      status: { label: 'Concluído', type: 'success' },
      highlights: [
        { label: 'Em andamento', value: '38h' },
        { label: 'Aguardando', value: '-', type: '' }
      ],
      cards: [
        { id: '#1442', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, score: '2h', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025 - 12/09/2025', badges: [{ label: '15h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Concluído', type: 'success' }, descricao: '12/09/2025' },
        { id: '#1444', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, score: '7h', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025 - 10/09/2025', badges: [{ label: '36min' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Aguardando Projetos', type: 'error' }, descricao: '10/09/2025 - 14/09/2025', badges: [{ label: '39h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '14/09/2025 - 14/09/2025', badges: [{ label: '5h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Aguardando Projetos', type: 'error' }, descricao: '14/09/2025 - 14/09/2025', badges: [{ label: '1h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '14/09/2025', badges: [{ label: '18h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Concluído', type: 'success' }, descricao: '14/09/2025' }
      ]
    },
    {
      nome: 'Produtos',
      status: { label: 'Em andamento', type: '' },
      highlights: [
        { label: 'Em andamento', value: '11h' },
        { label: 'Aguardando', value: '5h', type: 'error' }
      ],
      cards: [
        { id: '#3', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, score: '16h', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025 - 12/09/2025', badges: [{ label: '7h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Concluído', type: 'success' }, descricao: '12/09/2025' },
        { id: '#4', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, score: '20min', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '11/09/2025', badges: [{ label: '3h' }] },
        { id: '#5', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, score: '4h', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025', badges: [{ label: '1h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Aguardando Projetos', type: 'error' }, descricao: '10/09/2025', badges: [{ label: '41h' }] }
      ]
    },
    {
      nome: 'Desenvolvimento',
      status: { label: 'Em andamento', type: '' },
      highlights: [
        { label: 'Em andamento', value: '20h' },
        { label: 'Aguardando', value: '-', type: '' }
      ],
      cards: [
        { id: '#4903', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, score: '26h', descricao: '' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025 - 13/09/2025', badges: [{ label: '20h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Aguardando Produtos', type: 'error' }, descricao: '13/09/2025', badges: [{ label: '5h' }] }
      ]
    },
    {
      nome: 'QA',
      status: { label: '-', type: '' },
      highlights: [
        { label: 'Em andamento', value: '-', type: '' },
        { label: 'Aguardando', value: '-', type: '' }
      ],
      cards: [
        { id: '', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, descricao: 'Sem eventos registrados.' }
      ]
    },
    {
      nome: 'Cliente',
      status: { label: 'Concluído', type: 'success' },
      highlights: [
        { label: 'Em andamento', value: '18h' },
        { label: 'Aguardando', value: '18h', type: 'error' }
      ],
      cards: [
        { id: '', titulo: '', owner: '', avatar: '', status: { label: '', type: '' }, descricao: 'N/A' },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Em andamento', type: '' }, descricao: '10/09/2025 - 12/09/2025', badges: [{ label: '18h' }] },
        { id: '', titulo: '', owner: '', avatar: '', status: { label: 'Concluído', type: 'success' }, descricao: '12/09/2025' }
      ]
    }
  ];

  popoverScore = [
    { categoria: 'Cliente', peso: '30%', classificacao: 'JAL', score: 5.0, subTotal: 15.0, type: 'warning' },
    { categoria: 'Prazo', peso: '30%', classificacao: '06/05/2025', score: 8.0, subTotal: 24.0, type: 'error' },
    { categoria: 'Urgência', peso: '20%', classificacao: 'Médio', score: 5.0, subTotal: 10.0, type: 'warning' },
    { categoria: 'Complexidade', peso: '15%', classificacao: 'Baixo', score: 2.5, subTotal: 3.8, type: 'success' },
    { categoria: 'Impacto', peso: '5%', classificacao: 'Alto', score: 10.0, subTotal: 5.0, type: 'error' }
  ];

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

  get isListFiltrada(): FluxoIS[] {
    if (!this.filtroColuna || !this.filtroValor) return this.isList;
    const [setor, tipo] = this.filtroColuna.split('.');
    return this.isList.filter((is) => {
      if (this.filtroColuna === 'nome') {
        return is.nome.toLowerCase().includes(this.filtroValor.toLowerCase());
      }
      if (is.setores[setor as keyof typeof is.setores]) {
        const value = is.setores[setor as keyof typeof is.setores][tipo as keyof FluxoSetor];
        return value && value.toLowerCase().includes(this.filtroValor.toLowerCase());
      }
      return false;
    });
  }

  onFiltroColunaChange(event: any) {
    this.filtroValor = '';
  }

  abrirDetalhe(is: FluxoIS) {
    alert(`Detalhes de ${is.nome}`);
  }

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

  convertHorasToDiasHoras(valor: string | number): string {
    const horas = typeof valor === 'string' ? Number(valor.replace(/[^0-9.]/g, '')) : Number(valor);
    if (isNaN(horas) || horas <= 0) return '0 hora';

    const dias = Math.floor(horas / 24);
    const restoHoras = horas % 24;
    let resultado = '';
    if (dias > 0) {
      resultado = `${dias} dia${dias > 1 ? 's' : ''}`;
    }
    if (restoHoras > 0) {
      resultado += resultado ? ` e ${restoHoras} hora${restoHoras > 1 ? 's' : ''}` : `${restoHoras} hora${restoHoras > 1 ? 's' : ''}`;
    }
    return resultado || '0 hora';
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