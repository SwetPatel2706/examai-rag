import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import TopAppBar from '@/components/layout/TopAppBar';
import { PageHeader } from '@/components/ui/page-header';
import { FilterChipGroup, TeacherFilterCheckbox } from '@/components/ui/filter-chips';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Pagination } from '@/components/ui/pagination';
import { SectionHeader } from '@/components/ui/shared';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { RecentlyAccessedCard } from '@/components/materials/RecentlyAccessedCard';
import { MaterialsTable } from '@/components/materials/MaterialsTable';
import { useApi } from '@/lib/useApi';
import { getStudentMaterials, getStudentSubjects, getStudentStats } from '@/api/analytics';
import { getMaterialDownloadUrl } from '@/api/materials';

const PAGE_SIZE = 5;

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function StudentMaterials() {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);

  const subjectsApi = useApi(getStudentSubjects, []);
  const statsApi = useApi(getStudentStats, []);
  const materialsApi = useApi(
    () =>
      getStudentMaterials({
        subjectId: courseFilter === 'All' ? undefined : courseFilter,
        search: search.trim() || undefined,
        size: 100,
      }),
    [courseFilter, search]
  );

  const subjects = subjectsApi.data || [];
  const courseFilters = useMemo(
    () => ['All', ...subjects.map((s) => s.subjectId)],
    [subjects]
  );
  const subjectNameById = useMemo(
    () => new Map(subjects.map((s) => [s.subjectId, s.name])),
    [subjects]
  );

  const teachers = useMemo(() => {
    const seen = new Map();
    for (const s of subjects) {
      for (const t of s.teachers || []) {
        if (!seen.has(t.id)) seen.set(t.id, { id: t.id, name: t.name });
      }
    }
    return [...seen.values()];
  }, [subjects]);

  const recentMaterials = statsApi.data?.recentMaterials || [];

  // Teacher filter + pagination are applied client-side: the API accepts a
  // single teacher_id, so multi-teacher selection can't be expressed server-side.
  const filteredMaterials = useMemo(() => {
    const all = materialsApi.data?.items || [];
    if (selectedTeachers.size === 0) return all;
    return all.filter((mat) => selectedTeachers.has(mat.teacherId));
  }, [materialsApi.data, selectedTeachers]);

  const totalCount = filteredMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedMaterials = filteredMaterials.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tableMaterials = paginatedMaterials.map((mat) => ({
    id: mat.id,
    name: mat.name,
    course: subjectNameById.get(mat.subjectId) || 'Unknown',
    dateAdded: formatDate(mat.uploadedAt),
    size: '—',
    owner: mat.teacherName || 'Unknown',
    ownerId: mat.teacherId,
    type: mat.fileType,
  }));

  function toggleTeacher(teacherId, checked) {
    setSelectedTeachers((prev) => {
      const next = new Set(prev);
      if (checked) next.add(teacherId);
      else next.delete(teacherId);
      return next;
    });
    setPage(1);
  }

  function handleCourseChange(course) {
    setCourseFilter(course);
    setPage(1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  async function handleDownload(material) {
    try {
      const { url } = await getMaterialDownloadUrl(material.id);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      // surface inline by falling back to a no-op; the row stays interactive
      alert(`Could not download: ${err.message}`);
    }
  }

  if (subjectsApi.loading || materialsApi.loading) {
    return (
      <AppLayout role="student">
        <LoadingState label="Loading resources…" />
      </AppLayout>
    );
  }

  const pageError = subjectsApi.error || materialsApi.error;
  if (pageError) {
    return (
      <AppLayout role="student">
        <ErrorState
          message={pageError.message}
          onRetry={() => (subjectsApi.error ? subjectsApi.reload() : materialsApi.reload())}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout role="student">
      <TopAppBar
        searchPlaceholder="Search resources..."
        searchValue={search}
        onSearchChange={handleSearchChange}
      />

      <div className="-m-margin-desktop mt-0 pt-20 px-sp-lg pb-sp-xl">
        <PageHeader
          title="Resources"
          description="Materials approved by your teachers, grouped by course."
        />

        {/* Browse by Course */}
        <section className="mb-sp-md">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sp-sm">
            Browse by Course
          </h3>
          <FilterChipGroup
            options={courseFilters}
            value={courseFilter}
            onChange={handleCourseChange}
            labelById={(id) => (id === 'All' ? 'All' : subjectNameById.get(id) || id)}
          />
        </section>

        {/* Filter by Teacher */}
        {teachers.length > 0 && (
          <section className="mb-sp-md">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sp-sm">
              Filter by Teacher
            </h3>
            <div className="flex flex-wrap gap-2">
              {teachers.map((teacher) => (
                <TeacherFilterCheckbox
                  key={teacher.id}
                  name={teacher.name}
                  checked={selectedTeachers.has(teacher.id)}
                  onChange={(checked) => toggleTeacher(teacher.id, checked)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recently Accessed */}
        {recentMaterials.length > 0 && (
          <section className="mb-sp-lg">
            <SectionHeader title="Recently Added" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-sp-sm">
              {recentMaterials.map((item) => (
                <RecentlyAccessedCard
                  key={item.id}
                  name={item.name}
                  accessedAt={formatDate(item.uploadedAt)}
                  type={item.fileType}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Materials */}
        <section>
          <div className="flex items-center justify-between mb-sp-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface">All Materials</h3>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {totalCount === 0 ? (
            <EmptyState
              icon="folder_off"
              title="No materials found"
              description="Try a different course, teacher, or search term."
            />
          ) : view === 'list' ? (
            <MaterialsTable
              materials={tableMaterials}
              onDownload={handleDownload}
              pagination={{
                currentPage: safePage,
                totalPages,
                onPageChange: setPage,
                summary: `Showing ${paginatedMaterials.length} of ${totalCount} materials`,
              }}
            />
          ) : (
            <div className="bg-white rounded-xl ambient-shadow border border-outline-variant/10 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sp-sm p-sp-md">
                {tableMaterials.map((mat) => (
                  <RecentlyAccessedCard
                    key={mat.id}
                    name={mat.name}
                    accessedAt={`${mat.course} · ${mat.owner}`}
                    type={mat.type}
                  />
                ))}
              </div>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                summary={`Showing ${paginatedMaterials.length} of ${totalCount} materials`}
              />
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
