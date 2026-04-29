import React from 'react';
import { login } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function Login() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0A0B0D] font-sans overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1F2937 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>
      
      <Card className="w-[450px] border-[#1F2937] rounded-2xl bg-[#111827] shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
        <CardHeader className="text-center pt-12 pb-8">
          <div className="mx-auto mb-6 h-16 w-16 flex items-center justify-center text-[#10B981] bg-[#0A0B0D] rounded-2xl border border-[#1F2937] shadow-inner">
             <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white mb-2">
            QUE POLLO
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-[0.2em] text-[#10B981]">
            CORE ADMINISTRATION SYSTEM
          </CardDescription>
        </CardHeader>
        <CardContent className="px-12 pb-12">
          <Button 
            onClick={login} 
            className="w-full h-14 bg-[#10B981] hover:bg-[#10B981]/90 text-[#0A0B0D] font-bold uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-900/20"
          >
            Autenticarse con Google
          </Button>
          <div className="mt-10 flex flex-col gap-4 text-center">
             <div className="h-px bg-[#1F2937] w-full"></div>
             <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider leading-relaxed">
               ACCESO RESTRINGIDO <br />
               PROTOCOLO DE SEGURIDAD NIVEL 4 ACTIVO
             </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Decorative footer */}
      <div className="absolute bottom-8 text-[10px] text-[#2D3748] font-mono flex gap-8">
        <span>STU-SOUTH-CORE-V2.4</span>
        <span>LATENCY: 24MS</span>
        <span>ENCRYPTION: AES-256</span>
      </div>
    </div>
  );
}
