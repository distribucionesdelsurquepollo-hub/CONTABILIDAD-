import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Purchase, Product } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, ShoppingCart, Package, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '../lib/utils';

export function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const sUnsub = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc'), limit(50)), (sn) => {
      setSales(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });
    const pUnsub = onSnapshot(query(collection(db, 'purchases'), orderBy('date', 'desc'), limit(50)), (sn) => {
      setPurchases(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });
    const prUnsub = onSnapshot(collection(db, 'products'), (sn) => {
      setProducts(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    return () => { sUnsub(); pUnsub(); prUnsub(); };
  }, []);

  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.total, 0);
  const lowStock = products.filter(p => p.stock <= 5).length;

  // Prepare chart data (last 7 days simulated from fetched sales)
  const chartData = [
    { name: 'Lun', ventas: 4000, compras: 2400 },
    { name: 'Mar', ventas: 3000, compras: 1398 },
    { name: 'Mie', ventas: 2000, compras: 9800 },
    { name: 'Jue', ventas: 2780, compras: 3908 },
    { name: 'Vie', ventas: 1890, compras: 4800 },
    { name: 'Sab', ventas: 2390, compras: 3800 },
    { name: 'Dom', ventas: 3490, compras: 4300 },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Vista General</h2>
        <p className="text-xs text-[#9CA3AF]">Análisis operativo y métricas de rendimiento en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard 
            title="Ventas Totales" 
            value={`$${totalSales.toLocaleString()}`} 
            icon={<TrendingUp className="h-4 w-4" />} 
            trend="+12.5%" 
            trendUp={true}
         />
         <StatCard 
            title="Compras" 
            value={`$${totalPurchases.toLocaleString()}`} 
            icon={<ShoppingCart className="h-4 w-4" />} 
            trend="-2.4%" 
            trendUp={false}
         />
         <StatCard 
            title="Stock Bajo" 
            value={lowStock.toString()} 
            icon={<Package className="h-4 w-4" />} 
            trend={`${products.length} productos total`}
            trendUp={lowStock === 0}
         />
         <StatCard 
            title="Saldos por Cobrar" 
            value="$1,240,000" 
            icon={<ArrowUpRight className="h-4 w-4" />} 
            trend="Pendiente"
            trendUp={false}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="bg-[#111827] border-[#1F2937] rounded-xl shadow-none">
            <CardHeader className="border-b border-[#1F2937]">
               <CardTitle className="text-sm font-semibold">Ventas vs Compras (Semanal)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} stroke="#6B7280" />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} stroke="#6B7280" tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', color: '#E2E8F0', borderRadius: '8px' }}
                      itemStyle={{ color: '#10B981', fontSize: '10px', textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="ventas" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="compras" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>

         <Card className="bg-[#111827] border-[#1F2937] rounded-xl shadow-none">
            <CardHeader className="border-b border-[#1F2937]">
               <CardTitle className="text-sm font-semibold">Últimas Ventas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-[#1F2937]">
                  {sales.slice(0, 6).map((s) => (
                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-[#1F2937] transition-all group">
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#E2E8F0]">{s.customerName}</span>
                          <span className="text-[10px] text-[#9CA3AF] uppercase tracking-tighter">{s.date?.toDate().toLocaleTimeString()}</span>
                       </div>
                       <span className="text-xs font-mono font-bold text-[#10B981] group-hover:scale-105 transition-transform">
                         ${s.total.toLocaleString()}
                       </span>
                    </div>
                  ))}
                  {sales.length === 0 && (
                    <div className="p-10 text-center text-[#6B7280] text-[10px] uppercase tracking-widest">No hay ventas registradas</div>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendUp }: any) {
  return (
    <Card className="bg-[#111827] border-[#1F2937] rounded-xl shadow-none transition-all hover:bg-[#1F2937]/50">
       <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
             <div className="p-2 border border-[#1F2937] bg-[#0A0B0D] rounded-lg">
                {icon}
             </div>
             <div className={cn(
                "flex items-center text-[10px] font-bold px-2 py-1 rounded",
                trendUp ? "bg-[#064E3B] text-[#10B981]" : "bg-red-900/20 text-red-400"
             )}>
                {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {trend}
             </div>
          </div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-bold mb-1">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
       </CardContent>
    </Card>
  );
}
