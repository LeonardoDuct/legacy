import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { GitlabService } from 'src/app/services/gitlab.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { FormsModule } from '@angular/forms';

interface Issue {
  id: number;
  titulo: string;
  obs: string;
  percentual?: number;
  status?: 'opened' | 'closed';
  prazo?: string | null;
  data_fechamento?: string | null;
}

interface ProjetoInterno {
  nome: string;
  id: number;
  percentual: number;
  abertas: number;
  fechadas: number;
  issues_abertas: Issue[];
  issues_fechadas: Issue[];
  abertasDentroPrazo: number;
  abertasForaPrazo: number;
  fechadasDentroPrazo: number;
  fechadasForaPrazo: number;
}

@Component({
  selector: 'app-projetos-internos',
  imports: [CabecalhoComponent, CommonModule, FormsModule],
  templateUrl: './projetos-internos.component.html',
  styleUrls: ['./projetos-internos.component.css']
})
export class ProjetosInternosComponent implements OnInit {
  projetos: ProjetoInterno[] = [];
  projetoExpandidoIndex: number | null = 0;
  modalAberto = false;
  projetoSelecionado: ProjetoInterno | null = null;
  issueSelecionada: Issue | null = null;
  novaObs: string = '';
  novoPercentual: number = 0;
  usuarioHead: boolean = false;
  mostrarApenasAbertas: boolean = false;

  constructor(
    private gitlabService: GitlabService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.gitlabService.obterProjetosInternosResumo().subscribe({
      next: (projetos: ProjetoInterno[]) => {
        this.projetos = projetos;
      },
      error: (err) => {
        console.error('Erro ao obter projetos internos:', err);
      }
    });

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.usuarioHead = payload.head === true;
      } catch (e) {
        this.usuarioHead = false;
      }
    }
  }

  voltar(): void {
    this.location.back();
  }

  getPercentualConcluidas(projeto: ProjetoInterno): number {
    return projeto.percentual;
  }

  abrirModalAdicionarIssue(projeto: ProjetoInterno, issue: Issue) {
    this.modalAberto = true;
    this.projetoSelecionado = projeto;
    this.issueSelecionada = issue;
    this.novaObs = issue.obs || '';
    this.novoPercentual = issue.percentual ?? 0;
  }

  fecharModalAdicionar() {
    this.modalAberto = false;
    this.projetoSelecionado = null;
    this.issueSelecionada = null;
    this.novaObs = '';
    this.novoPercentual = 0;
  }

  confirmarAdicionarObs() {
    if (this.issueSelecionada) {
      this.gitlabService.upsertObservacaoIssue(
        this.issueSelecionada.id,
        this.novaObs.trim(),
        this.novoPercentual
      ).subscribe({
        next: () => {
          this.issueSelecionada!.obs = this.novaObs.trim();
          this.issueSelecionada!.percentual = this.novoPercentual;
          this.fecharModalAdicionar();
        },
        error: err => {
          console.error('Erro ao salvar observação:', err);
        }
      });
    }
  }

  toggleProjetoExpandido(index: number) {
    this.projetoExpandidoIndex = this.projetoExpandidoIndex === index ? null : index;
  }

  getIssuesOrdenadas(projeto: ProjetoInterno): Array<Issue & { status: 'opened' | 'closed' }> {
    let todas = this.getTodasIssues(projeto);
    if (this.mostrarApenasAbertas) {
      todas = todas.filter(issue => issue.status === 'opened');
    }
    return todas.slice().sort((a, b) => this.getPercentualIssue(b) - this.getPercentualIssue(a));
  }

  getTodasIssues(projeto: ProjetoInterno): Array<Issue & { status: 'opened' | 'closed' }> {
    const abertas = (projeto.issues_abertas ?? []).map(issue => ({ ...issue, status: 'opened' as const }));
    const fechadas = (projeto.issues_fechadas ?? []).map(issue => ({ ...issue, status: 'closed' as const }));
    return [...abertas, ...fechadas];
  }

  getPercentualProjeto(projeto: ProjetoInterno): number {
    const issues = this.getTodasIssues(projeto);
    if (!issues.length) return 0;
    const percentuais = issues.map(issue => issue.percentual || 0);
    if (percentuais.every(p => p === 100)) return 100;
    const soma = percentuais.reduce((acc, cur) => acc + cur, 0);
    return Math.round(soma / percentuais.length);
  }

  getPercentualIssue(issue: Issue): number {
    return issue.percentual || 0;
  }
}