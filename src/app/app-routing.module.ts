import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CadastroComponent } from './components/cadastro/cadastro.component';
import { TarefasComponent } from './components/tarefas/tarefas.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';
import { HeadGuard } from './guards/head.guard';
import { AdminOrHeadGuard } from './guards/adminOrHead.guard';
import { LoginComponent } from './components/login/login.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { SucessorasComponent } from './components/sucessoras/sucessoras.component';
import { RelatoriosComponent } from './components/relatorios/relatorios.component';
import { ProjetosInternosComponent } from './components/projetos-internos/projetos-internos.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'cadastro', component: CadastroComponent, canActivate: [AdminGuard] },
  { path: 'dashboard/:projeto', component: TarefasComponent },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AdminGuard] },
  { path: 'sucessoras/:id', component: SucessorasComponent },
  { path: 'relatorios', component: RelatoriosComponent, canActivate: [HeadGuard] },
  { path: 'projetosInternos', component: ProjetosInternosComponent, canActivate: [AdminOrHeadGuard] },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }