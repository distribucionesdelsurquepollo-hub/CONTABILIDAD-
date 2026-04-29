import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc, setDoc, addDoc, serverTimestamp, orderBy, where, runTransaction, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CashSession, CashMovement } from '../types';
import { useApp } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, History, Calculator, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function Cash() {
  const { userRole, user } = useApp();
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  
  const [newMovement, setNewMovement] = useState({ type: 'in' as 'in' | 'out', amount: 0, reason: '' });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Current session for today
    const q = query(
      collection(db, 'cash_sessions'), 
      where('date', '==', todayStr),
      where('status', '==', 'open'),
      limit(1)
    );
    
    const unsub = onSnapshot(q, (sn) => {
      if (!sn.empty) {
        const session = { id: sn.docs[0].id, ...sn.docs[0].data() } as CashSession;
        setActiveSession(session);
        fetchMovements(session.id);
      } else {
        setActiveSession(null);
        setMovements([]);
      }
    });

    return unsub;
  }, [todayStr]);

  const fetchMovements = (sessionId: string) => {
    const mq = query(collection(db, `cash_sessions/${sessionId}/movements`), orderBy('timestamp', 'desc'));
    onSnapshot(mq, (sn) => {
      setMovements(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashMovement)));
    });
  };

  const handleOpenCash = async () => {
    try {
      const sessionId = todayStr;
      await setDoc(doc(db, 'cash_sessions', sessionId), {
        date: todayStr,
        openingBalance,
        status: 'open',
        startTime: serverTimestamp(),
        openedBy: user?.email || 'N/A'
      });
      setIsOpening(false);
      toast.success('Caja abierta correctamente');
    } catch (err) {
      toast.error('Error al abrir caja');
    }
  };

  const handleAddMovement = async () => {
    if (!activeSession || !newMovement.amount || !newMovement.reason) return;
    
    try {
      await addDoc(collection(db, `cash_sessions/${activeSession.id}/movements`), {
        ...newMovement,
        timestamp: serverTimestamp()
      });
      setIsMovementOpen(false);
      setNewMovement({ type: 'in', amount: 0, reason: '' });
      toast.success('Movimiento registrado');
    } catch (err) {
      toast.error('Error al registrar movimiento');
    }
  };

  const handleCloseCash = async () => {
    if (!activeSession) return;
    const finalBalance = activeSession.openingBalance + movements.reduce((acc, m) => m.type === 'in' ? acc + m.amount : acc - m.amount, 0);
    
    try {
      await setDoc(doc(db, 'cash_sessions', activeSession.id), {
        ...activeSession,
        status: 'closed',
        closingBalance: finalBalance,
        endTime: serverTimestamp()
      }, { merge: true });
      toast.success('Caja cerrada con éxito');
    } catch (err) {
      toast.error('Error al cerrar caja');
    }
  };

  const currentBalance = activeSession 
    ? activeSession.openingBalance + movements.reduce((acc, m) => m.type === 'in' ? acc + m.amount : acc - m.amount, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestión de Tesorería</h2>
          <p className="text-xs text-[#9CA3AF]">
            {todayStr} • Control de flujo de efectivo y auditoría de jornada
          </p>
        </div>

        {activeSession ? (
          <div className="flex gap-3">
             <Button onClick={() => setIsMovementOpen(true)} className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold uppercase text-[10px] tracking-widest h-10 px-6 rounded-lg">
                Registrar Operación
             </Button>
             {userRole?.role === 'admin' && (
               <Button variant="outline" onClick={handleCloseCash} className="border-red-900 text-red-500 hover:bg-red-950 font-bold uppercase text-[10px] tracking-widest h-10 px-6 rounded-lg">
                  Cerrar Auditoría
               </Button>
             )}
          </div>
        ) : (
          <Button onClick={() => setIsOpening(true)} className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold uppercase text-[10px] tracking-widest h-11 px-8 rounded-lg shadow-lg shadow-emerald-900/20">
             Apertura de Terminal de Efectivo
          </Button>
        )}
      </div>

      {!activeSession && !isOpening && (
        <Card className="border-dashed border-2 border-[#1F2937] rounded-2xl bg-[#111827]/50 h-72 flex items-center justify-center">
           <div className="text-center space-y-4 max-w-sm">
              <div className="mx-auto h-16 w-16 rounded-full bg-[#1F2937]/50 flex items-center justify-center border border-[#1F2937]">
                <Clock className="h-8 w-8 text-[#9CA3AF] animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-bold text-white uppercase tracking-tight">Terminal Fuera de Servicio</p>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-1 italic">
                  Complete el protocolo de apertura para habilitar el registro de movimientos y transacciones.
                </p>
              </div>
           </div>
        </Card>
      )}

      {activeSession && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <Card className="bg-[#111827] border-[#1F2937] md:col-span-4 rounded-xl overflow-hidden shadow-none">
              <div className="p-4 border-b border-[#1F2937] bg-[#111827]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Status de Liquidez</h3>
              </div>
              <CardContent className="pt-8 px-6 pb-6 h-full flex flex-col gap-8 bg-[#0A0B0D]">
                 <div className="space-y-1.5 p-4 bg-[#111827] rounded-xl border border-[#1F2937]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Base de Apertura</span>
                    <p className="text-2xl font-mono font-bold text-[#E2E8F0]">${activeSession.openingBalance.toLocaleString()}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-4 bg-[#111827] rounded-xl border border-[#1F2937]">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Ingresos</span>
                       <p className="text-lg font-mono font-bold text-[#10B981]">+ ${movements.filter(m => m.type === 'in').reduce((acc, m) => acc + m.amount, 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1.5 p-4 bg-[#111827] rounded-xl border border-[#1F2937]">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Egresos</span>
                       <p className="text-lg font-mono font-bold text-red-500">- ${movements.filter(m => m.type === 'out').reduce((acc, m) => acc + m.amount, 0).toLocaleString()}</p>
                    </div>
                 </div>
                 
                 <div className="mt-auto space-y-2 p-6 bg-[#16A34A]/5 rounded-2xl border border-[#16A34A]/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                       <Calculator className="h-20 w-20" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#10B981] relative z-10">Balance Actual Efectivo</span>
                    <p className="text-4xl font-mono font-bold text-[#10B981] relative z-10 tracking-tighter">${currentBalance.toLocaleString()}</p>
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-[#111827] border-[#1F2937] md:col-span-8 rounded-xl overflow-hidden shadow-none">
              <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#111827]">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Libro de Movimientos</h3>
                 <History className="h-4 w-4 text-[#9CA3AF]" />
              </div>
              <CardContent className="p-0 bg-[#0A0B0D]">
                 <Table>
                    <TableHeader className="bg-[#1F2937]">
                      <TableRow className="border-[#1F2937] hover:bg-transparent">
                        <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest px-6 h-10">Registro</TableHead>
                        <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Concepto Operativo</TableHead>
                        <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right pr-8">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-[#1F2937]">
                       {movements.map(m => (
                         <TableRow key={m.id} className="border-[#1F2937] hover:bg-[#1F2937] transition-colors group">
                            <TableCell className="px-6 py-4">
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Timestamp</span>
                                  <span className="text-xs font-mono font-bold text-[#E2E8F0]">
                                     {m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                               </div>
                            </TableCell>
                            <TableCell className="py-4">
                               <div className="text-xs font-semibold text-[#E2E8F0] uppercase tracking-tight">{m.reason}</div>
                            </TableCell>
                            <TableCell className={cn(
                              "py-4 text-right pr-8 font-mono font-bold text-sm",
                              m.type === 'in' ? "text-[#10B981]" : "text-red-500"
                            )}>
                               <div className="flex items-center justify-end gap-2">
                                  {m.type === 'in' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                  {m.type === 'in' ? '+' : '-'} ${m.amount.toLocaleString()}
                               </div>
                            </TableCell>
                         </TableRow>
                       ))}
                       {movements.length === 0 && (
                         <TableRow>
                            <TableCell colSpan={3} className="text-center py-32">
                               <div className="flex flex-col items-center gap-2 opacity-20">
                                  <History className="h-10 w-10" />
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Idle Loop - No Activities</p>
                               </div>
                            </TableCell>
                         </TableRow>
                       )}
                    </TableBody>
                 </Table>
              </CardContent>
           </Card>
        </div>
      )}

      {/* Opening Dialog */}
      <Dialog open={isOpening} onOpenChange={setIsOpening}>
         <DialogContent className="max-w-md border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-6 rounded-2xl">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold tracking-tight">AUDITORÍA DE APERTURA</DialogTitle>
               <DialogDescription className="text-[#9CA3AF]">Asignación de base de efectivo para la jornada operativa</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Fondo de Caja (Efectivo)</label>
                  <Input 
                    type="number" 
                    value={openingBalance} 
                    onChange={e => setOpeningBalance(parseFloat(e.target.value))}
                    className="bg-[#0A0B0D] border-[#1F2937] text-2xl h-16 font-mono font-bold text-[#10B981] text-center"
                  />
               </div>
               <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-[#10B981] leading-relaxed italic">
                    Declaración de Responsabilidad: <br />
                    Al confirmar, se registrará su identidad como supervisor de la terminal para la jornada actual.
                  </p>
               </div>
            </div>
            <DialogFooter className="mt-8 flex flex-col gap-2">
               <Button onClick={handleOpenCash} className="w-full bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90 font-bold h-12 uppercase tracking-widest">Ejecutar Apertura</Button>
               <Button variant="ghost" onClick={() => setIsOpening(false)} className="text-[#9CA3AF] hover:text-white uppercase text-[10px] font-bold">Cancelar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
         <DialogContent className="max-w-md border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-6 rounded-2xl">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold tracking-tight">REGISTRAR FLUJO</DialogTitle>
               <DialogDescription className="text-[#9CA3AF]">Declaración de transacción manual fuera de facturación</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-6">
               <div className="grid grid-cols-2 gap-2">
                  {['in', 'out'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setNewMovement({...newMovement, type: t as any})}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all",
                        newMovement.type === t 
                          ? t === 'in' 
                             ? "bg-emerald-900/30 border-[#10B981] text-[#10B981]" 
                             : "bg-red-900/30 border-red-500 text-red-500"
                          : "bg-[#0A0B0D] border-[#1F2937] text-[#6B7280] opacity-50"
                      )}
                    >
                      {t === 'in' ? <ArrowUpCircle /> : <ArrowDownCircle />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t === 'in' ? 'Ingreso' : 'Egreso'}</span>
                    </button>
                  ))}
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Importe Operatvo</label>
                  <Input 
                    type="number" 
                    value={newMovement.amount || ''} 
                    onChange={e => setNewMovement({...newMovement, amount: parseFloat(e.target.value)})}
                    className="bg-[#0A0B0D] border-[#1F2937] text-xl h-12 font-mono font-bold text-white pl-4"
                    placeholder="0.00"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Motivo / Glosa</label>
                  <Input 
                    placeholder="Ej: Pago de flete, Servicios, Insumos..."
                    value={newMovement.reason} 
                    onChange={e => setNewMovement({...newMovement, reason: e.target.value})}
                    className="bg-[#0A0B0D] border-[#1F2937]"
                  />
               </div>
            </div>
            <DialogFooter className="mt-8 flex flex-col gap-2">
               <Button onClick={handleAddMovement} className="w-full bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90 font-bold h-12 uppercase tracking-widest">Confirmar Registro</Button>
               <Button variant="ghost" onClick={() => setIsMovementOpen(false)} className="text-[#9CA3AF] hover:text-white uppercase text-[10px] font-bold">Abortar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
