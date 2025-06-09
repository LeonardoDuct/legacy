import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { GitlabService } from '../../services/gitlab.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { Issue } from '../../shared/interfaces/models';
import { getScoreClass } from '../../shared/utils/functions';
import { prazoAtrasado } from '../../shared/utils/functions';

@Component({
  selector: 'app-sucessoras',
  standalone: true,
  imports: [CommonModule, RouterModule, CabecalhoComponent],
  templateUrl: './sucessoras.component.html',
  styleUrls: ['./sucessoras.component.css']
})

export class SucessorasComponent implements OnInit {
  sucessoras: Issue[] = [];
  idIssue!: number;
  tituloIssueOrigem: string = '';
  repositorioOrigem: string = '';
  numeroIsOrigem: number = 0;
  scoreOrigemTotal: number = 0;
  projetosAgrupados: { nome: string, issues: Issue[] }[] = [];
  totalConcluidas: number = 0;
  totalLigadas: number = 0;
  openedTooltip: number | null = null;
  getScoreClass = getScoreClass;
  prazoAtrasado = prazoAtrasado;

  constructor(
    private gitlabService: GitlabService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.idIssue = Number(this.route.snapshot.paramMap.get('id'));

    if (this.idIssue) {
      this.carregarSucessoras(this.idIssue);
    }
  }

  carregarSucessoras(id: number): void {
    this.gitlabService.obterSucessoras(id).subscribe({
      next: (data) => {
        this.tituloIssueOrigem = data.tituloOrigem ?? 'Título não disponível';
        this.repositorioOrigem = data.repositorioOrigem ?? 'Repositório desconhecido';
        this.numeroIsOrigem = data.numeroIsOrigem ?? 0;

        // ✅ Agora você pode acessar `scoreOrigemTotal`
        this.scoreOrigemTotal = data.scoreOrigemTotal ?? 0;

        this.sucessoras = data.sucessoras.map((issue: Issue) => {
          let conclusao = 'Sem informação de conclusão';

          if (issue.status?.toLowerCase() === 'closed') {
            conclusao = `Concluído em ${issue.data_fechamento ? new Date(issue.data_fechamento).toLocaleDateString() : 'data não informada'}`;
          } else if (issue.status?.toLowerCase() === 'opened') {
            conclusao = issue.prazo ? `Expectativa de conclusão ${new Date(issue.prazo).toLocaleDateString()}` : 'Sem expectativa de conclusão';
          }

          if (this.sucessoras.length > 0) {
            console.log('Link da primeira sucessora:', this.sucessoras[0].link);
          }

          return {
            ...issue,
            conclusao,
            score_total: issue.score_total ?? null, // ✅ Mantém `score_total` para sucessoras
            score_breakdown: issue.score_breakdown ?? null // ✅ Garante que os dados estão presentes
          };
        });

        this.projetosAgrupados = this.agruparPorProjeto(this.sucessoras);

        this.totalConcluidas = this.sucessoras.filter(issue => issue.status === 'closed').length;
        this.totalLigadas = this.sucessoras.length;
      },
      error: (error: any) => console.error('Erro ao obter sucessoras:', error)
    });
  }

  agruparPorProjeto(issues: Issue[]): { nome: string, issues: Issue[] }[] {
    const projetosMap = new Map<string, Issue[]>();

    issues.forEach(issue => {
      if (!projetosMap.has(issue.projeto_principal)) {
        projetosMap.set(issue.projeto_principal, []);
      }
      projetosMap.get(issue.projeto_principal)?.push(issue);
    });

    return Array.from(projetosMap.entries()).map(([nome, issues]) => ({ nome, issues }));
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'Concluído') return 'success';
    if (status === 'Em andamento') return 'warning';
    if (status === 'Aguardando') return 'error';
    return '';
  }

  showTooltip(numero_is: number): void {
    this.openedTooltip = numero_is;
  }
  
  hideTooltip(): void {
    this.openedTooltip = null;
  }

  voltar(): void {
    this.location.back()
  }

}