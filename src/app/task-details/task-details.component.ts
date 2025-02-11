import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GitlabService } from '../services/gitlab.service';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css']
})
export class TaskDetailsComponent implements OnInit {
  taskId: string | null = null;
  projectId: number | null = null;
  taskDetails: any;

  constructor(
    private route: ActivatedRoute,
    private gitlabService: GitlabService
  ) {}

  ngOnInit(): void {
    // Captura os parâmetros 'projectId' e 'taskId' da rota
    this.route.paramMap.subscribe(params => {
      this.taskId = params.get('id');
      const projId = params.get('projectId');
      
      // Verifica se o 'projectId' foi passado corretamente e converte para número
      if (projId) {
        this.projectId = +projId;
      }
      
      // Verifica se ambos os parâmetros existem
      if (this.taskId && this.projectId) {
        this.loadTaskDetails(this.projectId, this.taskId);
      }
    });
  }

  // Método para carregar os detalhes da task usando os parâmetros 'projectId' e 'taskId'
  loadTaskDetails(projectId: number, taskId: string): void {
    this.gitlabService.getTaskDetails(projectId, taskId).subscribe(
      data => {
        console.log('Dados da task recebidos:', data); // Verifica se os dados estão chegando
        this.taskDetails = data;
      },
      error => {
        console.error('Erro ao buscar detalhes da task:', error);
      }
    );
  }
  
}
