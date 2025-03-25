import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { SupabaseService } from 'src/app/services/supabase/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Promise<boolean> {

    const user = await this.supabaseService.getUser(); // Ajustado para retornar o usuário diretamente

    if (user) {
      // Se o usuário já estiver logado, redireciona para o dashboard
      if (next.routeConfig?.path === 'login') {
        this.router.navigate(['/dashboard']);
        return false;
      }
      return true; // Se o usuário estiver logado, permite o acesso às outras rotas protegidas
    } else {
      // Se não estiver logado, permite o acesso à tela de login
      if (next.routeConfig?.path !== 'login') {
        this.router.navigate(['/login']);
        return false;
      }
      return true;
    }
  }
}
