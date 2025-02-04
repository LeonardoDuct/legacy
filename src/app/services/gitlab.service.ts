import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root', // Torna o serviço disponível em toda a aplicação sem precisar declará-lo em um módulo específico.
})
export class GitlabService {
  private apiUrl = 'https://git.jallcard.com.br:9700/api/v4'; 
  private token = 'glpat-BCSWzPHzW-qzgDhXzGWv'; 

  constructor(private http: HttpClient) {} // Injeta o HttpClient para realizar chamadas HTTP.

  /**
   * Recupera todas as issues (tickets) de um projeto específico no GitLab.
   * @param projectId - ID do projeto do qual as issues serão buscadas.
   * @returns Observable contendo as issues retornadas pela API.
   */
  getIssues(projectId: number): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.get(`${this.apiUrl}/projects/${projectId}/issues`, { headers }); // Faz a requisição GET para obter as issues.
  }

  /**
   * Cria uma nova issue em um projeto específico.
   * @param projectId - ID do projeto no qual a issue será criada.
   * @param issueData - Objeto contendo os dados da nova issue (ex: título, descrição, rótulos).
   * @returns Observable contendo a resposta da API após a criação.
   */
  createIssue(projectId: number, issueData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.post(`${this.apiUrl}/projects/${projectId}/issues`, issueData, { headers }); // Faz a requisição POST para criar a issue.
  }

  updateIssue(projectId: number, issueId: number, issueData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.put(`${this.apiUrl}/projects/${projectId}/issues/${issueId}`, issueData, { headers }); // Faz a requisição PUT para atualizar a issue.
  }

  
  patchIssue(projectId: number, issueId: number, updates: any): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.patch(`${this.apiUrl}/projects/${projectId}/issues/${issueId}`, updates, { headers }); // Faz a requisição PATCH para atualizar a issue.
  }


  deleteIssue(projectId: number, issueId: number): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/issues/${issueId}`, { headers }); // Faz a requisição DELETE para excluir a issue.
  }

  
  getIssuesWithParams(projectId: number, params: any): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.get(`${this.apiUrl}/projects/${projectId}/issues`, { headers, params }); // Faz a requisição GET com os parâmetros fornecidos.
  }
}
