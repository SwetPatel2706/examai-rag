import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
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
      if (method === 'GET') {
        return jsonResponse({ items: users, total: users.length, page: 1, pages: 1, size: 100 });
      }
      if (method === 'POST') {
        const created = { id: `u-${users.length + 1}`, ...body };
        delete created.password;
        users.push(created);
        return jsonResponse(created, 201);
      }
      const id = url.split('/').pop();
      if (method === 'DELETE') {
        const index = users.findIndex((u) => u.id === id);
        users.splice(index, 1);
        return jsonResponse({ message: 'User deleted' });
      }
    }
    if (url.includes('/api/admin/subjects')) {
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
      <Page />
    </MemoryRouter>
  );
}

beforeEach(() => {
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

  it('filters by search text and role pills', async () => {
    stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminUsers);
    await screen.findByText('Dr. Alice Smith');

    await user.type(screen.getByLabelText('Search users'), 'charlie');
    expect(screen.queryByText('Dr. Alice Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Charlie Student')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search users'));
    await user.click(screen.getByRole('button', { name: 'Teachers' }));
    expect(screen.getByText('Dr. Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Student')).not.toBeInTheDocument();
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
});

describe('AdminMembership', () => {
  it('assigns a teacher to a subject', async () => {
    const fetch = stubAdminApi({ users: seedUsers(), subjects: seedSubjects() });
    const user = userEvent.setup();
    renderPage(AdminMembership);

    await user.selectOptions(await screen.findByLabelText('Subject'), 'sub1');
    await user.selectOptions(screen.getByLabelText('User'), 't1');
    await user.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/subjects/sub1/teachers'),
        expect.objectContaining({ method: 'POST' })
      )
    );
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
