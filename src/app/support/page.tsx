'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { LifeBuoy, Zap, ShieldCheck, Clock } from 'lucide-react';
import Image from 'next/image';

export default function SupportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    email: '',
    issueType: 'Technical Issue',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('form_submissions').insert({
        type: 'support',
        store_name: formData.storeName,
        email: formData.email,
        issue_type: formData.issueType,
        message: formData.description
      });

      if (error) throw error;

      // 2. Submit to Formspree via AJAX
      const response = await fetch("https://formspree.io/f/mgodgewr", {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeName: formData.storeName,
          email: formData.email,
          issueType: formData.issueType,
          description: formData.description
        })
      });

      if (!response.ok) {
        throw new Error('Formspree submission failed');
      }

      toast.success('Support ticket submitted successfully! We will get back to you within 2 hours.');
      
      // 3. Reset form
      setFormData({
        storeName: '',
        email: '',
        issueType: 'Technical Issue',
        description: ''
      });
    } catch (error: any) {
      console.error('Support form error:', error);
      toast.error(`Submission error: ${error.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <PublicHeader />
      
      <main className="flex-1 pt-24">
        {/* Support Hero */}
        <section className="relative h-[400px] flex items-center overflow-hidden bg-black">
          <div className="absolute inset-0 opacity-60">
            <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent z-10" />
            <Image 
              src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80" 
              alt="Support background" 
              fill 
              className="object-cover"
            />
          </div>
          <div className="container relative z-20 px-8 mx-auto">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                We&apos;re here <br /> to <span className="text-[#0071e3]">help you.</span>
              </h1>
              <p className="text-xl text-gray-300 font-medium">
                Our global support team is available 24/7 to ensure your business never stops.
              </p>
            </div>
          </div>
        </section>

        {/* Support Grid */}
        <section className="py-24 container px-8 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            
            {/* Left Side: Form */}
            <div className="lg:col-span-7 bg-[#f5f5f7] rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl shadow-gray-100">
              <div className="p-12 md:p-20">
                <form 
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Store Name</label>
                    <input 
                      name="Store Name"
                      type="text"
                      required
                      placeholder="The Coffee House"
                      className="w-full h-14 px-6 rounded-2xl bg-white border-none text-lg focus:ring-2 focus:ring-[#0071e3] transition-all"
                      value={formData.storeName}
                      onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        name="Email"
                        type="email"
                        required
                        placeholder="support@coffeehouse.com"
                        className="w-full h-14 px-6 rounded-2xl bg-white border-none text-lg focus:ring-2 focus:ring-[#0071e3] transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Issue Type</label>
                      <select 
                        name="Issue Type"
                        className="w-full h-14 px-6 rounded-2xl bg-white border-none text-lg focus:ring-2 focus:ring-[#0071e3] transition-all appearance-none cursor-pointer"
                        value={formData.issueType}
                        onChange={(e) => setFormData({...formData, issueType: e.target.value})}
                      >
                        <option>Technical Issue</option>
                        <option>Billing Question</option>
                        <option>Feature Request</option>
                        <option>General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      name="Description"
                      required
                      rows={6}
                      placeholder="Tell us about the issue..."
                      className="w-full p-6 rounded-3xl bg-white border-none text-lg focus:ring-2 focus:ring-[#0071e3] transition-all resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-16 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl text-xl font-bold shadow-lg"
                  >
                    {isSubmitting ? "Processing..." : "Submit Support Ticket"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side: Features */}
            <div className="lg:col-span-5 space-y-8">
              <SupportFeature 
                icon={LifeBuoy}
                title="Expert Support"
                description="Access our highly skilled technical team with deep POS experience."
              />
              <SupportFeature 
                icon={Zap}
                title="Rapid Response"
                description="95% of technical tickets are resolved within the first 2 hours."
              />
              <SupportFeature 
                icon={ShieldCheck}
                title="Secure Infrastructure"
                description="Enterprise-grade security with 99.99% uptime guaranteed."
              />
              <SupportFeature 
                icon={Clock}
                title="24/7 Monitoring"
                description="We proactively monitor your systems to detect issues before you do."
              />
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function SupportFeature({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-white border border-gray-100 hover:shadow-xl hover:shadow-gray-100 transition-all group">
      <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:bg-[#0071e3] transition-colors">
        <Icon className="w-7 h-7 text-[#0071e3] group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-2 tracking-tight">{title}</h3>
      <p className="text-[#86868b] leading-relaxed font-medium">{description}</p>
    </div>
  );
}
