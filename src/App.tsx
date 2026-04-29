import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserRole, CompanyConfig } from './types';
import { Toaster } from './components/ui/sonner';
import { SidebarLayout } from './components/SidebarLayout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Purchases } from './components/Purchases';
import { Sales } from './components/Sales';
import { Cash } from './components/Cash';
import { HR } from './components/HR';
import { Settings } from './components/Settings';
import { Loader2 } from 'lucide-react';

interface AppContextType {
  user: FirebaseUser | null;
  userRole: UserRole | null;
  companyConfig: CompanyConfig | null;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch/Set user role
        const roleRef = doc(db, 'users', user.uid);
        const roleSnap = await getDoc(roleRef);
        if (roleSnap.exists()) {
          setUserRole(roleSnap.data() as UserRole);
        } else {
          // Default role for current user meta if it matches the admin email
          const isAdminEmail = user.email === 'distribucionesdelsurquepollo@gmail.com';
          const defaultRole: UserRole = {
            uid: user.uid,
            email: user.email || '',
            role: isAdminEmail ? 'admin' : 'vendedor'
          };
          await setDoc(roleRef, defaultRole);
          setUserRole(defaultRole);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    // Fetch company config
    const configUnsub = onSnapshot(doc(db, 'configs', 'company'), (doc) => {
      if (doc.exists()) {
        setCompanyConfig(doc.data() as CompanyConfig);
      }
    });

    return () => {
      unsubscribe();
      configUnsub();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A0B0D]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#10B981]" />
          <p className="text-[10px] font-bold text-[#10B981] uppercase tracking-[0.3em] font-mono">Initializing Neural Core...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'purchases': return <Purchases />;
      case 'sales': return <Sales />;
      case 'cash': return <Cash />;
      case 'hr': return <HR />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{ user, userRole, companyConfig, loading }}>
      <SidebarLayout currentTab={currentTab} setTab={setCurrentTab}>
        {renderContent()}
      </SidebarLayout>
      <Toaster position="top-right" />
    </AppContext.Provider>
  );
}
