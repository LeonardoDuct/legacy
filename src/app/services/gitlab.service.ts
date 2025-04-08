import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private readonly apiUrl = environment.apiUrl;
  private readonly token = environment.gitlabToken;
  private readonly cache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  private criarHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Private-Token': this.token });
  }

  private criarParams(params: Record<string, string | number>): HttpParams {
    return Object.entries(params).reduce((acc, [key, value]) => {
      return value !== undefined && value !== null ? acc.set(key, value.toString()) : acc;
    }, new HttpParams());
  }

  private criarUrl(projectId: number, path: string = ''): string {
    return `${this.apiUrl}/projects/${projectId}${path ? '/' + path : ''}`;
  }

  private getRequest(url: string, params?: HttpParams, observe: any = 'body'): Observable<any> {
    const cacheKey = JSON.stringify({ url, params: params?.toString(), observe });
    const shouldRefresh = true;

    if (!shouldRefresh && this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey));
    }

    return this.http.get(url, { headers: this.criarHeaders(), params, observe }).pipe(
      map(response => {
        this.cache.set(cacheKey, response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Erro na requisição:', error);
        return of(null);
      })
    );
  }

  private paginar(projectId: number, totalPages: number, baseParams: HttpParams, path: string): Observable<any[]> {
    const requests = Array.from({ length: totalPages - 1 }, (_, i) => {
      const page = i + 2;
      return this.getRequest(this.criarUrl(projectId, path), baseParams.set('page', page.toString()));
    });
    return forkJoin(requests);
  }

  obterIssues(projectId: number, page: number = 1, porPagina: number = 50, estado: string = ''): Observable<any> {
    const params = this.criarParams({ page, per_page: porPagina, state: estado });
    return this.getRequest(this.criarUrl(projectId, 'issues'), params);
  }

  obterTotalIssues(projectId: number): Observable<number> {
    const params = this.criarParams({ per_page: 1 });
    return this.getRequest(this.criarUrl(projectId, 'issues'), params, 'response').pipe(
      map(response => Number(response.headers.get('X-Total')))
    );
  }

  obterTotalIssuesDeProjetos(projectIds: number[], estado: string = ''): Observable<number> {
    const requests = projectIds.map(id => {
      const params = this.criarParams({ state: estado });
      return this.getRequest(this.criarUrl(id, 'issues'), params, 'response');
    });

    return forkJoin(requests).pipe(
      map(responses => responses.reduce((total, res) => total + Number(res.headers.get('X-Total') || 0), 0))
    );
  }

  obterTotalIssuesAbertas(projectId: number): Observable<{ opened: number }> {
    const initialParams = new HttpParams()
      .set('per_page', '100')
      .set('page', '1')
      .set('state', 'opened');
  
    return this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, initialParams, 'response').pipe(
      mergeMap(response => {
        const totalPages = Number(response.headers.get('X-Total-Pages'));
        const issues = response.body;
        const requests: Observable<any>[] = [];
  
        for (let page = 2; page <= totalPages; page++) {
          const params = new HttpParams()
            .set('per_page', '100')
            .set('page', page.toString())
            .set('state', 'opened');
  
          requests.push(this.getRequest(`${this.apiUrl}/projects/${projectId}/issues`, params));
        }
  
        return forkJoin([of(issues), ...requests]).pipe(map(results => results.flat()));
      }),
      map(issues => ({ opened: issues.length }))
    );
  }  

  obterTotalIssuesFiltradas(
    projectId: number,
    filtro: { label: string; startDate: string; endDate: string }
  ): Observable<{ opened: number; closed: number; overdue: number; closedLate: number }> {
    let params = this.criarParams({ page: 1, state: 'all' });

    if (filtro.label && filtro.label !== 'Selecione um cliente') {
      params = params.set('labels', filtro.label);
    }
    if (filtro.startDate && filtro.endDate) {
      params = params.set('created_after', filtro.startDate).set('created_before', filtro.endDate);
    }

    return this.getRequest(this.criarUrl(projectId, 'issues'), params, 'response').pipe(
      mergeMap(response => {
        const totalPages = Number(response.headers.get('X-Total-Pages')) || 1;
        const issues = response.body;

        const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const requests = pages.map(page =>
          this.getRequest(this.criarUrl(projectId, 'issues'), params.set('page', page.toString())).pipe(
            catchError(error => {
              console.error(`❌ Erro na página ${page} do projeto ${projectId}:`, error);
              return of([]);
            })
          )
        );

        return forkJoin([of(issues), ...requests]).pipe(map(res => res.flat()));
      }),
      map(issues => {
        const inicio = new Date(filtro.startDate).getTime();
        const fim = new Date(filtro.endDate).getTime();

        const filtradas = issues.filter(issue => {
          const criado = new Date(issue.created_at).getTime();
          const fechado = issue.closed_at ? new Date(issue.closed_at).getTime() : null;
          return (fechado && fechado >= inicio && fechado <= fim) || (criado >= inicio && criado <= fim);
        });

        return {
          opened: filtradas.filter(i => i.state === 'opened').length,
          closed: filtradas.filter(i => i.state === 'closed').length,
          overdue: filtradas.filter(i => i.due_date && new Date(i.due_date).getTime() < Date.now() && i.state === 'opened').length,
          closedLate: filtradas.filter(i => i.due_date && i.closed_at && new Date(i.closed_at).getTime() > new Date(i.due_date).getTime() && i.state === 'closed').length
        };
      }),
      catchError(error => {
        console.error(`❌ Erro ao buscar issues para o projeto ${projectId}:`, error);
        return of({ opened: 0, closed: 0, overdue: 0, closedLate: 0 });
      })
    );
  }

  obterDetalhesDaTarefa(projectId: number, taskId: string): Observable<any> {
    return this.getRequest(this.criarUrl(projectId, `issues/${taskId}`));
  }

  obterSubProjetos(projectId: number): Observable<any[]> {
    return this.getRequest(this.criarUrl(projectId, 'subprojects'));
  }

  obterIssuesComSubProjetos(projectId: number): Observable<any[]> {
    return this.obterSubProjetos(projectId).pipe(
      mergeMap(subs => {
        const ids = [projectId, ...subs.map(sp => sp.id)];
        return forkJoin(ids.map(id => this.obterTotalIssuesAbertas(id)));
      })
    );
  }

  carregarLabels(projectIds: number[]): Observable<any[]> {
    const requests = projectIds.map(id =>
      this.getRequest(this.criarUrl(id, 'labels')).pipe(
        catchError(error => {
          console.error(`Erro ao carregar labels do projeto ${id}:`, error);
          return of([]);
        })
      )
    );

    return forkJoin(requests).pipe(
      map(res => res.flat().filter(label => label?.name && label?.color))
    );
  }
}
