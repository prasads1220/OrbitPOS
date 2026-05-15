'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Download,
  Clock,
  User,
  Trash2,
  Edit2,
  FileText,
  CalendarDays,
  Users,
  LayoutGrid,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfWeek, 
  addDays, 
  subWeeks, 
  addWeeks, 
  isSameDay, 
  parseISO,
  eachDayOfInterval,
  endOfWeek,
  isToday as isDateToday
} from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SchedulePage() {
  const { profile } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  
  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [shiftDate, setShiftDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');

  const isAdmin = profile?.role === 'admin';
  const startOfSelectedWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endOfSelectedWeek = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: startOfSelectedWeek,
    end: endOfSelectedWeek,
  });

  useEffect(() => {
    if (profile?.store_id) {
      fetchData();
    }
  }, [profile, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Employees
      if (isAdmin) {
        const { data: empData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('store_id', profile.store_id)
          .neq('role', 'superadmin');
        setEmployees(empData || []);
      }

      // Fetch Shifts for the week
      const { data: shiftData } = await supabase
        .from('shifts')
        .select(`
          *,
          employee:profiles(full_name)
        `)
        .eq('store_id', profile.store_id)
        .gte('start_time', startOfSelectedWeek.toISOString())
        .lte('start_time', endOfSelectedWeek.toISOString());

      setShifts(shiftData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!selectedEmployeeId || !shiftDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const start = new Date(`${shiftDate}T${startTime}:00`).toISOString();
    const end = new Date(`${shiftDate}T${endTime}:00`).toISOString();

    const shiftPayload = {
      store_id: profile.store_id,
      employee_id: selectedEmployeeId,
      start_time: start,
      end_time: end,
      note,
    };

    try {
      if (editingShift) {
        const { error } = await supabase
          .from('shifts')
          .update(shiftPayload)
          .eq('id', editingShift.id);
        if (error) throw error;
        toast.success('Shift updated successfully');
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert(shiftPayload);
        if (error) throw error;
        toast.success('Shift added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error('Failed to save shift');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Shift deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete shift');
    }
  };

  const openEditDialog = (shift: any) => {
    setEditingShift(shift);
    setSelectedEmployeeId(shift.employee_id);
    setShiftDate(format(parseISO(shift.start_time), 'yyyy-MM-dd'));
    setStartTime(format(parseISO(shift.start_time), 'HH:mm'));
    setEndTime(format(parseISO(shift.end_time), 'HH:mm'));
    setNote(shift.note || '');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingShift(null);
    setSelectedEmployeeId(null);
    setShiftDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('09:00');
    setEndTime('17:00');
    setNote('');
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const weekStr = `${format(startOfSelectedWeek, 'MMM dd')} - ${format(endOfSelectedWeek, 'MMM dd, yyyy')}`;
      
      doc.setFontSize(22);
      doc.setTextColor(0, 113, 227);
      doc.text('OrbitPOS Employee Schedule', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(134, 134, 139);
      doc.text(`Week of: ${weekStr}`, 14, 30);
      doc.text(`Store: ${profile?.stores?.name || 'OrbitPOS Store'}`, 14, 37);

      const tableData = shifts.map(s => [
        format(parseISO(s.start_time), 'EEEE, MMM dd'),
        s.employee?.full_name || 'Unknown',
        format(parseISO(s.start_time), 'HH:mm'),
        format(parseISO(s.end_time), 'HH:mm'),
        s.note || ''
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Employee', 'Start', 'End', 'Notes']],
        body: tableData,
        headStyles: { 
          fillColor: [0, 113, 227], 
          textColor: [255, 255, 255],
          fontSize: 12,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        styles: { fontSize: 10, cellPadding: 5 },
        theme: 'striped'
      });

      doc.save(`Schedule_${format(startOfSelectedWeek, 'yyyy-MM-dd')}.pdf`);
      toast.success('Schedule downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 rounded-2xl text-[#0071e3]">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-black">
              Shift Schedule
            </h1>
          </div>
          <p className="text-[#86868b] font-medium ml-1">Efficiently manage store coverage and staff rotations.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-gray-400 hover:text-black hover:bg-white hover:shadow-sm"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-6 font-black text-[14px] text-gray-800 min-w-[190px] text-center">
              {format(startOfSelectedWeek, 'MMM dd')} — {format(endOfSelectedWeek, 'MMM dd')}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-gray-400 hover:text-black hover:bg-white hover:shadow-sm"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="rounded-2xl h-12 px-6 border-gray-200 shadow-sm font-bold text-[14px] flex items-center gap-2 hover:bg-black hover:text-white hover:border-black transition-all"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4" />
            Export Schedule
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger render={
                <Button className="rounded-2xl h-12 px-8 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-[14px] shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
                  <Plus className="h-5 w-5" />
                  Assign Shift
                </Button>
              } />
              <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-8 bg-[#fbfbfd] border-b border-gray-100">
                  <DialogTitle className="text-2xl font-black text-black mb-1">Assign Shift</DialogTitle>
                  <DialogDescription className="font-medium text-gray-400 text-[13px]">
                    Create a new weekly assignment for your staff.
                  </DialogDescription>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Staff Member</Label>
                    <Select value={selectedEmployeeId} onValueChange={(val) => setSelectedEmployeeId(val)}>
                      <SelectTrigger className="rounded-xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-bold">
                        <SelectValue placeholder="Choose an employee" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="rounded-xl my-1 mx-1 focus:bg-blue-50 focus:text-blue-700">
                            <div className="flex flex-col">
                              <span className="font-bold">{emp.full_name}</span>
                              <span className="text-[10px] text-gray-400 capitalize">{emp.role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Shift Date</Label>
                      <Input 
                        type="date" 
                        className="rounded-xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white font-bold" 
                        value={shiftDate}
                        onChange={(e) => setShiftDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Start</Label>
                      <Input 
                        type="time" 
                        className="rounded-xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white font-bold" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">End</Label>
                      <Input 
                        type="time" 
                        className="rounded-xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white font-bold" 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest ml-1">Instruction (Optional)</Label>
                    <Input 
                      placeholder="e.g. Morning cleanup" 
                      className="rounded-xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white font-medium" 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="p-8 pt-0">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-black text-lg shadow-xl shadow-blue-500/10 transition-all active:scale-95"
                    onClick={handleAddShift}
                  >
                    {editingShift ? 'Save Changes' : 'Create Assignment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Weekly Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter(s => isSameDay(parseISO(s.start_time), day));
          const isToday = isDateToday(day);
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "group relative bg-white rounded-[2.5rem] border p-5 min-h-[400px] flex flex-col transition-all duration-500",
                isToday 
                  ? "border-blue-200 ring-4 ring-blue-50 shadow-2xl shadow-blue-500/10" 
                  : "border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1"
              )}
            >
              {isToday && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0071e3] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                  Today
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <p className={cn(
                  "text-[12px] font-bold uppercase tracking-tighter mb-1 transition-colors",
                  isToday ? "text-[#0071e3]" : "text-gray-400 group-hover:text-black"
                )}>
                  {format(day, 'EEEE')}
                </p>
                <h4 className={cn(
                  "text-3xl font-black transition-all",
                  isToday ? "text-[#0071e3] scale-110" : "text-black group-hover:scale-105"
                )}>
                  {format(day, 'dd')}
                </h4>
              </div>

              <div className="flex-1 space-y-4">
                {dayShifts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-8 text-center px-4">
                     <LayoutGrid className="h-10 w-10 mb-3" />
                     <p className="text-[11px] font-bold uppercase tracking-widest leading-tight">No Coverage Assigned</p>
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className="group/shift relative bg-gray-50/50 hover:bg-white rounded-3xl p-5 border border-transparent hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                           <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0071e3] flex items-center justify-center text-[12px] font-black shadow-inner">
                              {shift.employee?.full_name?.charAt(0)}
                           </div>
                           <div className="overflow-hidden">
                             <p className="text-[13px] font-black text-black truncate leading-tight">
                                {shift.employee?.full_name?.split(' ')[0]}
                             </p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Staff</p>
                           </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover/shift:opacity-100 transition-all scale-75 origin-right">
                            <button 
                              onClick={() => openEditDialog(shift)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-[#0071e3] transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteShift(shift.id)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                         <div className="flex items-center gap-2 text-[12px] font-black text-black">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
                            {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}
                         </div>
                         {shift.note && (
                           <div className="bg-white/50 p-2 rounded-xl border border-gray-100/50">
                             <div className="flex items-start gap-1.5 text-[10px] font-bold text-gray-500 italic">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2 leading-snug">{shift.note}</span>
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-black text-white p-8 rounded-[3rem] shadow-2xl md:col-span-2 flex items-center gap-8 relative overflow-hidden group">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500 rounded-full -mb-16 -mr-16 opacity-20 blur-3xl transition-transform duration-700 group-hover:scale-150" />
          <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center backdrop-blur-xl border border-white/5">
             <Users className="h-8 w-8 text-blue-400" />
          </div>
          <div>
             <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest mb-1">Weekly Staffing</p>
             <h3 className="text-4xl font-black">{shifts.length} <span className="text-lg font-bold text-white/60 ml-2">Total Shifts</span></h3>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0071e3] group-hover:bg-[#0071e3] group-hover:text-white transition-all">
             <CalendarDays className="h-6 w-6" />
          </div>
          <div>
             <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Coverage</p>
             <p className="font-black text-black text-[16px]">{weekDays.length} Days</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-all">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
             <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
             <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Status</p>
             <p className="font-black text-black text-[16px]">Optimized</p>
          </div>
        </div>
      </div>
    </div>
  );
}
