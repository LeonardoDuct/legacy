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
    { id: 32, name: 'Processos' }, //Cadastro, Layout, documento, amostra e report. Fazer uma condicional para pegar atraves das labels dos projetos do grupo produtos. Labels demanda processos

    /* { id: 262, name: 'QA' ,SubProjects: [ //analise
      { id: 118, name: 'Data Preparation' },
      { id: 107, name: 'Especificação' },
      { id: 110, name: 'QA quality assurance' } //ID 107, analise, oq tiver com a label demanda analise deve ser somado aqui
    ] },

   { id: 192, name: 'Projetos' },

    { id: 257, name: 'Produtos',SubProjects: [
      { id: 104, name: 'Cadastro' },
      { id: 106, name: 'Layout' },//ID 107, analise, oq tiver com a label demanda produtos deve ser somado aqui
      { id: 111, name: 'Documento' },
      { id: 113, name: 'Amostra' },
      { id: 32, name: 'Report' } // fazer condicional atraves das labels, demanda processos e demandas produtos
    ] },*/

    { id: 1, name: 'Desenvolvimento',SubProjects: [
      { id: 79, name: 'pyxis-ADM' },
      { id: 2, name: 'Pyxis' },
        { id: 1, name: 'pyxis-SFP' }
    ] },
    
    

    //{ id: 26, name: 'CMO' },
    
  ];
  page: number = 1;
  perPage: number = 50;
  hoveredProject: any;
  selectedProject: any;
  selectedSubProjectId: number = 123;
  totalOpened = 0;
  totalClosed = 0;
  totalOverdue = 0;


  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.loadAllProjectsIssues();
  }

  loadAllProjectsIssues(): void {
    const requests = this.projects.map(project => {
      const allProjectIds: number[] = [project.id, ...((project.SubProjects || []).map(sp => sp.id))];
      return forkJoin(allProjectIds.map((id: number) => this.gitlabService.getTotalIssuesByState(id)));
    });

    forkJoin(requests).subscribe((responses) => {
      this.totalOpened = 0;
      this.totalClosed = 0;
      this.totalOverdue = 0;
      this.totalIssues = 0;

      responses.forEach((dataList, index) => {
        let opened = 0, closed = 0, overdue = 0;
        
        dataList.forEach(data => {
          opened += data.opened;
          closed += data.closed;
          overdue += data.overdue;
        });

        this.projects[index] = {
          ...this.projects[index],
          totalIssues: opened + closed,
          openedOnTime: opened,
          overdue: overdue,
          closed: closed,
        };

        this.totalOpened += opened;
        this.totalClosed += closed;
        this.totalOverdue += overdue;
        this.totalIssues += opened + closed;
      });
    }, (error) => {
      console.error('Erro ao buscar o total de issues para os projetos:', error);
    });
  }

  selectProject(projectId: number): void {
    this.selectedProjectId = projectId;
  }
}
