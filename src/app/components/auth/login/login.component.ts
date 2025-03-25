import { Component } from '@angular/core';
import { SupabaseService } from 'src/app/services/supabase/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  newPassword: string = '';
  errorMessage: string = '';
  mustChangePassword: boolean = false;
  userId: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onLogin() {
    try {
      const user = await this.supabaseService.login(this.email, this.password);
  
      if (!user) {
        this.errorMessage = 'Usuário não encontrado';
        return;
      }
  
      const userData = await this.supabaseService.getUserData(user.id);
  
      if (userData?.must_change_password) {
        this.mustChangePassword = true;
        this.userId = user.id; // Guarda o ID do usuário para atualizar a senha
        return;
      }
      
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Erro ao realizar login';
    }
  }

  async onChangePassword() {
    try {
      if (this.newPassword.length < 6) {
        this.errorMessage = 'A nova senha deve ter pelo menos 6 caracteres';
        return;
      }

      // Atualiza a senha do usuário
      await this.supabaseService.updateUserPassword(this.newPassword);

      // Atualiza o campo 'must_change_password' no Supabase
      await this.supabaseService.updateMustChangePassword(this.userId);

      alert('Senha alterada com sucesso! Faça login novamente.');
      this.mustChangePassword = false;
      this.email = '';
      this.password = '';
      this.newPassword = '';
      this.router.navigate(['/login']); // Redireciona para login
    } catch (error: any) {
      this.errorMessage = error.message || 'Erro ao alterar a senha';
    }
  }
}
