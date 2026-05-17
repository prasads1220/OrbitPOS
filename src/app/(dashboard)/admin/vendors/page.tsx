'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  FileText, 
  Upload, 
  Search, 
  Calendar, 
  Download, 
  Trash2, 
  ExternalLink,
  Plus,
  Loader2,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function VendorInvoicesPage() {
  const { profile } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (profile?.store_id) {
      fetchInvoices();
    }
  }, [profile]);

  const fetchInvoices = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('vendor_invoices')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('invoice_date', { ascending: false });

    if (data) setInvoices(data);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !vendorName || !profile?.store_id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `invoices/${profile.store_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('vendor_invoices')
        .insert({
          vendor_name: vendorName,
          invoice_url: publicUrl,
          invoice_date: invoiceDate,
          store_id: profile.store_id
        });

      if (dbError) throw dbError;

      toast.success('Invoice uploaded successfully');
      setUploadOpen(false);
      setFile(null);
      setVendorName('');
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const deleteInvoice = async (id: string, url: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      // Delete from DB
      const { error: dbError } = await supabase
        .from('vendor_invoices')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (error: any) {
      toast.error('Failed to delete invoice');
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.vendor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Vendor Invoices</h1>
          <p className="text-[#86868b] font-medium mt-1">Manage and store your supplier invoices and documents.</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger render={<Button className="bg-black hover:bg-gray-800 text-white font-bold rounded-2xl h-11 px-6 shadow-lg transition-all active:scale-95" />}>
            <Upload className="mr-2 h-5 w-5" />
            Upload Invoice
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
              <DialogTitle className="text-2xl font-black text-black tracking-tight">Upload Invoice</DialogTitle>
              <p className="text-gray-400 font-medium text-[13px] mt-1">Store a new supplier document.</p>
            </div>
            <form onSubmit={handleUpload} className="p-10 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Vendor Name</Label>
                <Input 
                  placeholder="e.g. Acme Supplies" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl font-bold"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Invoice Date</Label>
                <Input 
                  type="date"
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl font-bold"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Document File</Label>
                <div className="relative h-32 rounded-3xl bg-[#f5f5f7] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden group">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-[#0071e3] mb-1" />
                      <p className="text-[11px] font-bold text-black truncate max-w-[200px]">{file.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-[12px] text-gray-400 font-medium">Click to select file</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="ghost" type="button" className="flex-1 rounded-xl font-bold text-gray-400" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-500/10" disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Save Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder="Search by vendor name..." 
            className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Vendor</TableHead>
              <TableHead className="font-bold text-black">Invoice Date</TableHead>
              <TableHead className="font-bold text-black">Uploaded At</TableHead>
              <TableHead className="w-[120px] pr-8 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-100" />
                  <p className="text-gray-400 font-bold">No invoices found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="border-gray-50 hover:bg-gray-50/50 group">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-black">{inv.vendor_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-600">
                    {format(new Date(inv.invoice_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-gray-400 text-[13px] font-medium">
                    {format(new Date(inv.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-blue-50 hover:text-[#0071e3]"
                        onClick={() => window.open(inv.invoice_url, '_blank')}
                      >
                        <ExternalLink className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-rose-50 hover:text-rose-500"
                        onClick={() => deleteInvoice(inv.id, inv.invoice_url)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
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
