import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Avatar } from './Avatar.jsx';
import { Logo } from './Logo.jsx';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="app-header">
        <Logo />
        <nav className="header-nav">
          <NavLink to="/workspaces">Workspaces</NavLink>
        </nav>
        <div className="header-user">
          <Avatar name={user.fullName} small />
          <span className="user-name">{user.fullName}</span>
          <button type="button" className="btn btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
