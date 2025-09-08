import { Location } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-voltar',
  imports: [],
  templateUrl: './voltar.component.html',
  styleUrl: './voltar.component.css'
})
export class VoltarComponent {
constructor(    
  private location: Location,
){}

  voltar(): void {
    this.location.back()
  }
}
