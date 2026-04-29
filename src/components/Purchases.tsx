import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, addDoc, getDocs, where, runTransaction, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Purchase, Product, Supplier, TransactionItem } from '../types';
import { useApp } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ShoppingCart, Plus, Search, ArrowRight, Printer, Scissors, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

export function Purchases() {
  const { userRole } = useApp();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  
  // New Purchase State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<TransactionItem[]>([]);
  const [paymentType, setPaymentType] = useState<'contado' | 'credito'>('contado');
  const [amountPaid, setAmountPaid] = useState(0);

  // New Supplier State
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '' });

  // 7:00 PM Rule Implementation
  const getEffectiveDate = () => {
    const now = new Date();
    const hours = now.getHours();
    if (hours >= 19 || hours < 6) {
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      return Timestamp.fromDate(tomorrow);
    }
    return Timestamp.fromDate(now);
  };

  useEffect(() => {
    const q = query(collection(db, 'purchases'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });

    const prodUnsub = onSnapshot(collection(db, 'products'), (sn) => {
      setProducts(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const supUnsub = onSnapshot(collection(db, 'suppliers'), (sn) => {
      setSuppliers(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });

    return () => {
      unsubscribe();
      prodUnsub();
      supUnsub();
    };
  }, []);

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return;
    await addDoc(collection(db, 'suppliers'), newSupplier);
    setNewSupplier({ name: '', phone: '' });
    setIsSupplierDialogOpen(false);
    toast.success('Proveedor registrado');
  };

  const addItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setPurchaseItems([...purchaseItems, {
      productId,
      productName: product.name,
      quantity: 1,
      price: product.costPrice,
      unitType: product.unitType
    }]);
  };

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, fields: Partial<TransactionItem>) => {
    const updated = [...purchaseItems];
    updated[index] = { ...updated[index], ...fields };
    setPurchaseItems(updated);
  };

  const total = purchaseItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  const handleSavePurchase = async () => {
    if (!selectedSupplier || purchaseItems.length === 0) {
      toast.error('Complete los datos de la compra');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Update items stock
        for (const item of purchaseItems) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) throw new Error("Producto no encontrado");
          
          const currentStock = productSnap.data().stock || 0;
          transaction.update(productRef, { stock: currentStock + item.quantity });
        }

        // 2. Create Purchase Record
        const purchaseRef = doc(collection(db, 'purchases'));
        const effectiveDate = getEffectiveDate();
        transaction.set(purchaseRef, {
          supplierId: selectedSupplier,
          supplierName: supplier?.name,
          date: effectiveDate,
          items: purchaseItems,
          total,
          paymentType,
          amountPaid: paymentType === 'contado' ? total : amountPaid,
          isDeboned: false,
          createdAt: serverTimestamp()
        });
      });

      setIsDialogOpen(false);
      setPurchaseItems([]);
      setSelectedSupplier('');
      toast.success('Compra registrada correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar la compra');
    }
  };

  // Deboning Logic State
  const [isDeboningDialogOpen, setIsDeboningDialogOpen] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [deboningItems, setDeboningItems] = useState<TransactionItem[]>([]);

  const openDeboning = (purchase: Purchase) => {
    const wholeChickenItem = purchase.items.find(i => i.productName.toLowerCase().includes('pollo entero'));
    if (!wholeChickenItem) {
      toast.error('Esta compra no incluye pollo entero');
      return;
    }
    setCurrentPurchase(purchase);
    // Suggest deboning parts
    const parts = products.filter(p => [
      'Pernil grande', 'Pernil mediano', 'Alas', 'Hueso', 'Pechuga', 'Pernil pequeño'
    ].includes(p.name));
    
    setDeboningItems(parts.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: 0,
      price: 0,
      unitType: 'kg'
    })));
    setIsDeboningDialogOpen(true);
  };

  const handleSaveDeboning = async () => {
    if (!currentPurchase) return;
    const wholeChickenItem = currentPurchase.items.find(i => i.productName.toLowerCase().includes('pollo entero'))!;
    
    const totalWeight = deboningItems.reduce((acc, i) => acc + i.quantity, 0);
    // Logic check: Deboned weight shouldn't exceed chicken weight significantly? 
    // Usually it matches or includes some water loss.

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Reduce whole chicken stock
        const chickenRef = doc(db, 'products', wholeChickenItem.productId);
        const chickenSnap = await transaction.get(chickenRef);
        const currentChickenStock = chickenSnap.data()?.stock || 0;
        transaction.update(chickenRef, { stock: Math.max(0, currentChickenStock - wholeChickenItem.quantity) });

        // 2. Increase parts stock
        for (const item of deboningItems) {
          if (item.quantity <= 0) continue;
          const partRef = doc(db, 'products', item.productId);
          const partSnap = await transaction.get(partRef);
          const currentPartStock = partSnap.data()?.stock || 0;
          transaction.update(partRef, { stock: currentPartStock + item.quantity });
        }

        // 3. Mark purchase as deboned
        transaction.update(doc(db, 'purchases', currentPurchase.id), { isDeboned: true });

        // 4. Record log
        const logRef = doc(collection(db, 'deboning_logs'));
        transaction.set(logRef, {
          purchaseId: currentPurchase.id,
          sourceQuantity: wholeChickenItem.quantity,
          outputItems: deboningItems.filter(i => i.quantity > 0),
          date: serverTimestamp()
        });
      });

      setIsDeboningDialogOpen(false);
      toast.success('Despresaje realizado con éxito');
    } catch (err) {
      toast.error('Error al procesar el despresaje');
    }
  };  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compras</h2>
          <p className="text-xs text-[#9CA3AF]">
            Adquisiciones de mercancía y gestión de despresaje
          </p>
        </div>

        <div className="flex gap-3">
           <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#1F2937] text-[#9CA3AF] hover:text-white uppercase font-bold text-[10px] tracking-widest h-10 px-4 rounded-lg">
                Proveedores
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-[#1F2937] bg-[#111827] text-[#E2E8F0]">
               <DialogHeader>
                 <DialogTitle className="text-lg font-bold">GESTIONAR PROVEEDORES</DialogTitle>
               </DialogHeader>
               <div className="space-y-6 pt-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nombre" 
                      value={newSupplier.name} 
                      onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                      className="border-[#1F2937] bg-[#0A0B0D] focus:ring-[#10B981]"
                    />
                    <Input 
                      placeholder="Teléfono" 
                      value={newSupplier.phone} 
                      onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                      className="border-[#1F2937] bg-[#0A0B0D] focus:ring-[#10B981] w-32"
                    />
                    <Button onClick={handleAddSupplier} className="bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <Separator className="bg-[#1F2937]" />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {suppliers.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-3 hover:bg-[#1F2937] rounded-lg transition-colors border-b border-[#1F2937]/50">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-[#9CA3AF] font-mono">{s.phone}</span>
                      </div>
                    ))}
                  </div>
               </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold text-xs h-10 px-6 rounded-lg uppercase tracking-wider">
                <Plus className="mr-2 h-4 w-4" /> Registrar Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-0 overflow-hidden rounded-xl">
              <DialogHeader className="p-6 border-b border-[#1F2937] bg-[#111827]">
                <DialogTitle className="text-xl font-bold tracking-tight">NUEVA FACTURA DE COMPRA</DialogTitle>
                <DialogDescription className="text-[#9CA3AF]">Complete los detalles para actualizar el inventario</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto max-h-[85vh]">
                 <div className="md:col-span-4 p-6 border-r border-[#1F2937] space-y-6 bg-[#0A0B0D]/50">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Proveedor</label>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger className="border-[#1F2937] bg-[#111827] text-white">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-[#1F2937]">
                          {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Añadir Productos</label>
                       <div className="max-h-[350px] overflow-y-auto space-y-1 p-1 bg-[#111827] border border-[#1F2937] rounded-lg">
                          {products.map(p => (
                            <button
                              key={p.id}
                              onClick={() => addItem(p.id!)}
                              className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#1F2937] text-left transition-colors border border-transparent hover:border-[#10B981]/30 group"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#E2E8F0]">{p.name}</div>
                                <div className="text-[9px] text-[#9CA3AF] uppercase">{p.unitType}</div>
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
                            <TableHead className="text-[#9CA3AF] text-[10px] font-bold uppercase h-8 text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseItems.map((item, index) => (
                            <TableRow key={index} className="border-[#1F2937] hover:bg-[#111827]">
                              <TableCell className="font-medium text-xs px-4">{item.productName}</TableCell>
                              <TableCell className="text-center">
                                <Input 
                                  type="number" 
                                  value={item.quantity} 
                                  onChange={e => updateItem(index, { quantity: parseFloat(e.target.value) })}
                                  className="w-16 h-7 text-center bg-transparent border-[#1F2937] text-xs font-mono"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input 
                                  type="number" 
                                  value={item.price} 
                                  onChange={e => updateItem(index, { price: parseFloat(e.target.value) })}
                                  className="w-24 h-7 text-right bg-transparent border-[#1F2937] text-xs font-mono"
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-[#10B981] text-xs">
                                ${(item.quantity * item.price).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-[#9CA3AF] hover:text-red-500" onClick={() => removeItem(index)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {purchaseItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-20 text-[#6B7280]">
                          <ShoppingCart className="h-10 w-10 mb-4 opacity-10" />
                          <p className="text-[10px] uppercase font-bold tracking-widest">No hay productos añadidos</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 p-6 border-t border-[#1F2937] bg-[#111827] rounded-xl flex flex-col gap-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#9CA3AF] uppercase">Método de Pago</span>
                          <div className="flex gap-2">
                             {['contado', 'credito'].map(t => (
                               <button 
                                 key={t}
                                 onClick={() => setPaymentType(t as any)}
                                 className={cn(
                                   "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border transition-all",
                                   paymentType === t ? "bg-[#10B981] text-[#0A0B0D] border-[#10B981]" : "bg-[#0A0B0D] text-[#9CA3AF] border-[#1F2937]"
                                 )}
                               >
                                 {t}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-sm font-bold uppercase tracking-tight text-white">Total Factura</span>
                          <span className="text-2xl font-mono font-bold text-[#10B981]">${total.toLocaleString()}</span>
                       </div>
                       <Button onClick={handleSavePurchase} disabled={purchaseItems.length === 0 || !selectedSupplier} className="w-full bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90 font-bold h-12 uppercase tracking-widest mt-2">
                         Confirmar y Registrar Compra
                       </Button>
                    </div>
                 </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none">
        <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#111827]">
          <h3 className="text-sm font-semibold">Registro Histórico de Compras</h3>
          <div className="flex gap-2">
            <span className="text-[10px] bg-blue-900/40 text-blue-400 px-2 py-1 rounded-md border border-blue-900/50 uppercase font-bold tracking-widest">Sync Active</span>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#1F2937]">
              <TableRow className="border-[#1F2937] hover:bg-transparent">
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest px-6 h-10">Fecha Efectiva</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Proveedor</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Artículos</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Total</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-center">Estado</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right pr-6">Ops</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#1F2937]">
              {purchases.map((purchase) => (
                <TableRow key={purchase.id} className="border-[#1F2937] hover:bg-[#1F2937] transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-[#E2E8F0]">{purchase.date?.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                       <span className="text-[10px] text-[#9CA3AF] font-mono">{purchase.date?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-[#E2E8F0] uppercase tracking-tight">{purchase.supplierName}</TableCell>
                  <TableCell>
                    <div className="text-xs text-[#9CA3AF]">{purchase.items.length} productos registrados</div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-[#E2E8F0] text-sm">${purchase.total.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn(
                      "text-[9px] border-none font-bold uppercase tracking-widest",
                      purchase.paymentType === 'contado' ? "bg-emerald-900/40 text-[#10B981]" : "bg-orange-900/30 text-orange-400"
                    )}>
                      {purchase.paymentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2 text-transparent group-hover:text-inherit">
                       {purchase.items.some(i => i.productName.toLowerCase().includes('pollo entero')) && (
                          <Button 
                            onClick={() => openDeboning(purchase)}
                            disabled={purchase.isDeboned}
                            variant="outline" 
                            size="sm"
                            className={cn(
                              "text-[9px] uppercase font-bold tracking-wider h-7 px-3 border-[#1F2937] transition-all",
                              purchase.isDeboned 
                                ? "bg-gray-900/50 text-gray-600 border-gray-800" 
                                : "bg-emerald-900/20 text-[#10B981] border-emerald-900/50 hover:bg-[#10B981] hover:text-[#0A0B0D]"
                            )}
                          >
                            {purchase.isDeboned ? 'Despresado' : 'Despresar'}
                          </Button>
                       )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deboning Dialog */}
      <Dialog open={isDeboningDialogOpen} onOpenChange={setIsDeboningDialogOpen}>
        <DialogContent className="max-w-4xl border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-0 overflow-hidden rounded-xl">
           <DialogHeader className="p-6 border-b border-[#1F2937] bg-emerald-950/20">
              <DialogTitle className="text-[#10B981] font-bold flex items-center gap-3">
                 <span className="animate-pulse">●</span> PROCESO DE DESPRESAJE
              </DialogTitle>
              <DialogDescription className="text-[#9CA3AF]">
                 Transformando Batch de Pollo Entero en presas individuales
              </DialogDescription>
           </DialogHeader>
           <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-[#0A0B0D] p-4 rounded-xl border border-[#1F2937]">
                    <label className="text-[10px] text-[#9CA3AF] uppercase font-bold block mb-1">Fuente de Insumo</label>
                    <div className="text-sm font-bold">{currentPurchase?.supplierName}</div>
                 </div>
                 <div className="bg-[#0A0B0D] p-4 rounded-xl border border-[#1F2937]">
                    <label className="text-[10px] text-[#9CA3AF] uppercase font-bold block mb-1">Peso a Transformar</label>
                    <div className="text-sm font-bold text-[#10B981] font-mono">
                       {currentPurchase?.items.find(i => i.productName.toLowerCase().includes('pollo entero'))?.quantity} KG
                    </div>
                 </div>
              </div>

              <div className="bg-[#0A0B0D] border border-[#1F2937] rounded-xl overflow-hidden">
                 <Table>
                    <TableHeader className="bg-[#111827]">
                       <TableRow className="border-[#1F2937]">
                          <TableHead className="text-[10px] font-bold uppercase text-[#9CA3AF] px-6">Producto Final (Presas)</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-[#9CA3AF] text-center">Peso Obtenido (KG)</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {deboningItems.map((item, idx) => (
                          <TableRow key={idx} className="border-[#1F2937] hover:bg-[#111827]/50 transition-colors">
                             <TableCell className="font-semibold text-xs px-6 py-4">{item.productName}</TableCell>
                             <TableCell className="text-center py-4">
                                <div className="flex items-center justify-center gap-2">
                                   <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder="0.00"
                                      value={item.quantity || ''}
                                      onChange={(e) => {
                                         const updated = [...deboningItems];
                                         updated[idx].quantity = parseFloat(e.target.value) || 0;
                                         setDeboningItems(updated);
                                      }}
                                      className="w-32 h-9 text-center bg-[#111827] border-[#1F2937] focus:ring-[#10B981] font-mono font-bold text-[#10B981]"
                                   />
                                   <span className="text-[10px] font-bold text-[#6B7280]">KG</span>
                                </div>
                             </TableCell>
                          </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </div>

              <div className="bg-emerald-950/10 border border-[#10B981]/20 p-4 rounded-xl flex items-center justify-between">
                 <div className="flex items-center gap-2 text-[#10B981]">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium italic">Esta acción actualizará los inventarios de forma permanente</span>
                 </div>
                 <div className="flex gap-4">
                   <Button variant="ghost" onClick={() => setIsDeboningDialogOpen(false)} className="text-[#9CA3AF] hover:text-white">CANCELAR</Button>
                   <Button 
                      onClick={handleSaveDeboning} 
                      className="bg-[#10B981] text-[#0A0B0D] font-bold uppercase tracking-widest px-8 hover:bg-[#10B981]/90"
                   >
                      CONFIRMAR TRANSFORMACIÓN
                   </Button>
                 </div>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
