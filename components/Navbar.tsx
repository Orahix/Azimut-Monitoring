import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, LogOut, Sun, Settings, LayoutGrid } from 'lucide-react';
import { APP_NAME } from '../constants';

export const Navbar: React.FC<{ theme: string, toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center shrink-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-amber-500/20 shadow-lg">
          <Activity className="text-white w-5 h-5" />
        </div>
        <Link to={user?.role === 'ADMIN' ? '/admin' : '/'} className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:block">
          {APP_NAME}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-4">
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors">
                <LayoutGrid size={18} />
                <span className="hidden md:inline">Projekti</span>
              </Link>
            )}
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.username}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                {user.username.charAt(0)}
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Odjavi se"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};