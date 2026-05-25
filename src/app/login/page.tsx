'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';
import { ParticleBackground } from '@/components/ui/particle-background';

const BACKGROUND_IMAGES = [
  '/images/bg_cafe.png',
  '/images/bg_boutique.png',
  '/images/bg_bakery.png',
  '/images/bg_florist.png',
  '/images/bg_market.png'
];

export default function LoginPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0a0604]">
      {/* Layer 1: Warm Cafe/Retail Background Slideshow with smooth 1.5s cross-fade and Ken Burns movement */}
      <div className="absolute inset-0 z-0 scale-[1.02] animate-kenburns pointer-events-none">
        {BACKGROUND_IMAGES.map((src, index) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{
              backgroundImage: `url('${src}')`,
              opacity: index === currentImageIndex ? 0.85 : 0
            }}
          />
        ))}
      </div>
      
      {/* Layer 2: Warm ambient gradient overlay to blend colors and ensure high text contrast */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0a0604]/55 via-[#140e0a]/40 to-[#0a0604]/75 pointer-events-none" />

      {/* Layer 3: Warm Ambient Backlight Aura (Sunlight Glow Halo) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Soft elegant warm ambient glow */}
        <div className="absolute w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-yellow-400/12 blur-3xl animate-aura-pulse" />
        
        {/* Core highlight halo surrounding the central card */}
        <div className="absolute w-[450px] h-[600px] rounded-[3rem] border border-white/5 shadow-[0_0_80px_rgba(245,158,11,0.08),0_0_40px_rgba(251,146,60,0.05)] pointer-events-none" />
      </div>

      {/* Layer 4: Floating warm-sunbeam-style canvas particles */}
      <ParticleBackground />

      {/* Layer 5: High-Fidelity Frosted Glass Card Container */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
        <div className="relative rounded-[2.5rem] bg-white/45 backdrop-blur-3xl border border-white/55 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.3),0_0_30px_rgba(255,255,255,0.45)] overflow-hidden transition-all duration-500 hover:shadow-[0_40px_90px_-20px_rgba(245,158,11,0.25),0_0_40px_rgba(255,255,255,0.65)] hover:-translate-y-2">
          {/* Subtle reflections and glass highlights */}
          <div className="absolute inset-0 rounded-[2.5rem] border-[3px] border-white/60 pointer-events-none" style={{ clipPath: 'inset(0 0 auto 0)' }} />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/55 to-transparent pointer-events-none" />
          
          <div className="p-10 relative z-20">
            <div className="mb-8 text-center">
              <div className="relative inline-block mb-10 group">
                {/* Warm backlight glow spot behind logo to pop details */}
                <div className="absolute inset-0 -m-4 bg-white/45 rounded-full filter blur-xl group-hover:bg-white/55 transition-colors duration-500 pointer-events-none" />
                <Image 
                  src="/logo.png" 
                  alt="OrbitPOS Logo" 
                  width={320} 
                  height={110} 
                  className="relative z-10 mx-auto transform group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]" 
                />
              </div>
              <p className="text-[12px] text-[#2c2c30] font-bold tracking-widest uppercase opacity-85">
                Sign in to your workspace
              </p>
            </div>
            
            <LoginForm variant="transparent" theme="light" />
          </div>
        </div>
      </div>
    </div>
  );
}
