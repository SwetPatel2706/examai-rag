import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import TopAppBar from '@/components/layout/TopAppBar';
import { PageHeader } from '@/components/ui/page-header';
import { FilterChipGroup, TeacherFilterCheckbox } from '@/components/ui/filter-chips';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Pagination } from '@/components/ui/pagination';
import { SectionHeader } from '@/components/ui/shared';
import { RecentlyAccessedCard } from '@/components/materials/RecentlyAccessedCard';
import { MaterialsTable } from '@/components/materials/MaterialsTable';

// --- Mock data (replace with GET /students/me/materials when backend is ready) ---
const COURSE_FILTERS = ['All', 'Data Structures', 'Algorithms', 'Comp. Arch', 'OS Fundamentals'];

const TEACHERS = [
  { id: 't1', name: 'Prof. Sarah Jenkins' },
  { id: 't2', name: 'Dr. Michael Chen' },
  { id: 't3', name: 'Prof. Robert Miller' },
];

const RECENTLY_ACCESSED = [
  { id: 'r1', name: 'Lecture 04: Heaps', accessedAt: '2h ago', type: 'PDF' },
  { id: 'r2', name: 'DS Syllabus', accessedAt: 'Yesterday', type: 'DOCX' },
  { id: 'r3', name: 'Algo Intro.pptx', accessedAt: '3d ago', type: 'PPTX' },
  { id: 'r4', name: 'Exam Review', accessedAt: '1w ago', type: 'PDF' },
];

const ALL_MATERIALS = [
  {
    id: 'm1',
    name: 'Weekly Lab 03 - Linked Lists.pdf',
    course: 'Data Structures',
    dateAdded: 'Oct 24, 2023',
    size: '2.4 MB',
    owner: 'Prof. Sarah Jenkins',
    ownerId: 't1',
    type: 'PDF',
  },
  {
    id: 'm2',
    name: 'Greedy Algorithms Notes.docx',
    course: 'Algorithms',
    dateAdded: 'Oct 22, 2023',
    size: '1.1 MB',
    owner: 'Marcus',
    ownerId: 't2',
    type: 'DOCX',
    ownerAvatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAFSKM5KXNj-4VevgZ2dSICILpfqtJONuH7MaeZ-o-m3zRIZjcunjT78pmQgaDnQ3bJagRasnq2u5vuuSBwoMGB5JDjHEdjhYQmxs63wSpxxSjyN2Z7A4WEP6FrZna6cDbAHabGBrCwqzQnCnIu0IBZq86uKaEhapv10PIXbyhUes_A_35F-EaS4Ot583NvXfPYzPX85ERhbls7dd9XyPg3XZdhVDFP6hlOrv6_3sef8q5gdj8VCdylDaEWdNurXo-QR_7F967rP-c',
  },
  {
    id: 'm3',
    name: 'Algorithms Intro.pptx',
    course: 'Algorithms',
    dateAdded: 'Oct 15, 2023',
    size: '5.6 MB',
    owner: 'Dr. Michael Chen',
    ownerId: 't2',
    type: 'PPTX',
  },
  {
    id: 'm4',
    name: 'Lab Resources Archive',
    course: 'OS Fundamentals',
    dateAdded: 'Sep 30, 2023',
    size: '42 MB',
    owner: 'Prof. Robert Miller',
    ownerId: 't3',
    type: 'FOLDER',
  },
  {
    id: 'm5',
    name: 'Grades-Calculation.xlsx',
    course: 'General',
    dateAdded: 'Sep 28, 2023',
    size: '85 KB',
    owner: 'Prof. Sarah Jenkins',
    ownerId: 't1',
    type: 'XLSX',
  },
  {
    id: 'm6',
    name: 'Binary Trees — Lecture Notes.pdf',
    course: 'Data Structures',
    dateAdded: 'Oct 20, 2023',
    size: '3.1 MB',
    owner: 'Prof. Sarah Jenkins',
    ownerId: 't1',
    type: 'PDF',
  },
  {
    id: 'm7',
    name: 'Dynamic Programming Worksheet.pdf',
    course: 'Algorithms',
    dateAdded: 'Oct 18, 2023',
    size: '890 KB',
    owner: 'Dr. Michael Chen',
    ownerId: 't2',
    type: 'PDF',
  },
  {
    id: 'm8',
    name: 'CPU Pipelining Slides.pptx',
    course: 'Comp. Arch',
    dateAdded: 'Oct 10, 2023',
    size: '4.2 MB',
    owner: 'Prof. Robert Miller',
    ownerId: 't3',
    type: 'PPTX',
  },
  {
    id: 'm9',
    name: 'Process Scheduling.pdf',
    course: 'OS Fundamentals',
    dateAdded: 'Oct 8, 2023',
    size: '1.8 MB',
    owner: 'Prof. Robert Miller',
    ownerId: 't3',
    type: 'PDF',
  },
  {
    id: 'm10',
    name: 'Memory Hierarchy Notes.docx',
    course: 'Comp. Arch',
    dateAdded: 'Oct 5, 2023',
    size: '720 KB',
    owner: 'Prof. Robert Miller',
    ownerId: 't3',
    type: 'DOCX',
  },
];

const PAGE_SIZE = 5;
const TOTAL_MATERIALS = 24;

export default function StudentMaterials() {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ALL_MATERIALS.filter((mat) => {
      const matchesCourse = courseFilter === 'All' || mat.course === courseFilter;
      const matchesTeacher =
        selectedTeachers.size === 0 || selectedTeachers.has(mat.ownerId);
      const matchesSearch =
        !query ||
        mat.name.toLowerCase().includes(query) ||
        mat.course.toLowerCase().includes(query) ||
        mat.owner.toLowerCase().includes(query);
      return matchesCourse && matchesTeacher && matchesSearch;
    });
  }, [search, courseFilter, selectedTeachers]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedMaterials = filteredMaterials.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

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

  const showingCount = paginatedMaterials.length;
  const totalCount = search || courseFilter !== 'All' || selectedTeachers.size > 0
    ? filteredMaterials.length
    : TOTAL_MATERIALS;

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
          description="Manage your academic assets and course documentation."
        />

        {/* Browse by Course */}
        <section className="mb-sp-md">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sp-sm">
            Browse by Course
          </h3>
          <FilterChipGroup
            options={COURSE_FILTERS}
            value={courseFilter}
            onChange={handleCourseChange}
          />
        </section>

        {/* Filter by Teacher */}
        <section className="mb-sp-md">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sp-sm">
            Filter by Teacher
          </h3>
          <div className="flex flex-wrap gap-2">
            {TEACHERS.map((teacher) => (
              <TeacherFilterCheckbox
                key={teacher.id}
                name={teacher.name}
                checked={selectedTeachers.has(teacher.id)}
                onChange={(checked) => toggleTeacher(teacher.id, checked)}
              />
            ))}
          </div>
        </section>

        {/* Recently Accessed */}
        <section className="mb-sp-lg">
          <SectionHeader
            title="Recently Accessed"
            action={
              <button type="button" className="text-primary font-label-md text-label-md hover:underline">
                View History
              </button>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-sp-sm">
            {RECENTLY_ACCESSED.map((item) => (
              <RecentlyAccessedCard key={item.id} {...item} />
            ))}
          </div>
        </section>

        {/* All Materials */}
        <section>
          <div className="flex items-center justify-between mb-sp-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface">All Materials</h3>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {view === 'list' ? (
            <MaterialsTable
              materials={paginatedMaterials}
              pagination={{
                currentPage: safePage,
                totalPages,
                onPageChange: setPage,
                summary: `Showing ${showingCount} of ${totalCount} materials`,
              }}
            />
          ) : (
            <div className="bg-white rounded-xl ambient-shadow border border-outline-variant/10 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sp-sm p-sp-md">
                {paginatedMaterials.map((mat) => (
                  <RecentlyAccessedCard
                    key={mat.id}
                    name={mat.name}
                    accessedAt={`${mat.course} · ${mat.size}`}
                    type={mat.type}
                  />
                ))}
              </div>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                summary={`Showing ${showingCount} of ${totalCount} materials`}
              />
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
