import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjetosInternosComponent } from './projetos-internos.component';

describe('ProjetosInternosComponent', () => {
  let component: ProjetosInternosComponent;
  let fixture: ComponentFixture<ProjetosInternosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjetosInternosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjetosInternosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
