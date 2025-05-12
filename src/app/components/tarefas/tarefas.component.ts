import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { GitlabService } from '../../services/gitlab.service';

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
  imports: [CommonModule, CabecalhoComponent],
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gitlabService: GitlabService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.nomeProjeto = params.get('projeto') ?? '';

      if (this.nomeProjeto) {
        this.carregarTarefas(this.nomeProjeto);
      }
    });
  }

  carregarTarefas(projeto: string) {
    this.gitlabService.obterIssuesPorProjetoNome(projeto).subscribe(
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

  voltar(): void {
    this.router.navigate(['/dashboard']);
  }
}