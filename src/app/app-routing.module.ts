import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CadastroComponent } from './components/cadastro/cadastro.component';
import { TarefasComponent } from './components/tarefas/tarefas.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'cadastro', component: CadastroComponent},
  { path: 'dashboard/:projeto', component: TarefasComponent },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }