import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { GitlabService } from 'src/app/services/gitlab.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';

@Component({
  selector: 'app-projetos-internos',
  imports: [CabecalhoComponent],
  templateUrl: './projetos-internos.component.html',
  styleUrl: './projetos-internos.component.css'
})
export class ProjetosInternosComponent {
  constructor(
    private gitlabService: GitlabService,
    private location: Location
  ){}
voltar(): void {
    this.location.back()
  }
  
}
