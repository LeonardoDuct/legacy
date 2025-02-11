import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TaskDetailsComponent } from './task-details/task-details.component';

const routes: Routes = [
  { path: '', component: DashboardComponent }, 
  { path: 'dashboard', component: DashboardComponent },  
  { path: 'tasks/:id', component: TaskDetailsComponent }, 
  { path: '**', redirectTo: '' }  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
