import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ExportDialogComponent } from './components/export-dialog/export-dialog.component';
import { ContextViewComponent } from './components/context-view/context-view.component';
import { NodeEditorComponent } from './components/node-editor/node-editor.component';
import { OpenContextComponent } from './components/open-context/open-context.component';
import { ContextDesignerComponent } from './components/context-designer/context-designer.component';

const routes: Routes = [
  { path: '', component: ContextDesignerComponent },
  { path: 'node-editor', component: ContextDesignerComponent, data: { blueprint: true } },
  { path: '**', redirectTo: '' }
];
@NgModule({
  declarations: [AppComponent, SidebarComponent, ExportDialogComponent, ContextViewComponent, NodeEditorComponent, ContextDesignerComponent, OpenContextComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule, RouterModule.forRoot(routes)],
  bootstrap: [AppComponent]
})
export class AppModule {}
