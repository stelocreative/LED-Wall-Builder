import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { 
  Monitor, 
  Package, 
  Clapperboard, 
  Home,
  Menu,
  X
} from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Shows', icon: Clapperboard, page: 'Shows' },
    { name: 'Cabinet Library', icon: Package, page: 'CabinetLibrary' },
  ];

  const isDesignerPage = currentPageName === 'WallDesigner';

  if (isDesignerPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-white">LED Wall Designer</h1>
                <p className="text-xs text-slate-400">Deployment Planner</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)}>
                  <Button 
                    variant={currentPageName === item.page ? 'secondary' : 'ghost'}
                    className={`gap-2 ${currentPageName === item.page ? 'text-slate-900' : 'text-slate-200 hover:text-white'}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 py-2 px-4">
            {navItems.map(item => (
              <Link 
                key={item.page} 
                to={createPageUrl(item.page)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button 
                  variant={currentPageName === item.page ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-2 mb-1 ${currentPageName === item.page ? 'text-slate-900' : 'text-slate-200 hover:text-white'}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
