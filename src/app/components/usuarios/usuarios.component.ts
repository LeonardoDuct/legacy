import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgIf, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitlabService } from '../../services/gitlab.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
import { VoltarComponent } from 'src/app/shared/utils/components/voltar/voltar.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
  imports: [FormsModule, NgIf, RouterModule, CabecalhoComponent, CommonModule, VoltarComponent],
})
export class UsuariosComponent implements OnInit {
  nome = '';
  email = '';
  senha = '';
  admin = false;
  head = false;
  iprojetos = false;
  adm_categorias = false;
  adm_usuarios = false;
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
  ) { }

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
    this.head = usuario.head;
    this.iprojetos = usuario.iprojetos;
    this.adm_categorias = usuario.adm_categorias ?? false;
    this.adm_usuarios = usuario.adm_usuarios ?? false;
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
    this.head = false;
    this.iprojetos = false;
    this.adm_categorias = false;
    this.adm_usuarios = false;
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

    this.gitlabService.cadastrarUsuario(
      this.nome,
      this.email,
      this.senha,
      this.admin,
      this.head,
      this.iprojetos,
      this.adm_categorias,
      this.adm_usuarios
    ).subscribe({
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

    this.gitlabService.atualizarUsuario(
      this.usuarioEditandoId,
      this.nome,
      this.email,
      this.admin,
      this.head,
      this.iprojetos,
      this.adm_categorias,
      this.adm_usuarios
    ).subscribe({
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

  resetarSenhaUsuario() {
    if (!this.usuarioEditandoId) return;
    this.loading = true;
    this.erroCadastro = '';
    this.sucessoCadastro = '';
    this.gitlabService.resetarSenhaUsuario(this.usuarioEditandoId).subscribe({
      next: (res) => {
        this.loading = false;
        this.sucessoCadastro = res.mensagem || 'Senha resetada com sucesso para o padrão "jallcard"';
      },
      error: (err) => {
        this.loading = false;
        this.erroCadastro = err.error?.mensagem || 'Erro ao resetar senha.';
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