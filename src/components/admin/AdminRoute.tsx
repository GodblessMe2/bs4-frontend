import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const AdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('bs4_admin_token');
  const userJson = localStorage.getItem('bs4_admin_user');

  if (!token || !userJson) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role !== 'admin' && user.role !== 'operator') {
      localStorage.removeItem('bs4_admin_token');
      localStorage.removeItem('bs4_admin_user');
      return <Navigate to="/admin/login" replace />;
    }
  } catch {
    return <Navigate to="/admin/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
