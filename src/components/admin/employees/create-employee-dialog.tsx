'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, DollarSign, Mail, User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { createEmployee } from '@/app/actions/employees';
import { useAuthStore } from '@/store/useAuthStore';

interface CreateEmployeeDialogProps {
  onSuccess: () => void;
}

export function CreateEmployeeDialog({ onSuccess }: CreateEmployeeDialogProps) {
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'cashier' | 'employee',
    hourly_rate: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('--- Employee Submission Started ---');
    console.log('FormData:', formData);
    setLoading(true);

    if (!profile?.store_id) {
      toast.error("User profile or Store ID not found");
      setLoading(false);
      return;
    }

    try {
      const result = await createEmployee({
        ...formData,
        store_id: profile.store_id
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Employee created successfully');
        setOpen(false);
        setFormData({
          full_name: '',
          email: '',
          password: '',
          role: 'employee',
          hourly_rate: 0,
        });
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button className="rounded-2xl h-11 font-bold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-lg shadow-blue-500/20">
            <Plus className="mr-2 h-5 w-5" />
            Add Employee
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-8 bg-[#fbfbfd] border-b border-gray-50">
          <h2 className="text-2xl font-black text-black mb-1 tracking-tight">Add New Employee</h2>
          <p className="text-gray-400 font-medium text-[13px]">Create a new login for your team member</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="John Doe" 
                  className="pl-12 h-12 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-medium"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="email"
                  placeholder="john@example.com" 
                  className="pl-12 h-12 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(val: any) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="h-12 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hourly Rate (Pay)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="25.00" 
                    className="pl-12 h-12 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-bold"
                    value={formData.hourly_rate || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData({ ...formData, hourly_rate: val });
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  className="pl-12 h-12 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-medium"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-xl" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
