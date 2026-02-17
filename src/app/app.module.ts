import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DatasetViewComponent } from './components/dataset-view/dataset-view.component';
import { ModelViewComponent } from './components/model-view/model-view.component';
import { MetricViewComponent } from './components/metric-view/metric-view.component';
import { DatasetItemComponent } from './components/dataset-item/dataset-item.component';
import { ModelItemComponent } from './components/model-item/model-item.component';
import { MetricItemComponent } from './components/metric-item/metric-item.component';
import { ExportDialogComponent } from './components/export-dialog/export-dialog.component';
import { TokenInputComponent } from './components/token-input/token-input.component';
import { ContextViewComponent } from './components/context-view/context-view.component';
import { NodeEditorComponent } from './components/node-editor/node-editor.component';
import { ContextDesignerComponent } from './components/context-designer/context-designer.component';

const routes: Routes = [
  { path: '', component: ContextDesignerComponent },
  { path: 'node-editor', component: NodeEditorComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    DatasetViewComponent,
    ModelViewComponent,
    MetricViewComponent,
    DatasetItemComponent,
    ModelItemComponent,
    MetricItemComponent,
    ExportDialogComponent,
    TokenInputComponent,
    ContextViewComponent,
    NodeEditorComponent,
    ContextDesignerComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 