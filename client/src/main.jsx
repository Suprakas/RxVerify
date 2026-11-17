import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { store } from './app/store';
import { buildRoutes } from './routes/routes';
import './styles/global.css';

// Created once, outside React, as React Router recommends for data routers.
const router = createBrowserRouter(buildRoutes(store));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>
);
