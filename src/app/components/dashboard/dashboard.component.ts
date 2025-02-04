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
  projectId: number = 1234;
  selectedProjectId: number = 123456;  
  projects = [
    { id: 262, name: 'Projeto 1' },
    { id: 78, name: 'Projeto 2' },
    { id: 3, name: 'Projeto 3' }
  ];
  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.selectedProjectId = this.projects[0].id;  
    this.loadIssues(this.selectedProjectId); 
  }

  
  loadIssues(projectId: number): void {
    this.gitlabService.getIssues(projectId).subscribe((data) => {
        this.issues = data; // Atualiza as issues recebidas da API.
      },
      (error) => {
        console.error('Erro ao buscar issues:', error); // Trata erros caso a requisição falhe.
      }
    );
  }
  onProjectSelect(): void {
    this.loadIssues(this.selectedProjectId);  // Carrega as issues quando um projeto for selecionado
  }
}
