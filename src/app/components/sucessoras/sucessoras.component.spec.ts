import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SucessorasComponent } from './sucessoras.component';

describe('SucessorasComponent', () => {
  let component: SucessorasComponent;
  let fixture: ComponentFixture<SucessorasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SucessorasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SucessorasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
