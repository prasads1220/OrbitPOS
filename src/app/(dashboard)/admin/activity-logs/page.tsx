'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { RefreshCw, Activity, User, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ActivityLogsPage() {
  const { profile } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  const PAGE_SIZE = 15;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE; // Fetch one extra to check if next page exists
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          description,
          created_at,
          profiles:employee_id (full_name),
          stores:store_id (name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching logs:', error);
      } else {
        if (data && data.length > PAGE_SIZE) {
          setHasNextPage(true);
          setLogs(data.slice(0, PAGE_SIZE));
        } else {
          setHasNextPage(false);
          setLogs(data || []);
        }
      }
    } catch (err) {
      console.error('Exception fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchLogs();
    }
  }, [profile, page]);

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-medium">
        You do not have permission to view activity logs.
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'clock_in':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">Clock In</Badge>;
      case 'clock_out':
        return <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold">Clock Out</Badge>;
      case 'page_visit':
        return <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold">Page View</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-600 border-gray-100 font-bold">{action}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black flex items-center gap-3">
            <Activity className="h-8 w-8 text-[#0071e3]" />
            Activity Logs
          </h1>
          <p className="text-[#86868b] font-medium mt-1">Real-time system actions and user navigation tracking.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button onClick={fetchLogs} variant="outline" className="rounded-xl h-10 px-4 border-gray-100 shadow-sm font-bold text-gray-600">
              <RefreshCw className={`mr-2 h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              Refresh Logs
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50 bg-gray-50/50">
              <TableHead className="font-bold text-black pl-8">Time</TableHead>
              <TableHead className="font-bold text-black">Employee</TableHead>
              <TableHead className="font-bold text-black">Store</TableHead>
              <TableHead className="font-bold text-black">Action</TableHead>
              <TableHead className="font-bold text-black pr-8">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-gray-400 font-medium">
                  <Activity className="h-12 w-12 opacity-20 mx-auto mb-4" />
                  No recent activity found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-8 font-medium text-gray-600 whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-bold text-black">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-500" />
                      </div>
                      {log.profiles?.full_name || 'System User'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {log.stores?.name || 'Unknown Store'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell className="pr-8 text-gray-600 font-medium text-[13px]">
                    {log.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-gray-50 bg-gray-50/30">
          <p className="text-[13px] font-medium text-gray-500">
            Page {page}
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 rounded-lg font-bold"
              disabled={page === 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 rounded-lg font-bold"
              disabled={!hasNextPage || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
