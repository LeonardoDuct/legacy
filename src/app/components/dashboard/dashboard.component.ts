import { Component, OnInit } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  issues: any[] = []; // Armazena as issues obtidas do GitLab.
  projectId: number = 123456; // Substitua pelo ID do projeto do GitLab.

  constructor(private gitlabService: GitlabService) {}

  ngOnInit(): void {
    this.loadIssues(); 
  }

  
  loadIssues(): void {
    this.gitlabService.getIssues(this.projectId).subscribe((data) => {
        this.issues = data; // Atualiza as issues recebidas da API.
      },
      (error) => {
        console.error('Erro ao buscar issues:', error); // Trata erros caso a requisição falhe.
      }
    );
  }
}
