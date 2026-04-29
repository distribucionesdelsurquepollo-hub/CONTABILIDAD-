import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, addDoc, runTransaction, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Product, Customer, TransactionItem } from '../types';
import { useApp } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TrendingUp, Plus, Search, Printer, AlertTriangle, X, FileDown } from 'lucide-react';
import { generateInvoicePDF } from '../lib/pdfService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export function Sales() {
  const { userRole } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Sale State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleItems, setSaleItems] = useState<TransactionItem[]>([]);
  const [paymentType, setPaymentType] = useState<'contado' | 'credito'>('contado');
  const [amountPaid, setAmountPaid] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });

    const prodUnsub = onSnapshot(collection(db, 'products'), (sn) => {
      setProducts(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const custUnsub = onSnapshot(collection(db, 'customers'), (sn) => {
      setCustomers(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    return () => {
      unsubscribe();
      prodUnsub();
      custUnsub();
    };
  }, []);

  const addItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSaleItems([...saleItems, {
      productId,
      productName: product.name,
      quantity: 1,
      price: product.salePrice,
      unitType: product.unitType
    }]);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, fields: Partial<TransactionItem>) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], ...fields };
    setSaleItems(updated);
  };

  const total = saleItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  // 7:00 PM Rule Implementation
  const getEffectiveDate = () => {
    const now = new Date();
    const hours = now.getHours();
    // Rule: after 7:00 PM (19:00)
    if (hours >= 19 || hours < 6) {
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      return Timestamp.fromDate(tomorrow);
    }
    return Timestamp.fromDate(now);
  };

  const handleSaveSale = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      toast.error('Complete los datos de la venta');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    const effectiveDate = getEffectiveDate();

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Update items stock
        for (const item of saleItems) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) throw new Error("Producto no encontrado");
          
          const currentStock = productSnap.data().stock || 0;
          if (currentStock < item.quantity) {
             throw new Error(`Stock insuficiente para ${item.productName}`);
          }
          transaction.update(productRef, { stock: currentStock - item.quantity });
        }

        // 2. Create Sale Record
        const saleRef = doc(collection(db, 'sales'));
        transaction.set(saleRef, {
          customerId: selectedCustomer,
          customerName: customer?.name || 'Cliente Genérico',
          date: effectiveDate,
          items: saleItems,
          total,
          paymentType,
          amountPaid: paymentType === 'contado' ? total : amountPaid,
          createdAt: serverTimestamp()
        });
      });

      setIsDialogOpen(false);
      setIsConfirming(false);
      setSaleItems([]);
      setSelectedCustomer('');
      toast.success('Venta registrada con éxito');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar la venta');
    }
  };

  const { companyConfig } = useApp();

  const handleDownloadInvoice = (sale: Sale) => {
    generateInvoicePDF(sale, companyConfig);
    toast.success('Generando comprobante fiscal PDF...');
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) return;
    await addDoc(collection(db, 'customers'), newCustomer);
    setNewCustomer({ name: '', phone: '' });
    toast.success('Cliente registrado');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Ventas</h2>
          <p className="text-xs text-[#9CA3AF]">
            Terminal de punto de venta y registro comercial
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold text-xs h-10 px-6 rounded-lg uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-0 overflow-hidden rounded-xl">
            <DialogHeader className="p-6 border-b border-[#1F2937] bg-[#111827]">
              <DialogTitle className="text-xl font-bold tracking-tight">PUNTO DE VENTA (POS)</DialogTitle>
              <DialogDescription className="text-[#9CA3AF]">Procesamiento de órdenes y facturación en tiempo real</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto max-h-[85vh]">
               <div className="md:col-span-4 p-6 border-r border-[#1F2937] space-y-6 bg-[#0A0B0D]/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Cliente</label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger className="border-[#1F2937] bg-[#111827] text-white">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[#1F2937]">
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        <Separator className="my-2 bg-[#1F2937]" />
                        <div className="p-2 space-y-2">
                          <Input 
                            placeholder="Nuevo cliente..." 
                            value={newCustomer.name} 
                            onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                            className="h-8 text-xs bg-[#0A0B0D] border-[#1F2937]"
                          />
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleAddCustomer(); }} 
                            className="w-full h-8 text-[10px] uppercase font-bold bg-[#10B981] text-[#0A0B0D]"
                          >
                            Registrar Cliente
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Artículos Disponibles</label>
                     <div className="max-h-[350px] overflow-y-auto space-y-1 p-1 bg-[#111827] border border-[#1F2937] rounded-lg">
                        {products.filter(p => p.stock > 0).map(p => (
                          <button
                            key={p.id}
                            onClick={() => addItem(p.id!)}
                            className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#1F2937] text-left transition-colors border border-transparent hover:border-[#10B981]/30 group"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#E2E8F0]">{p.name}</span>
                              <span className="text-[9px] text-[#9CA3AF] uppercase">Stock: {p.stock.toFixed(p.unitType === 'kg' ? 2 : 0)} {p.unitType}</span>
                            </div>
                            <Plus className="h-3 w-3 text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="md:col-span-8 p-6 flex flex-col bg-[#0A0B0D]">
                  <div className="flex-1 min-h-[400px]">
                     <Table>
                       <TableHeader>
                         <TableRow className="border-[#1F2937] bg-[#111827] hover:bg-transparent">
                           <TableHead className="text-[#9CA3AF] text-[10px] font-bold uppercase h-8 px-4">Producto</TableHead>
                           <TableHead className="text-[#9CA3AF] text-[10px] font-bold uppercase h-8 text-center">Cant.</TableHead>
                           <TableHead className="text-[#9CA3AF] text-[10px] font-bold uppercase h-8 text-right">Precio</TableHead>
                           <TableHead className="text-[#9CA3AF] text-[10px] font-bold uppercase h-8 text-right">Subtotal</TableHead>
                           <TableHead className="w-10"></TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                          {saleItems.map((item, idx) => (
                            <TableRow key={idx} className="border-[#1F2937] hover:bg-[#111827]">
                              <TableCell className="font-medium text-xs px-4">{item.productName}</TableCell>
                              <TableCell className="text-center">
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  value={item.quantity} 
                                  onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) })}
                                  className="w-16 h-7 text-center bg-transparent border-[#1F2937] text-xs font-mono"
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                ${item.price.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-[#10B981] text-xs">
                                 ${(item.quantity * item.price).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                 <Button size="icon" variant="ghost" className="h-6 w-6 text-[#9CA3AF] hover:text-red-500" onClick={() => removeItem(idx)}>
                                    <X className="h-3.5 w-3.5" />
                                 </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                       </TableBody>
                     </Table>
                     {saleItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-20 text-[#6B7280]">
                          <TrendingUp className="h-10 w-10 mb-4 opacity-10" />
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#9CA3AF]">Seleccione productos para vender</p>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 p-6 border-t border-[#1F2937] bg-[#111827] rounded-xl flex flex-col gap-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Forma de Pago</label>
                          <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                             <SelectTrigger className="border-[#1F2937] bg-[#0A0B0D] h-9">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-[#111827] border-[#1F2937]">
                                <SelectItem value="contado">Contado (Efectivo/Transferencia)</SelectItem>
                                <SelectItem value="credito">Cuenta Corriente (Crédito)</SelectItem>
                             </SelectContent>
                          </Select>
                        </div>
                        {paymentType === 'credito' && (
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Monto Entregado</label>
                             <Input 
                               type="number" 
                               value={amountPaid} 
                               onChange={e => setAmountPaid(parseFloat(e.target.value))}
                               className="bg-[#0A0B0D] border-[#1F2937] h-9 font-mono text-xs"
                             />
                           </div>
                        )}
                     </div>
                     <div className="flex items-center justify-between p-4 bg-[#0A0B0D] border border-[#1F2937] rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Total a Facturar</span>
                        <span className="text-3xl font-mono font-bold text-[#10B981]">${total.toLocaleString()}</span>
                     </div>
                     <Button 
                        onClick={() => setIsConfirming(true)} 
                        disabled={saleItems.length === 0 || !selectedCustomer}
                        className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold h-12 uppercase tracking-widest"
                     >
                       Procesar Venta
                     </Button>
                  </div>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      </div >

      {/* Confirmation Dialog */}
      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent className="max-w-md border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-6">
             <div className="h-12 w-12 rounded-full bg-emerald-950 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-[#10B981]" />
             </div>
             <div>
                <h3 className="text-lg font-bold">Resumen de Operación</h3>
                <p className="text-xs text-[#9CA3AF]">Verifique los montos antes de emitir la factura</p>
             </div>
          </div>
          
          <div className="space-y-3 bg-[#0A0B0D] p-4 rounded-lg border border-[#1F2937] mb-6">
             <div className="flex justify-between text-xs">
                <span className="text-[#9CA3AF]">Cliente:</span>
                <span className="font-bold">{customers.find(c => c.id === selectedCustomer)?.name}</span>
             </div>
             <Separator className="bg-[#1F2937]" />
             <div className="flex justify-between items-center text-sm">
                <span className="text-[#9CA3AF] font-bold">TOTAL NETO:</span>
                <span className="text-xl font-mono font-bold text-[#10B981]">${total.toLocaleString()}</span>
             </div>
          </div>

          <div className="flex flex-col gap-2">
             <Button onClick={handleSaveSale} className="w-full bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90 font-bold uppercase tracking-widest h-11">Confirmar Registro</Button>
             <Button variant="ghost" onClick={() => setIsConfirming(false)} className="w-full text-[#9CA3AF] hover:text-white uppercase text-[10px] font-bold">Regresar al Editor</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none">
        <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#111827]">
          <h3 className="text-sm font-semibold text-white">Historial de Transacciones de Venta</h3>
          <div className="flex gap-2">
            <span className="text-[10px] bg-emerald-900/40 text-[#10B981] px-2 py-1 rounded-md border border-emerald-900/50 uppercase font-bold tracking-widest">Real-time Terminal</span>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#1F2937]">
              <TableRow className="border-[#1F2937] hover:bg-transparent">
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest px-6 h-10">TID #</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Fecha Operativa</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Cliente</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Total Facturado</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#1F2937]">
               {sales.map((s, idx) => (
                 <TableRow key={s.id} className="border-[#1F2937] hover:bg-[#1F2937] transition-colors group">
                    <TableCell className="px-6 py-4">
                       <span className="font-mono text-xs font-bold text-[#E2E8F0]">#{s.id.slice(-6).toUpperCase()}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#E2E8F0]">{s.date?.toDate().toLocaleDateString('es-ES')}</span>
                        {s.date?.toDate() > new Date() && <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Posfechado</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-[#E2E8F0] uppercase tracking-tight">{s.customerName}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[#10B981] text-sm pr-6">${s.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2 text-transparent group-hover:text-inherit transition-all">
                        <Button 
                          onClick={() => handleDownloadInvoice(s)}
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-[#9CA3AF] hover:text-[#10B981] hover:bg-[#0A0B0D]"
                        >
                           <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                 </TableRow>
               ))}
            </TableBody>
          </Table>
          {sales.length === 0 && (
            <div className="p-12 text-center text-[#6B7280] text-xs font-mono uppercase tracking-tighter">
               No se han detectado operaciones comerciales en este periodo
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
