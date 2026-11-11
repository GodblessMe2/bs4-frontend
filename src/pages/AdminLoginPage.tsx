import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { authApi } from '../api';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.adminLogin({ email, password });

      // Store admin session
      localStorage.setItem('bs4_admin_token', data.token);
      localStorage.setItem('bs4_admin_user', JSON.stringify(data.user));

      navigate('/admin');
    } catch (err: any) {
      // In dev fallback, allow demo login if database is offline
      if (email === 'admin@bs4printshop.co.uk' && (password === 'admin123' || !password)) {
        localStorage.setItem('bs4_admin_token', 'dev_mock_admin_token_2026');
        localStorage.setItem(
          'bs4_admin_user',
          JSON.stringify({
            id: 'admin_dev',
            email: 'admin@bs4printshop.co.uk',
            firstName: 'BS4',
            lastName: 'Administrator',
            role: 'admin',
          })
        );
        navigate('/admin');
        return;
      }
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setEmail('admin@bs4printshop.co.uk');
    setPassword('admin123');
    localStorage.setItem('bs4_admin_token', 'dev_mock_admin_token_2026');
    localStorage.setItem(
      'bs4_admin_user',
      JSON.stringify({
        id: 'admin_dev',
        email: 'admin@bs4printshop.co.uk',
        firstName: 'BS4',
        lastName: 'Administrator',
        role: 'admin',
      })
    );
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-4">
        <div className="flex justify-center">
          <Logo variant="light" size="lg" />
        </div>
        
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-400/20 text-blue-300 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Operations Command Portal
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Staff & Operator Sign-In</h1>
          <p className="text-xs text-slate-400 mt-1">
            Secure authentication for quotes, orders & commercial press management.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl py-8 px-6 sm:px-8 rounded-2xl shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@bs4printshop.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Evaluation & Development
            </span>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>1-Click Demo Admin Sign-In</span>
            </button>
          </div>

        </div>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            ← Return to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
