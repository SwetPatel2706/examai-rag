import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn, initials as getInitials } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useAuthStore from '@/store/authStore';
import { logout } from '@/api/auth';

/**
 * @param {{ items: Array<{icon: string, label: string, to: string}>, bottomItems?: Array<{icon: string, label: string, to?: string, onClick?: fn}>, open?: boolean, onOpenChange?: (open: boolean) => void, mobileMenuButtonRef?: React.RefObject<HTMLButtonElement> }} props
 */
export default function Sidebar({ items, bottomItems = [], open = false, onOpenChange, mobileMenuButtonRef }) {
  const navigate = useNavigate();
  const { user, role, clearAuth } = useAuthStore();
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e) => setIsDesktop(e.matches);

    // Set initial value
    setIsDesktop(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const displayName = user?.name ?? (role === 'teacher' ? 'Professor' : 'Student');
  const displayRole = role === 'teacher' ? 'Professor View' : 'Student View';
  const initials = getInitials(displayName);

  async function handleLogout() {
    try {
      await logout(); // best-effort remote revocation
    } catch {
      // ignore — local session is cleared regardless
    }
    clearAuth();
    navigate('/login', { replace: true });
  }

  function closeDrawer() {
    onOpenChange?.(false);
    if (!isDesktop) mobileMenuButtonRef?.current?.focus();
  }

  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'h-screen w-64 fixed left-0 top-0 bg-white flex flex-col border-r border-outline-variant z-50 transition-transform duration-200',
          'max-lg:-translate-x-full',
          open && 'max-lg:translate-x-0'
        )}
        inert={!isDesktop && !open ? '' : undefined}
        aria-hidden={!isDesktop && !open ? 'true' : undefined}
      >
        {/* Logo */}
        <div className="p-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-headline-md text-headline-md font-bold text-primary">ExamAI</span>
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider opacity-70 mt-0.5">
                {displayRole}
              </p>
            </div>
            <button
              type="button"
              className="lg:hidden p-1 rounded-lg hover:bg-surface-container-low text-secondary"
              onClick={closeDrawer}
              aria-label="Close navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-label-md text-label-md',
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container translate-x-1'
                    : 'text-secondary hover:bg-surface-container-low'
                )
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-outline-variant shrink-0">
          {/* User info */}
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <Avatar>
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-bold text-on-surface truncate">{displayName}</span>
              <span className="text-[12px] text-secondary opacity-80 truncate">{user?.email ?? ''}</span>
            </div>
          </div>

          {/* Bottom items (e.g. Settings) */}
          {bottomItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick ?? (() => item.to && navigate(item.to))}
              className="flex items-center gap-3 text-secondary px-4 py-2 mx-0 hover:bg-surface-container-low transition-all rounded-lg w-full text-left font-label-md text-label-md"
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-error px-4 py-2 hover:bg-error-container transition-all rounded-lg w-full text-left font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
