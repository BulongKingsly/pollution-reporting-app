import { Routes } from '@angular/router';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { Home } from './home/home';
import { HelpPage } from './help-page/help-page';
import { Login } from './login/login';
import { Profile } from './profile/profile';
import { ResetPassword } from './reset-password/reset-password';
import { SettingsPage } from './settings-page/settings-page';
import { SignUp } from './sign-up/sign-up';
import { SubmitReport } from './submit-report/submit-report';
import { AuthGuard } from './guard/auth-guard';
import { AdminGuard } from './guard/admin-guard';
import { UnauthorizedComponent } from './unauthorized/unauthorized';
import { BarangayAdminGuard } from './guard/barangay-admin-guard';
import { BarangayAdminComponent } from './barangay-admin/barangay-admin';
import { AnalyticsComponent } from './analytics/analytics';
import { UserGuard } from './guard/user-guard';
import { NotificationsComponent } from './notifications/notifications';

export const routes: Routes = [
  // Public pages
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUp },
  { path: 'reset-password', component: ResetPassword },
  { path: 'help', component: HelpPage, canActivate: [UserGuard] },

  // Protected pages (require authentication)
  { path: 'profile', component: Profile, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsPage, canActivate: [AuthGuard] },
  { path: 'submit-report', component: SubmitReport, canActivate: [AuthGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard] },

  // Admin routes
  { path: 'admin', component: AdminDashboard, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/barangay/:barangayId', component: BarangayAdminComponent, canActivate: [AuthGuard, BarangayAdminGuard] },
  { path: 'admin/analytics', component: AnalyticsComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/barangay/:barangayId/analytics', component: AnalyticsComponent, canActivate: [AuthGuard, BarangayAdminGuard] },

  // Unauthorized
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Home page (default route)
  { path: '', component: Home, pathMatch: 'full' },

  // Unknown route fallback
  { path: '**', redirectTo: '' }
];
