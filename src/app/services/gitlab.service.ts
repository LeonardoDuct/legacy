import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../interfaces/models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private readonly apiUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  obterIssuesPorProjeto(): Observable<any> {
    return this.http.get(`${this.apiUrl}/issues`);
  }

  obterDetalhesDaIssue(issueId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/issues/${issueId}`);
  }

  obterProjetos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects`);
  }

  carregarLabels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/labels`);
  }

  obterIssuesPorProjetoNome(nomeProjeto: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/issues/detalhes/${nomeProjeto}`);
  }

  obterIssuesPorPeriodo(dataInicio: string, dataFim: string): Observable<Issue[]> {
  return this.http.get<Issue[]>(`${this.apiUrl}/issues/filtrar?dataInicio=${dataInicio}&dataFim=${dataFim}`);
}

obterCategorias(): Observable<any> {
  return this.http.get(`${this.apiUrl}/categorias`);
}

atualizarCategoria(id: string, titulo: string, porcentagem: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/categorias/${id}`, { titulo, porcentagem });
}

excluirCategoria(id: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/categorias/${id}`);
}

atualizarClassificacao(categoria: string, classificacao: string, descricao: string, score: number): Observable<any> {
  const categoriaEncoded = encodeURIComponent(categoria.trim());

  const classificacaoLimpa = classificacao.trim().split(/[-/]/).pop()?.trim() || '';
  const classificacaoEncoded = encodeURIComponent(classificacaoLimpa);

  const urlFinal = `${this.apiUrl}/classificacao/${categoriaEncoded}/${classificacaoEncoded}`;

  return this.http.put(urlFinal, { descricao, score });
}


excluirClassificacao(categoria: string, classificacao: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/classificacao/${categoria}/${classificacao}`);
}
  
}