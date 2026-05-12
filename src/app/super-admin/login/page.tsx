import { SuperAdminLoginForm } from '@/components/auth/super-admin-login-form';

export default function SuperAdminLoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black font-sans">
      {/* Dynamic Animated Dark Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#0071e3]/40 to-[#00c6ff]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-[#8a2be2]/30 to-[#4a00e0]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite_1s]" />
        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-gradient-to-bl from-[#ff007f]/20 to-[#7f00ff]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_14s_ease-in-out_infinite_2s]" />

      </div>

      {/* Glossy Glass Card Container */}
      <div className="relative z-10 w-full max-w-[460px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
        <div className="relative rounded-[2.5rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,113,227,0.15)] overflow-hidden">
          {/* Inner Gloss Highlights */}
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/20 pointer-events-none" style={{ clipPath: 'inset(0 0 auto 0)' }} />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          
          <div className="p-10 relative z-20">
            <SuperAdminLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
