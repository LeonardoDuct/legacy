import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { CommonModule } from '@angular/common';
import { ChartOptions,  ChartType, ChartDataset, ChartData } from 'chart.js';
import { forkJoin } from 'rxjs';



@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

  pieChartOptions: ChartOptions = {
    responsive: true,
  };
  pieChartLabels: string[] = ['Abertas', 'Fechadas' , 'Em Andamento', 'Em Teste', 'Atrasadas' ];
  pieChartType: ChartType = 'pie';
  pieChartLegend = true;
  pieChartData: ChartData <'pie', number[], string> = {
    labels: this.pieChartLabels,
    datasets: [
      {data: [65, 59, 80, 81, 56], label:'Tarefas'}
    ]

  };
  issues: any[] = []; 
  totalIssues: number = 0;
  totalIssuesOverall: number = 0;
  selectedProjectId: number = 123456;  
  selectedIssueState: string = 'all';
  filterOverdue: boolean = false; // Nova propriedade para armazenar o filtro de issues atrasadas
  projects = [
    { id: 262, name: 'Analise' },
    { id: 78, name: 'Atendimento' },
    { id: 1, name: 'Desenvolvimento', subProjectIds: [1, 2, 79] },
    { id: 26, name: 'infra' },
    { id: 108, name: 'Integração' },
    { id: 32, name: 'Processos' },
    { id: 257, name: 'Produtos' },
    { id: 192, name: 'Projetos' },
  ];
  page: number = 1;
  perPage: number = 50;

  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.selectedProjectId = this.projects[0].id;  
    this.loadIssues(this.selectedProjectId, this.selectedIssueState); 
  }

  loadIssues(projectId: number, state: string): void {
    const project = this.projects.find(p => p.id === projectId);
    console.log('Projeto selecionado:', project?.name);
    console.log('Subprojetos:', project?.subProjectIds);
    this.issues = [];
    this.totalIssues = 0;
    this.totalIssuesOverall = 0;
    let stateParam = state === 'all' ? '' : state;
  
    const requests = [];
  
    // Buscar issues do projeto principal
    requests.push(this.gitlabService.getIssues(projectId, this.page, this.perPage, stateParam));
  
    // Buscar issues de subprojetos (se existirem)
    if (project?.subProjectIds) {
      project.subProjectIds.forEach((subProjectId: number) => {
        requests.push(this.gitlabService.getIssues(subProjectId, this.page, this.perPage, stateParam));
      });
    }
  
    // Fazer todas as requisições ao mesmo tempo
    forkJoin(requests).subscribe((responses: any[][]) => {
      responses.forEach((data: any[]) => {
        this.issues = this.issues.concat(data); // Adiciona todas as issues
        this.totalIssues += data.length; // Atualiza o total de issues
      });
  
      // Agora que todas as issues foram carregadas, atualiza o gráfico
      this.updateChartData();
    }, (error: any) => {
      console.error('Erro ao buscar issues:', error);
    });
  
    // Atualizar total geral de issues
    this.gitlabService.getTotalIssues(projectId).subscribe((total: number) => {
      this.totalIssuesOverall = total;
    }, (error: any) => {
      console.error('Erro ao buscar o total geral de issues:', error);
    });
  }
  
  onProjectSelect(): void {
    this.loadIssues(this.selectedProjectId, this.selectedIssueState);
  }

  onIssueStateSelect(): void {
    this.loadIssues(this.selectedProjectId, this.selectedIssueState);
  }

  onOverdueFilterChange(): void {
    this.loadIssues(this.selectedProjectId, this.selectedIssueState);
  }

  updateChartData(): void {
    // Criamos variáveis para armazenar os totais corretos
    let opened = 0;
    let closed = 0;
    let inProgress = 0;
    let testing = 0;
    let overdue = 0;
  
    // Buscar todas as issues do projeto e subprojetos
    const project = this.projects.find(p => p.id === this.selectedProjectId);
    let allRequests = [this.gitlabService.getTotalIssuesByState(this.selectedProjectId)];
  
    if (project?.subProjectIds) {
      project.subProjectIds.forEach((subProjectId) => {
        allRequests.push(this.gitlabService.getTotalIssuesByState(subProjectId));
      });
    }
  
    // Fazer todas as requisições de uma vez e processar os dados
    forkJoin(allRequests).subscribe((responses: any[]) => {
      responses.forEach((data) => {
        opened += data.opened;
        closed += data.closed;
        inProgress += data.in_progress;
        testing += data.testing;
        overdue += data.overdue;
      });
  
      // Atualizar os dados do gráfico com os valores reais
      this.pieChartData = {
        labels: ['Abertas', 'Fechadas', 'Em Andamento', 'Em Teste', 'Atrasadas'],
        datasets: [{ data: [opened, closed, inProgress, testing, overdue] }]
      };
    }, (error) => {
      console.error('Erro ao buscar o total de issues para o gráfico:', error);
    });
  }
  
  isOverdue(issue: any): boolean {
    return issue.due_date && new Date(issue.due_date) < new Date();
  }
  
}