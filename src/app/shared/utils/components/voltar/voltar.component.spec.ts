import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoltarComponent } from './voltar.component';

describe('VoltarComponent', () => {
  let component: VoltarComponent;
  let fixture: ComponentFixture<VoltarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoltarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoltarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
