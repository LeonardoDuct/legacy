import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgIf, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitlabService } from '../../services/gitlab.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
  imports: [FormsModule, NgIf, RouterModule, CabecalhoComponent, CommonModule],
})
export class UsuariosComponent implements OnInit {
  nome = '';
  email = '';
  senha = '';
  admin = false;
  erroCadastro = '';
  sucessoCadastro = '';
  loading = false;
  mostrarModal = false;
  usuarios: any[] = [];

  modoEdicao = false;
  usuarioEditandoId: any = null;

  constructor(
    private gitlabService: GitlabService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios(): void {
    this.gitlabService.listarUsuarios().subscribe({
      next: (res) => {
        this.usuarios = res;
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
      }
    });
  }

  abrirModalCadastro() {
    this.limparFormulario();
    this.modoEdicao = false;
    this.mostrarModal = true;
  }

  abrirModalEdicao(usuario: any) {
    this.modoEdicao = true;
    this.usuarioEditandoId = usuario.id; 
    this.nome = usuario.nome;
    this.email = usuario.email;
    this.admin = usuario.admin;
    this.senha = '';
    this.erroCadastro = '';
    this.sucessoCadastro = '';
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.limparFormulario();
  }

  limparFormulario() {
    this.nome = '';
    this.email = '';
    this.senha = '';
    this.admin = false;
    this.erroCadastro = '';
    this.sucessoCadastro = '';
    this.usuarioEditandoId = null;
  }

  onSubmit() {
    if (this.modoEdicao) {
      this.atualizarUsuario();
    } else {
      this.cadastrarUsuario();
    }
  }

  cadastrarUsuario() {
    this.erroCadastro = '';
    this.sucessoCadastro = '';
    this.loading = true;

    this.gitlabService.cadastrarUsuario(this.nome, this.email, this.senha, this.admin).subscribe({
      next: (res) => {
        this.loading = false;
        this.sucessoCadastro = res.mensagem || 'Usuário cadastrado com sucesso!';
        this.carregarUsuarios();
        this.fecharModal();
      },
      error: (err) => {
        this.loading = false;
        this.erroCadastro = err.error?.mensagem || 'Erro ao cadastrar usuário.';
      }
    });
  }

  atualizarUsuario() {
    this.erroCadastro = '';
    this.sucessoCadastro = '';
    this.loading = true;

    this.gitlabService.atualizarUsuario(this.usuarioEditandoId, this.nome, this.email, this.admin).subscribe({
      next: (res) => {
        this.loading = false;
        this.sucessoCadastro = res.mensagem || 'Usuário atualizado com sucesso!';
        this.carregarUsuarios();
        this.fecharModal();
      },
      error: (err) => {
        this.loading = false;
        this.erroCadastro = err.error?.mensagem || 'Erro ao atualizar usuário.';
      }
    });
  }

  editarUsuario(usuario: any) {
    this.abrirModalEdicao(usuario);
  }

  voltar(): void {
    this.location.back()
  }
}
