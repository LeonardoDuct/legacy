import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, mergeMap, catchError, concatMap, delay } from 'rxjs/operators';
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

    let params = new HttpParams().set('page', page.toString()).set('per_page', perPage.toString());

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

    const requests = projectIds.map(id => {
      let params = new HttpParams();
      if (state) {
        params = params.set('state', state);
      }
      return this.http.get(`${this.apiUrl}/projects/${id}/issues`, {
        headers,
        params,
        observe: 'response'
      });
    });

    return forkJoin(requests).pipe(
      map(responses => {
        return responses.reduce((total, response) => {
          const totalIssues = Number(response.headers.get('X-Total'));
          return total + (totalIssues || 0);
        }, 0);
      })
    );
  }

  getTotalIssuesByState(projectId: number): Observable<{ opened: number; closed: number; overdue: number }> {
    const headers = new HttpHeaders({
      'Private-Token': this.token,
    });

    return this.http.get<any[]>(`${this.apiUrl}/projects/${projectId}/issues`, {
      headers,
      observe: 'response',
      params: new HttpParams().set('per_page', '100').set('page', '1').set('state', 'all'),
    }).pipe(
      mergeMap(response => {
        const totalPages = Number(response.headers.get('X-Total-Pages'));
        const issues = response.body;
        const requests = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push(
            this.http.get<any[]>(`${this.apiUrl}/projects/${projectId}/issues`, {
              headers,
              params: new HttpParams().set('per_page', '100').set('page', page.toString()).set('state', 'all'),
            })
          );
        }
        return forkJoin([of(issues), ...requests]).pipe(
          map(results => results.flat())
        );
      }),
      map(issues => {
        const opened = issues.filter(issue => issue.state === 'opened').length;
        const closed = issues.filter(issue => issue.state === 'closed').length;
        const overdue = issues.filter(issue => issue.due_date && new Date(issue.due_date) < new Date() && issue.state === 'opened').length;
        return { opened, closed, overdue };
      })
    );
  }

  getTaskDetails(projectId: number, taskId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/projects/${projectId}/issues/${taskId}`);
  }

  getSubProjects(projectId: number): Observable<any[]> {
    const headers = new HttpHeaders({
      'Private-Token': this.token,
    });

    return this.http.get<any[]>(`${this.apiUrl}/projects/${projectId}/subprojects`, { headers });
  }

  getIssuesForProjectAndSubProjects(projectId: number): Observable<any[]> {
    return this.getSubProjects(projectId).pipe(
      mergeMap(subProjects => {
        const projectIds = [projectId, ...subProjects.map(sp => sp.id)];
        return forkJoin(projectIds.map(id =>
          this.getTotalIssuesByState(id)
        ));
      })
    );
  }
}
