'use client';

import { Mail, MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    // 1. We DON'T call e.preventDefault() here to allow natural submission
    // But we need to save to Supabase FIRST.
    // So we stop the form, save, then manually submit.
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('form_submissions').insert({
        type: 'contact',
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        company: formData.company,
        message: formData.message
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          company: formData.company,
          message: formData.message
        })
      });

      if (!response.ok) {
        throw new Error('Formspree submission failed');
      }

      toast.success('Message sent successfully! We will get back to you soon.');
      
      // 3. Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast.error(`Submission error: ${error.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1d1d1f] selection:bg-indigo-100 font-sans">
      <PublicHeader />

      <main className="flex-1 pt-32 pb-24">
        <div className="container px-8 mx-auto">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-black mb-6">
              Let&apos;s start a <br />
              <span className="text-[#0071e3]">conversation.</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#86868b] font-medium leading-relaxed">
              Whether you&apos;re a small boutique or a global retailer, <br className="hidden md:block" />
              we&apos;re here to help you scale.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-bold mb-8 tracking-tight">Contact Information</h2>
                <div className="space-y-6">
                  <ContactMethod 
                    icon={Mail} 
                    title="Email our team" 
                    description="Our friendly team is here to help."
                    value="orbitpossales@gmail.com"
                  />
                  <ContactMethod 
                    icon={MapPin} 
                    title="Location" 
                    description="Our team operates globally to serve you."
                    value="Remote / Global Support"
                  />
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-[#f5f5f7] border border-gray-100">
                <h3 className="text-xl font-bold mb-4 tracking-tight">Enterprise Solutions</h3>
                <p className="text-[#86868b] font-medium mb-6">Looking for custom integrations or multi-region support? Our enterprise team is ready to assist.</p>
                <Button variant="link" className="p-0 h-auto text-[#0071e3] font-semibold hover:no-underline flex items-center gap-2">
                  Learn about Enterprise <Globe className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-1000 delay-400">
              <form 
                onSubmit={handleSubmit}
                className="space-y-6"
              >

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-[13px] font-semibold text-gray-500 ml-1">First Name</Label>
                    <Input 
                      id="firstName" 
                      name="First Name"
                      placeholder="Jane" 
                      required 
                      className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-[13px] font-semibold text-gray-500 ml-1">Last Name</Label>
                    <Input 
                      id="lastName" 
                      name="Last Name"
                      placeholder="Smith" 
                      required 
                      className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px] font-semibold text-gray-500 ml-1">Email Address</Label>
                  <Input 
                    id="email" 
                    name="Email"
                    type="email" 
                    placeholder="jane@company.com" 
                    required 
                    className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-[13px] font-semibold text-gray-500 ml-1">Company Name</Label>
                  <Input 
                    id="company" 
                    name="Company Name"
                    placeholder="Acme Inc." 
                    className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[13px] font-semibold text-gray-500 ml-1">How can we help?</Label>
                  <Textarea 
                    id="message" 
                    name="Message"
                    placeholder="Tell us about your business goals..." 
                    required 
                    className="min-h-[150px] rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all resize-none p-4" 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl bg-black hover:bg-gray-900 text-white font-bold text-lg transition-all shadow-xl"
                >
                  {isSubmitting ? "Processing..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function ContactMethod({ icon: Icon, title, description, value }: { icon: any, title: string, description: string, value: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center group-hover:bg-[#0071e3]/10 transition-colors">
        <Icon className="w-6 h-6 text-[#0071e3]" />
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-tight mb-1">{title}</h3>
        <p className="text-[#86868b] font-medium text-[15px] mb-1">{description}</p>
        <p className="text-black font-semibold">{value}</p>
      </div>
    </div>
  );
}
