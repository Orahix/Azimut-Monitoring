import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { PlantDashboard } from './pages/PlantDashboard';
import { Menu, Activity, Calculator } from 'lucide-react';
import { APP_NAME } from './constants';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

const AdminRoute: React.FC = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/" />;
};

const Layout: React.FC<{ theme: string, toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">

      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Azimut Logo" className="w-8 h-8" />
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {APP_NAME}
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      <Sidebar
        theme={theme as 'light' | 'dark'}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto min-w-0 relative w-full">
        <Outlet />
      </main>
    </div>
  );
};

const AppRoutes: React.FC<{ theme: string, toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const { user, isAuthenticated } = useAuth();

  // Helper to redirect root based on role
  const HomeRedirect = () => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role === 'admin') return <Navigate to="/admin" />;
    // If client, find their first project
    if (user?.assignedProjectIds && user.assignedProjectIds.length > 0) {
      return <Navigate to={`/plant/${user.assignedProjectIds[0]}`} />;
    }
    return <div className="p-10 text-center">Nema dodeljenih projekata za ovaj nalog.</div>;
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Layout theme={theme} toggleTheme={toggleTheme} />}>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/plant/:id" element={<PlantDashboard theme={theme as 'light' | 'dark'} />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Check for critical configuration
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setConfigError("Missing Supabase Configuration. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Environment Variables.");
    }

    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(curr => curr === 'dark' ? 'light' : 'dark');
  };

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 max-w-lg">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="mb-6 text-slate-300">{configError}</p>
          <div className="text-left bg-slate-800 p-4 rounded text-sm font-mono overflow-auto">
            <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
            <p>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <AppRoutes theme={theme} toggleTheme={toggleTheme} />
      </AuthProvider>
    </Router>
  );
};

export default App;