import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GitlabService {
  private apiUrl = environment.apiUrl; 
  private token = environment.gitlabToken; 

  constructor(private http: HttpClient) {}

  getIssues(projectId: number, page: number = 1, perPage: number = 50, state: string = ''): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());
    if (state) {
      params = params.set('state', state);
    }
    return this.http.get(`${this.apiUrl}/projects/${projectId}/issues`, { headers, params });
  }

  getTotalIssues(projectId: number): Observable<number> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    return this.http.get(`${this.apiUrl}/projects/${projectId}/issues`, {
      headers,
      observe: 'response',
      params: new HttpParams().set('per_page', '1') // Solicita uma única issue para obter o cabeçalho
    }).pipe(
      map(response => Number(response.headers.get('X-Total')))
    );
  }

  getTotalIssuesForMultipleProjects(projectIds: number[], state: string = ''): Observable<number> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
  
    // Aqui criamos uma requisição para cada projeto
    const requests = projectIds.map(id => {
      let params = new HttpParams();
      if (state) {
        params = params.set('state', state);
      }
      return this.http.get(`${this.apiUrl}/projects/${id}/issues`, { headers, params, observe: 'response' });
    });
  
    // Faz todas as requisições e retorna o total de issues combinados
    return forkJoin(requests).pipe(
      map(responses => {
        // Agora acessamos o cabeçalho 'X-Total' para cada resposta
        return responses.reduce((total, response) => {
          const totalIssues = Number(response.headers.get('X-Total'));
          return total + (totalIssues || 0); // Se o totalIssues não for um número, consideramos como 0
        }, 0); // Inicializa com 0
      })
    );
  }
  
  
  getTotalIssuesByState(projectId: number): Observable<any> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
  
    return this.http.get<any>(`${this.apiUrl}/projects/${projectId}/issues_statistics`, { headers })
      .pipe(
        map(response => ({
          opened: response.statistics.counts.opened || 0,
          closed: response.statistics.counts.closed || 0,
          in_progress: response.statistics.counts.in_progress || 0,
          testing: response.statistics.counts.testing || 0,
          overdue: response.statistics.counts.overdue || 0
        }))
      );
    
  }
  
  getTaskDetails(projectId: number, taskId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/projects/${projectId}/issues/${taskId}`);
  }

  
}