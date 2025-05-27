import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CadastroComponent } from './components/cadastro/cadastro.component';
import { TarefasComponent } from './components/tarefas/tarefas.component';
import { AdminGuard } from './guards/admin.guard';
import { LoginComponent } from './components/login/login.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent},
  { path: 'dashboard', component: DashboardComponent },
  { path: 'cadastro', component: CadastroComponent, canActivate: [AdminGuard] },
  { path: 'dashboard/:projeto', component: TarefasComponent },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AdminGuard] },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }