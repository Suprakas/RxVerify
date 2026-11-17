import { Outlet, ScrollRestoration } from 'react-router';
import Toaster from '../Toaster/Toaster';

export default function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <ScrollRestoration />
    </>
  );
}
