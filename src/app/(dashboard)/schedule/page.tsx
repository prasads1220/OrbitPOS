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
  RefreshCw,
  MoreVertical
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
  endOfWeek
} from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
    const doc = new jsPDF() as any;
    const weekStr = `${format(startOfSelectedWeek, 'MMM dd')} - ${format(endOfSelectedWeek, 'MMM dd, yyyy')}`;
    
    doc.setFontSize(20);
    doc.text('OrbitPOS Employee Schedule', 14, 22);
    doc.setFontSize(12);
    doc.text(`Week of: ${weekStr}`, 14, 30);
    doc.text(`Store: ${profile?.stores?.name || 'OrbitPOS Store'}`, 14, 37);

    const tableData = shifts.map(s => [
      format(parseISO(s.start_time), 'EEEE, MMM dd'),
      s.employee?.full_name || 'Unknown',
      format(parseISO(s.start_time), 'HH:mm'),
      format(parseISO(s.end_time), 'HH:mm'),
      s.note || ''
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Date', 'Employee', 'Start', 'End', 'Notes']],
      body: tableData,
      headStyles: { fillStyle: '#0071e3', textColor: 255 },
      theme: 'grid'
    });

    doc.save(`Schedule_${format(startOfSelectedWeek, 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-[#0071e3]" />
            Shift Schedule
          </h1>
          <p className="text-[#86868b] font-medium mt-1">Plan and manage weekly employee shifts.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-gray-100 rounded-2xl shadow-sm p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-gray-400 hover:text-black"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-4 font-bold text-[14px] text-gray-700 min-w-[180px] text-center">
              {format(startOfSelectedWeek, 'MMM dd')} - {format(endOfSelectedWeek, 'MMM dd')}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-gray-400 hover:text-black"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="rounded-2xl h-12 px-6 border-gray-100 shadow-sm font-bold text-[14px] flex items-center gap-2 hover:bg-gray-50"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger 
                render={
                  <Button className="rounded-2xl h-12 px-8 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-[14px] shadow-lg shadow-blue-500/10 flex items-center gap-2 transition-all active:scale-95">
                    <Plus className="h-5 w-5" />
                    Add Shift
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-black">
                    {editingShift ? 'Edit Shift' : 'Schedule New Shift'}
                  </DialogTitle>
                  <DialogDescription className="font-medium text-gray-500">
                    Assign a time slot to an employee for the current week.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Select Employee</Label>
                    <Select value={selectedEmployeeId} onValueChange={(val) => setSelectedEmployeeId(val)}>
                      <SelectTrigger className="rounded-xl h-12 border-gray-100 font-medium">
                        <SelectValue placeholder="Choose an employee" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="rounded-lg">
                            {emp.full_name} ({emp.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Shift Date</Label>
                    <Input 
                      type="date" 
                      className="rounded-xl h-12 border-gray-100 font-medium" 
                      value={shiftDate}
                      onChange={(e) => setShiftDate(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-gray-700">Start Time</Label>
                      <Input 
                        type="time" 
                        className="rounded-xl h-12 border-gray-100 font-medium" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-gray-700">End Time</Label>
                      <Input 
                        type="time" 
                        className="rounded-xl h-12 border-gray-100 font-medium" 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Note (Optional)</Label>
                    <Input 
                      placeholder="e.g. Lunch break at 1pm" 
                      className="rounded-xl h-12 border-gray-100 font-medium" 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="w-full h-14 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-black text-lg shadow-xl shadow-blue-500/10 transition-all active:scale-95"
                    onClick={handleAddShift}
                  >
                    {editingShift ? 'Update Shift' : 'Save Shift'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Weekly Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter(s => isSameDay(parseISO(s.start_time), day));
          const isToday = isSameDay(day, new Date());
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "bg-white rounded-[2rem] border p-6 min-h-[300px] flex flex-col transition-all duration-300",
                isToday ? "border-[#0071e3] ring-1 ring-[#0071e3] shadow-lg shadow-blue-500/5" : "border-gray-100 shadow-sm"
              )}
            >
              <div className="text-center mb-6">
                <p className={cn(
                  "text-[11px] font-bold uppercase tracking-widest mb-1",
                  isToday ? "text-[#0071e3]" : "text-gray-400"
                )}>
                  {format(day, 'EEEE')}
                </p>
                <h4 className={cn(
                  "text-2xl font-black",
                  isToday ? "text-[#0071e3]" : "text-black"
                )}>
                  {format(day, 'dd')}
                </h4>
              </div>

              <div className="flex-1 space-y-3">
                {dayShifts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                     <Clock className="h-8 w-8 mb-2" />
                     <p className="text-[10px] font-bold uppercase tracking-tighter">No Shifts</p>
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className="group bg-[#f8faff] rounded-2xl p-4 border border-blue-50/50 hover:border-blue-200 transition-all relative"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[10px] font-bold">
                              {shift.employee?.full_name?.charAt(0)}
                           </div>
                           <p className="text-[13px] font-bold text-black truncate max-w-[80px]">
                              {shift.employee?.full_name?.split(' ')[0]}
                           </p>
                        </div>
                        {isAdmin && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button 
                              onClick={() => openEditDialog(shift)}
                              className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-[#0071e3] transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteShift(shift.id)}
                              className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                            <Clock className="h-3 w-3 text-[#0071e3]" />
                            {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}
                         </div>
                         {shift.note && (
                           <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 italic truncate">
                              <FileText className="h-2.5 w-2.5" />
                              {shift.note}
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

      {/* Summary Footer */}
      <div className="bg-black text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-black/10">
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
               <User className="h-6 w-6 text-blue-400" />
            </div>
            <div>
               <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Weekly Coverage</p>
               <h3 className="text-2xl font-black">{shifts.length} Total Shifts</h3>
            </div>
         </div>
         
         <div className="flex items-center gap-8">
            <div className="text-right">
               <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Active Store</p>
               <p className="font-bold text-[14px]">{profile?.stores?.name || 'OrbitPOS Store'}</p>
            </div>
            <div className="w-px h-10 bg-white/10 hidden md:block" />
            <div className="text-right">
               <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Week Range</p>
               <p className="font-bold text-[14px]">{format(startOfSelectedWeek, 'MMM dd')} - {format(endOfSelectedWeek, 'MMM dd')}</p>
            </div>
         </div>
      </div>
    </div>
  );
}

