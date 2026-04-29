import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Wallet, 
  Users, 
  Settings as SettingsIcon, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  PieChart
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useApp } from '../App';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface SidebarLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  setTab: (tab: string) => void;
}

export function SidebarLayout({ children, currentTab, setTab }: SidebarLayoutProps) {
  const { userRole, companyConfig } = useApp();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'purchases', label: 'Compras', icon: ShoppingCart },
    { id: 'sales', label: 'Ventas', icon: TrendingUp },
    { id: 'cash', label: 'Caja', icon: Wallet },
    { id: 'hr', label: 'Recursos Humanos', icon: Users },
    { id: 'analysis', label: 'Análisis Financiero', icon: PieChart, adminOnly: true },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon, adminOnly: true },
  ];

  const filteredItems = menuItems.filter(item => !item.adminOnly || userRole?.role === 'admin');

  return (
    <div className="flex h-screen bg-[#0A0B0D] font-sans text-[#E2E8F0] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 border-r border-[#1F2937] bg-[#111827] md:flex md:flex-col">
        <div className="p-6 border-b border-[#1F2937]">
          <div className="text-[#10B981] font-bold text-[10px] tracking-widest uppercase mb-1">
            {companyConfig?.name}
          </div>
          <div className="text-xl font-bold leading-tight tracking-tight uppercase">
            {companyConfig?.name?.includes('Sur') ? 'QUE POLLO' : 'POS SYSTEM'}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "group flex w-full items-center px-4 py-2 text-sm transition-all duration-200 rounded-lg cursor-pointer gap-3",
                currentTab === item.id 
                  ? "bg-[#1F2937] text-white" 
                  : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", currentTab === item.id ? "text-[#10B981]" : "text-[#9CA3AF]")} />
              <span>{item.label}</span>
              {currentTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981]" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1F2937] space-y-4">
          <div className="bg-[#0A0B0D] p-3 rounded-xl border border-[#1F2937]">
            <div className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Status: Online</div>
            <div className="text-xs font-mono text-[#10B981]">v2.0.4 - Secure</div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => auth.signOut()}
            className="w-full justify-start text-[#9CA3AF] hover:text-white hover:bg-white/5 h-9"
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Nav Trigger */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Button size="icon" variant="outline" onClick={() => setMobileOpen(!mobileOpen)} className="border-[#1F2937] bg-[#111827] text-[#10B981] rounded-xl shadow-lg">
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col bg-[#0A0B0D]">
        {/* Header Bar */}
        <header className="h-16 border-b border-[#1F2937] flex items-center justify-between px-8 bg-[#111827]">
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#6B7280] font-mono whitespace-nowrap">SYS_VER: 2.0.4</span>
            <div className="h-4 w-[1px] bg-[#1F2937]"></div>
            <span className="text-xs font-medium text-[#D1D5DB] truncate max-w-[200px]">
              {auth.currentUser?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-[#9CA3AF] uppercase font-bold">Today</span>
              <span className="text-sm font-mono">{new Date().toISOString().split('T')[0]}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center font-bold text-xs text-[#0A0B0D]">
              {auth.currentUser?.email?.substring(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
             {children}
          </div>
        </div>
      </main>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#0A0B0D] md:hidden">
          <div className="flex flex-col h-full pt-20 p-4 space-y-2">
             {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-6 py-4 text-sm rounded-xl transition-all",
                    currentTab === item.id ? "bg-[#111827] text-white border border-[#1F2937]" : "text-[#9CA3AF]"
                  )}
                >
                  <item.icon className={cn("mr-4 h-5 w-5", currentTab === item.id ? "text-[#10B981]" : "")} />
                  {item.label}
                </button>
              ))}
              <Button
                variant="ghost"
                onClick={() => auth.signOut()}
                className="w-full justify-start text-red-500 hover:bg-red-500/10 mt-auto"
              >
                <LogOut className="mr-4 h-5 w-5" />
                Cerrar Sesión
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}
