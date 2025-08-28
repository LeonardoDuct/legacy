import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private router: Router) { }

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Se tem admin OU adm_categorias, pode acessar a tela
      if (payload.admin === true || payload.adm_categorias === true) {
        return true;
      } else {
        this.router.navigate(['/dashboard']);
        return false;
      }
    } catch (e) {
      this.router.navigate(['/login']);
      return false;
    }
  }
}