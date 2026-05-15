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
  ArrowRight,
  Filter,
  FileText
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
  parseISO,
  isToday as isDateToday,
  startOfDay,
  endOfDay,
  isValid
} from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SchedulePage() {
  const { profile } = useAuthStore();
  
  // Custom View Range State
  const [startInput, setStartInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endInput, setEndInput] = useState(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'));
  
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

  // Helper to parse date string as LOCAL time to avoid timezone shifts
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (profile?.store_id) {
      fetchData();
    }
  }, [profile, startInput, endInput]);

  const fetchData = async () => {
    const s = parseLocalDate(startInput);
    const e = parseLocalDate(endInput);
    if (!isValid(s) || !isValid(e)) return;

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
        .lte('start_time', endOfDay(e).toISOString())
        .order('start_time', { ascending: true });

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
      doc.text('Shift Report', 14, 20);
      const tableData = shifts.map(s => [
        format(parseISO(s.start_time), 'MMM dd, yyyy'),
        s.employee?.full_name || '?',
        format(parseISO(s.start_time), 'HH:mm'),
        format(parseISO(s.end_time), 'HH:mm'),
        s.note || ''
      ]);
      autoTable(doc, { startY: 30, head: [['Date', 'Staff', 'In', 'Out', 'Note']], body: tableData });
      doc.save('Schedule.pdf');
    } catch (e) {}
  };

  // Group shifts by date for a "neat" list view without "empty week" logic
  const groupedShifts = shifts.reduce((acc: any, shift) => {
    const dateKey = format(parseISO(shift.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(shift);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedShifts).sort();

  function addWeeks(date: Date, weeks: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Shift Schedule</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Active Store: {profile?.stores?.name || 'OrbitPOS'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
             <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-black uppercase text-gray-400">From</span>
                <Input type="date" className="h-9 w-40 rounded-lg border-transparent bg-white font-bold text-[13px]" value={startInput} onChange={e => setStartInput(e.target.value)} />
             </div>
             <ArrowRight className="h-4 w-4 text-gray-300" />
             <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-black uppercase text-gray-400">To</span>
                <Input type="date" className="h-9 w-40 rounded-lg border-transparent bg-white font-bold text-[13px]" value={endInput} onChange={e => setEndInput(e.target.value)} />
             </div>
          </div>

          <Button variant="outline" className="h-10 rounded-xl font-bold px-6" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger render={
                <Button className="h-10 rounded-xl bg-[#0071e3] font-bold px-8">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              } />
              <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
                 <h2 className="text-2xl font-black mb-6">Assign Shift</h2>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Staff Member</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-transparent font-bold">
                           <SelectValue>{employees.find(e => e.id === selectedEmployeeId)?.full_name || "Select Staff"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {employees.map(e => <SelectItem key={e.id} value={e.id} className="rounded-lg">{e.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Shift Date</Label>
                      <Input type="date" className="h-11 rounded-xl bg-gray-50 font-bold" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">In</Label>
                        <Input type="time" className="h-11 rounded-xl bg-gray-50 font-bold" value={startTime} onChange={e => setStartTime(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Out</Label>
                        <Input type="time" className="h-11 rounded-xl bg-gray-50 font-bold" value={endTime} onChange={e => setEndTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Note</Label>
                      <Input placeholder="..." className="h-11 rounded-xl bg-gray-50 font-medium" value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                 </div>
                 <Button className="w-full h-12 rounded-xl bg-[#0071e3] mt-8 font-bold" onClick={handleAddShift}>Confirm Assignment</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* List View - Only shows dates with shifts in the range */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {sortedDates.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <FileText className="h-8 w-8" />
             </div>
             <p className="font-bold text-gray-400 uppercase tracking-widest text-sm">No shifts found in this range</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-[200px] font-bold text-black py-4 pl-8 uppercase tracking-widest text-[11px]">Date</TableHead>
                <TableHead className="font-bold text-black py-4 uppercase tracking-widest text-[11px]">Staff & Times</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDates.map((dateKey) => {
                const dateShifts = groupedShifts[dateKey];
                const displayDate = parseISO(dateKey);
                const isToday = isDateToday(displayDate);
                
                return (
                  <TableRow key={dateKey} className={cn("border-gray-50", isToday && "bg-blue-50/20")}>
                    <TableCell className="py-8 pl-8 align-top">
                      <div className="flex flex-col">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isToday ? "text-[#0071e3]" : "text-gray-400")}>{format(displayDate, 'EEEE')}</span>
                        <span className={cn("text-2xl font-black", isToday ? "text-[#0071e3]" : "text-black")}>{format(displayDate, 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-8 pr-8 align-top">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dateShifts.map((shift: any) => (
                          <div 
                            key={shift.id} 
                            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4 group transition-all hover:border-blue-500/30 hover:shadow-md"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20 shrink-0">
                               {shift.employee?.full_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                               <p className="font-black text-black text-base truncate leading-tight uppercase tracking-tight">{shift.employee?.full_name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <Clock className="h-3.5 w-3.5 text-[#0071e3]" />
                                  <span className="text-[12px] font-bold text-gray-400">
                                    {format(parseISO(shift.start_time), 'hh:mm a')} — {format(parseISO(shift.end_time), 'hh:mm a')}
                                  </span>
                               </div>
                               {shift.note && <p className="text-[11px] text-gray-400 mt-1 italic line-clamp-1">{shift.note}</p>}
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditDialog(shift)} className="p-1.5 hover:text-blue-500 text-gray-300 transition-colors"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteShift(shift.id)} className="p-1.5 hover:text-red-500 text-gray-300 transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
