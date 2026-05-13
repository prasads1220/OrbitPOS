'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: 'Features', href: '/#features' },
    { name: 'Support', href: '/support' },
    { name: 'Sign In', href: '/login' },
  ];

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 transition-all duration-500",
      (scrolled || pathname !== '/' || isMobileMenuOpen) ? 'bg-white/90 backdrop-blur-xl border-b border-gray-100 py-3' : 'bg-transparent py-6'
    )}>
      <div className="container mx-auto px-8 flex items-center justify-between">
        <Link className="flex items-center gap-2 group" href="/">
          <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-black">
            OrbitPOS
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-12">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              className="text-[13px] font-medium text-black/60 hover:text-black transition-colors" 
              href={link.href}
            >
              {link.name}
            </Link>
          ))}
          <Link href="/contact">
            <Button className="bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full px-6 h-9 text-[13px] font-semibold transition-all">
              Contact Sales
            </Button>
          </Link>
        </nav>

        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden rounded-xl h-10 w-10"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 p-8 animate-in slide-in-from-top-4 duration-300">
          <nav className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                className="text-lg font-bold text-black hover:text-[#0071e3] transition-colors" 
                href={link.href}
              >
                {link.name}
              </Link>
            ))}
            <Link href="/contact" className="mt-4">
              <Button className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl h-14 text-lg font-bold transition-all">
                Contact Sales
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
