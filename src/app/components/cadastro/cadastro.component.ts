import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { GitlabService } from 'src/app/services/gitlab.service';
import { removerAcentos } from 'src/app/shared/utils/functions';
import { VoltarComponent } from 'src/app/shared/utils/components/voltar/voltar.component';

interface DadoCategoria {
  classificacao: string;
  descricao: string;
  score: number;
}

interface Categoria {
  id: string;
  titulo: string;
  porcentagem: number;
  expandida: boolean;
  editando?: boolean;
  dados: DadoCategoria[];
}

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, CabecalhoComponent, FormsModule, VoltarComponent],
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.css'],
})
export class CadastroComponent implements OnInit {

  categorias: Categoria[] = [];
  novaClassificacao = {
    categoria: '',
    classificacao: '',
    score: 1.0,
    descricao: '',
  };
  sortColumn = '';
  sortDirection = true;

  modalAberto = false;
  modalNovaCategoriaAberto = false;
  modalNovaClassificacaoAberto = false;
  dropdownAberto = false;
  editandoScore = false;
  novaCategoriaNome = '';
  novaCategoriaPeso = 0;
  selectedCategoria: Categoria | undefined;
  modoEdicao = false;
  classificacaoAtual: DadoCategoria | null = null;
  mensagemSucesso: string | null = null;

  modalConfirmacaoAberto = false;
  categoriaSelecionada: Categoria | undefined;
  dadoSelecionado: DadoCategoria | undefined;
  usuarioLogado: any = {};

  constructor(
    private gitlabService: GitlabService,
    private location: Location
  ) { }

  ngOnInit() {
    this.carregarCategorias();
    this.carregarPermissoes();
  }

  carregarCategorias() {
    this.gitlabService.obterCategorias().subscribe({
      next: (dados) => {
        this.categorias = dados.map((categoria: any) => {
          const nomeCorrigido = categoria.nome_categoria.toLowerCase().includes('urgenc') ? 'Urgência' : categoria.nome_categoria;

          const mapDadosPadrao = (classificacao: string, descricao: string, score: string) =>
            classificacao && descricao && score
              ? classificacao.split('\n').map((_, index) => ({
                classificacao: classificacao.split('\n')[index],
                descricao: descricao.split('\n')[index],
                score: parseFloat(score.split('\n')[index]) || 0,
              }))
              : [];

          const mapDadosCliente = (classificacao: string) =>
            classificacao
              ? classificacao.split('\n').map((linha: string) => {
                const [classificacao, descricao, score] = linha.split('|');
                return {
                  classificacao,
                  descricao: descricao && descricao.trim() !== '' ? descricao : 'SEM DESCRIÇÃO',
                  score: parseFloat(score) || 0,
                };
              })
              : [];

          return {
            id: categoria.nome_categoria.toLowerCase(),
            titulo: nomeCorrigido,
            porcentagem: categoria.peso,
            expandida: false,
            dados:
              nomeCorrigido === 'Cliente'
                ? mapDadosCliente(categoria.classificacao_cliente)
                : nomeCorrigido === 'Prazo'
                  ? mapDadosPadrao(categoria.classificacao_prazo, categoria.descricao_prazo, categoria.score_prazo)
                  : nomeCorrigido === 'Impacto'
                    ? mapDadosPadrao(categoria.classificacao_impacto, categoria.descricao_impacto, categoria.score_impacto)
                    : nomeCorrigido === 'Urgência'
                      ? mapDadosPadrao(categoria.classificacao_urgencia, categoria.descricao_urgencia, categoria.score_urgencia)
                      : nomeCorrigido === 'Complexidade'
                        ? mapDadosPadrao(categoria.classificacao_complexidade, categoria.descricao_complexidade, categoria.score_complexidade)
                        : [],
          };
        });
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
      }
    });
  }

  carregarPermissoes(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.usuarioLogado = JSON.parse(atob(token.split('.')[1]));
    }
  }

  toggleCategoria(id: string) {
    const categoria = this.categorias.find(cat => cat.id === id);
    if (categoria) categoria.expandida = !categoria.expandida;
  }

  calcularPesoTotal(): number {
    return this.categorias.reduce((total, cat) => total + cat.porcentagem, 0);
  }

  gravarCategorias() {
    let erro = false;
    let categoriasAtualizadas = 0;

    this.categorias.forEach((cat) => {
      const nomeCategoriaSemAcento = removerAcentos(cat.titulo);

      this.gitlabService.atualizarCategoria(nomeCategoriaSemAcento, cat.titulo, cat.porcentagem)
        .subscribe({
          next: () => {
            categoriasAtualizadas++;
            if (categoriasAtualizadas === this.categorias.length && !erro) {
              this.mostrarMensagemSucesso('Categorias salvas com sucesso!');
              this.carregarCategorias();
              this.fecharModal();
            }
          },
          error: (err) => {
            erro = true;
            this.mostrarMensagemSucesso('Erro ao salvar categorias!');
            console.error('Erro ao atualizar categoria:', err);
          }
        });
    });
  }

  editarCategoria(categoria: Categoria) {
    console.log('Editar categoria:', categoria);
  }

  habilitarEdicao(categoria: Categoria) {
    this.categorias.forEach(cat => cat.editando = false);
    categoria.editando = true;
  }

  salvarEdicao(categoria: Categoria) {
    categoria.editando = false;
  }

  excluirCategoria(id: string) {
    this.categorias = this.categorias.filter(cat => cat.id !== id);
  }

  novaCategoria() {
    this.modalNovaCategoriaAberto = true;
  }

  fecharModalNovaCategoria() {
    this.modalNovaCategoriaAberto = false;
  }

  gravarNovaCategoria(nome: string, peso: number) {
    this.gitlabService.criarCategoria(nome, peso).subscribe({
      next: (resposta) => {
        this.carregarCategorias();
        this.fecharModalNovaCategoria();
        this.mostrarMensagemSucesso('Categoria criada com sucesso!');
      },
      error: (error) => {
        console.error('Erro ao criar categoria:', error);
        this.mostrarMensagemSucesso('Erro ao criar categoria!');
      }
    });
  }

  abrirModalNovaClassificacao() {
    this.novaClassificacao = {
      categoria: '',
      classificacao: '',
      score: 1.0,
      descricao: '',
    };
    this.modoEdicao = false;
    this.selectedCategoria = undefined;
    this.modalNovaClassificacaoAberto = true;
  }

  fecharModalNovaClassificacao() {
    this.modalNovaClassificacaoAberto = false;
  }

  editarClassificacao(categoria: Categoria, dado: DadoCategoria) {
    this.modoEdicao = true;
    this.modalNovaClassificacaoAberto = true;
    this.novaClassificacao = {
      categoria: categoria.titulo,
      classificacao: dado.classificacao,
      score: dado.score,
      descricao: dado.descricao,
    };
    this.selectedCategoria = categoria;
    this.classificacaoAtual = dado;
  }

  gravarClassificacao() {
    if (this.modoEdicao && this.selectedCategoria && this.classificacaoAtual) {
      this.gitlabService.atualizarClassificacao(
        this.selectedCategoria.titulo,
        this.classificacaoAtual.classificacao,
        this.novaClassificacao.descricao,
        this.novaClassificacao.score
      ).subscribe({
        next: (resposta) => {
          if (this.classificacaoAtual) {
            this.classificacaoAtual.descricao = resposta.descricao;
            this.classificacaoAtual.score = resposta.nota;
          }
          this.fecharModalNovaClassificacao();
          this.mostrarMensagemSucesso('Gravado com sucesso!');
        },
        error: (error) => {
          console.error('Erro ao atualizar classificação:', error);
        }
      });

    } else {
      if (this.novaClassificacao.categoria) {
        const categoria = this.novaClassificacao.categoria.trim();
        const classificacao = this.novaClassificacao.classificacao.trim();
        const descricao = this.novaClassificacao.descricao;
        const score = this.novaClassificacao.score;

        console.log('Chamando criarClassificacao:', categoria, classificacao, descricao, score);

        this.gitlabService.criarClassificacao(categoria, classificacao, descricao, score)
          .subscribe({
            next: (resposta) => {
              const categoriaObj = this.categorias.find(cat => cat.titulo === categoria);
              if (categoriaObj) {
                categoriaObj.dados.push({
                  classificacao: classificacao,
                  descricao: resposta.descricao,
                  score: resposta.nota,
                });
              }
              this.fecharModalNovaClassificacao();
              this.mostrarMensagemSucesso('Gravado com sucesso!');
            },
            error: (error) => {
              console.error('Erro ao criar classificação:', error);
            }
          });
      }
    }
  }

  excluirClassificacao(categoria: Categoria, dado: DadoCategoria) {
    this.gitlabService.excluirClassificacao(categoria.titulo, dado.classificacao).subscribe({
      next: () => {
        categoria.dados = categoria.dados.filter(item => item !== dado);
        this.mostrarMensagemSucesso('Classificação excluída com sucesso!');
      },
      error: (error) => {
        console.error('Erro ao excluir classificação:', error);
      }
    });
  }

  incrementarScore() {
    this.novaClassificacao.score = Math.min(
      Math.round((this.novaClassificacao.score + 0.1) * 10) / 10,
      10.0
    );
  }

  decrementarScore() {
    this.novaClassificacao.score = Math.max(
      Math.round((this.novaClassificacao.score - 0.1) * 10) / 10,
      0.0
    );
  }

  ajustaScoreManual() {
    let val = this.novaClassificacao.score;
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(10, val));
    this.novaClassificacao.score = Math.round(val * 10) / 10;
  }

  sortTable(column: string, categoriaId: string) {
    const categoria = this.categorias.find(cat => cat.id === categoriaId);
    if (!categoria) return;

    this.sortDirection = this.sortColumn === column ? !this.sortDirection : true;
    this.sortColumn = column;

    categoria.dados.sort((a, b) => {
      if (a[column as keyof DadoCategoria] < b[column as keyof DadoCategoria]) return this.sortDirection ? -1 : 1;
      if (a[column as keyof DadoCategoria] > b[column as keyof DadoCategoria]) return this.sortDirection ? 1 : -1;
      return 0;
    });
  }

  ordenarModal(coluna: string) {
    this.sortDirection = this.sortColumn === coluna ? !this.sortDirection : true;
    this.sortColumn = coluna;

    this.categorias.sort((a, b) => {
      const aValue = a[coluna as keyof Categoria] ?? '';
      const bValue = b[coluna as keyof Categoria] ?? '';
      if (aValue < bValue) return this.sortDirection ? -1 : 1;
      if (aValue > bValue) return this.sortDirection ? 1 : -1;
      return 0;
    });
  }

  abrirModal() {
    this.modalAberto = true;
  }

  fecharModal() {
    this.modalAberto = false;
  }

  toggleDropdown() {
    this.dropdownAberto = !this.dropdownAberto;
  }

  mostrarMensagemSucesso(texto: string) {
    this.mensagemSucesso = texto;
    setTimeout(() => {
      this.mensagemSucesso = null;
    }, 3000);
  }

  selecionarCategoria(categoria: Categoria, event: Event) {
    event.stopPropagation();
    this.selectedCategoria = categoria;
    this.novaClassificacao.categoria = categoria.titulo;
    this.dropdownAberto = false;
  }

  getScoreClass(score: number): string {
    if (score < 4) return 'score verde';
    if (score < 7) return 'score amarelo';
    if (score < 9) return 'score vermelho-claro';
    return 'score vermelho-escuro';
  }

  abrirModalConfirmacao(categoria?: Categoria, dado?: DadoCategoria) {
    this.modalConfirmacaoAberto = true;
    this.categoriaSelecionada = categoria;
    this.dadoSelecionado = dado;
  }

  fecharModalConfirmacao() {
    this.modalConfirmacaoAberto = false;
    this.categoriaSelecionada = undefined;
    this.dadoSelecionado = undefined;
  }

  confirmarExclusao() {
    if (this.dadoSelecionado && this.categoriaSelecionada) {
      this.gitlabService.excluirClassificacao(
        this.categoriaSelecionada.titulo,
        this.dadoSelecionado.classificacao
      ).subscribe({
        next: () => {
          this.categoriaSelecionada!.dados = this.categoriaSelecionada!.dados.filter(
            dado => dado !== this.dadoSelecionado
          );
          this.mostrarMensagemSucesso('Classificação excluída com sucesso!');
          this.fecharModalConfirmacao();
        },
        error: (error) => {
          console.error('Erro ao excluir classificação:', error);
          this.fecharModalConfirmacao();
        }
      });

    } else if (this.categoriaSelecionada) {
      this.gitlabService.excluirCategoria(this.categoriaSelecionada.id).subscribe({
        next: () => {
          this.categorias = this.categorias.filter(cat => cat !== this.categoriaSelecionada);
          this.mostrarMensagemSucesso('Categoria excluída com sucesso!');
          this.fecharModalConfirmacao();
        },
        error: (error) => {
          console.error('Erro ao excluir categoria:', error);
          this.fecharModalConfirmacao();
        }
      });

    } else {
      this.fecharModalConfirmacao();
    }
  }

  voltar(): void {
    this.location.back()
  }

}