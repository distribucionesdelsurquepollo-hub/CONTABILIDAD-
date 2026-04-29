import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, addDoc, serverTimestamp, orderBy, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, Attendance } from '../types';
import { useApp } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Users, UserPlus, Clock, CalendarDays, AlertCircle, Coffee, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function HR() {
  const { userRole } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', salary: 0, role: '' });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsubEmp = onSnapshot(collection(db, 'employees'), (sn) => {
      setEmployees(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    const unsubAtt = onSnapshot(query(collection(db, 'attendance'), where('date', '==', todayStr)), (sn) => {
      setAttendance(sn.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    });

    return () => {
      unsubEmp();
      unsubAtt();
    };
  }, [todayStr]);

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.salary) return;
    await addDoc(collection(db, 'employees'), newEmployee);
    setNewEmployee({ name: '', salary: 0, role: '' });
    setIsEmployeeDialogOpen(false);
    toast.success('Empleado registrado');
  };

  const handleCheckIn = async (employeeId: string) => {
    const now = new Date();
    const scheduleIn = new Date();
    scheduleIn.setHours(6, 0, 0, 0); // Standard start 6:00 AM

    const isLate = now > scheduleIn;

    try {
      await addDoc(collection(db, 'attendance'), {
        employeeId,
        date: todayStr,
        checkIn: serverTimestamp(),
        isLate,
        isEarlyLeave: false
      });
      toast.success('Entrada registrada');
    } catch (err) {
      toast.error('Error al registrar entrada');
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    const now = new Date();
    const scheduleOut = new Date();
    scheduleOut.setHours(19, 0, 0, 0); // Standard end 7:00 PM

    const isEarlyLeave = now < scheduleOut;

    try {
      await updateDoc(doc(db, 'attendance', attendanceId), {
        checkOut: serverTimestamp(),
        isEarlyLeave
      });
      toast.success('Salida registrada');
    } catch (err) {
      toast.error('Error al registrar salida');
    }
  };

  const isAdmin = userRole?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestión de Talento</h2>
          <p className="text-xs text-[#9CA3AF]">
            Control de asistencia y administración de capital humano
          </p>
        </div>

        {isAdmin && (
          <Button onClick={() => setIsEmployeeDialogOpen(true)} className="bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold uppercase text-[10px] tracking-widest h-10 px-6 rounded-lg">
            <UserPlus className="mr-2 h-4 w-4" /> Registrar Nuevo Empleado
          </Button>
        )}
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="bg-[#111827] border border-[#1F2937] p-1 h-12 rounded-xl">
          <TabsTrigger value="attendance" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-8 data-[state=active]:bg-[#1F2937] data-[state=active]:text-white text-[#9CA3AF]">
            Panel de Asistencia
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-8 data-[state=active]:bg-[#1F2937] data-[state=active]:text-white text-[#9CA3AF]">
            Nómina Operativa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="pt-6 space-y-6">
          <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none">
            <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#111827]">
              <h3 className="text-sm font-semibold text-white">Log de Entradas y Salidas - {todayStr}</h3>
              <CalendarDays className="h-4 w-4 text-[#9CA3AF]" />
            </div>
            <CardContent className="p-0 bg-[#0A0B0D]">
               <Table>
                  <TableHeader className="bg-[#1F2937]">
                    <TableRow className="border-[#1F2937] hover:bg-transparent">
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest px-6 h-10">Empleado</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Inbound</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Outbound</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Status</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right pr-6">Acción de Terminal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-[#1F2937]">
                     {employees.map(emp => {
                       const att = attendance.find(a => a.employeeId === emp.id);
                       return (
                         <TableRow key={emp.id} className="border-[#1F2937] hover:bg-[#1F2937] transition-colors group">
                            <TableCell className="px-6 py-4">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-[#E2E8F0] uppercase tracking-tight">{emp.name}</span>
                                  <span className="text-[10px] text-[#9CA3AF] font-mono">{emp.role || 'Operativo'}</span>
                               </div>
                            </TableCell>
                            <TableCell className="py-4 font-mono text-xs text-[#E2E8F0]">
                               {att?.checkIn ? att.checkIn.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ':: -- : --'}
                            </TableCell>
                            <TableCell className="py-4 font-mono text-xs text-[#E2E8F0]">
                               {att?.checkOut ? att.checkOut.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ':: -- : --'}
                            </TableCell>
                            <TableCell className="py-4">
                               <div className="flex gap-2">
                                  {att?.isLate && (
                                     <Badge className="bg-red-950 text-red-500 border-red-900 border text-[8px] font-bold uppercase tracking-widest h-5">
                                        <AlertCircle className="h-2 w-2 mr-1" /> Delay
                                     </Badge>
                                  )}
                                  {att?.checkIn && !att.isLate && (
                                     <Badge className="bg-emerald-950 text-[#10B981] border-emerald-900 border text-[8px] font-bold uppercase tracking-widest h-5">
                                        On Time
                                     </Badge>
                                  )}
                                  {!att && (
                                     <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-widest italic animate-pulse">Awaiting Check-in...</span>
                                  )}
                               </div>
                            </TableCell>
                            <TableCell className="py-4 text-right pr-6">
                               {!att ? (
                                 <Button size="sm" onClick={() => handleCheckIn(emp.id)} className="bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90 h-8 uppercase font-bold text-[9px] tracking-widest px-4 rounded-md shadow-lg shadow-emerald-900/10">
                                    Registrar Entrada
                                 </Button>
                               ) : !att.checkOut ? (
                                 <Button size="sm" onClick={() => handleCheckOut(att.id)} className="bg-red-900 text-red-100 hover:bg-red-800 h-8 uppercase font-bold text-[9px] tracking-widest px-4 rounded-md">
                                    Registrar Salida
                                 </Button>
                               ) : (
                                 <Badge variant="outline" className="text-gray-600 border-gray-800 uppercase text-[8px] font-bold">Shift Completed</Badge>
                               )}
                            </TableCell>
                         </TableRow>
                       );
                     })}
                  </TableBody>
               </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none border-l-4 border-l-amber-600">
                <CardHeader className="bg-[#1F2937]/30 pb-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center text-amber-500">
                    <Coffee className="mr-2 h-4 w-4" /> BREAK PROTOCOL (AM)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6 bg-[#0A0B0D]">
                   <p className="text-2xl font-mono font-bold text-white mb-2">08:15 — 08:30</p>
                   <p className="text-xs text-[#9CA3AF] uppercase tracking-wide leading-relaxed">Intervalo de refrigerio coordinado. El personal debe turnarse para no afectar la operación en mostrador.</p>
                </CardContent>
             </Card>
             <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none border-l-4 border-l-blue-600">
                <CardHeader className="bg-[#1F2937]/30 pb-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center text-blue-500">
                    <Utensils className="mr-2 h-4 w-4" /> LUNCH SYNC GRID
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6 bg-[#0A0B0D]">
                   <p className="text-2xl font-mono font-bold text-white mb-2">12:00 — 14:00</p>
                   <p className="text-xs text-[#9CA3AF] uppercase tracking-wide leading-relaxed">Ventana de alimentación principal. Se asignarán sub-grupos de salida para garantizar continuidad de servicio.</p>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="pt-6">
           <Card className="bg-[#111827] border-[#1F2937] rounded-xl overflow-hidden shadow-none">
            <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#111827]">
               <h3 className="text-sm font-semibold text-white">Database de Personal y Parámetros Financieros</h3>
               <div className="flex gap-2">
                  <span className="text-[9px] bg-emerald-950/30 text-[#10B981] border border-emerald-900 border-none px-2 py-0.5 rounded uppercase font-bold tracking-widest">Active Units: {employees.length}</span>
               </div>
            </div>
            <CardContent className="p-0 bg-[#0A0B0D]">
                <Table>
                  <TableHeader className="bg-[#1F2937]">
                    <TableRow className="border-[#1F2937] hover:bg-transparent">
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest px-6 h-10">Identidad</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10">Posición</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Quota (Quincena)</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right">Credit Line (MAX)</TableHead>
                      <TableHead className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest h-10 text-right pr-6">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-[#1F2937]">
                     {employees.map(emp => (
                       <TableRow key={emp.id} className="border-[#1F2937] hover:bg-[#1F2937] transition-colors group">
                          <TableCell className="px-6 py-4 font-bold text-xs uppercase text-[#E2E8F0] tracking-tight">{emp.name}</TableCell>
                          <TableCell className="py-4">
                             <Badge variant="outline" className="text-[9px] border-[#1F2937] text-[#9CA3AF] font-bold uppercase tracking-widest">
                                {emp.role || 'Operativo'}
                             </Badge>
                          </TableCell>
                          <TableCell className="text-right py-4 font-mono font-bold text-sm text-[#E2E8F0]">${emp.salary.toLocaleString()}</TableCell>
                          <TableCell className="text-right py-4 font-mono text-xs text-blue-500 font-bold bg-blue-950/10">
                             ${(emp.salary * 0.3).toLocaleString()} <span className="text-[8px] opacity-40 ml-1">(30%)</span>
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4">
                             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] hover:text-white hover:bg-[#111827]">
                                Ver Perfil
                             </Button>
                          </TableCell>
                       </TableRow>
                     ))}
                  </TableBody>
                </Table>
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* New Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
         <DialogContent className="max-w-md border-[#1F2937] bg-[#111827] text-[#E2E8F0] p-6 rounded-2xl">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold tracking-tight uppercase">Alta de Personal</DialogTitle>
               <DialogDescription className="text-[#9CA3AF]">Inclusión de nueva unidad operativa al sistema core</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 pt-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Identidad Nominal</label>
                  <Input 
                    value={newEmployee.name} 
                    onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="bg-[#0A0B0D] border-[#1F2937] focus:ring-[#10B981]"
                    placeholder="Ingrese nombre completo..."
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Rol Operativo</label>
                  <Input 
                    placeholder="Vendedor, Bodega, Logística..."
                    value={newEmployee.role} 
                    onChange={e => setNewEmployee({...newEmployee, role: e.target.value})}
                    className="bg-[#0A0B0D] border-[#1F2937] focus:ring-[#10B981]"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Sueldo Base (Quincenal)</label>
                  <Input 
                    type="number"
                    value={newEmployee.salary || ''} 
                    onChange={e => setNewEmployee({...newEmployee, salary: parseFloat(e.target.value)})}
                    className="bg-[#0A0B0D] border-[#1F2937] focus:ring-[#10B981] font-mono text-white"
                  />
               </div>
            </div>
            <DialogFooter className="mt-8 flex flex-col gap-2">
               <Button onClick={handleAddEmployee} className="w-full bg-[#10B981] text-[#0A0B0D] hover:bg-[#10B981]/90 font-bold h-12 uppercase tracking-widest">Ejecutar Registro</Button>
               <Button variant="ghost" onClick={() => setIsEmployeeDialogOpen(false)} className="text-[#9CA3AF] hover:text-white uppercase text-[10px] font-bold">Cancelar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
