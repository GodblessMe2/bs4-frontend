import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Printer, ShieldCheck, Truck, Menu, X, User, LogIn } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customerUser, setCustomerUser] = useState<any>(() => {
    try {
      const token = localStorage.getItem('bs4_token');
      const rawUser = localStorage.getItem('bs4_user');
      return token && rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });
  const location = useLocation();

  useEffect(() => {
    const syncAuth = () => {
      try {
        const token = localStorage.getItem('bs4_token');
        const rawUser = localStorage.getItem('bs4_user');
        setCustomerUser(token && rawUser ? JSON.parse(rawUser) : null);
      } catch {
        setCustomerUser(null);
      }
    };
    window.addEventListener('bs4-auth-change', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('bs4-auth-change', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top UK delivery alert banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 text-center border-b border-slate-800 flex items-center justify-center gap-3 font-medium">
        <span className="flex items-center gap-1 text-emerald-400">
          <Truck className="w-3.5 h-3.5" /> Fast UK Next-Day Delivery Available
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="hidden sm:inline">Free Standard Delivery on orders over £30.00</span>
        <span className="text-slate-600 hidden md:inline">•</span>
        <span className="text-amber-300 hidden md:inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> In-House Commercial Quality Guarantee
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors ${
                isCurrent('/') && !location.hash ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home
            </Link>
            <Link
              to="/copyshop"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isCurrent('/copyshop') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-4 h-4 text-blue-600" />
              Online Copy Shop
            </Link>
            <Link
              to="/#pricing-guide"
              className={`text-sm font-semibold transition-colors ${
                location.hash === '#pricing-guide' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pricing Guide
            </Link>
            <Link
              to="/#paper-finishes"
              className={`text-sm font-semibold transition-colors ${
                location.hash === '#paper-finishes' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paper & Binding
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {customerUser ? (
              <Link
                to="/account"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  isCurrent('/account')
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{customerUser.firstName || 'My Account'}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  isCurrent('/login') || isCurrent('/register')
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </Link>
            )}

            <Link
              to="/copyshop"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all hover:shadow-md transform active:scale-98"
            >
              <Printer className="w-4 h-4" />
              Upload & Configure
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-semibold text-slate-800 hover:bg-slate-100"
          >
            Home
          </Link>
          <Link
            to="/copyshop"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-semibold text-blue-600 hover:bg-blue-50"
          >
            Online Copy Shop
          </Link>
          <Link
            to="/#pricing-guide"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-semibold text-slate-700 hover:bg-slate-100"
          >
            Pricing Guide
          </Link>
          <Link
            to="/#paper-finishes"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-semibold text-slate-700 hover:bg-slate-100"
          >
            Paper & Binding
          </Link>
          <Link
            to={customerUser ? '/account' : '/login'}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-semibold text-slate-700 hover:bg-slate-100"
          >
            {customerUser ? `My Account (${customerUser.firstName || 'Dashboard'})` : 'Customer Sign In / Register'}
          </Link>
          <Link
            to="/copyshop"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-base font-bold text-white bg-blue-600"
          >
            <Printer className="w-5 h-5" />
            Upload Document Now
          </Link>
        </div>
      )}
    </header>
  );
};
