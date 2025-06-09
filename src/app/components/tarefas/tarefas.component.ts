import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { GitlabService } from '../../services/gitlab.service';
import { FormsModule } from '@angular/forms';
import { getScoreClass, removerAcentos } from 'src/app/shared/utils/functions';
import { obterStatusGeral } from 'src/app/shared/utils/functions';
import { prazoAtrasado } from 'src/app/shared/utils/functions';

interface Issue {
  codigo_issue: number;
  repositorio: string;
  cliente: string;
  status: string;
  prazo: string;
  responsavel: string;
  prioridade?: number;
  score_total?: number;
  labels?: string[];
  motivoAtraso?: string | null;
  id_issue: number;
}

@Component({
  selector: 'app-tarefas',
  standalone: true,
  imports: [CommonModule, CabecalhoComponent, FormsModule, RouterModule],
  templateUrl: './tarefas.component.html',
  styleUrl: './tarefas.component.css',
})
export class TarefasComponent implements OnInit {
  nomeProjeto: string = '';
  sortColumn: string = '';
  sortDirection: boolean = true;
  tarefas: any[] = [];
  atrasadasTotal: number = 0;
  pendentesTotal: number = 0;
  statusGeral: string = 'Estável';
  openedTooltip: number | null = null;
  getScoreClass = getScoreClass
  removerAcentos = removerAcentos
  prazoAtrasado = prazoAtrasado

  // Variáveis de filtro
  filtroColuna: string = '';
  filtroValor: string = '';

  LABEL_STATUS_COLORS: { [label: string]: string } = {
    // Sustentação
    "Status / Não Iniciado": "#e86f5b",
    "Status / Iniciado": "#e88e3d",
    "Status / Liberado": "#18aa61",
    "Status / Pendente": "#e2445c",
    "Status / Stand By": "#e86f5b",
  
    // Projetos
    "Status / Acompanhamento": "#e88e3d",
    "Status / Em Andamento": "#e88e3d",
    "Status / Aguardando": "#e2445c",
    "Status / Pendencia": "#e2445c",
  
    // Processos
    "Status / Fila": "#e86f5b",
    "Status / Andamento": "#e88e3d",
    "Status / Ajuste": "#e88e3d",
    "Status / Validação": "#e88e3d",
  
    // Desenvolvimento (usando os mesmos nomes)
    // QA (Análise e QA)
    "Status / Não Iniciado QA": "#cd5b45",
    "Status / Iniciado QA": "#ed9121",
    "Status / Liberado QA": "#009966",
    "Status / Pendente QA": "#c21e56",
    "Status / Stand By QA": "#cd5b45"
  };

  AGUARDANDO_INTERNAS: string[] = ['Aguardando ajustes', 'Aguardando review'];

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private gitlabService: GitlabService
  ) {}

  sucessorasMap: { [id_issue: number]: number } = {};

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.nomeProjeto = params.get('projeto') ?? '';
  
      // Pegue os query params e converta null para undefined
      this.route.queryParamMap.subscribe((queryParams) => {
        const dataInicio = queryParams.get('dataInicio') || undefined;
        const dataFim = queryParams.get('dataFim') || undefined;
  
        if (this.nomeProjeto) {
          this.carregarTarefas(this.nomeProjeto, dataInicio, dataFim);
        }
      });
    });
  }

  carregarTarefas(nomeProjeto: string, dataInicio?: string, dataFim?: string) {
    this.gitlabService.obterIssuesPorProjetoNome(nomeProjeto, dataInicio, dataFim).subscribe({
      next: (dados: Issue[]) => {
        this.tarefas = dados.map(tarefa => {
          // Passa o id (único) para buscar sucessoras, e não o codigo_issue
          this.carregarQuantidadeSucessoras(tarefa.id_issue);  
          return { ...tarefa, motivoAtraso: this.getMotivoAtraso(tarefa) };
        });
  
        this.pendentesTotal = this.tarefas.length;
        this.atrasadasTotal = this.tarefas.filter(
          tarefa => tarefa.prazo && new Date(tarefa.prazo) < new Date() && !tarefa.motivoAtraso
        ).length;
  
        this.statusGeral = obterStatusGeral(this.pendentesTotal, this.atrasadasTotal);
      },
      error: (erro) => {
        console.error('Erro ao carregar tarefas:', erro);
      }
    });
  }

  carregarQuantidadeSucessoras(idIssue: number): void {
    this.gitlabService.obterSucessoras(idIssue).subscribe({
      next: (data) => {
        const sucessoras = data?.sucessoras ?? [];
        this.sucessorasMap[idIssue] = sucessoras.length;  
      },
      error: (error: any) => console.error(`Erro ao obter sucessoras da issue ${idIssue}:`, error)
    });
  }
  

getQuantidadeSucessoras(idIssue: number): number {
    return this.sucessorasMap[idIssue] || 0;
}

  getMotivoAtraso(tarefa: Issue): string | null {
    if (!prazoAtrasado(tarefa.prazo) || !tarefa.labels) return null;

    // Busca label "Aguardando X" que não seja interna
    const labelAguardandoOutro = tarefa.labels.find(label =>
      label.startsWith('Aguardando') &&
      !this.AGUARDANDO_INTERNAS.includes(label)
    );

    if (labelAguardandoOutro) {
      // Extrai o setor, ex: "Aguardando QA"
      const setor = labelAguardandoOutro.replace('Aguardando ', '');
      return `Essa issue está aguardando o setor de ${setor} para ser finalizada.`;
    }
    return null;
  }
  
  get tarefasFiltradas() {
    if (!this.filtroColuna || !this.filtroValor) {
      return this.tarefas;
    }
    const valor = this.filtroValor.toLowerCase();
    return this.tarefas.filter(tarefa => {
      const campo = (tarefa[this.filtroColuna] || '').toString().toLowerCase();
      return campo.includes(valor);
    });
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = !this.sortDirection;
    } else {
      this.sortColumn = column;
      this.sortDirection = true;
    }

    this.tarefas.sort((a, b) => {
      const key = column as keyof typeof a;
      if (a[key] < b[key]) return this.sortDirection ? -1 : 1;
      if (a[key] > b[key]) return this.sortDirection ? 1 : -1;
      return 0;
    });
  }

  corDeStatus(status: string): string {
    if (this.LABEL_STATUS_COLORS[status]) {
      return this.LABEL_STATUS_COLORS[status];
    }
    if (this.LABEL_STATUS_COLORS[status + ' QA']) {
      return this.LABEL_STATUS_COLORS[status + ' QA'];
    }
    return "#2c3e50"; 
  }

  voltar(): void {
    this.location.back()
  }

  showTooltip(index: number) {
    this.openedTooltip = index;
  }
  hideTooltip() {
    this.openedTooltip = null;
  }
  
}