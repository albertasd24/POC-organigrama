import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', loadComponent: () => import('./app').then((module) => module.ProcessDemo) },
	{ path: 'demo/org-chart', loadComponent: () => import('./org-chart-demo').then((module) => module.OrgChartDemo) },
];
