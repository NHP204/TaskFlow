import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/authContext.js';
import LoginPage from './LoginPage.jsx';

function renderLogin(login) {
  render(
    <AuthContext.Provider value={{ login, status: 'anonymous' }}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/workspaces" element={<p>Workspaces page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('LoginPage', () => {
  it('logs in and redirects to workspaces', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1 });
    renderLogin(login);

    await userEvent.type(screen.getByLabelText('Email'), 'owner@taskflow.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(login).toHaveBeenCalledWith({ email: 'owner@taskflow.dev', password: 'password123' });
    expect(await screen.findByText('Workspaces page')).toBeInTheDocument();
  });

  it('shows the API error when credentials are wrong', async () => {
    const login = vi.fn().mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid email or password' } },
    });
    renderLogin(login);

    await userEvent.type(screen.getByLabelText('Email'), 'owner@taskflow.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});
