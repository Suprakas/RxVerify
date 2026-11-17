import RootLayout from '../components/Layout/RootLayout';
import AppLayout from '../components/Layout/AppLayout';
import AuthLayout from '../components/Layout/AuthLayout';
import RouteError from '../pages/RouteError';
import NotFoundPage from '../pages/NotFoundPage';
import { FullPageSpinner } from '../components/StateViews/StateViews';
import { sessionMiddleware, requireAuth, requireRole, redirectIfAuthenticated, homeRedirectLoader } from './guards';

// Each page is its own chunk: a customer never downloads the pharmacist or admin code.
const page = (importer) => async () => ({ Component: (await importer()).default });

/**
 * Route objects for createBrowserRouter. Built from a function so tests can
 * pass their own store and use createMemoryRouter with the same tree.
 */
export function buildRoutes(store) {
  return [
    {
      id: 'root',
      path: '/',
      Component: RootLayout,
      HydrateFallback: FullPageSpinner,
      ErrorBoundary: RouteError,
      middleware: [sessionMiddleware(store)],
      // A root loader makes the router run middleware on the very first load too.
      loader: () => null,
      children: [
        { index: true, loader: homeRedirectLoader(store) },
        {
          Component: AuthLayout,
          middleware: [redirectIfAuthenticated(store)],
          children: [
            { path: 'login', lazy: page(() => import('../features/auth/LoginPage')) },
            { path: 'register', lazy: page(() => import('../features/auth/RegisterPage')) },
          ],
        },
        {
          Component: AppLayout,
          middleware: [requireAuth(store)],
          children: [
            {
              middleware: [requireRole(store, ['customer'])],
              children: [
                { path: 'prescriptions', lazy: page(() => import('../features/prescriptions/MyPrescriptionsPage')) },
                { path: 'prescriptions/new', lazy: page(() => import('../features/prescriptions/NewPrescriptionPage')) },
                { path: 'prescriptions/:id', lazy: page(() => import('../features/prescriptions/PrescriptionDetailPage')) },
              ],
            },
            {
              middleware: [requireRole(store, ['pharmacist', 'admin'])],
              children: [
                { path: 'queue', lazy: page(() => import('../features/queue/QueuePage')) },
                { path: 'queue/:id', lazy: page(() => import('../features/queue/ReviewPage')) },
              ],
            },
            {
              middleware: [requireRole(store, ['admin'])],
              children: [
                { path: 'admin', lazy: page(() => import('../features/admin/DashboardPage')) },
                { path: 'admin/users', lazy: page(() => import('../features/admin/UsersPage')) },
              ],
            },
          ],
        },
        { path: '*', Component: NotFoundPage },
      ],
    },
  ];
}
