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

  getIssuesForMultipleProjects(projectIds: number[], page: number = 1, perPage: number = 50, state: string = ''): Observable<any[]> {
    const headers = new HttpHeaders({
      'Private-Token': this.token, 
    });
    const requests = projectIds.map(id => {
      let params = new HttpParams()
        .set('page', page.toString())
        .set('per_page', perPage.toString());
      if (state) {
        params = params.set('state', state);
      }
      return this.http.get(`${this.apiUrl}/projects/${id}/issues`, { headers, params });
    });
    return forkJoin(requests);
  }

  getOverdueIssues(projectId: number, state: string = ''): Observable<any[]> {
    return this.getIssues(projectId, 1, 100, state).pipe(
      map((issues: any[]) => issues.filter(issue => {
        const dueDate = new Date(issue.due_date);
        const currentDate = new Date();
        return dueDate < currentDate;
      }))
    );
  }
}