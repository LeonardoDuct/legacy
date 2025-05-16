import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../interfaces/models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private readonly apiUrl = environment.backendApiUrl; // URL do backend Express.js

  constructor(private http: HttpClient) {}

  // 🔹 Buscar todas as issues agrupadas por projeto principal
  obterIssuesPorProjeto(): Observable<any> {
    return this.http.get(`${this.apiUrl}/issues`);
  }

  // 🔹 Buscar detalhes de uma única issue pelo ID
  obterDetalhesDaIssue(issueId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/issues/${issueId}`);
  }

  // 🔹 Buscar todos os projetos
  obterProjetos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects`);
  }

  // 🔹 Buscar todas as labels
  carregarLabels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/labels`);
  }

  obterIssuesPorProjetoNome(nomeProjeto: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/issues/detalhes/${nomeProjeto}`);
  }

  obterIssuesPorPeriodo(dataInicio: string, dataFim: string): Observable<Issue[]> {
  return this.http.get<Issue[]>(`${this.apiUrl}/issues/filtrar?dataInicio=${dataInicio}&dataFim=${dataFim}`);
}
  
}