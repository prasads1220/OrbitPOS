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
  Trash2,
  Edit2,
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfWeek, 
  subWeeks, 
  addWeeks, 
  isSameDay, 
  parseISO,
  eachDayOfInterval,
  endOfWeek,
  isToday as isDateToday,
  startOfDay,
  endOfDay
} from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SchedulePage() {
  const { profile } = useAuthStore();
  
  // View Range State
  const [viewStartDate, setViewStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewEndDate, setViewEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  
  // Form State (Single Date as requested)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [shiftDate, setShiftDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');

  const isAdmin = profile?.role === 'admin';
  
  const viewDays = eachDayOfInterval({
    start: viewStartDate,
    end: viewEndDate,
  });

  useEffect(() => {
    if (profile?.store_id) {
      fetchData();
    }
  }, [profile, viewStartDate, viewEndDate]);

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
        .gte('start_time', startOfDay(viewStartDate).toISOString())
        .lte('start_time', endOfDay(viewEndDate).toISOString());

      setShifts(shiftData || []);
    } catch (error) {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!selectedEmployeeId || !shiftDate || !startTime || !endTime) {
      toast.error('Missing required fields');
      return;
    }

    const shiftPayload = {
      store_id: profile.store_id,
      employee_id: selectedEmployeeId,
      start_time: new Date(`${shiftDate}T${startTime}:00`).toISOString(),
      end_time: new Date(`${shiftDate}T${endTime}:00`).toISOString(),
      note,
    };

    try {
      if (editingShift) {
        const { error } = await supabase
          .from('shifts')
          .update(shiftPayload)
          .eq('id', editingShift.id);
        if (error) throw error;
        toast.success('Shift updated');
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert(shiftPayload);
        if (error) throw error;
        toast.success('Shift assigned');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save shift');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete this shift?')) return;
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
      doc.setFontSize(18);
      doc.text('Employee Schedule', 14, 20);
      const tableData = shifts.map(s => [
        format(parseISO(s.start_time), 'EEE, MMM dd'),
        s.employee?.full_name || 'Unknown',
        format(parseISO(s.start_time), 'HH:mm'),
        format(parseISO(s.end_time), 'HH:mm'),
        s.note || ''
      ]);
      autoTable(doc, { startY: 30, head: [['Date', 'Employee', 'Start', 'End', 'Notes']], body: tableData });
      doc.save('Schedule.pdf');
    } catch (error) {
      toast.error('PDF failed');
    }
  };

  const getEmployeeName = (id: string | null) => {
    if (!id) return '';
    return employees.find(e => e.id === id)?.full_name || id;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Updated Header with Range Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-50 rounded-xl text-[#0071e3]">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Shift Schedule</h1>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Store Management</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View Range Selector */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 border border-gray-100">
             <div className="flex items-center gap-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">From</Label>
                <Input 
                  type="date" 
                  className="h-8 w-36 rounded-lg border-transparent bg-white text-[12px] font-bold"
                  value={format(viewStartDate, 'yyyy-MM-dd')}
                  onChange={(e) => setViewStartDate(new Date(e.target.value))}
                />
             </div>
             <ArrowRight className="h-4 w-4 text-gray-300" />
             <div className="flex items-center gap-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">To</Label>
                <Input 
                  type="date" 
                  className="h-8 w-36 rounded-lg border-transparent bg-white text-[12px] font-bold"
                  value={format(viewEndDate, 'yyyy-MM-dd')}
                  onChange={(e) => setViewEndDate(new Date(e.target.value))}
                />
             </div>
          </div>

          <Button variant="outline" size="sm" className="h-10 px-6 rounded-xl font-bold border-gray-200" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger render={
                <Button size="sm" className="h-10 px-8 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold shadow-lg shadow-blue-500/10">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              } />
              <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-bold">Assign Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Staff Member</Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-transparent font-bold">
                         <SelectValue>
                            {selectedEmployeeId ? getEmployeeName(selectedEmployeeId) : "Select Staff"}
                         </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="rounded-lg">{emp.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Date</Label>
                    <Input type="date" className="h-11 rounded-xl bg-gray-50 border-transparent font-bold" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Clock In</Label>
                      <Input type="time" className="h-11 rounded-xl bg-gray-50 border-transparent font-bold" value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Clock Out</Label>
                      <Input type="time" className="h-11 rounded-xl bg-gray-50 border-transparent font-bold" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Notes</Label>
                    <Input placeholder="Optional details..." className="h-11 rounded-xl bg-gray-50 border-transparent font-medium" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button className="w-full h-12 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] font-bold" onClick={handleAddShift}>
                    {editingShift ? 'Save Changes' : 'Confirm Assignment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              <TableHead className="w-[180px] font-bold text-black py-4 pl-6">Day & Date</TableHead>
              <TableHead className="font-bold text-black py-4">Assignments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viewDays.map((day) => {
              const dayShifts = shifts.filter(s => isSameDay(parseISO(s.start_time), day));
              const isToday = isDateToday(day);
              
              return (
                <TableRow key={day.toISOString()} className={cn("group border-gray-50", isToday && "bg-blue-50/20")}>
                  <TableCell className="py-6 pl-6 align-top">
                    <div className="flex flex-col">
                      <span className={cn("text-[11px] font-black uppercase tracking-widest", isToday ? "text-[#0071e3]" : "text-gray-400")}>{format(day, 'EEEE')}</span>
                      <span className={cn("text-2xl font-black", isToday ? "text-[#0071e3]" : "text-black")}>{format(day, 'dd')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 pr-6 align-top">
                    {dayShifts.length === 0 ? (
                      <div className="h-full flex items-center text-gray-300 font-bold text-[12px] uppercase tracking-widest py-2">No assignments</div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-4 min-w-[280px] group/shift transition-all hover:border-blue-200">
                            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-black text-sm">{shift.employee?.full_name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                               <p className="font-bold text-black text-[14px] truncate">{shift.employee?.full_name}</p>
                               <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500"><Clock className="h-3 w-3 text-[#0071e3]" />{format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}</div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 opacity-0 group-hover/shift:opacity-100 transition-opacity">
                                <button onClick={() => openEditDialog(shift)} className="p-1 hover:text-blue-500 text-gray-300 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDeleteShift(shift.id)} className="p-1 hover:text-red-500 text-gray-300 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
