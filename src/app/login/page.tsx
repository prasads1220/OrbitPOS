import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';
import { ParticleBackground } from '@/components/ui/particle-background';

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#030308]">
      {/* Layer 1: Background Image with slow Ken Burns movement */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-80 scale-[1.02] animate-kenburns pointer-events-none" 
        style={{ backgroundImage: "url('/orbit_bg_premium.png')" }}
      />
      
      {/* Layer 2: Deep space gradient overlay to balance brightness and ensure high text contrast */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#030308]/65 via-[#05060f]/45 to-[#030308]/75 pointer-events-none" />

      {/* Layer 3: Interactive Holographic Orbital Rings */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Ambient shifting cosmic glow */}
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/15 via-[#8A2BE2]/10 to-pink-500/10 blur-3xl animate-aura-pulse" />

        {/* Outer Orbit Ring */}
        <div className="absolute w-[780px] h-[780px] border border-cyan-500/15 rounded-full animate-spin-slow flex items-center justify-center">
          {/* Glowing planetary nodes orbiting on the path */}
          <div className="absolute top-0 w-4 h-4 rounded-full bg-cyan-400/40 blur-[1px] shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
          <div className="absolute bottom-0 w-3 h-3 rounded-full bg-cyan-400/30 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          <div className="absolute left-[20%] top-[20%] w-2 h-2 rounded-full bg-indigo-400/35 shadow-[0_0_5px_rgba(129,140,248,0.4)]" />
        </div>

        {/* Inner Orbit Ring (Rotating in reverse for multi-axis depth) */}
        <div className="absolute w-[540px] h-[540px] border border-dashed border-[#8A2BE2]/20 rounded-full animate-spin-slow-reverse flex items-center justify-center">
          {/* Holographic detail nodes */}
          <div className="absolute right-0 w-5 h-5 rounded-full bg-purple-400/30 blur-[2px] shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
          <div className="absolute left-0 w-3.5 h-3.5 rounded-full bg-pink-400/45 shadow-[0_0_10px_rgba(236,72,153,0.6)]" />
          <div className="w-[500px] h-[500px] border border-dotted border-white/10 rounded-full" />
        </div>

        {/* Halo outline enclosing the central login card */}
        <div className="absolute w-[450px] h-[600px] rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(6,182,212,0.1),0_0_40px_rgba(138,43,226,0.08)] pointer-events-none" />
      </div>

      {/* Layer 4: Canvas Stardust Particles */}
      <ParticleBackground />

      {/* Layer 5: High-Fidelity Frosted Glass Card Container */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
        <div className="relative rounded-[2.5rem] bg-white/45 backdrop-blur-3xl border border-white/55 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.35),0_0_30px_rgba(255,255,255,0.4)] overflow-hidden transition-all duration-500 hover:shadow-[0_40px_90px_-20px_rgba(0,113,227,0.45),0_0_40px_rgba(255,255,255,0.6)] hover:-translate-y-2">
          {/* Subtle reflections and glass highlights */}
          <div className="absolute inset-0 rounded-[2.5rem] border-[3px] border-white/60 pointer-events-none" style={{ clipPath: 'inset(0 0 auto 0)' }} />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/55 to-transparent pointer-events-none" />
          
          <div className="p-10 relative z-20">
            <div className="mb-8 text-center">
              <div className="relative inline-block mb-10 group">
                {/* Backlight glow spot behind logo to pop details */}
                <div className="absolute inset-0 -m-4 bg-white/40 rounded-full filter blur-xl group-hover:bg-white/50 transition-colors duration-500 pointer-events-none" />
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
