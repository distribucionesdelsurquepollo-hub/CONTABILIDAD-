import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Purchase, CashMovement, CompanyConfig } from '../types';
import { useApp } from '../App';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, TrendingDown, DollarSign, Download, PieChart, Activity, BrainCircuit } from 'lucide-react';
import { generateFinancialReportPDF } from '../lib/pdfService';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

export function FinancialAnalysis() {
  const { companyConfig } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [generatingInsight, setGeneratingInsight] = useState(false);

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), (sn) => {
      setSales(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });
    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (sn) => {
      setPurchases(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });
    const unsubCash = onSnapshot(collection(db, 'cash_movements'), (sn) => {
      setCashMovements(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashMovement)));
    });
    setLoading(false);

    return () => {
      unsubSales();
      unsubPurchases();
      unsubCash();
    };
  }, []);

  const metrics = React.useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
    const totalPurchases = purchases.reduce((acc, p) => acc + p.total, 0);
    const grossProfit = totalSales - totalPurchases;
    
    const accountsReceivable = sales
      .filter(s => s.paymentType === 'credito')
      .reduce((acc, s) => acc + (s.total - s.amountPaid), 0);
      
    const accountsPayable = purchases
      .filter(p => p.paymentType === 'credito')
      .reduce((acc, p) => acc + (p.total - p.amountPaid), 0);

    const cashIn = cashMovements.filter(m => m.type === 'in').reduce((acc, m) => acc + m.amount, 0);
    const cashOut = cashMovements.filter(m => m.type === 'out').reduce((acc, m) => acc + m.amount, 0);
    const cashBalance = cashIn - cashOut;

    return {
      totalSales,
      totalPurchases,
      grossProfit,
      accountsReceivable,
      accountsPayable,
      cashBalance,
      salesCount: sales.length,
      margin: ((grossProfit / (totalSales || 1)) * 100).toFixed(1)
    };
  }, [sales, purchases, cashMovements]);

  const generateAiInsights = async () => {
    setGeneratingInsight(true);
    try {
      const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analiza los siguientes datos financieros de la empresa "${companyConfig?.name || 'Que Pollo'}" y proporciona 3 recomendaciones estratégicas cortas y profesionales:
      - Ventas Totales: $${metrics.totalSales}
      - Compras Totales: $${metrics.totalPurchases}
      - Utilidad Bruta: $${metrics.grossProfit}
      - Margen: ${metrics.margin}%
      - Cuentas por Cobrar: $${metrics.accountsReceivable}
      - Cuentas por Pagar: $${metrics.accountsPayable}
      - Saldo en Caja: $${metrics.cashBalance}
      
      Responde en español, usando formato Markdown amigable.`;

      const result = await model.generateContent(prompt);
      setAiInsight(result.response.text());
    } catch (error) {
      console.error(error);
      setAiInsight("No se pudo generar el análisis de IA en este momento.");
    } finally {
      setGeneratingInsight(false);
    }
  };

  const downloadReport = () => {
    generateFinancialReportPDF({
      ...metrics,
      period: 'Acumulado Histórico'
    }, companyConfig);
  };

  if (loading) return <div>Cargando analíticas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase italic">Neural Financial Hub</h2>
          <p className="text-xs text-[#9CA3AF] font-mono">Agregación de datos y análisis predictivo en tiempo real</p>
        </div>
        <Button onClick={downloadReport} className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold h-10 px-6 rounded-lg uppercase text-xs tracking-widest">
          <Download className="mr-2 h-4 w-4" /> Bajar Reporte PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', val: metrics.totalSales, icon: TrendingUp, color: 'text-[#10B981]' },
          { label: 'Costo Mercancía', val: metrics.totalPurchases, icon: TrendingDown, color: 'text-red-400' },
          { label: 'Utilidad Bruta', val: metrics.grossProfit, icon: DollarSign, color: 'text-blue-400' },
          { label: 'Margen Neto', val: `${metrics.margin}%`, icon: Activity, color: 'text-purple-400' }
        ].map((m, i) => (
          <Card key={i} className="bg-[#111827] border-[#1F2937] rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20 transition-all group-hover:opacity-100" style={{ color: m.color.split('[')[1].split(']')[0] }}></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{m.label}</span>
                <m.icon className={cn("h-4 w-4", m.color)} />
              </div>
              <div className={cn("text-2xl font-mono font-bold", m.color)}>
                {typeof m.val === 'number' ? `$${m.val.toLocaleString()}` : m.val}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         <Card className="md:col-span-8 bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1F2937] bg-emerald-950/10 flex items-center justify-between">
               <h3 className="text-xs font-bold uppercase tracking-widest text-[#10B981] flex items-center gap-2">
                 <BrainCircuit className="h-4 w-4" /> AI Strategic Insights
               </h3>
               {!aiInsight && !generatingInsight && (
                 <Button onClick={generateAiInsights} size="sm" variant="ghost" className="text-[10px] font-bold text-[#10B981] hover:bg-[#10B981]/10">
                   GENERAR ANÁLISIS
                 </Button>
               )}
            </div>
            <CardContent className="p-8 min-h-[200px]">
               {generatingInsight ? (
                 <div className="flex flex-col items-center justify-center p-10 gap-4 opacity-50">
                   <div className="h-8 w-8 border-2 border-[#10B981] border-t-transparent animate-spin rounded-full"></div>
                   <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#10B981]">Procesando métricas corporativas...</p>
                 </div>
               ) : aiInsight ? (
                 <div className="prose prose-invert prose-xs max-w-none prose-emerald">
                    <Markdown>{aiInsight}</Markdown>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-30">
                    <PieChart className="h-16 w-16 mb-4" />
                    <p className="text-sm font-medium">Haga clic en 'Generar Análisis' para obtener visión estratégica asistida por IA</p>
                 </div>
               )}
            </CardContent>
         </Card>

         <Card className="md:col-span-4 bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1F2937]">
               <h3 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Balance de Cartera</h3>
            </div>
            <CardContent className="p-6 space-y-6">
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                     <span className="text-[#9CA3AF] uppercase font-bold tracking-tight">Cuentas por Cobrar</span>
                     <span className="font-mono font-bold text-emerald-400">${metrics.accountsReceivable.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#0A0B0D] h-2 rounded-full overflow-hidden">
                     <div className="bg-emerald-400 h-full" style={{ width: '65%' }}></div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                     <span className="text-[#9CA3AF] uppercase font-bold tracking-tight">Cuentas por Pagar</span>
                     <span className="font-mono font-bold text-red-400">${metrics.accountsPayable.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#0A0B0D] h-2 rounded-full overflow-hidden">
                     <div className="bg-red-400 h-full" style={{ width: '35%' }}></div>
                  </div>
               </div>
               <div className="pt-4 mt-4 border-t border-[#1F2937]">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-white font-bold uppercase italic">Cash Liquidity</span>
                     <span className="font-mono font-bold text-[#10B981] text-xl">${metrics.cashBalance.toLocaleString()}</span>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
