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
  Package,
  Building,
  Mail,
  Phone,
  MapPin,
  ClipboardList
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useActiveStore } from '@/store/useActiveStore';
import { Badge } from '@/components/ui/badge';

type ActiveTab = 'invoices' | 'suppliers';

export default function VendorInvoicesPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const storeToUse = activeStoreId || profile?.store_id;

  const [activeTab, setActiveTab] = useState<ActiveTab>('invoices');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Invoices State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Suppliers (Vendors) State
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [submittingVendor, setSubmittingVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    gst_number: '',
    address: '',
  });

  useEffect(() => {
    if (storeToUse) {
      if (activeTab === 'invoices') {
        fetchInvoices();
      } else {
        fetchVendors();
      }
    }
  }, [profile, activeStoreId, storeToUse, activeTab]);

  const fetchInvoices = async () => {
    if (!storeToUse) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('vendor_invoices')
      .select('*')
      .eq('store_id', storeToUse)
      .order('invoice_date', { ascending: false });

    if (data) setInvoices(data);
    setLoading(false);
  };

  const fetchVendors = async () => {
    if (!storeToUse) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('store_id', storeToUse)
      .order('created_at', { ascending: false });
    
    setVendors(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !vendorName || !storeToUse) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `invoices/${storeToUse}/${fileName}`;

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
          store_id: storeToUse
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

  // Vendor / Supplier creation
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name.trim() || !storeToUse) {
      toast.error('Please provide a vendor/supplier name');
      return;
    }

    setSubmittingVendor(true);
    try {
      const { error } = await supabase.from('vendors').insert({
        store_id: storeToUse,
        name: newVendor.name,
        contact_person: newVendor.contact_person || null,
        email: newVendor.email || null,
        phone: newVendor.phone || null,
        gst_number: newVendor.gst_number || null,
        address: newVendor.address || null,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Supplier added to directory successfully!');
      setVendorDialogOpen(false);
      setNewVendor({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        gst_number: '',
        address: '',
      });
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add supplier');
    } finally {
      setSubmittingVendor(false);
    }
  };

  const deleteVendor = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this supplier? (Any linked purchase orders will be affected)')) return;

    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;

      toast.success('Supplier deleted from directory');
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    }
  };

  const toggleVendorStatus = async (vendor: any) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ is_active: !vendor.is_active })
        .eq('id', vendor.id);

      if (error) throw error;
      toast.success(`${vendor.name} is now ${!vendor.is_active ? 'Active' : 'Inactive'}`);
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.vendor_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    (v.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Supplier Center</h1>
          <p className="text-[#86868b] font-medium mt-1">Manage vendor relations, track invoices, and catalog suppliers.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'invoices' ? (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger render={<Button className="bg-black hover:bg-gray-800 text-white font-bold rounded-2xl h-11 px-6 shadow-lg transition-all active:scale-95" />}>
                <Upload className="mr-2 h-5 w-5" />
                Upload Invoice
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
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
                    <Button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white font-bold h-14 rounded-2xl shadow-xl" disabled={uploading}>
                      {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      Save Invoice
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
              <DialogTrigger render={<Button className="bg-black hover:bg-gray-800 text-white font-bold rounded-2xl h-11 px-6 shadow-lg transition-all active:scale-95" />}>
                <Plus className="mr-2 h-5 w-5" />
                Register Supplier
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white max-h-[90vh] flex flex-col">
                <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 shrink-0">
                  <DialogTitle className="text-2xl font-black text-black tracking-tight">Register Supplier</DialogTitle>
                  <p className="text-gray-400 font-medium text-[13px] mt-1">Add a new supplier to the procurement directory.</p>
                </div>
                <form onSubmit={handleAddVendor} className="p-8 space-y-4 overflow-y-auto flex-1">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Supplier Name *</Label>
                    <Input 
                      placeholder="e.g. Acme Corp Wholesale" 
                      className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Contact Person</Label>
                      <Input 
                        placeholder="John Doe" 
                        className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold"
                        value={newVendor.contact_person}
                        onChange={(e) => setNewVendor({...newVendor, contact_person: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">GSTIN Number</Label>
                      <Input 
                        placeholder="22AAAAA0000A1Z5" 
                        className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold"
                        value={newVendor.gst_number}
                        onChange={(e) => setNewVendor({...newVendor, gst_number: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</Label>
                      <Input 
                        type="email"
                        placeholder="sales@acme.com" 
                        className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold"
                        value={newVendor.email}
                        onChange={(e) => setNewVendor({...newVendor, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone</Label>
                      <Input 
                        placeholder="+91 98765 43210" 
                        className="h-12 bg-[#f5f5f7] border-transparent rounded-xl font-bold"
                        value={newVendor.phone}
                        onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Office Address</Label>
                    <textarea
                      placeholder="Enter company address..." 
                      className="w-full h-20 p-3 bg-[#f5f5f7] border-transparent rounded-xl font-medium text-[13px] outline-none"
                      value={newVendor.address}
                      onChange={(e) => setNewVendor({...newVendor, address: e.target.value})}
                    />
                  </div>
                  
                  <div className="pt-4 flex gap-3 shrink-0">
                    <Button variant="ghost" type="button" className="flex-1 rounded-xl font-bold text-gray-400" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white font-bold h-12 rounded-xl shadow-lg" disabled={submittingVendor}>
                      {submittingVendor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Register Supplier
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-[#f5f5f7] p-1 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => { setActiveTab('invoices'); setSearch(''); }}
          className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
            activeTab === 'invoices' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-400 hover:text-black'
          }`}
        >
          <ClipboardList className="inline h-4 w-4 mr-2" />
          Supplier Invoices
        </button>
        <button
          onClick={() => { setActiveTab('suppliers'); setSearch(''); }}
          className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
            activeTab === 'suppliers' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-400 hover:text-black'
          }`}
        >
          <Building className="inline h-4 w-4 mr-2" />
          Supplier Directory
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder={activeTab === 'invoices' ? "Search by vendor name..." : "Search suppliers..."}
            className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'invoices' ? (
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
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50">
                <TableHead className="font-bold text-black pl-8">Supplier</TableHead>
                <TableHead className="font-bold text-black">Contact Info</TableHead>
                <TableHead className="font-bold text-black">GSTIN Number</TableHead>
                <TableHead className="font-bold text-black">Status</TableHead>
                <TableHead className="w-[120px] pr-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Building className="h-16 w-16 mx-auto mb-4 text-gray-100" />
                    <p className="text-gray-400 font-bold">No suppliers registered</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id} className="border-gray-50 hover:bg-gray-50/50 group">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Building className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-black">{vendor.name}</p>
                          {vendor.contact_person && (
                            <p className="text-[11px] text-gray-400 font-bold">Attn: {vendor.contact_person}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-600 text-[12px]">
                      {vendor.email && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {!vendor.email && !vendor.phone && <span>-</span>}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-gray-500">
                      {vendor.gst_number || '-'}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleVendorStatus(vendor)}>
                        {vendor.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer font-bold rounded-full">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-pointer font-bold rounded-full">Inactive</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-xl hover:bg-rose-50 hover:text-rose-500"
                          onClick={() => deleteVendor(vendor.id)}
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
      )}
    </div>
  );
}
