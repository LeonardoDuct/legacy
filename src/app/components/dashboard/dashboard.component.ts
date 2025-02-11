import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { Project, Issue, StatusCount, SubProject } from '../../interfaces/models.ts';  // Importando as interfaces
import { ChartOptions, ChartType, ChartDataset, ChartData } from 'chart.js';
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
  pieChartLabels: string[] = ['Abertas', 'Fechadas', 'Em Andamento', 'Em Teste', 'Atrasadas'];
  pieChartType: ChartType = 'pie';
  pieChartLegend = true;
  pieChartData: ChartData<'pie', number[], string> = {
    labels: this.pieChartLabels,
    datasets: [{ data: [65, 59, 80, 81, 56], label: 'Tarefas' }],
  };

  issues: Issue[] = []; // Usando a interface Issue
  totalIssues: number = 0;
  totalIssuesOverall: number = 0;
  selectedProjectId: number = 0;
  selectedIssueState: string = 'all';
  filterOverdue: boolean = false;
  projects: Project[] = [
    
    { id: 108, name: 'Sustentação' },
    { id: 32, name: 'Processos' },

    { id: 262, name: 'Analise' ,SubProjects: [
      { id: 118, name: 'Data Preparation' },
      { id: 107, name: 'Especificação' },
      { id: 110, name: 'QA quality assurance' },
      { id: 125, name: 'RNC Tecnologia'}
    ] },

    { id: 192, name: 'Projetos' },
    
    { id: 257, name: 'Produtos',SubProjects: [
      { id: 104, name: 'Cadastro' },
      { id: 111, name: 'Documento' }
    ] },

    { id: 1, name: 'Desenvolvimento',SubProjects: [
      { id: 79, name: 'pyxis-ADM' },
      { id: 2, name: 'Pyxis' },
        { id: 1, name: 'pyxis-SFP' }
    ] },
    

    { id: 26, name: 'infra' },
    
  ];
  page: number = 1;
  perPage: number = 50;
  hoveredProject: any;
  selectedProject: any;
  selectedSubProjectId: number = 123;


  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    // Não vai carregar nada por padrão, o usuário escolhe o projeto
    this.loadIssues(this.selectedProjectId, this.selectedIssueState);
  }

  loadIssues(projectId: number, state: string): void {
    // Limpar dados
    this.issues = [];
    this.totalIssues = 0;
    this.totalIssuesOverall = 0;

    let stateParam = state === 'all' ? '' : state;
    
    // Lista de requisições para o projeto principal e subprojetos
    const requests = [];

    // Buscar as issues do projeto principal
    requests.push(this.gitlabService.getIssues(projectId, this.page, this.perPage, stateParam));

    // Buscar as issues dos subprojetos, se existirem
    const project = this.projects.find(p => p.id === projectId);
    if (project?.SubProjects) {
  project.SubProjects.forEach((subProject: SubProject) => {
    requests.push(this.gitlabService.getIssues(subProject.id, this.page, this.perPage, stateParam));
  });
}

    // Realiza todas as requisições
    forkJoin(requests).subscribe((responses: Issue[][]) => {
      responses.forEach((data: Issue[]) => {
        this.issues = this.issues.concat(data);
        this.totalIssues += data.length;
      });

      // Atualiza o gráfico
      this.updateChartData();
    }, (error: any) => {
      console.error('Erro ao carregar issues:', error);
    });

    // Buscar o total geral de issues
    this.gitlabService.getTotalIssues(projectId).subscribe((total: number) => {
      this.totalIssuesOverall = total;
    }, (error: any) => {
      console.error('Erro ao buscar o total geral de issues:', error);
    });
  }

  updateChartData(): void {
    const statusLabels = {
      opened: 'Abertas',
      closed: 'Fechadas'
    };
  
    // Inicializar o contador de status
    let statusCount: StatusCount = {
      opened: 0,
      closed: 0
    };
  
    // Contabiliza as issues para os estados abertos e fechados
    this.issues.forEach((issue: Issue) => {
      switch (issue.state) {
        case 'opened':
          statusCount.opened += 1;
          break;
        case 'closed':
          statusCount.closed += 1;
          break;
        default:
          break;
      }
    });
  
    // Atualiza o gráfico para mostrar apenas Abertas e Fechadas
    this.pieChartData = {
      labels: Object.values(statusLabels),
      datasets: [{
        data: [
          statusCount.opened,
          statusCount.closed
        ],
        label: 'Tarefas'
      }]
    };
  }
  

  isOverdue(issue: Issue): boolean {
    return (new Date(issue.due_date ?? '') < new Date());
  }
  onProjectSelect(): void {
    // Lógica para lidar com a seleção de um projeto
    console.log('Projeto selecionado:', this.selectedProjectId);
    this.loadIssues(this.selectedProjectId, this.selectedIssueState);
  }
  

  // Método chamado quando um estado de issue é selecionado
  onIssueStateSelect(): void {
    // Lógica para lidar com a seleção de um estado de issue
    console.log('Estado da issue selecionado:', this.selectedIssueState);
    this.loadIssues(this.selectedProjectId, this.selectedIssueState);
  }

  
  onOverdueFilterChange(): void {
    
    console.log('Filtro de overdue alterado:', this.filterOverdue);
    this.updateChartData();
  }
  
}
