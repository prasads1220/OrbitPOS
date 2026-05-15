'use client';

import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Send, MessageSquare, Building2, Globe, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { submitToFormSubmit } from '@/app/actions/formsubmit';
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

      // Send email via FormSubmit Server Action (bypasses CORS)
      const formResult = await submitToFormSubmit("orbitpossales@gmail.com", {
        _subject: "New OrbitPOS Contact Lead",
        "First Name": formData.firstName,
        "Last Name": formData.lastName,
        "Email": formData.email,
        "Company": formData.company,
        "Message": formData.message
      });

      if (!formResult.success) {
        console.warn('FormSubmit failed:', formResult.error);
        // We still show success because it was saved to the DB
      }

      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
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
          <div className="max-w-4xl mx-auto text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-1000 delay-200">
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
                  className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full h-14 text-lg font-bold transition-all hover:scale-[1.01] shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </Button>
                
                <p className="text-center text-[13px] text-[#86868b] font-medium px-4">
                  By clicking send, you agree to our <Link href="/privacy" className="text-[#0071e3] hover:underline">Privacy Policy</Link> and <Link href="/terms" className="text-[#0071e3] hover:underline">Terms of Service</Link>.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function ContactMethod({ icon: Icon, title, description, value }: any) {
  return (
    <div className="flex gap-4 group">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center shrink-0 group-hover:bg-[#0071e3] transition-colors">
        <Icon className="w-6 h-6 text-black group-hover:text-white transition-colors" />
      </div>
      <div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-[#86868b] font-medium text-[15px] mb-1">{description}</p>
        <p className="font-semibold text-[#1d1d1f]">{value}</p>
      </div>
    </div>
  );
}
