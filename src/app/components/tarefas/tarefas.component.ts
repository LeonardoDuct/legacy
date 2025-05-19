import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { GitlabService } from '../../services/gitlab.service';
import { FormsModule } from '@angular/forms';

interface Issue {
  codigo_issue: number;
  repositorio: string;
  cliente: string;
  status: string;
  prazo: string;
  responsavel: string;
  prioridade?: number;
  score_total?: number;
}

@Component({
  selector: 'app-tarefas',
  standalone: true,
  imports: [CommonModule, CabecalhoComponent, FormsModule],
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gitlabService: GitlabService
  ) {}

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
    this.gitlabService.obterIssuesPorProjetoNome(nomeProjeto, dataInicio, dataFim).subscribe(
      (dados: Issue[]) => {
        this.tarefas = dados;
        this.pendentesTotal = this.tarefas.length;
        this.atrasadasTotal = this.tarefas.filter(
          (tarefa) => tarefa.prazo && new Date(tarefa.prazo) < new Date()
        ).length;

        this.statusGeral = this.obterStatusGeral(this.pendentesTotal, this.atrasadasTotal);
      },
      (erro) => {
        console.error('Erro ao carregar tarefas:', erro);
      }
    );
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

  getScoreClass(score: number): string {
    if (score < 25) return 'score verde';
    if (score < 50) return 'score amarelo';
    if (score < 75) return 'score vermelho-claro';
    return 'score vermelho-escuro';
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
    this.router.navigate(['/dashboard']);
  }

  showTooltip(index: number) {
    this.openedTooltip = index;
  }
  hideTooltip() {
    this.openedTooltip = null;
  }
  prazoAtrasado(data: string | Date): boolean {
    const hoje = new Date();
    const prazo = new Date(data);
    return prazo < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  }
  
}