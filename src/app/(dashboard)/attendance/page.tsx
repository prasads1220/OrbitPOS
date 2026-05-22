'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Clock, 
  LogIn, 
  LogOut as LogOutIcon, 
  History,
  Timer,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfWeek, startOfMonth } from 'date-fns';

export default function AttendancePage() {
  const { profile } = useAuthStore();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ weekTotal: 0, monthTotal: 0 });

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [profile]);

  const fetchAttendance = async () => {
    if (!profile) return;
    setLoading(true);

    // Fetch active shift
    const { data: activeData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .filter('clock_out', 'is', 'null')
      .maybeSingle();

    setActiveShift(activeData);

    // Fetch recent logs
    const { data: logsData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .order('clock_in', { ascending: false })
      .limit(10);

    setLogs(logsData || []);

    // Calculate Week/Month Stats
    const weekStart = startOfWeek(new Date()).toISOString();
    const monthStart = startOfMonth(new Date()).toISOString();

    const { data: weekLogs } = await supabase
      .from('attendance')
      .select('total_hours')
      .eq('employee_id', profile.id)
      .gte('clock_in', weekStart);
    
    const { data: monthLogs } = await supabase
      .from('attendance')
      .select('total_hours')
      .eq('employee_id', profile.id)
      .gte('clock_in', monthStart);

    setStats({
      weekTotal: weekLogs?.reduce((sum, l) => sum + (l.total_hours || 0), 0) || 0,
      monthTotal: monthLogs?.reduce((sum, l) => sum + (l.total_hours || 0), 0) || 0,
    });

    setLoading(false);
  };

  const handleClockIn = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: profile.id,
        store_id: profile.store_id || '00000000-0000-0000-0000-000000000000',
        clock_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Clock in error:', error);
      toast.error('Failed to clock in');
    } else {
      setActiveShift(data);
      toast.success('Clocked in successfully');
      fetchAttendance();
      
      // Log activity
      supabase.from('activity_logs').insert({
        employee_id: profile.id,
        store_id: profile.store_id || '00000000-0000-0000-0000-000000000000',
        action: 'clock_in',
        description: 'Clocked in for shift'
      }).then(({ error: logError }) => {
        if (logError) console.error('Failed to log activity:', logError);
      });
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;

    const clockOut = new Date();
    const clockIn = new Date(activeShift.clock_in);
    const totalMinutes = differenceInMinutes(clockOut, clockIn);
    const totalHours = totalMinutes / 60;

    const { error } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOut.toISOString(),
        total_hours: totalHours,
      })
      .eq('id', activeShift.id);

    if (error) {
      toast.error('Failed to clock out');
    } else {
      setActiveShift(null);
      toast.success('Clocked out successfully');
      fetchAttendance();
      
      // Log activity
      supabase.from('activity_logs').insert({
        employee_id: profile.id,
        store_id: profile.store_id || '00000000-0000-0000-0000-000000000000',
        action: 'clock_out',
        description: `Clocked out after ${totalHours.toFixed(2)} hours`
      }).then(({ error: logError }) => {
        if (logError) console.error('Failed to log activity:', logError);
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Time Punch</h1>
          <p className="text-[#86868b] font-medium mt-1">Track your work hours and punch logs history.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-[13px] font-bold text-gray-600">
              {format(currentTime, 'EEEE, MMMM do')}
           </div>
           <Button onClick={fetchAttendance} variant="outline" className="rounded-xl h-10 w-10 p-0 border-gray-100 shadow-sm">
              <RefreshCw className={loading ? 'animate-spin' : 'h-4 w-4 text-gray-400'} />
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Clock In/Out Control */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-12 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-[#0071e3]/10 text-[#0071e3] rounded-[1.5rem] flex items-center justify-center mb-8">
                <Clock className="h-8 w-8" />
             </div>
             
             <div className="text-6xl font-black text-black tracking-tighter mb-4 tabular-nums">
               {format(currentTime, 'HH:mm:ss')}
             </div>
             
             {activeShift ? (
               <div className="space-y-8 w-full max-w-sm">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full font-bold text-[13px] border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Currently On Shift
                 </div>
                 <p className="text-gray-400 font-medium">Started at {format(new Date(activeShift.clock_in), 'HH:mm')}</p>
                 <Button 
                   className="w-full h-16 rounded-[1.5rem] bg-rose-500 hover:bg-rose-600 text-white font-black text-lg shadow-xl shadow-rose-500/10 transition-all active:scale-95"
                   onClick={handleClockOut}
                 >
                   <LogOutIcon className="mr-3 h-6 w-6" />
                   Clock Out
                 </Button>
               </div>
             ) : (
               <div className="space-y-8 w-full max-w-sm">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 rounded-full font-bold text-[13px] border border-gray-100">
                    Shift Not Started
                 </div>
                 <p className="text-gray-400 font-medium">Ready to start your work day?</p>
                 <Button 
                   className="w-full h-16 rounded-[1.5rem] bg-[#0071e3] hover:bg-[#0077ed] text-white font-black text-lg shadow-xl shadow-blue-500/10 transition-all active:scale-95"
                   onClick={handleClockIn}
                 >
                   <LogIn className="mr-3 h-6 w-6" />
                   Clock In
                 </Button>
               </div>
             )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hours This Week</p>
             <h3 className="text-4xl font-black text-black tracking-tighter">{stats.weekTotal.toFixed(1)} hrs</h3>
             <div className="mt-4 flex items-center text-[12px] font-bold text-emerald-500 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                <TrendingUp className="h-3 w-3 mr-1" />
                On track for goal
             </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hours This Month</p>
             <h3 className="text-4xl font-black text-black tracking-tighter">{stats.monthTotal.toFixed(1)} hrs</h3>
             <p className="text-[12px] text-gray-400 mt-2 font-medium">Estimated pay: <span className="text-black font-bold">${(stats.monthTotal * (profile?.hourly_rate || 0)).toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
           <h3 className="text-xl font-bold text-black flex items-center gap-3">
              <History className="h-5 w-5 text-[#0071e3]" />
              Recent Logs
           </h3>
           <Button variant="ghost" className="text-[#0071e3] font-bold text-[13px] hover:bg-blue-50 rounded-xl">View All History</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Date</TableHead>
              <TableHead className="font-bold text-black">In</TableHead>
              <TableHead className="font-bold text-black">Out</TableHead>
              <TableHead className="font-bold text-black text-right">Duration</TableHead>
              <TableHead className="font-bold text-black text-center pr-8">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-gray-400 font-medium">
                  No punch history found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="pl-8 font-bold text-black">
                    {format(new Date(log.clock_in), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-gray-600">{format(new Date(log.clock_in), 'HH:mm')}</TableCell>
                  <TableCell className="font-medium text-gray-600">
                    {log.clock_out ? format(new Date(log.clock_out), 'HH:mm') : '--:--'}
                  </TableCell>
                  <TableCell className="text-right font-black text-black">
                    {log.total_hours ? `${log.total_hours.toFixed(2)} hrs` : '---'}
                  </TableCell>
                  <TableCell className="text-center pr-8">
                    {log.clock_out ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">Completed</Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-[#0071e3] border-blue-100 font-bold animate-pulse">Live Shift</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
