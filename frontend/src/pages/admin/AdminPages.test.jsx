import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/toaster';
import { clear } from '@/lib/apiCache';
import useAuthStore from '@/store/authStore';
import AdminUsers from './Users';
import AdminSubjects from './Subjects';
import AdminMembership from './Membership';

const ADMIN = { id: 'a1', email: 'admin@examai.com', role: 'admin', name: 'Admin' };

function jsonResponse(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ success: true, data }) };
}

/** Stateful stub: backs the admin API with in-memory lists so mutations show up on reload. */
function stubAdminApi({ users, subjects }) {
  const handler = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    if (url.includes('/api/admin/users')) {
      if (method === 'GET' && url.endsWith('/subjects')) {
        const id = url.split('/').slice(-2, -1)[0];
        const mine = id === 't1' || id === 's1' ? subjects.filter((s) => s.id === 'sub1') : [];
        return jsonResponse(mine);
      }
      if (method === 'GET') {
        const params = new URL(url).searchParams;
        const role = params.get('role');
        const search = (params.get('search') || '').toLowerCase();
        const page = Math.max(1, parseInt(params.get('page') || '1', 10));
        const size = Math.max(1, parseInt(params.get('size') || '100', 10));
        const filtered = users.filter((u) => {
          if (role && u.role !== role) return false;
          if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search)) return false;
          return true;
        });
        const items = filtered.slice((page - 1) * size, page * size);
        return jsonResponse({
          items,
          total: filtered.length,
          page,
          pages: Math.max(1, Math.ceil(filtered.length / size)),
          size,
        });
      }
      if (method === 'POST') {
        const created = { id: `u-${users.length + 1}`, ...body };
        delete created.password;
        users.push(created);
        return jsonResponse(created, 201);
      }
      const id = url.split('/').pop();
      if (method === 'PATCH') {
        const target = users.find((u) => u.id === id);
        Object.assign(target, body);
        return jsonResponse(target);
      }
      if (method === 'DELETE') {
        const index = users.findIndex((u) => u.id === id);
        users.splice(index, 1);
        return jsonResponse({ message: 'User deleted' });
      }
    }
    if (url.includes('/api/admin/subjects')) {
      if (method === 'GET' && url.endsWith('/members')) {
        return jsonResponse({
          teachers: users.filter((u) => u.role === 'teacher'),
          students: users.filter((u) => u.role === 'student'),
        });
      }
      if (url.includes('/teachers') || url.includes('/students')) {
        return jsonResponse({ message: 'ok' });
      }
      if (method === 'GET') return jsonResponse(subjects);
      if (method === 'POST') {
        const created = { id: `s-${subjects.length + 1}`, name: body.name };
        subjects.push(created);
        return jsonResponse(created, 201);
      }
      const id = url.split('/').pop();
      if (method === 'PATCH') {
        const subject = subjects.find((s) => s.id === id);
        subject.name = body.name;
        return jsonResponse(subject);
      }
      if (method === 'DELETE') {
        subjects.splice(subjects.findIndex((s) => s.id === id), 1);
        return jsonResponse({ message: 'Subject deleted' });
      }
    }
    if (url.includes('/api/auth/me')) return jsonResponse(ADMIN);
    return jsonResponse(null);
  });
  vi.stubGlobal('fetch', handler);
  return handler;
}

function seedUsers() {
  return [
    { id: 't1', email: 'teacher1@examai.com', role: 'teacher', name: 'Dr. Alice Smith' },
    { id: 's1', email: 'student1@examai.com', role: 'student', name: 'Charlie Student' },
  ];
}

function seedSubjects() {
  return [{ id: 'sub1', name: 'Software Engineering' }];
}

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Toaster />
      <Page />
    </MemoryRouter>
  );
}

beforeEach(() => {
  clear();
  useAuthStore.setState({ user: ADMIN, role: 'admin', accessToken: 't' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AdminUsers', () => {
  it('renders user rows with role badges', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    renderPage(AdminUsers);

    expect(await screen.findByText('Dr. Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('teacher1@examai.com')).toBeInTheDocument();
    expect(screen.getByText('Charlie Student')).toBeInTheDocument();
  });

  it('searches and filters server-side with debounced input', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Dr. Alice Smith');

    await user.type(screen.getByLabelText('Search users'), 'charlie');
    // The header count only updates once the debounced server fetch lands,
    // so waiting on it avoids racing stale list data.
    await waitFor(() => expect(screen.getByText('1 total')).toBeInTheDocument());
    expect(screen.getByText('Charlie Student')).toBeInTheDocument();
    expect(screen.queryByText('Dr. Alice Smith')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search users'));
    await waitFor(() => expect(screen.getByText('2 total')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Teachers' }));
    await waitFor(() => expect(screen.getByText('1 total')).toBeInTheDocument());
    expect(screen.getByText('Dr. Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Student')).not.toBeInTheDocument();
  });

  it('paginates through the server-side user set', async () => {
    const users = [...seedUsers()];
    for (let i = users.length; i < 25; i++) {
      users.push({
        id: `x${i}`,
        email: `extra${i}@examai.com`,
        role: i % 2 ? 'student' : 'teacher',
        name: `Extra ${i}`,
      });
    }
    stubAdminApi({ users, subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminUsers);

    expect(await screen.findByText('Showing 20 of 25 users')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Showing 5 of 25 users')).toBeInTheDocument();
  });

  it('deletes a user after confirmation and reloads the list', async () => {
    const fetch = stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Charlie Student');

    await user.click(screen.getByRole('button', { name: 'Delete Charlie Student' }));

    await waitFor(() => expect(screen.queryByText('Charlie Student')).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/s1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('shows the error banner without an unhandled rejection when delete fails', async () => {
    const users = seedUsers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        if (url.includes('/api/admin/users') && (options.method || 'GET').toUpperCase() === 'DELETE') {
          return {
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: { code: 'DELETE_FAILED', message: 'Delete failed.', request_id: 'r1' },
            }),
          };
        }
        return jsonResponse({ items: users, total: users.length, page: 1, pages: 1, size: 100 });
      })
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Charlie Student');

    await user.click(screen.getByRole('button', { name: 'Delete Charlie Student' }));

    // Banner appears, the row stays, and no rejection escapes the click handler.
    expect(await screen.findByText('Delete failed.')).toBeInTheDocument();
    expect(screen.getByText('Charlie Student')).toBeInTheDocument();
  });

  it('expands a user row to show their subjects', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Dr. Alice Smith');

    await user.click(screen.getByRole('button', { name: 'Show subjects of Dr. Alice Smith' }));

    expect(await screen.findByLabelText('Subjects')).toBeInTheDocument();
  });

  it('edits a user name and role through the dialog with a toast', async () => {
    const fetch = stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Charlie Student');

    await user.click(screen.getByRole('button', { name: 'Edit Charlie Student' }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Charles Student');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'teacher');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Charles Student')).toBeInTheDocument();
    expect(await screen.findByText('User updated')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/s1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('creates a user through the dialog and closes it on success', async () => {
    const fetch = stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Dr. Alice Smith');

    // The header button's accessible name includes its icon ligature.
    await user.click(screen.getByRole('button', { name: /Add user/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Email'), 'newt@examai.com');
    await user.type(within(dialog).getByLabelText('Name'), 'New Teacher');
    await user.type(within(dialog).getByLabelText('Password'), 'Password123!');
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }));

    expect(await screen.findByText('New Teacher')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('AdminSubjects', () => {
  it('renders subjects and adds one through the dialog', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminSubjects);

    expect(await screen.findByText('Software Engineering')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add subject/ }));
    const createDialog = await screen.findByRole('dialog');
    await user.type(within(createDialog).getByLabelText('Subject name'), 'Linear Algebra');
    await user.click(within(createDialog).getByRole('button', { name: 'Add subject' }));

    expect(await screen.findByText('Linear Algebra')).toBeInTheDocument();
  });

  it('renames a subject through the dialog', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminSubjects);
    await screen.findByText('Software Engineering');

    await user.click(screen.getByRole('button', { name: 'Rename Software Engineering' }));
    const renameDialog = await screen.findByRole('dialog');
    const input = within(renameDialog).getByLabelText('Subject name');
    await user.clear(input);
    await user.type(input, 'Software Engineering II');
    await user.click(within(renameDialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Software Engineering II')).toBeInTheDocument();
  });

  it('expands a subject to show its teachers and students', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminSubjects);
    await screen.findByText('Software Engineering');

    await user.click(screen.getByText('Software Engineering'));

    expect(await screen.findByText('Teachers · 1')).toBeInTheDocument();
    expect(screen.getByText('Students · 1')).toBeInTheDocument();
  });
});

describe('AdminMembership', () => {
  it('assigns a teacher to a subject', async () => {
    const fetch = stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminMembership);

    await user.selectOptions(await screen.findByLabelText('Subject'), 'sub1');
    await screen.findByRole('option', { name: /Dr\. Alice Smith/ });
    await user.selectOptions(screen.getByLabelText('User'), 't1');
    await user.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/subjects/sub1/teachers'),
        expect.objectContaining({ method: 'POST' })
      )
    );
    expect(await screen.findByText('Teacher assigned')).toBeInTheDocument();
  });

  it('searches the membership user picker server-side', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminMembership);

    await user.selectOptions(await screen.findByLabelText('Subject'), 'sub1');
    await user.selectOptions(screen.getByLabelText('Kind'), 'student');
    await screen.findByRole('option', { name: /Charlie Student/ });

    await user.type(screen.getByLabelText('Find user'), 'alice');
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /Charlie Student/ })).not.toBeInTheDocument()
    );
  });

  it('disables both buttons while a membership request is pending', async () => {
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        if (url.includes('/teachers') && (options.method || 'GET').toUpperCase() === 'POST') {
          await pending;
          return jsonResponse({ message: 'Teacher assigned' });
        }
        if (url.includes('/api/admin/users')) {
          return jsonResponse({ items: seedUsers(), total: 2, page: 1, pages: 1, size: 100 });
        }
        if (url.includes('/api/admin/subjects')) {
          return jsonResponse(seedSubjects());
        }
        return jsonResponse(null);
      })
    );
    const user = userEvent.setup();
    renderPage(AdminMembership);
    await user.selectOptions(await screen.findByLabelText('Subject'), 'sub1');
    await user.selectOptions(screen.getByLabelText('User'), 't1');
    await user.click(screen.getByRole('button', { name: 'Assign' }));

    // Single flight: Assign shows progress and Remove is disabled too.
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();

    release();
    expect(await screen.findByText('Teacher assigned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign' })).toBeEnabled();
  });

  it('shows an error toast when membership update fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        if (url.includes('/teachers') && (options.method || 'GET').toUpperCase() === 'POST') {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              success: false,
              error: { code: 'BAD_REQUEST', message: 'User is not a teacher.', request_id: 'r2' },
            }),
          };
        }
        if (url.includes('/api/admin/users')) {
          return jsonResponse({ items: seedUsers(), total: 2, page: 1, pages: 1, size: 100 });
        }
        if (url.includes('/api/admin/subjects')) {
          return jsonResponse(seedSubjects());
        }
        return jsonResponse(null);
      })
    );
    const user = userEvent.setup();
    renderPage(AdminMembership);

    await user.selectOptions(await screen.findByLabelText('Subject'), 'sub1');
    await screen.findByRole('option', { name: /Dr\. Alice Smith/ });
    await user.selectOptions(screen.getByLabelText('User'), 't1');
    await user.click(screen.getByRole('button', { name: 'Assign' }));

    // Same temporary channel as success — no permanent banner.
    expect(await screen.findByText('User is not a teacher.')).toBeInTheDocument();
  });
});

describe('Admin sidebar', () => {
  it('shows the admin view label and one link per admin page', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    render(
      <MemoryRouter>
        <AppLayout role="admin">
          <div>content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(await screen.findByText('Admin View')).toBeInTheDocument();
    // Mobile drawer is aria-hidden in jsdom (matchMedia.stub matches: false),
    // so query it with hidden: true like the responsive Sidebar intends.
    const nav = screen.getByRole('navigation', { hidden: true });
    const links = within(nav).getAllByRole('link', { hidden: true });
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/admin/users',
      '/admin/subjects',
      '/admin/membership',
    ]);
  });
});
