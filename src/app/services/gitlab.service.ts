import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GitlabService {
  private apiUrl = environment.apiUrl;
  private token = environment.gitlabToken;
  private cache: Map<string, any> = new Map();

  constructor(private http: HttpClient) {}

  private createHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Private-Token': this.token,
    });
  }

  private getRequest(url: string, params?: HttpParams, observe: any = 'body'): Observable<any> {
    const cacheKey = JSON.stringify({ url, params, observe });
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey));
    } else {
      return this.http.get(url, { headers: this.createHeaders(), params, observe }).pipe(
        map(response => {
          this.cache.set(cacheKey, response);
          return response;
        }),
        catchError(error => {
          console.error('Request error:', error);
          return of(null);
        })
      );
    }
  }

  obterIssues(projectId: number, page: number = 1, perPage: number = 50, state: string = ''): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('per_page', perPage.toString());
    if (state) {
      params = params.set('state', state);
    }
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, params);
  }

  obterTotalIssues(projectId: number): Observable<number> {
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, new HttpParams().set('per_page', '1'), 'response').pipe(
      map(response => Number(response.headers.get('X-Total')))
    );
  }

  obterTotalIssuesParaVariosProjetos(projectIds: number[], state: string = ''): Observable<number> {
    const requests = projectIds.map(id => {
      let params = new HttpParams();
      if (state) {
        params = params.set('state', state);
      }
      return this.getRequest(`${this.apiUrl}/projects/${id}/issues`, params, 'response');
    });

    return forkJoin(requests).pipe(
      map(responses => responses.reduce((total, response) => total + Number(response.headers.get('X-Total') || 0), 0))
    );
  }

  obterTotalIssuesAbertas(projectId: number): Observable<{ opened: number }> {
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, new HttpParams().set('per_page', '100').set('page', '1').set('state', 'opened'), 'response').pipe(
      mergeMap(response => {
        const totalPages = Number(response.headers.get('X-Total-Pages'));
        const issues = response.body;
        const requests = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push(this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, new HttpParams().set('per_page', '100').set('page', page.toString()).set('state', 'opened')));
        }
        return forkJoin([of(issues), ...requests]).pipe(map(results => results.flat()));
      }),
      map(issues => ({ opened: issues.length }))
    );
  }

  obterTotalIssuesFiltradas(projectId: number, params: { label: string, startDate: string, endDate: string }): Observable<{ opened: number; closed: number; overdue: number; closedLate: number }> {
    let queryParams = new HttpParams().set('page', '1').set('state', 'all');
    if (params.label && params.label !== 'Selecione um cliente') {
      queryParams = queryParams.set('labels', params.label);
    }
    if (params.startDate && params.endDate) {
      queryParams = queryParams.set('created_after', params.startDate).set('created_before', params.endDate);
    }
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, queryParams, 'response').pipe(
      mergeMap(response => {
        const totalPages = Number(response.headers.get('X-Total-Pages'));
        const issues = response.body;
        const requests = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push(this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, queryParams.set('page', page.toString())));
        }
        return forkJoin([of(issues), ...requests]).pipe(map(results => results.flat()));
      }),
      map(issues => ({
        opened: issues.filter(issue => issue.state === 'opened').length,
        closed: issues.filter(issue => issue.state === 'closed').length,
        overdue: issues.filter(issue => issue.due_date && new Date(issue.due_date) < new Date() && issue.state === 'opened').length,
        closedLate: issues.filter(issue => issue.due_date && issue.closed_at && new Date(issue.closed_at) > new Date(issue.due_date) && issue.state === 'closed').length
      })),
      catchError(error => {
        console.error('Erro ao buscar issues:', error);
        return of({ opened: 0, closed: 0, overdue: 0, closedLate: 0 });
      })
    );
  }

  obterDetalhesDaTarefa(projectId: number, taskId: string): Observable<any> {
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/issues/${taskId}`);
  }

  obterSubProjetos(projectId: number): Observable<any[]> {
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/subprojects`);
  }

  obterIssuesParaProjetoESubProjetos(projectId: number): Observable<any[]> {
    return this.obterSubProjetos(projectId).pipe(
      mergeMap(subProjetos => {
        const projectIds = [projectId, ...subProjetos.map(sp => sp.id)];
        return forkJoin(projectIds.map(id => this.obterTotalIssuesAbertas(id)));
      })
    );
  }

  carregarLabels(projectIds: number[]): Observable<any[]> {
    const requests = projectIds.map(id => this.getRequest(`${this.apiUrl}/projects/${id}/labels`).pipe(
      catchError(error => {
        console.error(`Erro ao carregar labels para o projeto ${id}:`, error);
        return of([]);
      })
    ));
    return forkJoin(requests).pipe(
      map(responses => responses.flat().filter(label => label && label.name && label.color))
    );
  }
}