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
  ArrowRight,
  Filter,
  Search
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
  endOfDay,
  isValid,
  isAfter
} from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SchedulePage() {
  const { profile } = useAuthStore();
  
  // Custom View Range State
  const [startInput, setStartInput] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endInput, setEndInput] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  
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
  
  // Safe Interval Calculation
  const getIntervalDays = () => {
    try {
      const s = parseISO(startInput);
      const e = parseISO(endInput);
      if (isValid(s) && isValid(e) && !isAfter(s, e)) {
        return eachDayOfInterval({ start: s, end: e });
      }
    } catch (err) {}
    return [];
  };

  const viewDays = getIntervalDays();

  useEffect(() => {
    if (profile?.store_id) {
      fetchData();
    }
  }, [profile, startInput, endInput]);

  const fetchData = async () => {
    const s = parseISO(startInput);
    const e = parseISO(endInput);
    if (!isValid(s) || !isValid(e) || isAfter(s, e)) return;

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
        .gte('start_time', startOfDay(s).toISOString())
        .lte('start_time', endOfDay(e).toISOString());

      setShifts(shiftData || []);
    } catch (error) {
      toast.error('Load failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!selectedEmployeeId || !shiftDate || !startTime || !endTime) {
      toast.error('Required fields missing');
      return;
    }
    const payload = {
      store_id: profile.store_id,
      employee_id: selectedEmployeeId,
      start_time: new Date(`${shiftDate}T${startTime}:00`).toISOString(),
      end_time: new Date(`${shiftDate}T${endTime}:00`).toISOString(),
      note,
    };
    try {
      if (editingShift) {
        await supabase.from('shifts').update(payload).eq('id', editingShift.id);
      } else {
        await supabase.from('shifts').insert(payload);
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
      toast.success('Shift saved');
    } catch (error) {
      toast.error('Save failed');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('shifts').delete().eq('id', id);
    fetchData();
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
      doc.text('Employee Schedule', 14, 20);
      const tableData = shifts.map(s => [
        format(parseISO(s.start_time), 'EEE, MMM dd'),
        s.employee?.full_name || '?',
        format(parseISO(s.start_time), 'HH:mm'),
        format(parseISO(s.end_time), 'HH:mm')
      ]);
      autoTable(doc, { startY: 30, head: [['Date', 'Staff', 'In', 'Out']], body: tableData });
      doc.save('Schedule.pdf');
    } catch (e) {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Dynamic Filter Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0071e3]">
            <Filter className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Shift Explorer</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Custom Date Selection</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
             <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Start</span>
                <Input 
                  type="date" 
                  className="h-9 w-40 rounded-lg border-transparent bg-white font-bold text-[13px]" 
                  value={startInput} 
                  onChange={e => setStartInput(e.target.value)} 
                />
             </div>
             <ArrowRight className="h-4 w-4 text-gray-300" />
             <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-black uppercase text-gray-400">End</span>
                <Input 
                  type="date" 
                  className="h-9 w-40 rounded-lg border-transparent bg-white font-bold text-[13px]" 
                  value={endInput} 
                  onChange={e => setEndInput(e.target.value)} 
                />
             </div>
          </div>

          <Button variant="outline" className="h-10 rounded-xl font-bold px-6" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger render={
                <Button className="h-10 rounded-xl bg-[#0071e3] font-bold px-8 shadow-lg shadow-blue-500/10">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              } />
              <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-6 shadow-2xl border-none">
                 <h2 className="text-2xl font-black mb-6">Assign Shift</h2>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-transparent font-bold">
                           <SelectValue>{employees.find(e => e.id === selectedEmployeeId)?.full_name || "Select"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {employees.map(e => <SelectItem key={e.id} value={e.id} className="rounded-lg">{e.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Date</Label>
                      <Input type="date" className="h-11 rounded-xl bg-gray-50 font-bold" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Clock In</Label>
                        <Input type="time" className="h-11 rounded-xl bg-gray-50 font-bold" value={startTime} onChange={e => setStartTime(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Clock Out</Label>
                        <Input type="time" className="h-11 rounded-xl bg-gray-50 font-bold" value={endTime} onChange={e => setEndTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Notes</Label>
                      <Input placeholder="..." className="h-11 rounded-xl bg-gray-50 font-medium" value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                 </div>
                 <Button className="w-full h-12 rounded-xl bg-[#0071e3] mt-8 font-bold" onClick={handleAddShift}>Confirm</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-[180px] font-bold text-black py-4 pl-6 uppercase tracking-widest text-[11px]">Period</TableHead>
              <TableHead className="font-bold text-black py-4 uppercase tracking-widest text-[11px]">Daily Staffing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viewDays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-sm">
                  Invalid Date Range Selected
                </TableCell>
              </TableRow>
            ) : (
              viewDays.map((day) => {
                const dayShifts = shifts.filter(s => isSameDay(parseISO(s.start_time), day));
                const isToday = isDateToday(day);
                return (
                  <TableRow key={day.toISOString()} className={cn("border-gray-50", isToday && "bg-blue-50/20")}>
                    <TableCell className="py-6 pl-6 align-top">
                      <div className="flex flex-col">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isToday ? "text-[#0071e3]" : "text-gray-400")}>{format(day, 'EEEE')}</span>
                        <span className={cn("text-2xl font-black", isToday ? "text-[#0071e3]" : "text-black")}>{format(day, 'dd MMM')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 pr-6 align-top">
                      <div className="flex flex-wrap gap-3">
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-4 min-w-[280px] group transition-all hover:border-blue-200">
                            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-black text-sm">{shift.employee?.full_name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                               <p className="font-bold text-black text-[14px] truncate">{shift.employee?.full_name}</p>
                               <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500"><Clock className="h-3 w-3 text-[#0071e3]" />{format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}</div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditDialog(shift)} className="p-1 hover:text-blue-500 text-gray-300"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDeleteShift(shift.id)} className="p-1 hover:text-red-500 text-gray-300"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
