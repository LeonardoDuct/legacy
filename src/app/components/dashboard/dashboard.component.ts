import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { Project, Issue, SubProject } from '../../interfaces/models';  // Importando as interfaces
import { forkJoin, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';

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
  filtroAtrasado: boolean = false;  // Filtro de atraso
  selectedLabel: string = 'Selecione um cliente';  // Filtro de label
  dataInicio: string = '';  // Filtro de data inicial
  dataFim: string = '';    // Filtro de data final
  periodoSelecionado: string = 'mes_anterior'; // Período selecionado
  menuAberto: boolean = false;
  mostrarCamposDataPersonalizada: boolean = false; // Controle de exibição dos campos de data
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
    { id: 108, name: 'Projetos' , subProjects: [
      { id: 123, name: 'BI' },
      { id: 124, name: 'Sistemas Pro'}
    ]},

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
    { id: 315, name: 'Suporte' },
    
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
    this.periodoSelecionado = 'mes_atual'; // Define o período padrão como "Mês Atual"
    this.dataInicio = this.obterPrimeiroDiaDoMesAtual();
    this.dataFim = this.obterUltimoDiaDoMesAtual();
    this.carregarIssues();
  }

  aplicarFiltros(): void {
    // Aplica os filtros quando clicado
    this.carregarIssues();
  }

  alterarPeriodo(event: any): void {
    const selectValue = event.target.value;

    if(selectValue === '') {
      this.voltarPeriodo();
      return;
    }
    
    this.periodoSelecionado = event.target.value;
    this.mostrarCamposDataPersonalizada = (this.periodoSelecionado === 'custom');
    switch (this.periodoSelecionado) {
      case 'mes_atual':
        this.dataInicio = this.obterPrimeiroDiaDoMesAtual();
        this.dataFim = this.obterUltimoDiaDoMesAtual();
        break;
      case 'ultimos_5':
        this.dataInicio = this.obterDataDeDiasAtras(5);
        this.dataFim = this.obterDataAtual();
        break;
      case 'ultimos_15':
        this.dataInicio = this.obterDataDeDiasAtras(15);
        this.dataFim = this.obterDataAtual();
        break;
      case 'ultimos_30':
        this.dataInicio = this.obterDataDeDiasAtras(30);
        this.dataFim = this.obterDataAtual();
        break;
      case 'custom':
        this.dataInicio = '';
        this.dataFim = '';
        break;
    }
  }

  voltarPeriodo(): void {
    this.mostrarCamposDataPersonalizada = false; // Oculta os campos de data
    this.periodoSelecionado = 'mes_atual'; // Define o período padrão como "Mês Atual"
    this.dataInicio = this.obterPrimeiroDiaDoMesAtual();
    this.dataFim = this.obterUltimoDiaDoMesAtual();
    this.carregarIssues(); // Recarrega as issues do mês atual
  }

  obterPrimeiroDiaDoMesAtual(): string {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  }

  obterUltimoDiaDoMesAtual(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    date.setHours(23, 59, 59, 999);
    return date.toISOString().split('T')[0];
  }

  obterDataAtual(): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  }

  obterDataDeDiasAtras(dias: number): string {
    const date = new Date();
    date.setDate(date.getDate() - dias);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  }

  carregarIssues(): void {
    const requests = this.projects.map(project => {
      const projectIds = project.subProjects ? project.subProjects.map(sp => sp.id) : [project.id];

      const params = {
        label: this.selectedLabel,
        startDate: this.dataInicio || this.obterPrimeiroDiaDoMesAtual(),
        endDate: this.dataFim || this.obterUltimoDiaDoMesAtual(),
      };

      return forkJoin(projectIds.map(id =>
        this.gitlabService.obterTotalIssuesFiltradas(id, params).pipe(
          catchError(error => {
            console.error(`Erro ao buscar issues para o projeto ${id}:`, error);
            return of({ opened: 0, closed: 0, overdue: 0, closedLate: 0 }); // Caso de erro, retorna valores default
          }),
          tap((issues) => {
            if (Array.isArray(issues) && issues.length === 0) {
              console.warn(`Nenhuma issue encontrada para o projeto ${id} no intervalo definido.`)
            }
          })
        )
      ));
    });

    forkJoin(requests).pipe(
      tap((responses) => {
        this.resetarTotais();
        responses.forEach((dataList, index) => {
          if (dataList && dataList.length === 0) {
            console.warn(`Projeto ${this.projects[index].name}: Nenhuma issue encontrada para o período.`);
          }
          this.processarDadosProjeto(dataList, index);
        });
      }),
      catchError((error) => {
        console.error('Erro ao buscar o total de issues para os projetos:', error);
        throw error; // Rethrow the error to propagate it further if needed
      }),
      finalize(() => {
        console.log('Processamento das issues finalizado');
      })
    ).subscribe();
  }

  carregarIssuesTodosProjetos(): void {
    const requests = this.projects.map(project => {
      // Busca issues apenas dos subprojetos, se houver
      const projectIds = project.subProjects ? project.subProjects.map(sp => sp.id) : [project.id];
      return forkJoin(projectIds.map(id => 
        this.gitlabService.obterTotalIssuesPorEstado(id).pipe(
          catchError(error => {
            console.error(`Erro ao buscar issues para o projeto ${id}:`, error);
            return of({ opened: 0, closed: 0, overdue: 0 });
          })
        )
      ));
    });

    forkJoin(requests).pipe(
      tap((responses) => {
        this.resetarTotais();
        responses.forEach((dataList, index) => {
          this.processarDadosProjeto(dataList, index);
        });
      }),
      catchError ((error) => {
        console.error('Erro ao buscar o total de issues para os projetos:', error);
        throw error;
      }),
      finalize(() => {
        console.log('Processamento das issues finalizado');
      })
    ).subscribe();
  }

  selecionarProjeto(projectId: number): void {
    this.selectedProjectId = projectId;
  }

  private resetarTotais(): void {
    this.totalOpened = 0;
    this.totalClosed = 0;
    this.totalOverdue = 0;
    this.totalClosedLate = 0;
    this.totalIssues = 0;
  }

  private processarDadosProjeto(dataList: any[], index: number): void {
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
    this.projects[index].closedLate = closedLate;

    this.totalOpened += opened;
    this.totalClosed += closed;
    this.totalOverdue += overdue;
    this.totalClosedLate += closedLate;
    this.totalIssues += totalIssues;
  }
}