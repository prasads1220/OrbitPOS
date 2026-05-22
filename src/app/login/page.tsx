import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#f0f0f5]">
      {/* Dynamic Animated Background - Google Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
        {/* Blue Bubbles */}
        <div className="absolute left-[10%] w-32 h-32 bg-[#4285F4] rounded-full mix-blend-multiply blur-xl animate-float-bubble [animation-delay:0s] [animation-duration:12s]" />
        <div className="absolute left-[80%] w-20 h-20 bg-[#4285F4] rounded-full mix-blend-multiply blur-lg animate-float-bubble [animation-delay:4s] [animation-duration:15s]" />
        
        {/* Red Bubbles */}
        <div className="absolute left-[30%] w-24 h-24 bg-[#EA4335] rounded-full mix-blend-multiply blur-lg animate-float-bubble [animation-delay:2s] [animation-duration:14s]" />
        <div className="absolute left-[70%] w-36 h-36 bg-[#EA4335] rounded-full mix-blend-multiply blur-xl animate-float-bubble [animation-delay:7s] [animation-duration:18s]" />
        
        {/* Yellow Bubbles */}
        <div className="absolute left-[50%] w-28 h-28 bg-[#FBBC05] rounded-full mix-blend-multiply blur-xl animate-float-bubble [animation-delay:1s] [animation-duration:13s]" />
        <div className="absolute left-[20%] w-16 h-16 bg-[#FBBC05] rounded-full mix-blend-multiply blur-lg animate-float-bubble [animation-delay:6s] [animation-duration:16s]" />

        {/* Green Bubbles */}
        <div className="absolute left-[60%] w-32 h-32 bg-[#34A853] rounded-full mix-blend-multiply blur-xl animate-float-bubble [animation-delay:3s] [animation-duration:17s]" />
        <div className="absolute left-[40%] w-20 h-20 bg-[#34A853] rounded-full mix-blend-multiply blur-lg animate-float-bubble [animation-delay:5s] [animation-duration:14s]" />
        
        <div className="absolute left-[90%] w-24 h-24 bg-[#34A853] rounded-full mix-blend-multiply blur-xl animate-float-bubble [animation-delay:8s] [animation-duration:19s]" />
      </div>

      {/* Glossy Glass Card Container */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
        <div className="relative rounded-[2.5rem] bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Inner Gloss Highlights */}
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/80 pointer-events-none" style={{ clipPath: 'inset(0 0 auto 0)' }} />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          
          <div className="p-10 relative z-20">
            <div className="mb-8 text-center">
              <Image 
                src="/logo.png" 
                alt="OrbitPOS Logo" 
                width={320} 
                height={110} 
                className="mx-auto mb-10 transform hover:scale-105 transition-transform duration-500" 
              />
              <p className="text-[14px] text-[#505055] font-medium">
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
