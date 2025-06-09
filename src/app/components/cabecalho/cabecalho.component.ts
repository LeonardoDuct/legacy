import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { GitlabService } from '../../services/gitlab.service';

@Component({
  selector: 'app-cabecalho',
  templateUrl: './cabecalho.component.html',
  styleUrls: ['./cabecalho.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class CabecalhoComponent implements OnInit {
  isMenuOpen = false;
  subMenuStates: { [key: string]: boolean } = {
    cadastro: true,
    configuracoes: true,
  };

  caminho: string[] = [];

  constructor(
      private gitlabService: GitlabService,
      private router: Router
    ) {}

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.caminho = event.urlAfterRedirects
          .split('/')
          .filter(p => p)
          .map(p => this.capitalize(p));
      }
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSubMenu(menu: string): void {
    this.subMenuStates[menu] = !this.subMenuStates[menu];
  }

  capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  getTituloPagina(): string {
    return this.caminho[0] || 'Dashboard';
  }

  estaLogado(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    this.gitlabService.logout();
    this.router.navigate(['/login']);
  }
}