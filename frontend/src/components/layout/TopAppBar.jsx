import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useAuthStore from '@/store/authStore';
import { initials as getInitials } from '@/lib/utils';

/**
 * Fixed top bar with search and account actions — spans main content area beside sidebar.
 */
export default function TopAppBar({ searchPlaceholder = 'Search…', searchValue, onSearchChange }) {
  const { user, role } = useAuthStore();
  const displayName = user?.name ?? (role === 'teacher' ? 'Professor' : 'Student');
  const initials = getInitials(displayName);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 w-full lg:w-[calc(100%-16rem)] h-16 bg-surface/80 backdrop-blur-md z-40 px-sp-lg flex items-center justify-between border-b border-outline-variant/10">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-label-md focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="hover:bg-surface-container rounded-full p-2 transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
        </button>
        <button
          type="button"
          className="hover:bg-surface-container rounded-full p-2 transition-colors"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-on-surface-variant">settings</span>
        </button>
        <Avatar className="h-8 w-8 border border-outline-variant/20">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
          <AvatarFallback className="bg-primary-fixed text-primary text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
