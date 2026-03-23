// src/components/ResponsiveHeader.tsx
// Mobile-ready header with responsive navigation
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@/components/ui/drawer';
import { H3, Caption } from '@/components/ui/typography';

export interface ResponsiveHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  onSignOut?: () => void;
  showComponentsLink?: boolean;
}

export default function ResponsiveHeader({
  title,
  subtitle,
  userName,
  onSignOut,
  showComponentsLink = false,
}: ResponsiveHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isComponentsPage = location.pathname === '/components';
  const isHomePage = location.pathname === '/';

  return (
    <>
      {/* Desktop & Mobile Header */}
      <header className="sticky top-0 z-sticky bg-bg border-b border-outline shadow-sm">
        <div className="max-w-7xl mx-auto px-md lg:px-lg h-16 flex items-center justify-between">
          {/* Left: Title — clickable on inner pages to return home */}
          <div className="flex-1">
            {isHomePage ? (
              <H3 className="text-primary m-0 tracking-tight font-bold text-lg md:text-xl">
                {title}
              </H3>
            ) : (
              <button
                type="button"
                onClick={() => handleNavigation('/')}
                className="text-left group"
                aria-label="Back to Portal home"
              >
                <H3 className="text-primary m-0 tracking-tight font-bold text-lg md:text-xl group-hover:text-primary-700 transition-colors duration-normal">
                  {title}
                </H3>
              </button>
            )}
            {subtitle && (
              <Caption className="text-text-weak text-xs md:text-sm">{subtitle}</Caption>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-md">
            {/* Back to Portal link — shown on all inner pages (not home, not /components which has its own toggle) */}
            {!isHomePage && !isComponentsPage && (
              <button type="button"
                onClick={() => handleNavigation('/')}
                className="text-sm text-primary hover:text-primary-700 underline transition-colors duration-normal"
              >
                ← Portal
              </button>
            )}
            {showComponentsLink && (
              <button type="button"
                onClick={() => handleNavigation(isComponentsPage ? '/' : '/components')}
                className="text-sm text-primary hover:text-primary-700 underline transition-colors duration-normal"
              >
                {isComponentsPage ? '← Back to Portal' : 'Components →'}
              </button>
            )}
            {userName && (
              <span className="text-body-sm text-text-weak">{userName}</span>
            )}
            {onSignOut && (
              <Button
                variant="secondary"
                onClick={onSignOut}
                className="transition-all duration-normal hover:shadow-md"
              >
                Sign Out
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden ml-2 p-sm hover:bg-surface rounded-md transition-colors duration-normal"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <Drawer isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="left">
        <DrawerContent className="flex flex-col h-full bg-bg">
          <DrawerHeader>
            <H3 className="text-primary m-0 font-bold">{title}</H3>
            {subtitle && (
              <Caption className="text-text-weak">{subtitle}</Caption>
            )}
          </DrawerHeader>

          <DrawerBody className="flex-1 space-y-md">
            {/* Back to Portal — shown on inner pages in mobile drawer */}
            {!isHomePage && !isComponentsPage && (
              <button 
                type="button"
                onClick={() => handleNavigation('/')}
                className="w-full text-left px-md py-sm text-primary hover:bg-primary-50 rounded-md transition-colors duration-normal font-medium"
              >
                ← Back to Portal
              </button>
            )}
            {showComponentsLink && (
              <button 
                type="button"
                onClick={() => handleNavigation(isComponentsPage ? '/' : '/components')}
                className="w-full text-left px-md py-sm text-primary hover:bg-primary-50 rounded-md transition-colors duration-normal font-medium"
              >
                {isComponentsPage ? '← Back to Portal' : '→ Component Showcase'}
              </button>
            )}

            {userName && (
              <div className="px-md py-sm border-t border-outline pt-md">
                <Caption className="text-text-weak text-xs">Signed in as:</Caption>
                <p className="text-sm font-medium text-text mt-xs">{userName}</p>
              </div>
            )}
          </DrawerBody>

          {onSignOut && (
            <div className="border-t border-outline p-md space-y-sm">
              <Button
                variant="secondary"
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full transition-all duration-normal"
              >
                Sign Out
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
