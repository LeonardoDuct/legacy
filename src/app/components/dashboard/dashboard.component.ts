import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
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
    this.issues = [];
    this.totalIssues = 0;
    this.totalIssuesOverall = 0;
    let stateParam = state === 'all' ? '' : state;

    if (this.filterOverdue) {
      this.gitlabService.getOverdueIssues(projectId, stateParam).subscribe((data: any[]) => {
        this.issues = data;
        this.totalIssues = data.length;
      },
      (error: any) => {
        console.error('Erro ao buscar issues atrasadas:', error);
      });
    } else {
      if (project?.subProjectIds) {
        this.gitlabService.getIssuesForMultipleProjects(project.subProjectIds, this.page, this.perPage, stateParam).subscribe((data: any[]) => {
            data.forEach((issues: any[]) => {
              this.issues = this.issues.concat(issues);
              this.totalIssues += issues.length;
            });
          },
          (error: any) => {
            console.error('Erro ao buscar issues dos subprojetos:', error);
          }
        );
      } else {
        this.gitlabService.getIssues(projectId, this.page, this.perPage, stateParam).subscribe((data: any[]) => {
            this.issues = data;
            this.totalIssues = data.length;
          },
          (error: any) => {
            console.error('Erro ao buscar issues:', error);
          }
        );
      }
    }

    this.gitlabService.getTotalIssues(projectId).subscribe((total: number) => {
      this.totalIssuesOverall = total;
    },
    (error: any) => {
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
}