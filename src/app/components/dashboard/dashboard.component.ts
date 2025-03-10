import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { Project, Issue, SubProject } from '../../interfaces/models';  // Importando as interfaces
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

  issues: Issue[] = [];
  totalIssues: number = 0;
  totalIssuesOverall: number = 0;
  selectedProjectId: number = 0;
  selectedIssueState: string = 'all';
  filterOverdue: boolean = false;
  selectedLabel: string = 'Selecione um cliente';  // Filtro de label
  startDate: string = '';  // Filtro de data inicial
  endDate: string = '';    // Filtro de data final
  selectedPeriodo: string = 'mes_anterior'; // Período selecionado
  showCustomDateFields: boolean = false; // Controle de exibição dos campos de data
  projects: Project[] = [
    { id: 109, name: 'Sustentação' },
    { id: 32, name: 'Processos', subProjects: [
      { id: 104, name: 'Cadastro' },
      { id: 106, name: 'Layout' },
      { id: 111, name: 'Documento' },
      { id: 113, name: 'Amostra' },
      { id: 32, name: 'Report' }
    ]},
    { id: 262, name: 'QA', subProjects: [
      { id: 118, name: 'Data Preparation' },
      { id: 107, name: 'Especificação' },
      { id: 110, name: 'QA quality assurance' }
    ]},
    { id: 108, name: 'Projetos' },
    { id: 328, name: 'Produtos', subProjects: [
      { id: 130, name: 'Design' },
      { id: 129, name: 'Sistemas' }
    ]},
    { id: 3, name: 'Desenvolvimento', subProjects: [
      { id: 1, name: 'Pyxis - SFP' },
      { id: 2, name: 'Pyxis - WEB' },
      { id: 119, name: 'agibank-ws' },
      { id: 54, name: 'pyxis-envio-ws' },
      { id: 79, name: 'Pyxis ADM' },
      { id: 101, name: 'pyxis-faturamento' },
      { id: 103, name: 'pyxis-faturamento-coletor' },
      { id: 36, name: 'pyxis-ws' },
      { id: 26, name: 'pyxis-cardcheck' },
      { id: 61, name: 'pyxis-sfp-ws' },
      { id: 86, name: 'Flamengo API' },
      { id: 80, name: 'read-card-api' },
      { id: 25, name: 'cardcheck' },
      { id: 58, name: 'pyxis-ids' }
    ]},
    
    { id: 315, name: 'Projetos Internos', subProjects: [
      { id: 123, name: 'BI' },
      { id: 124, name: 'Sistemas Pro'}
    ]},

    { id: 26, name: 'CMO', subProjects: [
      { id: 44, name: 'Solicitações' }
    ]},
    
  ];
  page: number = 1;
  perPage: number = 50;
  hoveredProject: any;
  selectedProject: any;
  selectedSubProjectId: number = 0;
  totalOpened = 0;
  totalClosed = 0;
  totalClosedLate = 0;
  totalOverdue = 0;

  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.selectedPeriodo = 'mes_atual'; // Define o período padrão como "Mês Atual"
    this.startDate = this.getFirstDayOfCurrentMonth();
    this.endDate = this.getLastDayOfCurrentMonth();
    this.loadIssues();
  }
  

  applyFilters(): void {
    // Aplica os filtros quando clicado
    this.loadIssues();
  }

  onPeriodoChange(event: any): void {
    this.selectedPeriodo = event.target.value;
    this.showCustomDateFields = (this.selectedPeriodo === 'custom');
    switch (this.selectedPeriodo) {
      case 'mes_anterior':
        this.startDate = this.getFirstDayOfCurrentMonth();
        this.endDate = this.getLastDayOfCurrentMonth();
        break;
      case 'ultimos_5':
        this.startDate = this.getDateDaysAgo(5);
        this.endDate = this.getCurrentDate();
        break;
      case 'ultimos_15':
        this.startDate = this.getDateDaysAgo(15);
        this.endDate = this.getCurrentDate();
        break;
      case 'ultimos_30':
        this.startDate = this.getDateDaysAgo(30);
        this.endDate = this.getCurrentDate();
        break;
      case 'custom':
        this.startDate = '';
        this.endDate = '';
        break;
    }
  }
  
  voltarPeriodo(): void {
    this.showCustomDateFields = false; // Oculta os campos de data
    this.selectedPeriodo = 'mes_atual'; // Define o período padrão como "Mês Atual"
    this.startDate = this.getFirstDayOfCurrentMonth();
    this.endDate = this.getLastDayOfCurrentMonth();
    this.loadIssues(); // Recarrega as issues do mês atual
  }

getFirstDayOfCurrentMonth(): string {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

getLastDayOfCurrentMonth(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date.toISOString().split('T')[0];
}

getCurrentDate(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}


loadIssues(): void {
  const requests = this.projects.map(project => {
    const projectIds = project.subProjects ? project.subProjects.map(sp => sp.id) : [project.id];

    const params = {
      label: this.selectedLabel,
      startDate: this.startDate || this.getFirstDayOfCurrentMonth(),
      endDate: this.endDate || this.getLastDayOfCurrentMonth(),
    };

    return forkJoin(projectIds.map(id =>
      this.gitlabService.getTotalIssuesByStatefil(id, params).pipe(
        catchError(error => {
          console.error(`Erro ao buscar issues para o projeto ${id}:`, error);
          return of({ opened: 0, closed: 0, overdue: 0, closedLate: 0 }); // Caso de erro, retorna valores default
        })
      )
    ));
  });

  forkJoin(requests).subscribe((responses) => {
    this.totalOpened = 0;
    this.totalClosed = 0;
    this.totalOverdue = 0;
    this.totalClosedLate = 0;
    this.totalIssues = 0;

    responses.forEach((dataList, index) => {
      let opened = 0, closed = 0, overdue = 0, closedLate = 0;
      let totalIssues = 0;

      dataList.forEach(data => {
        opened += data.opened;
        closed += data.closed;
        overdue += data.overdue;
        closedLate += data.closedLate;
        totalIssues += data.opened + data.closed;
      });

      this.projects[index].totalIssues = opened;
      this.projects[index].openedOnTime = opened - overdue;
      this.projects[index].overdue = overdue;
      this.projects[index].closed = closed;
      this.projects[index].closedOnTime = closed - closedLate;
      this.projects[index].closedLate = closedLate; // Adiciona a inicialização correta

      this.totalOpened += opened;
      this.totalClosed += closed;
      this.totalOverdue += overdue;
      this.totalClosedLate += closedLate;
      this.totalIssues += totalIssues;
    });
  }, (error) => {
    console.error('Erro ao buscar o total de issues para os projetos:', error);
  });
}


  loadAllProjectsIssues(): void {
    const requests = this.projects.map(project => {
      // Busca issues apenas dos subprojetos, se houver
      const projectIds = project.subProjects ? project.subProjects.map(sp => sp.id) : [project.id];
      return forkJoin(projectIds.map(id => 
        this.gitlabService.getTotalIssuesByState(id).pipe(
          catchError(error => {
            console.error(`Erro ao buscar issues para o projeto ${id}:`, error);
            return of({ opened: 0, closed: 0, overdue: 0 });
          })
        )
      ));
    });

    forkJoin(requests).subscribe((responses) => {
      this.totalOpened = 0;
      this.totalClosed = 0;
      this.totalOverdue = 0;
      this.totalIssues = 0;

      responses.forEach((dataList, index) => {
        let opened = 0, closed = 0, overdue = 0;
        let totalIssues = 0;

        dataList.forEach(data => {
          opened += data.opened;
          closed += data.closed;
          overdue += data.overdue;
          totalIssues += data.opened + data.closed;
        });

        // Atualiza os totais do projeto principal
        this.projects[index].totalIssues = opened;
        this.projects[index].openedOnTime = opened - overdue; // Tarefas abertas dentro do prazo
        this.projects[index].overdue = overdue;
        this.projects[index].closed = closed;
        this.projects[index].closedOnTime = closed - overdue;

        // Atualiza os totais gerais
        this.totalOpened += opened;
        this.totalClosed += closed;
        this.totalOverdue += overdue;
        this.totalIssues += totalIssues;
      });
    }, (error) => {
      console.error('Erro ao buscar o total de issues para os projetos:', error);
    });
  }

  selectProject(projectId: number): void {
    this.selectedProjectId = projectId;
  }
}
