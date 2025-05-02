import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.css'],
  standalone: true,
  imports: [CommonModule, CabecalhoComponent],
})
export class CadastroComponent {

}
