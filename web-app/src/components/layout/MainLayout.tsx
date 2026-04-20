/**
 * MainLayout Component
 * Page wrapper combining Header + Sidebar + content area
 */

import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/utils';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useSettingsStore } from '@/stores';

export interface MainLayoutProps {
  /** Additional CSS classes */
  className?: string;
}

export function MainLayout({ className }: MainLayoutProps) {
  // Mobile sidebar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Desktop sidebar collapsed state
  const isCollapsed = useSettingsStore((state) => state.ui.sidebarCollapsed);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      {/* Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          // Account for sidebar width on desktop
          isCollapsed ? 'lg:ml-0' : 'lg:ml-0'
        )}
      >
        {/* Header */}
        <Header showMenuButton onMenuClick={openMobileMenu} />

        {/* Page Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Optional Footer could go here */}
      </div>
    </div>
  );
}

export default MainLayout;
