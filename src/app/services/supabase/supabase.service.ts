import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(error.message);
    }
    return data.user; // Retornando o usuário logado corretamente
  }

  async getUser() {
    console.log("Chamando getUser()");
  
    // Forçar o Supabase a recuperar a sessão
    await this.supabase.auth.refreshSession();  // Tenta forçar a sessão a ser atualizada
  
    const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
  
    if (sessionError || !sessionData?.session) {
      console.error("Erro ao restaurar sessão:", sessionError?.message || "Nenhuma sessão ativa encontrada");
      return null;
    }
  
    const { data, error } = await this.supabase.auth.getUser();
  
    if (error) {
      console.error("Erro ao obter usuário:", error.message);
      return null;
    }
  
    console.log("Usuário encontrado:", data.user);
    return data.user;
  }
   

  async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error('Erro ao deslogar:', error.message);
    }
  }

  // Método para criar usuário
  async createUser(email: string, password: string, role: string, fullName: string) {
    // Criação do usuário
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { user } = data; // Acessando o user corretamente

    console.log('Usuário cadastrado:', user);

    // Adicionando os dados na tabela 'users'
    const { error: profileError } = await this.supabase
      .from('users') 
      .upsert({
        id: user?.id,
        full_name: fullName,
        role: role, 
      });

    if (profileError) {
      throw new Error(profileError.message);
    }

    return user;
}

  // Método para atualizar a senha do usuário
  async updateUserPassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error('Erro ao atualizar a senha: ' + error.message);
    }
  }

  // Método para atualizar 'must_change_password' na tabela de usuários
  async updateMustChangePassword(userId: string) {
    const { error } = await this.supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', userId);

    if (error) {
      throw new Error('Erro ao atualizar o status de mudança de senha: ' + error.message);
    }
  }

  async getUserData(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('must_change_password')
      .eq('id', userId)
      .single();
  
    if (error) {
      throw new Error('Erro ao buscar informações do usuário: ' + error.message);
    }
  
    return data;
  }  

}
