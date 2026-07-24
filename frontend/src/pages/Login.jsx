import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === 'student') navigate('/student');
    else navigate('/teacher');
  };

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
        <div className="bg-surface-container-lowest rounded-3xl p-lg ambient-shadow relative z-10">

          {/* Sliding Pill Role Toggle */}
          <div className="mb-lg">
            <div className="relative bg-surface-container flex p-1 rounded-full items-center select-none cursor-pointer">
              {/* Animated sliding pill */}
              <div
                className="absolute h-[calc(100%-8px)] w-[calc(50%-4px)] bg-surface-container-lowest rounded-full shadow-sm transition-all duration-300 ease-in-out"
                style={{ left: role === 'student' ? '4px' : 'calc(50% + 0px)' }}
              />
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`relative z-10 w-1/2 py-2 font-label-md text-label-md text-center transition-colors duration-300 ${
                  role === 'student' ? 'text-on-surface' : 'text-on-secondary-container'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`relative z-10 w-1/2 py-2 font-label-md text-label-md text-center transition-colors duration-300 ${
                  role === 'teacher' ? 'text-on-surface' : 'text-on-secondary-container'
                }`}
              >
                Teacher
              </button>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-lg">
            <h2 className="font-headline-md text-headline-md text-on-background mb-2">Welcome Back</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Access your academic companion</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-sm">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-label-md text-label-md text-on-surface-variant mb-xs ml-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="alex.rivers@university.edu"
                className="w-full h-12 px-4 rounded-xl border border-surface-variant bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-body-md text-body-md text-on-surface"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-xs ml-1">
                <label htmlFor="password" className="font-label-md text-label-md text-on-surface-variant">
                  Password
                </label>
                <a href="#" className="font-label-sm text-label-sm text-primary hover:underline">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  className="w-full h-12 px-4 rounded-xl border border-surface-variant bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-body-md text-body-md text-on-surface pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-sm">
              <button
                type="submit"
                className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary-container active:scale-95 transition-all shadow-md shadow-primary/10"
              >
                Continue as {role === 'student' ? 'Student' : 'Teacher'}
              </button>
            </div>
          </form>

          {/* Sign-up link */}
          <div className="mt-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Don't have an account?{' '}
              <a href="#" className="text-primary font-bold hover:underline">
                Create an account
              </a>
            </p>
          </div>
        </div>

        {/* Atmospheric quote */}
        <div className="mt-md text-center px-lg opacity-60">
          <p className="italic font-body-md text-body-md text-on-surface-variant">
            "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
          </p>
        </div>
      </main>
    </div>
  );
}
