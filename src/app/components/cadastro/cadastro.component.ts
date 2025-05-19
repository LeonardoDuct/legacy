import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { GitlabService } from 'src/app/services/gitlab.service';

// Interfaces
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
  imports: [CommonModule, CabecalhoComponent, FormsModule],
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.css'],
})
export class CadastroComponent implements OnInit {

  categorias: Categoria[] = [];

  constructor(private gitlabService: GitlabService) {} 

  ngOnInit() {
    this.carregarCategorias();
  }


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

  novaCategoriaNome = '';
  novaCategoriaPeso = 0;

  selectedCategoria: Categoria | undefined;
  modoEdicao = false;
  classificacaoAtual: DadoCategoria | null = null; // Referência para a classificação atual durante a edição

  carregarCategorias() {
    this.gitlabService.obterCategorias().subscribe(
      (dados) => {
        this.categorias = dados.map((categoria: any) => {
          const nomeCorrigido = categoria.nome_categoria.toLowerCase().includes('urgenc') ? 'Urgência' : categoria.nome_categoria;
  
          const mapDados = (classificacao: string, descricao: string, score: string) =>
            classificacao && descricao && score
              ? classificacao.split('\n').map((_, index) => ({
                  classificacao: classificacao.split('\n')[index],
                  descricao: descricao.split('\n')[index],
                  score: parseFloat(score.split('\n')[index]) || 0,
                }))
              : [];
  
          return {
            id: categoria.nome_categoria.toLowerCase(),
            titulo: nomeCorrigido, // 🔹 Agora o nome aparece corretamente com acento!
            porcentagem: categoria.peso,
            expandida: false,
            dados:
              nomeCorrigido === 'Cliente'
                ? mapDados(categoria.classificacao_cliente, categoria.descricao_cliente, categoria.score_cliente)
                : nomeCorrigido === 'Prazo'
                ? mapDados(categoria.classificacao_prazo, categoria.descricao_prazo, categoria.score_prazo)
                : nomeCorrigido === 'Impacto'
                ? mapDados(categoria.classificacao_impacto, categoria.descricao_impacto, categoria.score_impacto)
                : nomeCorrigido === 'Urgência' // 🔹 Agora pegamos corretamente os dados de Urgência
                ? mapDados(categoria.classificacao_urgencia, categoria.descricao_urgencia, categoria.score_urgencia)
                : nomeCorrigido === 'Complexidade'
                ? mapDados(categoria.classificacao_complexidade, categoria.descricao_complexidade, categoria.score_complexidade)
                : [],
          };
        });
      },
      (error) => {
        console.error('Erro ao carregar categorias:', error);
      }
    );
  }

  toggleCategoria(id: string) {
    const categoria = this.categorias.find(cat => cat.id === id);
    if (categoria) categoria.expandida = !categoria.expandida;
  }

  calcularPesoTotal(): number {
    return this.categorias.reduce((total, cat) => total + cat.porcentagem, 0);
  }

  gravarCategorias() {
    console.log('Categorias gravadas:', this.categorias);
    this.fecharModal();
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

  novaCategoria() {
    this.modalNovaCategoriaAberto = true;
  }

  fecharModalNovaCategoria() {
    this.modalNovaCategoriaAberto = false;
  }

  gravarNovaCategoria(nome: string, peso: number) {
    const nova: Categoria = {
      id: `categoria-${this.categorias.length + 1}`,
      titulo: nome,
      porcentagem: peso,
      expandida: false,
      dados: [{ classificacao: '', descricao: '', score: 0 }],
    };

    this.categorias.push(nova);
    this.fecharModalNovaCategoria();
  }

  abrirModalNovaClassificacao() {
    this.novaClassificacao = {
      categoria: '',
      classificacao: '',
      score: 1.0,
      descricao: '',
    };
    this.modoEdicao = false; // Garantir que não está no modo de edição
    this.selectedCategoria = undefined; // Limpar categoria selecionada
    this.modalNovaClassificacaoAberto = true; // Abrir o modal
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
    if (!this.selectedCategoria || !this.classificacaoAtual) return;
  
    this.gitlabService.atualizarClassificacao(
      this.selectedCategoria.titulo, 
      this.classificacaoAtual.classificacao,
      this.novaClassificacao.descricao,
      this.novaClassificacao.score
    ).subscribe(
      (resposta) => {
        console.log('Classificação atualizada:', resposta);
        if (this.classificacaoAtual) {
          this.classificacaoAtual.descricao = resposta.descricao;
          this.classificacaoAtual.score = resposta.nota;
      }
      },
      (error) => {
        console.error('Erro ao atualizar classificação:', error);
      }
    );
  
    this.fecharModalNovaClassificacao();
  }
  
  excluirClassificacao(categoria: Categoria, dado: DadoCategoria) {
    this.gitlabService.excluirClassificacao(categoria.titulo, dado.classificacao).subscribe(
      () => {
        categoria.dados = categoria.dados.filter(item => item !== dado);
        console.log('Classificação excluída com sucesso!');
      },
      (error) => {
        console.error('Erro ao excluir classificação:', error);
      }
    );
  }

  incrementarScore() {
    this.novaClassificacao.score = Math.min(this.novaClassificacao.score + 0.5, 10.0);
  }

  decrementarScore() {
    this.novaClassificacao.score = Math.max(this.novaClassificacao.score - 0.5, 0.0);
  }

  toggleDropdown() {
    this.dropdownAberto = !this.dropdownAberto;
  }

  selecionarCategoria(categoria: Categoria, event: Event) {
    event.stopPropagation();
    this.selectedCategoria = categoria;
    this.dropdownAberto = false;
  }

  getScoreClass(score: number): string {
    if (score < 4) return 'score verde';
    if (score < 7) return 'score amarelo';
    if (score < 9) return 'score vermelho-claro';
    return 'score vermelho-escuro';
  }

  // Novas funções adicionadas para o modal de confirmação
  modalConfirmacaoAberto = false; // Controla a exibição do modal de confirmação
  categoriaSelecionada: Categoria | undefined; // Categoria selecionada para exclusão
  dadoSelecionado: DadoCategoria | undefined; // Dado selecionado para exclusão

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
      // Excluir apenas o dado selecionado da categoria
      this.categoriaSelecionada.dados = this.categoriaSelecionada.dados.filter(
        dado => dado !== this.dadoSelecionado
      );
    } else if (this.categoriaSelecionada) {
      // Excluir a categoria inteira se nenhum dado for selecionado
      this.categorias = this.categorias.filter(cat => cat !== this.categoriaSelecionada);
    }
  
    // Fechar o modal de confirmação e limpar as variáveis
    this.fecharModalConfirmacao();
  }
}