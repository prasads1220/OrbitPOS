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
  CheckCircle2,
  MoreHorizontal
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
      if (isAdmin) {
        const { data: empData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('store_id', profile.store_id)
          .neq('role', 'superadmin');
        setEmployees(empData || []);
      }

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
      toast.error('Failed to save shift');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
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
        headStyles: { fillColor: [0, 113, 227] },
        theme: 'striped'
      });
      doc.save(`Schedule_${format(startOfSelectedWeek, 'yyyy-MM-dd')}.pdf`);
      toast.success('Schedule downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header section with proper alignment */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0071e3]">
            <CalendarIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">Shift Schedule</h1>
            <p className="text-gray-400 font-medium text-sm">Manage team coverage for the current week.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-4 font-bold text-[14px] min-w-[160px] text-center">
              {format(startOfSelectedWeek, 'MMM dd')} - {format(endOfSelectedWeek, 'MMM dd')}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="h-12 px-6 rounded-2xl font-bold border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger render={
                <Button className="h-12 px-8 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-black shadow-lg shadow-blue-500/20 flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Assign Shift
                </Button>
              } />
              <DialogContent className="sm:max-w-[440px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                 <div className="p-8 bg-[#fbfbfd] border-b border-gray-100">
                    <DialogTitle className="text-2xl font-black">Assign New Shift</DialogTitle>
                    <DialogDescription className="font-medium text-gray-400">Add a shift to the weekly schedule.</DialogDescription>
                 </div>
                 <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-bold">
                          <SelectValue placeholder="Select Staff" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id} className="rounded-xl mx-1 my-1">
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Date</Label>
                        <Input 
                          type="date" 
                          className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white font-bold"
                          value={shiftDate}
                          onChange={e => setShiftDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Start Time</Label>
                        <Input 
                          type="time" 
                          className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white font-bold"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">End Time</Label>
                        <Input 
                          type="time" 
                          className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white font-bold"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Notes</Label>
                      <Input 
                        placeholder="e.g. Closing shift" 
                        className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white font-medium"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                    </div>
                 </div>
                 <DialogFooter className="p-8 pt-0">
                    <Button 
                      className="w-full h-14 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-black text-lg"
                      onClick={handleAddShift}
                    >
                      {editingShift ? 'Save Changes' : 'Confirm Assignment'}
                    </Button>
                 </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Main Grid with better spacing and proportions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-6">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter(s => isSameDay(parseISO(s.start_time), day));
          const isToday = isDateToday(day);
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "relative bg-white rounded-[2rem] border p-6 min-h-[500px] flex flex-col transition-all duration-300",
                isToday 
                  ? "border-blue-500 ring-4 ring-blue-50 shadow-xl" 
                  : "border-gray-100 shadow-sm hover:border-gray-200"
              )}
            >
              {isToday && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0071e3] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">
                  Current Day
                </div>
              )}

              <div className="text-center mb-8">
                <p className={cn(
                  "text-[12px] font-black uppercase tracking-widest mb-1",
                  isToday ? "text-[#0071e3]" : "text-gray-400"
                )}>
                  {format(day, 'EEEE')}
                </p>
                <h4 className={cn(
                  "text-4xl font-black tracking-tight",
                  isToday ? "text-[#0071e3]" : "text-black"
                )}>
                  {format(day, 'dd')}
                </h4>
              </div>

              <div className="flex-1 space-y-4">
                {dayShifts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-20">
                     <LayoutGrid className="h-12 w-12 mb-4" />
                     <p className="text-[11px] font-black uppercase tracking-widest">No Staff Assigned</p>
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className="group relative bg-[#f8faff] hover:bg-white rounded-[1.5rem] p-5 border border-transparent hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center text-[14px] font-black shadow-lg shadow-blue-500/20">
                              {shift.employee?.full_name?.charAt(0)}
                           </div>
                           <div>
                             <p className="text-[14px] font-black text-black leading-tight">
                                {shift.employee?.full_name?.split(' ')[0]}
                             </p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Team</p>
                           </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => openEditDialog(shift)}
                              className="p-1.5 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-[#0071e3] transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteShift(shift.id)}
                              className="p-1.5 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-[13px] font-black text-gray-700 bg-white/60 p-2 rounded-xl border border-white/50">
                            <Clock className="h-3.5 w-3.5 text-[#0071e3]" />
                            {format(parseISO(shift.start_time), 'HH:mm')} — {format(parseISO(shift.end_time), 'HH:mm')}
                         </div>
                         {shift.note && (
                           <div className="flex items-start gap-2 text-[11px] font-medium text-gray-400 leading-snug pl-1">
                              <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{shift.note}</span>
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

      {/* Summary Footer with glass effect */}
      <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -mr-64 -mt-64 group-hover:bg-blue-500/20 transition-all duration-1000" />
         
         <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-xl border border-white/5">
               <Users className="h-10 w-10 text-blue-400" />
            </div>
            <div>
               <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest mb-1">Weekly Coverage</p>
               <h3 className="text-4xl font-black">{shifts.length} Total Assignments</h3>
            </div>
         </div>
         
         <div className="flex items-center gap-10 relative z-10">
            <div className="text-right">
               <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest mb-1">Active Store</p>
               <p className="font-black text-xl">{profile?.stores?.name || 'OrbitPOS Store'}</p>
            </div>
            <div className="w-px h-16 bg-white/10 hidden lg:block" />
            <div className="text-right">
               <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest mb-1">Current Range</p>
               <p className="font-black text-xl">{format(startOfSelectedWeek, 'MMM dd')} - {format(endOfSelectedWeek, 'MMM dd')}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
