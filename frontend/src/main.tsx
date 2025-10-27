import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import OrdersPage from './pages/OrdersPage.tsx';
import ReactDOM from 'react-dom/client';
import React from 'react';
import SellerDashboard from './pages/SellerDashboard.tsx';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/orders', element: <OrdersPage /> },
  { path:'/seller', element: <SellerDashboard/> }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
