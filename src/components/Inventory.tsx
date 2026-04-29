import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, UnitType } from '../types';
import { useApp } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Package, Plus, Trash2, Edit2, Search, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const INITIAL_PRODUCTS_KG = [
  'Pernil grande', 'Pernil mediano', 'Alas', 'Hueso', 'Pollo entero', 'Pechuga', 'Quesos', 'Cuajada', 'Pernil pequeño', 'Cachama', 'Tilapia'
];

const INITIAL_PRODUCTS_UNIT = [
  'Picadas', 'Bandeja de hígado', 'Bandeja de molleja', 'Bolsa de patas', 'Bandeja de pescuezo', 'Bandeja de corazones', 'Menudencia grande', 'Menudencia', 'Gallina', 'Hielo', 'Bandeja de alas'
];

export function Inventory() {
  const { userRole } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);

      // Bootstrap if empty and admin
      if (prods.length === 0 && userRole?.role === 'admin') {
        bootstrapProducts();
      }
    });
    return unsubscribe;
  }, [userRole]);

  const bootstrapProducts = async () => {
    toast.info('Inicializando catálogo de productos...');
    for (const name of INITIAL_PRODUCTS_KG) {
      await addDoc(collection(db, 'products'), { name, unitType: 'kg', stock: 0, costPrice: 0, salePrice: 0, isInitial: true });
    }
    for (const name of INITIAL_PRODUCTS_UNIT) {
      await addDoc(collection(db, 'products'), { name, unitType: 'unidad', stock: 0, costPrice: 0, salePrice: 0, isInitial: true });
    }
    toast.success('Catálogo inicializado');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.unitType) return;

    try {
      if (editingProduct.id) {
        await setDoc(doc(db, 'products', editingProduct.id), editingProduct);
        toast.success('Producto actualizado');
      } else {
        await addDoc(collection(db, 'products'), {
          ...editingProduct,
          stock: editingProduct.stock || 0,
          costPrice: editingProduct.costPrice || 0,
          salePrice: editingProduct.salePrice || 0
        });
        toast.success('Producto creado');
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error('Error al guardar producto');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Producto eliminado');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const isAdmin = userRole?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
          <p className="text-xs text-[#9CA3AF]">
            Control de existencias y precios de venta en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] group-focus-within:text-[#10B981] transition-colors" />
            <Input 
              placeholder="BUSCAR PRODUCTO..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-72 h-10 border-[#1F2937] bg-[#111827] text-white focus:ring-1 focus:ring-[#10B981] placeholder:text-[#6B7280] text-xs font-mono"
            />
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProduct({ unitType: 'kg' })} className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold text-xs h-10 px-6 rounded-lg uppercase tracking-wider">
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border-[#1F2937] bg-[#111827] p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-lg font-bold tracking-tight">
                    {editingProduct?.id ? 'EDITAR PRODUCTO' : 'REGISTRAR PRODUCTO'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Nombre del Producto</label>
                    <Input 
                      required 
                      value={editingProduct?.name || ''} 
                      onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                      className="border-[#1F2937] bg-[#0A0B0D] text-white focus:ring-[#10B981]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Tipo de Unidad</label>
                      <Select 
                        value={editingProduct?.unitType} 
                        onValueChange={v => setEditingProduct({...editingProduct, unitType: v as UnitType})}
                      >
                        <SelectTrigger className="border-[#1F2937] bg-[#0A0B0D] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-[#1F2937]">
                          <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                          <SelectItem value="unidad">Unidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Stock Inicial</label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={editingProduct?.stock || 0} 
                        onChange={e => setEditingProduct({...editingProduct, stock: parseFloat(e.target.value)})}
                        className="border-[#1F2937] bg-[#0A0B0D] text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Precio Compra</label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={editingProduct?.costPrice || 0} 
                        onChange={e => setEditingProduct({...editingProduct, costPrice: parseFloat(e.target.value)})}
                        className="border-[#1F2937] bg-[#0A0B0D] text-white font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Precio Venta</label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={editingProduct?.salePrice || 0} 
                        onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})}
                        className="border-[#1F2937] bg-[#0A0B0D] text-[#10B981] font-mono font-bold"
                      />
                    </div>
                  </div>
                  <DialogFooter className="pt-4 border-t border-[#1F2937]">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-[#9CA3AF] hover:text-white hover:bg-white/5">CANCELAR</Button>
                    <Button type="submit" className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold">GUARDAR CAMBIOS</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none lg:col-span-8">
        <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#111827]">
          <h3 className="text-sm font-semibold">Inventory Status (KG/Units)</h3>
          <div className="flex gap-2">
            <span className="text-[10px] bg-emerald-900/40 text-[#10B981] px-2 py-1 rounded-md border border-emerald-900/50 uppercase font-bold tracking-widest">Live Sync</span>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#1F2937]">
              <TableRow className="hover:bg-transparent border-[#1F2937]">
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 px-6">Product Name</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Type</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Stock</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Last Cost</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Status</TableHead>
                <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right pr-6">Ops</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#1F2937]">
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-[#1F2937] transition-colors hover:bg-[#1F2937]">
                  <TableCell className="py-4 font-semibold text-[#E2E8F0] text-sm px-6">{product.name}</TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={cn(
                      "rounded-md border-none text-[9px] font-bold uppercase",
                      product.unitType === 'kg' ? "bg-blue-900/30 text-blue-400" : "bg-purple-900/30 text-purple-400"
                    )}>
                      {product.unitType}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "py-4 text-right font-mono font-bold text-sm",
                    product.stock <= 5 ? "text-orange-400 underline decoration-orange-400/50" : "text-[#E2E8F0]"
                  )}>
                    {product.stock.toFixed(product.unitType === 'kg' ? 2 : 0)} {product.unitType}
                  </TableCell>
                  <TableCell className="py-4 text-right font-mono text-xs text-[#9CA3AF]">
                    ${product.costPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider",
                      product.stock > 10 ? "text-[#10B981] bg-[#064E3B]" : product.stock > 0 ? "text-orange-400 bg-orange-900/30" : "text-red-400 bg-red-900/30"
                    )}>
                      {product.stock > 10 ? 'Optimal' : product.stock > 0 ? 'Low Stock' : 'Critical'}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       {isAdmin && (
                         <>
                           <Button 
                             onClick={() => {
                               setEditingProduct(product);
                               setIsDialogOpen(true);
                             }}
                             size="icon" 
                             variant="ghost" 
                             className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/5"
                           >
                             <Edit2 className="h-3.5 w-3.5" />
                           </Button>
                           <Button 
                             onClick={() => handleDelete(product.id)}
                             size="icon" 
                             variant="ghost" 
                             className="h-8 w-8 text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                           >
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                         </>
                       )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
