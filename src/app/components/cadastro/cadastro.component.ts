import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';

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
export class CadastroComponent {

  categorias: Categoria[] = [
    {
      id: 'cliente',
      titulo: 'Cliente',
      porcentagem: 30,
      expandida: false,
      dados: [
        { classificacao: 'Baixo', descricao: 'Complexidade rotineira', score: 2.5 },
        { classificacao: 'Médio', descricao: 'Complexidade moderada', score: 5.0 },
        { classificacao: 'Alto', descricao: 'Complexidade desafiadora', score: 7.5 },
        { classificacao: 'Crítico', descricao: 'Conhecimento externo', score: 10.0 },
      ],
    },
    {
      id: 'prazo',
      titulo: 'Prazo',
      porcentagem: 30,
      expandida: false,
      dados: [
        { classificacao: 'Baixo', descricao: 'Entrega com prazo superior a 30 dias', score: 2.0 },
        { classificacao: 'Médio', descricao: 'Entrega entre 15 e 30 dias', score: 5.0 },
        { classificacao: 'Alto', descricao: 'Entrega entre 7 e 14 dias', score: 7.5 },
        { classificacao: 'Crítico', descricao: 'Entrega em menos de 7 dias', score: 10.0 },
      ],
    },
    {
      id: 'urgencia',
      titulo: 'Urgência',
      porcentagem: 20,
      expandida: false,
      dados: [
        { classificacao: 'Baixo', descricao: 'Pode ser planejado com calma', score: 2.0 },
        { classificacao: 'Médio', descricao: 'Necessita atenção moderada', score: 5.0 },
        { classificacao: 'Alto', descricao: 'Necessita atenção imediata', score: 7.5 },
        { classificacao: 'Crítico', descricao: 'Demanda ação urgente e priorizada', score: 10.0 },
      ],
    },
    {
      id: 'complexidade',
      titulo: 'Complexidade',
      porcentagem: 15,
      expandida: false,
      dados: [
        { classificacao: 'Baixo', descricao: 'Tarefa simples com poucas variáveis', score: 2.0 },
        { classificacao: 'Médio', descricao: 'Envolve múltiplas etapas e validações', score: 5.0 },
        { classificacao: 'Alto', descricao: 'Integrações ou lógica de negócio complexa', score: 7.5 },
        { classificacao: 'Crítico', descricao: 'Alta interdependência e riscos técnicos', score: 10.0 },
      ],
    },
    {
      id: 'impacto',
      titulo: 'Impacto',
      porcentagem: 5,
      expandida: false,
      dados: [
        { classificacao: 'Baixo', descricao: 'Impacto limitado a um pequeno grupo', score: 2.0 },
        { classificacao: 'Médio', descricao: 'Impacto moderado na operação', score: 5.0 },
        { classificacao: 'Alto', descricao: 'Afeta diretamente áreas críticas', score: 7.5 },
        { classificacao: 'Crítico', descricao: 'Impacto em toda a organização ou clientes', score: 10.0 },
      ],
    },
  ];

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
    if (!this.selectedCategoria) return;

    if (this.modoEdicao && this.classificacaoAtual) {
      this.classificacaoAtual.descricao = this.novaClassificacao.descricao;
      this.classificacaoAtual.score = this.novaClassificacao.score;
    } else {
      const nova = {
        classificacao: this.novaClassificacao.classificacao,
        descricao: this.novaClassificacao.descricao,
        score: this.novaClassificacao.score,
      };

      this.selectedCategoria.dados.push(nova);
    }

    this.modoEdicao = false;
    this.classificacaoAtual = null;
    this.novaClassificacao = {
      categoria: '',
      classificacao: '',
      score: 1.0,
      descricao: '',
    };

    this.fecharModalNovaClassificacao();
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