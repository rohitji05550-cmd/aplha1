import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { LogIn } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'manager', 'staff', 'reviewer'];

export default function AdminLogin() {
  const [data, setData] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!data.email || !data.password) {
      toast({ title: 'Enter email and password' });
      return;
    }
    setBusy(true);
    const result = await login(data.email, data.password);
    setBusy(false);
    if (!result.ok) {
      toast({ title: 'Sign in failed', description: result.error });
      return;
    }

    const destination = result.user && ADMIN_ROLES.includes(result.user.role) ? '/admin' : '/dashboard';
    if (!ADMIN_ROLES.includes(result.user.role)) {
      toast({ title: 'Signed in', description: 'You do not have admin access. Redirecting to dashboard.' });
    } else {
      toast({ title: 'Admin signed in', description: 'Redirecting to the control center.' });
    }
    setTimeout(() => navigate(destination), 250);
  };

  const handleOAuth = (provider) => {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (!supabaseUrl) {
      toast({ title: 'Configuration missing', description: 'Supabase URL is not set.' });
      return;
    }
    const redirectUrl = `${window.location.origin}/auth/callback?redirect=/admin`;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain min-h-[80vh]">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Admin Portal</span>
            </div>
            <h1 className="mt-4 font-display text-5xl lg:text-6xl font-semibold text-slate-900 leading-[1.02]">
              Secure admin access<br />for your operations team.
            </h1>
            <p className="mt-5 text-slate-600 max-w-md">
              Sign in with your staff credentials to manage leads, orders, KYC and user access. Use the regular client login at <span className="font-semibold text-slate-900">/login</span>.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>✓ Admin workflows for sales, operations and review</li>
              <li>✓ Direct access to KYC, invoices, coupons and memberships</li>
              <li>✓ Team management and password reset tools</li>
            </ul>
          </div>

          <div className="card-elevated rounded-3xl p-7 lg:p-9" data-testid="admin-login-card">
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Admin sign in</div>
            <form onSubmit={submit} className="space-y-5 mt-6" data-testid="admin-login-form">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</label>
                <Input
                  data-testid="admin-email-input"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="mt-1.5 h-11 rounded-lg"
                  placeholder="admin@company.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Password</label>
                <Input
                  data-testid="admin-password-input"
                  type="password"
                  value={data.password}
                  onChange={(e) => setData({ ...data, password: e.target.value })}
                  className="mt-1.5 h-11 rounded-lg"
                  placeholder="Your password"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                data-testid="admin-login-submit"
                className="btn-primary rounded-full w-full h-12"
              >
                {busy ? 'Signing in…' : <><LogIn className="h-4 w-4 mr-2" /> Sign in</>}
              </Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
              <div className="flex-1 h-px bg-slate-200" /> or sign in with SSO <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 flex items-center justify-center"
              >Google</button>
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                className="h-11 rounded-full border border-slate-200 bg-[#24292f] hover:bg-[#1f2328] text-[13px] font-semibold text-white flex items-center justify-center"
              >GitHub</button>
              <button
                type="button"
                onClick={() => handleOAuth('facebook')}
                className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 flex items-center justify-center"
              >Facebook</button>
            </div>
            <div className="mt-5 text-xs text-slate-500">
              By signing in you agree to our Terms and Privacy Policy.
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
