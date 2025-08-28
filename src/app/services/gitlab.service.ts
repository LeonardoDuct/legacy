import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../shared/interfaces/models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private readonly apiUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  private obterIdUsuarioDoToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || null;
    } catch {
      return null;
    }
  }

  cadastrarUsuario(nome: string, email: string, senha: string, admin: boolean, head:boolean, iprojetos:boolean, adm_categorias:boolean, adm_usuarios:boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios`, { nome, email, senha, admin, head, iprojetos, adm_categorias, adm_usuarios });
  }
  
  login(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, senha });
  }

  listarUsuarios(): Observable<any[]> {
    const token = localStorage.getItem('token');
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }  

  resetarSenhaUsuario(id: number) {
    return this.http.post<{ mensagem: string }>(`${this.apiUrl}/usuarios/${id}/resetar-senha`, {});
  }

  atualizarUsuario(id: number, nome: string, email: string, admin: boolean, head: boolean, iprojetos: boolean, adm_categorias:boolean, adm_usuarios:boolean) {
    return this.http.put<{ mensagem: string }>(`${this.apiUrl}/usuarios/${id}`, { nome, email, admin, head, iprojetos, adm_categorias, adm_usuarios });
  }  

  alterarSenha(novaSenha: string) {
    const token = localStorage.getItem('token');
    console.log('Token enviado:', token);
    const id = this.obterIdUsuarioDoToken();
  
    if (!id) {
      throw new Error('ID do usuário não encontrado no token.');
    }
  
    return this.http.post<any>(`${this.apiUrl}/usuarios/${id}/alterar-senha`, { novaSenha }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }  

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

  obterIssuesPorProjetoNome(nomeProjeto: string, dataInicio?: string, dataFim?: string): Observable<any> {
    let params = new HttpParams();
    if (dataInicio) params = params.set('dataInicio', dataInicio);
    if (dataFim) params = params.set('dataFim', dataFim);

    return this.http.get(`${this.apiUrl}/issues/detalhes/${nomeProjeto}`, { params });
  }

  obterIssuesPorPeriodo(dataInicio: string, dataFim: string): Observable<Issue[]> {
    return this.http.get<Issue[]>(`${this.apiUrl}/issues/filtrar?dataInicio=${dataInicio}&dataFim=${dataFim}`);
  }

  obterCategorias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categorias`);
  }

  criarCategoria(titulo: string, porcentagem: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/categorias`, { titulo, porcentagem });
  }
  
  atualizarCategoria(nomeCategoria: string, titulo: string, porcentagem: number): Observable<any> {
    const nomeCategoriaEncoded = encodeURIComponent(nomeCategoria.trim());
    return this.http.put(`${this.apiUrl}/categorias/${nomeCategoriaEncoded}`, { titulo, porcentagem });
  }

  excluirCategoria(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categorias/${id}`);
  }

  criarClassificacao(categoria: string, classificacao: string, descricao?: string, score?: number): Observable<any> {
    const categoriaEncoded = encodeURIComponent(categoria.trim());
    const classificacaoLimpa = classificacao.trim().split(/[-/]/).pop()?.trim() || '';
    const classificacaoEncoded = encodeURIComponent(classificacaoLimpa);
    const urlFinal = `${this.apiUrl}/classificacao/${categoriaEncoded}/${classificacaoEncoded}`;
    return this.http.post(urlFinal, { descricao, score });
  }

  atualizarClassificacao(categoria: string, classificacao: string, descricao: string,score: number): Observable<any> {
    const categoriaEncoded = encodeURIComponent(categoria.trim());
    const classificacaoLimpa = classificacao.trim().split(/[-/]/).pop()?.trim() || '';
    const classificacaoEncoded = encodeURIComponent(classificacaoLimpa);
    const urlFinal = `${this.apiUrl}/classificacao/${categoriaEncoded}/${classificacaoEncoded}`;
    return this.http.put(urlFinal, { descricao, score });
  }

  excluirClassificacao(categoria: string, classificacao: string): Observable<any> {
    const categoriaEncoded = encodeURIComponent(categoria.trim());
    const classificacaoEncoded = encodeURIComponent(classificacao.trim());
    return this.http.delete(`${this.apiUrl}/classificacao/${categoriaEncoded}/${classificacaoEncoded}`);
  }

  obterSucessoras(id: number): Observable<{ tituloOrigem: string; repositorioOrigem: string; numeroIsOrigem: number; scoreOrigemTotal: number; sucessoras: Issue[] }> {
    return this.http.get<{ tituloOrigem: string; repositorioOrigem: string; numeroIsOrigem: number; scoreOrigemTotal: number; sucessoras: Issue[] }>(`${this.apiUrl}/issues/${id}/sucessoras`);
  }

  obterRelatorioPorCliente(dataInicio?: string, dataFim?: string): Observable<any> {
    let params = new HttpParams();
    if (dataInicio) params = params.set('dataInicio', dataInicio);
    if (dataFim) params = params.set('dataFim', dataFim);

    return this.http.get(`${this.apiUrl}/issues/relatorio/por-cliente`, { params });
  }

  obterRelatorioIssuesFechadas(nomeProjeto: string, dataInicio?: string, dataFim?: string): Observable<any[]> {
    let params = new HttpParams();
    if (dataInicio) params = params.set('dataInicio', dataInicio);
    if (dataFim) params = params.set('dataFim', dataFim);

    return this.http.get<any[]>(`${this.apiUrl}/issues/relatorio-fechadas/${encodeURIComponent(nomeProjeto)}`, { params });
  }

  obterProjetosInternosResumo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/projetosInternos`);
  }

  upsertObservacaoIssue(id: number, descricao: string, percentual: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/issues/${id}/observacao`, { descricao, percentual });
  }

  deletarObservacaoIssue(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/issues/${id}/observacao`);
  }
  
  logout(): void {
    localStorage.removeItem('token');
  }
  
}