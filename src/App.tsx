import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { CopyShopPage } from './pages/CopyShopPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { QuoteViewPage } from './pages/QuoteViewPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminRoute } from './components/admin/AdminRoute';

// Public customer layout with standard storefront navbar & footer
const CustomerLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <Router>
      <Routes>
        {/* Customer Storefront Routes (with customer Navbar & Footer) */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/copyshop" element={<CopyShopPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/quotes/:identifier" element={<QuoteViewPage />} />
        </Route>

        {/* Dedicated Admin Portal Routes (Completely isolated, no customer Navbar/Footer) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        {/* Catch-all redirect to storefront home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
