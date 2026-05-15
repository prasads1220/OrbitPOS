'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ShieldCheck, Users, Zap, ArrowRight, BarChart3, Globe, Smartphone, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function LandingPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#ffffff] text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full pt-40 pb-24 overflow-hidden bg-[#f5f5f7]">
          <div className="container px-8 mx-auto text-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-black mb-8 leading-[1.05]">
                Modern Retail. <br />
                <span className="text-[#0071e3]">Effortlessly Simple.</span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-[#86868b] text-xl md:text-2xl mb-12 font-medium leading-relaxed">
                Experience the world&apos;s most intuitive Point of Sale system. <br className="hidden md:block" />
                Designed for speed, built for scale.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
                <Link href="/contact">
                  <Button size="lg" className="glossy-button bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full px-12 h-14 text-lg font-semibold shadow-lg shadow-blue-500/10">
                    Schedule a Demo
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="glossy-button rounded-full px-12 h-14 text-lg font-semibold hover:bg-gray-200/50">
                    Sign In to Store
                  </Button>
                </Link>
              </div>
            </div>

            {/* Premium Asset Preview */}
            <div className="relative mx-auto max-w-4xl animate-in fade-in zoom-in-95 duration-1000 delay-300">
              <div className="relative p-2 rounded-[2.5rem] bg-gradient-to-b from-white/80 to-white/20 backdrop-blur-xl border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] animate-float-subtle">
                <Image 
                  src="/images/hero-branded.png" 
                  alt="OrbitPOS Interface" 
                  width={1000} 
                  height={600} 
                  className="rounded-[2rem] shadow-sm w-full hover-glow transition-all"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="py-32 bg-white">
          <div className="container px-8 mx-auto">
            <div className="max-w-4xl mx-auto mb-32 text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-bold mb-10 tracking-tight">Everything about your <br /> business, at a glance.</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <p className="text-xl text-[#86868b] font-medium leading-relaxed">
                  OrbitPOS streamlines your entire operation from inventory management to automated payroll, so you can focus on what matters most—your customers.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    Real-time Inventory Sync
                  </div>
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    Multi-location Support
                  </div>
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    AI-powered Sales Analytics
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <FeatureCard 
                icon={ShoppingCart} 
                title="Swift Checkout" 
                description="Engineered for high-volume retail. Process transactions in seconds with smart barcode scanning."
              />
              <FeatureCard 
                icon={Zap} 
                title="Instant Insights" 
                description="Live data processing means you see sales, trends, and stock alerts the moment they happen."
              />
              <FeatureCard 
                icon={Smartphone} 
                title="Hardware Ready" 
                description="Works seamlessly with any USB or Bluetooth scanner, label printer, and payment terminal."
              />
            </div>
          </div>
        </section>

        {/* Product Showcase Marquee */}
        <section className="pb-32 overflow-hidden bg-white">
          <div className="container px-8 mx-auto mb-16 text-center">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Experience OrbitPOS</h2>
            <p className="text-xl text-[#86868b] font-medium">Designed for the world&apos;s most ambitious retail brands.</p>
          </div>
          <div className="flex animate-marquee gap-8 px-8">
            {[
              '/images/cafe-lifestyle.png',
              '/images/dashboard-analytics.png',
              '/images/hero-branded.png',
              '/images/cafe-lifestyle.png',
              '/images/dashboard-analytics.png',
              '/images/hero-branded.png',
            ].map((src, i) => (
              <div key={i} className="relative w-[500px] md:w-[700px] aspect-video shrink-0 rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] group">
                <Image 
                  src={src} 
                  alt={`OrbitPOS Screenshot ${i + 1}`}
                  fill
                  className="object-cover transition-all duration-700 scale-105 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-10">
                   <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <p className="text-white font-bold text-xl">Premium Interface</p>
                    <p className="text-white/80 text-sm">Engineered for speed and elegance.</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Apple-style Banner */}
        <section className="py-32 bg-[#000000] text-white">
          <div className="container px-8 mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Ready to elevate your store?</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">Join thousands of retailers who have simplified their checkout experience with OrbitPOS.</p>
            <Link href="/contact">
              <Button size="lg" className="glossy-button bg-white text-black hover:bg-gray-100 rounded-full px-12 h-14 text-lg font-bold">
                Contact our Sales Team
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: any) {
  return (
    <div className="group p-10 rounded-[2.5rem] bg-white transition-all duration-500 border border-gray-100 card-hover-effect relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Glossy Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </div>

      <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-10 shadow-sm group-hover:bg-[#0071e3] group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-500 relative z-10">
        <Icon className="h-8 w-8 text-[#1d1d1f] group-hover:text-white transition-all duration-500" />
      </div>
      <h3 className="text-2xl font-black mb-4 tracking-tight text-black relative z-10">{title}</h3>
      <p className="text-[#86868b] leading-relaxed font-medium text-lg relative z-10">{description}</p>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 h-1 bg-[#0071e3] transition-all duration-500 w-0 group-hover:w-full" />
    </div>
  );
}
