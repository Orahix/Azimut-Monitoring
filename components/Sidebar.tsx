import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Activity,
  LayoutGrid,
  X,
  Calculator
} from 'lucide-react';
import { APP_NAME } from '../constants';

interface SidebarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ theme, toggleTheme, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 px-3 py-3 rounded-lg transition-colors font-medium text-sm mb-1
    ${isActive
      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
    }
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 lg:w-64 h-screen 
        bg-white dark:bg-slate-900 
        border-r border-slate-200 dark:border-slate-800 
        flex flex-col flex-shrink-0 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Azimut Logo" className="w-8 h-8" />
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {APP_NAME}
            </span>
          </div>

          {/* Close Button (Mobile Only) */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto py-2 scrollbar-hide">
          <NavLink
            to="/"
            className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2 hover:text-amber-600 transition-colors block w-full text-left"
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            Meni
          </NavLink>

          {user?.role?.toLowerCase() === 'admin' && (
            <NavLink to="/admin" className={linkClass} onClick={() => window.innerWidth < 1024 && onClose()}>
              <LayoutGrid size={20} />
              <span>Projekti</span>
            </NavLink>
          )}

          {/* If user is assigned to projects, link to the first one as "Dashboard" */}
          {user?.assignedProjectIds && user.assignedProjectIds.length > 0 && (
            <NavLink to={`/plant/${user.assignedProjectIds[0]}`} className={linkClass} onClick={() => window.innerWidth < 1024 && onClose()}>
              <LayoutDashboard size={20} />
              <span>Nadzor Elektrane</span>
            </NavLink>
          )}

        </nav>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Svetla Tema' : 'Tamna Tema'}</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 shadow-sm">
              {user?.username.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role.toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors p-2"
              title="Odjavi se"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};