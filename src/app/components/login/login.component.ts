import { Component } from '@angular/core';
import { GitlabService } from '../../services/gitlab.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule, CommonModule]
})
export class LoginComponent {
  email = '';
  senha = '';
  novaSenha = '';
  confirmarSenha = '';
  erroLogin = '';
  loading = false;
  primeiroAcesso = false;

  // Recuperação de senha
  recuperarSenhaAtivo = false;
  emailRecuperacao = '';
  mensagemRecuperacao = '';

  constructor(
    private gitlabService: GitlabService,
    private router: Router
  ) { }

  onLogin() {
    this.erroLogin = '';
    this.loading = true;
    this.gitlabService.login(this.email, this.senha).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.trocaSenha) {
          this.primeiroAcesso = true;
          localStorage.setItem('token', res.token);
        } else {
          localStorage.setItem('token', res.token);
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.erroLogin = err.error?.mensagem || 'Erro ao fazer login.';
      }
    });
  }

  onAlterarSenha() {
    if (this.novaSenha !== this.confirmarSenha) {
      this.erroLogin = 'As senhas não coincidem.';
      return;
    }

    this.loading = true;
    this.gitlabService.alterarSenha(this.novaSenha).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.erroLogin = err.error?.mensagem || 'Erro ao alterar a senha.';
      }
    });
  }

  ativarRecuperacao(event: Event) {
    event.preventDefault();
    this.recuperarSenhaAtivo = true;
    this.emailRecuperacao = '';
    this.mensagemRecuperacao = '';
  }

  cancelarRecuperacao() {
    this.recuperarSenhaAtivo = false;
    this.emailRecuperacao = '';
    this.mensagemRecuperacao = '';
  }

  enviarRecuperacao() {
  this.mensagemRecuperacao = '';
  this.loading = true;

  this.gitlabService.recuperarSenha(this.emailRecuperacao).subscribe({
    next: (res) => {
      this.loading = false;
      this.mensagemRecuperacao = res.mensagem || 'Verifique seu e-mail para redefinir a senha.';
      setTimeout(() => {
        this.recuperarSenhaAtivo = false;
        this.emailRecuperacao = '';
        this.mensagemRecuperacao = '';
      }, 3000);
    },
    error: (err) => {
      this.loading = false;
      this.mensagemRecuperacao = err.error?.mensagem || 'Erro ao solicitar recuperação de senha.';
    }
  });
}
}