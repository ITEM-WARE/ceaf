import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Users, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../hooks/useAuth';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const location = useLocation();
  const { role, logout } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: Home, roles: ['admin', 'read'] },
    { name: 'Create Profile', path: '/create', icon: PlusCircle, roles: ['admin'] },
    { name: 'View Profiles', path: '/profiles', icon: Users, roles: ['admin', 'read'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['admin'] },
  ].filter(item => item.roles.includes(role as string));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="bg-emerald-600 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center font-bold text-xl tracking-tight">
                CEAF Donations
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-white text-white'
                        : 'border-transparent text-emerald-100 hover:border-emerald-300 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-emerald-100 hover:border-emerald-300 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10 pb-safe">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors',
                  isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-500'
                )}
              >
                <Icon className="w-6 h-6 mb-1" />
                {item.name}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex flex-col items-center py-3 px-2 text-xs font-medium text-slate-500 hover:text-emerald-500 transition-colors"
          >
            <LogOut className="w-6 h-6 mb-1" />
            Logout
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16 sm:mb-0">
        <Outlet />
      </main>

      <footer className="bg-slate-800 text-slate-300 py-8 mt-auto hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            CEAF Donations - Applicant Ranking System
          </p>
          <p className="text-sm mt-2">
            Contact: <a href="mailto:Farmforneedy@gmail.com" className="text-emerald-400 hover:text-emerald-300">Farmforneedy@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
