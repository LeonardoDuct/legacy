import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { GitlabService } from '../../services/gitlab.service';

interface Issue {
  codigo_issue: number;
  repositorio: string;
  cliente: string;
  status: string;
  prazo: string;
  responsavel: string;
  prioridade?: number;
  score_total?: number;
}

@Component({
  selector: 'app-tarefas',
  standalone: true,
  imports: [CommonModule, CabecalhoComponent],
  templateUrl: './tarefas.component.html',
  styleUrl: './tarefas.component.css'
})
export class TarefasComponent implements OnInit {
  nomeProjeto: string = '';
  sortColumn: string = ''; // Coluna pela qual os dados serão ordenados
  sortDirection: boolean = true; // Direção da ordenação (true = ascendente, false = descendente)
  tarefas: any[] = [];

  constructor(private route: ActivatedRoute,private router: Router, private gitlabService: GitlabService){}

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.nomeProjeto = params.get('projeto') ?? '';
      console.log('🎯 Nome do projeto recebido:', this.nomeProjeto); // 🔹 Verifica se "QA" está sendo recebido
  
      if (this.nomeProjeto) {
        console.log('📢 Chamando carregarTarefas()'); // 🔹 Verifica se estamos chamando a função corretamente
        this.carregarTarefas(this.nomeProjeto);
      } else {
        console.warn('⚠ nomeProjeto está indefinido ou vazio!');
      }
    });
  }

  carregarTarefas(projeto: string) {
    console.log('📢 Chamando API para:', projeto); // 🔹 Verificar se a função está sendo chamada
  
    this.gitlabService.obterIssuesPorProjetoNome(projeto).subscribe(
      (dados: Issue[]) => {
        console.log('✅ Dados recebidos:', dados); // 🔹 Log dos dados recebidos da API
        this.tarefas = dados;
      },
      (erro) => {
        console.error('❌ Erro ao carregar tarefas:', erro); // 🔹 Se houver erro na API, será exibido aqui
      }
    );
  }


  getScoreClass(score: number): string {
    if (score < 25) return 'score verde';
    if (score < 50) return 'score amarelo';
    if (score < 75) return 'score vermelho-claro';
    return 'score vermelho-escuro';
}

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = !this.sortDirection; // Alterna a direção
    } else {
      this.sortColumn = column;
      this.sortDirection = true; // Se for uma nova coluna, a ordenação será crescente por padrão
    }
  
    this.tarefas.sort((a, b) => {
      // Aqui fazemos a assertiva de tipo para garantir que `column` é uma chave de `Tarefa`
      const key = column as keyof typeof a;
  
      if (a[key] < b[key]) {
        return this.sortDirection ? -1 : 1;
      } else if (a[key] > b[key]) {
        return this.sortDirection ? 1 : -1;
      }
      return 0;
    });
  }

  voltar(): void {
    this.router.navigate(['/dashboard']); // ou qualquer rota que faça sentido
  }
  
}
