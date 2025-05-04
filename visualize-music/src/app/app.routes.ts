import { Route, Routes } from '@angular/router';
import { FileUploadPage } from './pages/file_upload/file_upload';
import { HomePage } from './pages/home/home';
import { dataExistsRouteGuard } from './route_guards/data_exists_route_guard';
import { latestChartWeekRouteGuard } from './route_guards/latest_chart_week_route_guard';
import { SettingsPage } from './pages/settings/settings';
import { DetailsPage } from './pages/details/details';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/file-upload',
    pathMatch: 'full',
  },

  {
    path: 'file-upload',
    component: FileUploadPage,
  },
  {
    path: 'charts',
    canActivate: [dataExistsRouteGuard, latestChartWeekRouteGuard],
    children: [],
  },

  {
    path: 'charts/:weekId/:entityType', // Expects YYYY-MM-DD format
    component: HomePage,
    canActivate: [dataExistsRouteGuard],
  },
  {
    path: 'settings',
    canActivate: [dataExistsRouteGuard],
    component: SettingsPage,
  },
  {
    path: 'details/:entityType/:id',
    canActivate: [dataExistsRouteGuard],
    component: DetailsPage,
  },
  {
    path: '**',
    redirectTo: '/file-upload',
  },
];
