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
  Users,
  CheckCircle2,
  AlertCircle
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
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0071e3] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <CalendarIcon className="h-6 w-6" />
            </div>
            Weekly Schedule
          </h1>
          <p className="text-gray-500 font-bold mt-2 ml-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Managing shifts for {profile?.stores?.name || 'OrbitPOS Store'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-100 rounded-[1.5rem] p-1.5 shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 rounded-xl"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="px-6 font-black text-[15px] min-w-[200px] text-center">
              {format(startOfSelectedWeek, 'MMMM dd')} — {format(endOfSelectedWeek, 'dd')}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 rounded-xl"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="h-14 px-8 rounded-2xl font-black border-gray-200 hover:bg-black hover:text-white transition-all flex items-center gap-2"
            onClick={downloadPDF}
          >
            <Download className="h-5 w-5" />
            Download
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger render={
                <Button className="h-14 px-10 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2">
                  <Plus className="h-6 w-6" />
                  Assign Shift
                </Button>
              } />
              <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                 <div className="p-8 bg-[#fbfbfd] border-b border-gray-100">
                    <DialogTitle className="text-3xl font-black text-black">New Assignment</DialogTitle>
                    <DialogDescription className="font-medium text-gray-400">Set a work slot for your team member.</DialogDescription>
                 </div>
                 <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select Staff</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-black text-lg">
                          <SelectValue placeholder="Pick an employee" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id} className="rounded-xl mx-2 my-1 p-3">
                              <div className="flex flex-col">
                                <span className="font-black text-black">{emp.full_name}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold">{emp.role}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Shift Date</Label>
                        <Input 
                          type="date" 
                          className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white font-black text-lg"
                          value={shiftDate}
                          onChange={e => setShiftDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Start Time</Label>
                        <Input 
                          type="time" 
                          className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white font-black text-lg"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">End Time</Label>
                        <Input 
                          type="time" 
                          className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white font-black text-lg"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Notes (Optional)</Label>
                      <Input 
                        placeholder="e.g. Closing duties" 
                        className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white font-bold"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                    </div>
                 </div>
                 <DialogFooter className="p-8 pt-0">
                    <Button 
                      className="w-full h-16 rounded-3xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-black text-xl shadow-xl shadow-blue-500/20"
                      onClick={handleAddShift}
                    >
                      {editingShift ? 'Update Assignment' : 'Confirm Shift'}
                    </Button>
                 </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* New Neat List-Based Format */}
      <div className="space-y-6">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter(s => isSameDay(parseISO(s.start_time), day));
          const isToday = isDateToday(day);
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "group flex flex-col md:flex-row md:items-stretch bg-white rounded-[2rem] border transition-all duration-500 overflow-hidden",
                isToday 
                  ? "border-[#0071e3] shadow-2xl shadow-blue-500/10 ring-1 ring-blue-100" 
                  : "border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200"
              )}
            >
              {/* Date Column */}
              <div className={cn(
                "w-full md:w-48 p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-50 transition-colors",
                isToday ? "bg-blue-50/50" : "bg-gray-50/30 group-hover:bg-white"
              )}>
                <p className={cn(
                  "text-[12px] font-black uppercase tracking-widest mb-1",
                  isToday ? "text-[#0071e3]" : "text-gray-400"
                )}>
                  {format(day, 'EEEE')}
                </p>
                <h4 className={cn(
                  "text-5xl font-black tracking-tighter",
                  isToday ? "text-[#0071e3]" : "text-black"
                )}>
                  {format(day, 'dd')}
                </h4>
                {isToday && (
                  <Badge className="mt-4 bg-[#0071e3] text-white border-none font-black px-3 py-1">TODAY</Badge>
                )}
              </div>

              {/* Shifts Content */}
              <div className="flex-1 p-8">
                {dayShifts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-300 gap-3">
                    <AlertCircle className="h-5 w-5 opacity-20" />
                    <p className="font-bold text-[13px] uppercase tracking-widest opacity-30">No assignments for this day</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {dayShifts.map((shift) => (
                      <div 
                        key={shift.id} 
                        className="relative bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group/shift"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-black shadow-lg">
                                {shift.employee?.full_name?.charAt(0)}
                             </div>
                             <div>
                               <p className="text-lg font-black text-black leading-tight">
                                  {shift.employee?.full_name}
                               </p>
                               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Assigned Staff</p>
                             </div>
                          </div>
                          
                          {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/shift:opacity-100 transition-all">
                              <button 
                                onClick={() => openEditDialog(shift)}
                                className="p-2 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-[#0071e3] transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteShift(shift.id)}
                                className="p-2 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                           <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-transparent group-hover/shift:border-blue-50 transition-all">
                              <Clock className="h-5 w-5 text-[#0071e3]" />
                              <span className="font-black text-black text-lg">
                                {format(parseISO(shift.start_time), 'HH:mm')} — {format(parseISO(shift.end_time), 'HH:mm')}
                              </span>
                           </div>
                           {shift.note && (
                             <div className="flex items-start gap-3 pl-2 py-1">
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <p className="text-[13px] font-bold text-gray-500 leading-snug">{shift.note}</p>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
