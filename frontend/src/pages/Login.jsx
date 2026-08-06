import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { login } from '@/api/auth';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const session = await login(email, password);
      setAuth(session.user, session.user.role, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      const from = location.state?.from?.pathname;
      const home = session.user.role === 'teacher' ? '/teacher' : '/student';
      const target = from?.startsWith(home) ? from : home;
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center font-body-md text-on-surface relative overflow-hidden">
      {/* Background decoration blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[5%] right-[0%] w-[30%] h-[30%] bg-tertiary-fixed-dim/10 rounded-full blur-[80px]" />
      </div>

      {/* Logo header */}
      <header className="fixed top-0 left-0 w-full px-6 h-16 flex items-center justify-center pointer-events-none">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">ExamAI</h1>
      </header>

      <main className="w-full max-w-md px-margin-mobile md:px-0">
        {/* Auth Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-sp-lg ambient-shadow relative z-10">
          {/* Heading */}
          <div className="text-center mb-sp-lg">
            <h2 className="font-headline-md text-headline-md text-on-background mb-2">Welcome Back</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Access your academic companion</p>
          </div>

          {location.search?.includes('expired=1') && (
            <div role="alert" className="mb-sp-md p-sp-md bg-error-container text-error rounded-2xl flex items-center gap-2 font-label-md">
              <span className="material-symbols-outlined text-[20px]">timer_off</span>
              <span>Your session expired. Please log in again.</span>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-sp-md p-sp-md bg-error-container text-error rounded-2xl flex items-center gap-2 font-label-md">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-sp-sm">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-label-md text-label-md text-on-surface-variant mb-sp-xs ml-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                autoComplete="email"
                placeholder="alex.rivers@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-surface-variant bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-body-md text-body-md text-on-surface"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block font-label-md text-label-md text-on-surface-variant mb-sp-xs ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-surface-variant bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-body-md text-body-md text-on-surface pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-sp-sm">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary-container active:scale-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Atmospheric quote */}
        <div className="mt-sp-md text-center px-sp-lg opacity-60">
          <p className="italic font-body-md text-body-md text-on-surface-variant">
            "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
          </p>
        </div>
      </main>
    </div>
  );
}
