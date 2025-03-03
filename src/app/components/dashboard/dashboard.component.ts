import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { Project, Issue, SubProject } from '../../interfaces/models.ts';  // Importando as interfaces
import { ChartOptions, ChartType, ChartData } from 'chart.js';
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
      { id: 110, name: 'QA quality assurance' },
      { id: 125, name: 'RNC Tecnologia' }
    ]},
    { id: 108, name: 'Projetos' },
    { id: 257, name: 'Produtos', subProjects: [
      { id: 104, name: 'Cadastro' },
      { id: 106, name: 'Layout' },
      { id: 111, name: 'Documento' },
      { id: 113, name: 'Amostra' },
      { id: 32, name: 'Report' }
    ]},
    { id: 1, name: 'Desenvolvimento', subProjects: [
      { id: 79, name: 'pyxis-ADM' },
      { id: 2, name: 'Pyxis' },
      { id: 1, name: 'pyxis-SFP' }
    ]},
  ];
  page: number = 1;
  perPage: number = 50;
  hoveredProject: any;
  selectedProject: any;
  selectedSubProjectId: number = 0;
  totalOpened = 0;
  totalClosed = 0;
  totalOverdue = 0;

  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.loadAllProjectsIssues();
  }

  loadAllProjectsIssues(): void {
    const requests = this.projects.map(project => {
      const allProjectIds: number[] = [project.id, ...(project.subProjects || []).map((sp: SubProject) => sp.id)];
      return forkJoin(allProjectIds.map((id: number) => 
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

        // Verifica se é um projeto principal com subprojetos e soma os valores de todos os subprojetos
        const subProjects = this.projects[index].subProjects;
        const isMainProjectWithSubprojects = subProjects && subProjects.length > 0;

        if (isMainProjectWithSubprojects) {
          this.projects[index].totalIssues = opened ;
          this.projects[index].openedOnTime = opened - overdue; // Tarefas abertas dentro do prazo
          this.projects[index].overdue = overdue;
          this.projects[index].closed = this.totalClosed;
        } else {
          this.projects[index].totalIssues = opened ;
          this.projects[index].openedOnTime = opened - overdue; // Tarefas abertas dentro do prazo
          this.projects[index].overdue = overdue;
          this.projects[index].closed = closed;
        }

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
