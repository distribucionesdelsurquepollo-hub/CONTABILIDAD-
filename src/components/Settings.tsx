import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Settings as SettingsIcon, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const { companyConfig } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(companyConfig || {
    name: 'DISTRIBUCIONES DEL SUR QUE POLLO',
    nit: '',
    phone1: '3173315203',
    phone2: '',
    address: '',
    warehouseAddress: 'Calle 9 CR 11-33 El Carmen',
    email: 'distribucionesdelsurquepollo@gmail.com',
    manager: 'Jorge Luis Lasprilla',
    logoUrl: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'configs', 'company'), formData);
      toast.success('Configuración guardada correctamente');
    } catch (err) {
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Configuración del Sistema</h2>
          <p className="text-xs text-[#9CA3AF]">
            Parámetros globales y metadatos corporativos
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="bg-[#111827] border-[#1F2937] md:col-span-7 rounded-xl overflow-hidden shadow-none">
          <div className="p-4 border-b border-[#1F2937] bg-[#111827]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Perfil Corporativo</h3>
          </div>
          <CardContent className="space-y-6 pt-8 px-6 pb-8 bg-[#0A0B0D]">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Identidad Jurídica / Comercial</label>
              <Input 
                 value={formData.name} 
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="bg-[#111827] border-[#1F2937] text-white focus:ring-[#10B981] font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Número de Identificación Tributaria (NIT)</label>
                  <Input 
                    value={formData.nit} 
                    onChange={e => setFormData({...formData, nit: e.target.value})}
                    className="bg-[#111827] border-[#1F2937] text-white font-mono"
                    placeholder="--- --- --- - ---"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Representante Legal / Gerente</label>
                  <Input 
                    value={formData.manager} 
                    onChange={e => setFormData({...formData, manager: e.target.value})}
                    className="bg-[#111827] border-[#1F2937] text-white"
                  />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Canal de Contacto Primario</label>
                  <Input 
                    value={formData.phone1} 
                    onChange={e => setFormData({...formData, phone1: e.target.value})}
                    className="bg-[#111827] border-[#1F2937] text-white font-mono"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Canal Secundario</label>
                  <Input 
                    value={formData.phone2} 
                    onChange={e => setFormData({...formData, phone2: e.target.value})}
                    className="bg-[#111827] border-[#1F2937] text-white font-mono"
                  />
               </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Endpoint de Comunicación (Email)</label>
              <Input 
                 type="email"
                 value={formData.email} 
                 onChange={e => setFormData({...formData, email: e.target.value})}
                 className="bg-[#111827] border-[#1F2937] text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937] md:col-span-5 rounded-xl overflow-hidden shadow-none">
          <div className="p-4 border-b border-[#1F2937] bg-[#111827]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Logística y Visual</h3>
          </div>
          <CardContent className="space-y-6 pt-8 px-6 pb-8 bg-[#0A0B0D]">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Sede Administrativa</label>
              <Input 
                 value={formData.address} 
                 onChange={e => setFormData({...formData, address: e.target.value})}
                 className="bg-[#111827] border-[#1F2937] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Centro de Almacenamiento (Bodega)</label>
              <Input 
                 value={formData.warehouseAddress} 
                 onChange={e => setFormData({...formData, warehouseAddress: e.target.value})}
                 className="bg-[#111827] border-[#1F2937] text-white font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Identidad Visual (Source URL)</label>
              <div className="flex gap-3">
                 <Input 
                    placeholder="https://cloud.storage/logo.png"
                    value={formData.logoUrl} 
                    onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                    className="bg-[#111827] border-[#1F2937] text-white flex-1 text-xs"
                 />
                 <div className="h-10 w-10 border border-[#1F2937] rounded-lg flex items-center justify-center bg-[#0A0B0D] overflow-hidden">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-[#374151]" />
                    )}
                 </div>
              </div>
            </div>
            
            <div className="pt-8">
               <Button type="submit" disabled={loading} className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold h-12 uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-900/10">
                  <Save className="mr-2 h-4 w-4" />
                  Sincronizar Cambios
               </Button>
               <p className="text-[9px] text-[#4B5563] text-center mt-4 uppercase tracking-[0.2em] font-bold">
                 Los cambios se propagarán a todos los documentos generados
               </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
