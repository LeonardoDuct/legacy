import { Component } from '@angular/core';
import { SupabaseService } from 'src/app/services/supabase/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class UserManagementComponent {
  email: string = '';
  password: string = '';
  role: string = ''; // Exemplo de valor, altere conforme necessário
  fullName: string = '';
  successMessage: string = ''; // Adicionar a propriedade de sucesso
  errorMessage: string = ''; // Adicionar a propriedade de erro

  // Validação do email (verificando se o domínio é válido)
  get isEmailValid(): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(this.email);
  }

  // Validação da senha (mínimo de 6 caracteres)
  get isPasswordValid(): boolean {
    return this.password.length >= 6;
  }

  // Verifica se o formulário é válido
  isFormValid(): boolean {
    return this.isEmailValid && this.isPasswordValid;
  }

  constructor(private supabaseService: SupabaseService) {}

  // Método para criar o usuário
  async onCreateUser() {
    // Validações do formulário
    if (!this.isEmailValid) {
      this.errorMessage = 'Email inválido ou domínio incorreto.';
      return;
    }
  
    if (!this.isPasswordValid) {
      this.errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }
  
    try {
      // Tentar criar o usuário no Supabase
      const user = await this.supabaseService.createUser(
        this.email,
        this.password,
        this.role,
        this.fullName,
      );
      
      // Se o usuário foi criado com sucesso, mostramos a mensagem de sucesso
      this.successMessage = 'Usuário criado com sucesso!';
      
      // Limpar os campos do formulário após a criação
      this.email = '';
      this.password = '';
      this.role = '';
      this.fullName = '';
      this.errorMessage = ''; // Limpar qualquer erro, caso exista
    } catch (error) {
      // Se houver algum erro, mostramos a mensagem de erro
      console.error('Erro ao criar usuário:', error);
      
      // Se o erro for de criação do usuário, podemos lançar uma mensagem
      if (error instanceof Error) {
        this.errorMessage = error.message || 'Erro desconhecido. Tente novamente.';
      } else {
        this.errorMessage = 'Erro ao criar usuário. Tente novamente.';
      }
    }
  }
  
}