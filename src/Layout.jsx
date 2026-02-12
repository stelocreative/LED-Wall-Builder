import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import { 
  Monitor, 
  Package, 
  Clapperboard, 
  Home,
  Menu,
  X
} from 'lucide-react';

const resolveBrandLogoUrl = (appPublicSettings) => {
  const settings = appPublicSettings?.public_settings ?? appPublicSettings ?? {};
  const candidates = [
    settings?.branding?.logoUrl,
    settings?.branding?.logo_url,
    settings?.logoUrl,
    settings?.logo_url,
    settings?.brandLogoUrl,
    settings?.brand_logo_url,
    settings?.company?.logoUrl,
    settings?.company?.logo_url
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || null;
};

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [logoIndex, setLogoIndex] = React.useState(0);
  const { appPublicSettings } = useAuth();

  const runtimeLogoUrl = React.useMemo(() => resolveBrandLogoUrl(appPublicSettings), [appPublicSettings]);
  const logoCandidates = React.useMemo(() => {
    const unique = [];
    for (const candidate of [runtimeLogoUrl, '/starsound-logo.svg']) {
      if (candidate && !unique.includes(candidate)) {
        unique.push(candidate);
      }
    }
    return unique;
  }, [runtimeLogoUrl]);

  React.useEffect(() => {
    setLogoIndex(0);
  }, [runtimeLogoUrl]);

  const activeLogoSrc = logoCandidates[logoIndex] || null;

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
              <div className="h-10 w-10 rounded-lg border border-slate-600 bg-slate-700/60 flex items-center justify-center overflow-hidden">
                {activeLogoSrc ? (
                  <img
                    src={activeLogoSrc}
                    alt="Starsound logo"
                    className="h-full w-full object-cover"
                    onError={() => {
                      setLogoIndex((prev) => (prev + 1 < logoCandidates.length ? prev + 1 : logoCandidates.length));
                    }}
                  />
                ) : (
                  <Monitor className="w-6 h-6 text-blue-300" />
                )}
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-white">LED Wall Designer</h1>
                <p className="text-xs text-slate-300">By Starsound</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)}>
                  <Button 
                    variant={currentPageName === item.page ? 'secondary' : 'ghost'}
                    className={`gap-2 ${currentPageName === item.page ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'text-slate-200 hover:bg-slate-700 hover:text-white'}`}
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
                  className={`w-full justify-start gap-2 mb-1 ${currentPageName === item.page ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'text-slate-200 hover:bg-slate-700 hover:text-white'}`}
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
