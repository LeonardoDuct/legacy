import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.css'],
  standalone: true,
  imports: [CommonModule, CabecalhoComponent],
})
export class CadastroComponent {
  categorias = [
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

  sortColumn: string = '';
  sortDirection: boolean = true;

  toggleCategoria(id: string) {
    const categoria = this.categorias.find((cat) => cat.id === id);
    if (categoria) {
      categoria.expandida = !categoria.expandida;
    }
  }

  sortTable(column: string, categoriaId: string) {
    const categoria = this.categorias.find((cat) => cat.id === categoriaId);
    if (!categoria || !categoria.dados) return;

    this.sortDirection = this.sortColumn === column ? !this.sortDirection : true;
    this.sortColumn = column;

    categoria.dados.sort((a: any, b: any) => {
      if (a[column] < b[column]) return this.sortDirection ? -1 : 1;
      if (a[column] > b[column]) return this.sortDirection ? 1 : -1;
      return 0;
    });
  }
}
