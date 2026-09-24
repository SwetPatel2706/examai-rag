import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton loading primitives + screen-level layouts. These match the final
 * content dimensions closely so they reduce cumulative layout shift instead
 * of just blinking. They replace spinner fallbacks only on data-heavy screens;
 * LoadingState remains for short actions and app-wide session restoration.
 */

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse bg-surface-container-high rounded-lg', className)} />;
}

export function SkeletonText({ className }) {
  return <Skeleton className={cn('h-4', className)} />;
}

/** Screen-reader-announced wrapper for a screen skeleton. */
export function SkeletonScreen({ label, className, children }) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-sp-lg', className)}>
      {children}
    </div>
  );
}

export function SkeletonHeader({ titleWidth = 'w-72', subtitleWidth = 'w-96' }) {
  return (
    <div className="space-y-2">
      <Skeleton className={cn('h-8', titleWidth)} />
      <Skeleton className={cn('h-4', subtitleWidth)} />
    </div>
  );
}

export function SkeletonStatCards({ count = 3, className }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sp-md', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl ambient-shadow p-sp-md space-y-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <SkeletonText className="w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, cardClassName = 'h-56' }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('bg-white rounded-2xl ambient-shadow p-sp-md space-y-3', cardClassName)}>
          <Skeleton className="h-5 w-3/4" />
          <SkeletonText className="w-1/2" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Compact skeleton for the materials scope panel (Chat side panel and the
 * FlashcardDecks generate modal) while its subject-scoped materials load.
 */
export function SkeletonScopePanel() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading materials">
      <div className="flex items-center justify-between">
        <SkeletonText className="w-28" />
        <SkeletonText className="w-16" />
      </div>
      {[0, 1].map((group) => (
        <div key={group} className="space-y-2">
          <SkeletonText className="w-24" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              <SkeletonText className="w-32" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}


export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
      <div className="h-12 bg-surface-container-low/50 px-sp-md flex items-center gap-6 border-b border-surface-container-high">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-sp-md py-sp-md border-b border-surface-container-high/60">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <SkeletonText className="w-40" />
          <SkeletonText className="w-28" />
          <Skeleton className="w-16 h-5 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <SkeletonScreen label="Loading dashboard">
      <SkeletonHeader />
      <Skeleton className="h-40 rounded-3xl" />
      <div className="space-y-3">
        <SkeletonText className="w-32" />
        <SkeletonStatCards count={3} />
      </div>
      <div className="space-y-3">
        <SkeletonText className="w-40" />
        <SkeletonCardGrid count={3} cardClassName="h-56" />
      </div>
    </SkeletonScreen>
  );
}

export function TeacherDashboardSkeleton() {
  return (
    <SkeletonScreen label="Loading teacher dashboard">
      <SkeletonHeader titleWidth="w-80" subtitleWidth="w-64" />
      <SkeletonStatCards count={4} className="lg:grid-cols-4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        <div className="lg:col-span-2 space-y-3">
          <SkeletonText className="w-40" />
          <SkeletonTable rows={5} cols={4} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </SkeletonScreen>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex gap-0 h-[calc(100vh-96px)] -m-margin-desktop" role="status" aria-label="Loading chat">
      <aside className="flex-shrink-0 w-72 p-sp-md border-r border-outline-variant bg-white space-y-3" aria-hidden="true">
        <SkeletonText className="w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-outline-variant bg-white flex items-center gap-3 px-sp-md">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <SkeletonText className="w-48" />
        </div>
        <div className="flex-1 p-sp-md space-y-4">
          <Skeleton className="h-16 w-2/3 rounded-2xl" />
          <Skeleton className="h-24 w-1/2 rounded-2xl ml-auto" />
          <Skeleton className="h-16 w-3/5 rounded-2xl" />
        </div>
        <div className="p-sp-md bg-white border-t border-outline-variant">
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function SubjectOverviewSkeleton() {
  return (
    <SkeletonScreen label="Loading subject">
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-64" subtitleWidth="w-80" />
        <Skeleton className="h-12 w-48 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-2 w-72" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        <div className="lg:col-span-2 space-y-sp-xl">
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-40 rounded-full" />
            ))}
          </div>
          <div className="space-y-2">
            <SkeletonText className="w-32" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <SkeletonText className="w-20" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}

export function MaterialsSkeleton() {
  return (
    <SkeletonScreen label="Loading materials">
      <SkeletonHeader />
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <SkeletonTable rows={5} cols={5} />
    </SkeletonScreen>
  );
}

export function AnalyticsSkeleton() {
  return (
    <SkeletonScreen label="Loading analytics">
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-48" subtitleWidth="w-64" />
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>
      <SkeletonStatCards count={4} className="md:grid-cols-4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        <div className="lg:col-span-2 space-y-3">
          <SkeletonText className="w-56" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </SkeletonScreen>
  );
}

export function ProgressSkeleton() {
  return (
    <SkeletonScreen label="Loading student progress">
      <SkeletonHeader />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl ml-auto" />
      </div>
      <SkeletonTable rows={7} cols={5} />
    </SkeletonScreen>
  );
}

export function QuizCreateEditSkeleton() {
  return (
    <SkeletonScreen label="Loading quizzes">
      <div className="flex items-center justify-between">
        <SkeletonHeader titleWidth="w-40" subtitleWidth="w-72" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <SkeletonCardGrid count={3} cardClassName="h-48" />
    </SkeletonScreen>
  );
}
