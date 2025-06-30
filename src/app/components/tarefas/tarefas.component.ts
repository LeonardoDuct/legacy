import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { GitlabService } from '../../services/gitlab.service';
import { getScoreClass, obterStatusGeral, prazoAtrasado, removerAcentos } from 'src/app/shared/utils/functions';

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
  autor?: string; 
  data_abertura?: string; 
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

  filtroColuna: string = '';
  filtroValor: string = '';

  LABEL_STATUS_COLORS: { [label: string]: string } = {
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
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).subscribe(([params, queryParams]) => {
      this.nomeProjeto = params.get('projeto') ?? '';
      const dataInicio = queryParams.get('dataInicio') || undefined;
      const dataFim = queryParams.get('dataFim') || undefined;

      if (this.nomeProjeto) {
        this.carregarTarefas(this.nomeProjeto, dataInicio, dataFim);
      }
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

  get totalAguardandoSetor(): number {
    return this.tarefas.filter(tarefa => this.getMotivoAtraso(tarefa)).length;
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

  ordenarTarefas(criterio: string | ((a: Issue, b: Issue) => number)): void {
    if (typeof criterio === 'function') {
      this.tarefas.sort(criterio);
      return;
    }

    if (this.sortColumn === criterio) {
      this.sortDirection = !this.sortDirection;
    } else {
      this.sortColumn = criterio;
      this.sortDirection = true;
    }

    const direction = this.sortDirection ? 1 : -1;

    this.tarefas.sort((a, b) => {
      const key = criterio as keyof Issue;
      let aValue = a[key];
      let bValue = b[key];

      function parsePossiblyNumeric(val: any): number | null {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^0-9.]+/g, ''));
          return isNaN(num) ? null : num;
        }
        return null;
      }

      const aNum = parsePossiblyNumeric(aValue);
      const bNum = parsePossiblyNumeric(bValue);
      if (aNum !== null && bNum !== null) {
        if (aNum < bNum) return -1 * direction;
        if (aNum > bNum) return 1 * direction;
        return 0;
      }

      if (
        (criterio.toLowerCase().includes('prazo') ||
          criterio.toLowerCase().includes('data')) &&
        aValue &&
        bValue
      ) {
        const aDate = new Date(aValue as string).getTime();
        const bDate = new Date(bValue as string).getTime();
        return (aDate - bDate) * direction;
      }

      const aStr = (aValue ?? '').toString().toLowerCase();
      const bStr = (bValue ?? '').toString().toLowerCase();
      if (aStr < bStr) return -1 * direction;
      if (aStr > bStr) return 1 * direction;
      return 0;
    });
  }

  // Critérios de ordenação especiais:
  ordenarAguardandoSetorPrimeiro = (a: Issue, b: Issue) => {
    const aAguardando = !!a.motivoAtraso;
    const bAguardando = !!b.motivoAtraso;
    if (aAguardando && !bAguardando) return -1;
    if (!aAguardando && bAguardando) return 1;
    return 0;
  }

  ordenarAtrasadasPrimeiro = (a: Issue, b: Issue) => {
    const aAtrasada = !!(a.prazo && this.prazoAtrasado(a.prazo) && !a.motivoAtraso);
    const bAtrasada = !!(b.prazo && this.prazoAtrasado(b.prazo) && !b.motivoAtraso);
    if (aAtrasada && !bAtrasada) return -1;
    if (!aAtrasada && bAtrasada) return 1;
    return 0;
  }
  
}