'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Users, 
  Search, 
  RefreshCw,
  Shield,
  ShoppingCart,
  User,
  Trash2,
  KeyRound
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateEmployeeDialog } from '@/components/admin/employees/create-employee-dialog';
import { DollarSign } from 'lucide-react';
import { updateEmployeeRole, updateEmployeePayRate, deleteEmployee, resetEmployeePassword } from '@/app/actions/employees';

import { useActiveStore } from '@/store/useActiveStore';

const roleConfig: Record<string, any> = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-violet-50 text-violet-700 border-violet-100' },
  cashier: { label: 'Cashier', icon: ShoppingCart, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  employee: { label: 'Employee', icon: User, color: 'bg-gray-50 text-gray-700 border-gray-100' },
};

export default function EmployeesPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [onlineEmployees, setOnlineEmployees] = useState<Set<string>>(new Set());

  const storeToUse = activeStoreId || profile?.store_id;

  useEffect(() => {
    if (storeToUse) {
      fetchEmployees();
    }
  }, [profile, activeStoreId, storeToUse]);

  const fetchEmployees = async () => {
    if (!storeToUse) return;
    setLoading(true);
    
    // Fetch employees
    const { data: empData } = await supabase
      .from('profiles')
      .select('*')
      .eq('store_id', storeToUse)
      .order('created_at', { ascending: false });
      
    // Fetch active shifts to determine online status
    const { data: activeShifts } = await supabase
      .from('attendance')
      .select('employee_id')
      .eq('store_id', storeToUse)
      .is('clock_out', null);
      
    if (activeShifts) {
      const onlineIds = new Set(activeShifts.map(s => s.employee_id));
      setOnlineEmployees(onlineIds);
    }
      
    setEmployees(empData || []);
    setLoading(false);
  };

  const updateRole = async (id: string, role: string) => {
    const result = await updateEmployeeRole(id, role);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Role updated successfully');
      fetchEmployees();
    }
  };

  const handleRateChange = (id: string, val: string) => {
    setEditingRates(prev => ({ ...prev, [id]: val }));
  };

  const saveRate = async (id: string) => {
    const rateStr = editingRates[id];
    if (rateStr === undefined) return;
    
    const rate = parseFloat(rateStr);
    if (isNaN(rate) || rate < 0) {
      toast.error('Invalid pay rate');
      return;
    }
    
    try {
      const result = await updateEmployeePayRate(id, rate);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pay rate updated successfully');
        setEditingRates(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pay rate');
    }
  };

  const cancelEditRate = (id: string) => {
    setEditingRates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?\nThey will no longer be able to log in.`)) return;

    setLoading(true);
    try {
      const res = await deleteEmployee(id);
      if (res.error) throw new Error(res.error);
      
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete employee');
      setLoading(false);
    }
  };

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmployee, setResetEmployee] = useState<{id: string, name: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleResetPassword = async () => {
    if (!resetEmployee || !newPassword) return;
    setLoading(true);
    try {
      const res = await resetEmployeePassword(resetEmployee.id, newPassword);
      if (res.error) throw new Error(res.error);
      
      toast.success(`Password reset for ${resetEmployee.name}. They will be forced to change it on next login.`);
      setResetModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Employees</h1>
          <p className="text-[#86868b] font-medium mt-1">Manage your team members and their roles.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchEmployees} variant="outline" className="rounded-2xl h-11 font-bold">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {isAdmin && <CreateEmployeeDialog onSuccess={fetchEmployees} storeId={storeToUse} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['admin', 'cashier', 'employee'].map((role) => {
          const cfg = roleConfig[role];
          const count = employees.filter(e => e.role === role).length;
          return (
            <div key={role} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${cfg.color}`}>
                <cfg.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-black">{count}</p>
                <p className="text-[13px] text-gray-400 font-medium">{cfg.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
        <Input
          placeholder="Search by name or email..."
          className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Employee</TableHead>
              <TableHead className="font-bold text-black">Email</TableHead>
              <TableHead className="font-bold text-black">Role</TableHead>
              <TableHead className="font-bold text-black">Status</TableHead>
              <TableHead className="font-bold text-black">Pay</TableHead>
              <TableHead className="font-bold text-black">Joined</TableHead>
              {isAdmin && <TableHead className="font-bold text-black text-right pr-8">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading employees...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 font-medium">No employees found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => {
                const cfg = roleConfig[emp.role] || roleConfig.employee;
                return (
                  <TableRow key={emp.id} className="border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-black text-sm">
                          {emp.full_name?.charAt(0) || '?'}
                        </div>
                        <p className="font-bold text-black">{emp.full_name || 'Unknown'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 font-medium">{emp.email}</TableCell>
                    <TableCell>
                      <Badge className={`${cfg.color} font-bold border`}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {onlineEmployees.has(emp.id) ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-[12px] border border-emerald-100">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          Online
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-500 rounded-full font-bold text-[12px] border border-gray-100">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          Offline
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          {editingRates[emp.id] !== undefined ? (
                            <>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-24 h-9 pl-6 font-bold" 
                                  value={editingRates[emp.id]} 
                                  onChange={e => handleRateChange(emp.id, e.target.value)} 
                                  autoFocus
                                />
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 px-3 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 font-bold"
                                onClick={() => saveRate(emp.id)}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 px-3 text-gray-500 font-bold"
                                onClick={() => cancelEditRate(emp.id)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-black">${emp.hourly_rate?.toFixed(2) || '0.00'}/hr</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2 text-[#0071e3] font-bold text-[12px] bg-blue-50 hover:bg-blue-100 rounded-lg ml-1"
                                onClick={() => handleRateChange(emp.id, (emp.hourly_rate || 0).toString())}
                              >
                                Edit
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-black">${emp.hourly_rate?.toFixed(2) || '0.00'}/hr</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-400 font-medium">
                      {emp.created_at ? format(new Date(emp.created_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            defaultValue={emp.role}
                            onValueChange={(val) => updateRole(emp.id, val)}
                          >
                            <SelectTrigger className="w-32 h-9 rounded-xl border-gray-200 font-bold text-[13px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="cashier">Cashier</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-[#0071e3] hover:bg-[#0071e3]/10 hover:text-[#0071e3] rounded-xl h-9 w-9"
                            onClick={() => {
                              setResetEmployee({ id: emp.id, name: emp.full_name || 'Unknown' });
                              setNewPassword('');
                              setResetModalOpen(true);
                            }}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl h-9 w-9"
                            onClick={() => handleDelete(emp.id, emp.full_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-500 font-medium">
              Set a temporary password for <span className="font-bold text-black">{resetEmployee?.name}</span>. 
              They will be required to change it immediately after logging in.
            </p>
            <div className="space-y-2">
              <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">Temporary Password</Label>
              <Input
                type="text"
                placeholder="e.g. Temp123!"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 font-bold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setResetModalOpen(false)} className="rounded-xl font-bold h-11 px-6 text-gray-500">Cancel</Button>
            <Button onClick={handleResetPassword} className="bg-black hover:bg-gray-800 text-white rounded-xl font-bold h-11 px-6 shadow-md transition-all">
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
