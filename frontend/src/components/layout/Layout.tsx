import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Play, 
  Image, 
  Database, 
  Box, 
  Settings,
  Layers,
  LineChart,
  Sparkles,
  GitGraph,
  ChevronLeft
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/demo', label: 'Demo', icon: Sparkles },
  { path: '/workflow', label: 'Workflow', icon: GitGraph },
  { path: '/training', label: 'Training', icon: Play },
  { path: '/detection', label: 'Detection', icon: Image },
  { path: '/evaluation', label: 'Evaluation', icon: LineChart },
  { path: '/datasets', label: 'Datasets', icon: Database },
  { path: '/models', label: 'Models', icon: Box },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isDemoPage = location.pathname === '/demo';
  const isWorkflowPage = location.pathname === '/workflow';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar - Hidden on demo and workflow pages */}
      {!isDemoPage && !isWorkflowPage && (
        <aside className="w-64 sidebar-clean flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                   style={{ background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))' }}>
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-xl" style={{ color: 'var(--text-primary)' }}>
                  Crack Net
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-clean ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-disabled)' }}>
              Version 1.0.0
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden ${isDemoPage || isWorkflowPage ? 'w-full' : ''}`}>
        {/* Header - Hidden on demo page only, shown on workflow with back button */}
        {!isDemoPage && (
          <header className="header-clean px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isWorkflowPage && (
                <Link 
                  to="/" 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-primary)'
                  }}
                >
                  <ChevronLeft size={18} />
                  <span className="text-sm font-medium">Back</span>
                </Link>
              )}
              <h2 className="font-serif text-2xl" style={{ color: 'var(--text-primary)' }}>
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </header>
        )}

        {/* Page Content - Full screen on demo and workflow pages */}
        <div 
          className={`flex-1 overflow-auto ${isDemoPage || isWorkflowPage ? 'p-0 h-screen w-full' : 'p-8'}`} 
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};
