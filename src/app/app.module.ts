import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HttpClientModule} from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { TaskDetailsComponent } from './task-details/task-details.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TaskDetailsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    NgChartsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
