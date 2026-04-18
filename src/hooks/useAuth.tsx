import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './useFirebase';

type Role = 'admin' | 'read' | 'donor' | null;

interface AuthContextType {
  role: Role;
  donorName?: string;
  login: (password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [donorName, setDonorName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const settings = useSettings();

  useEffect(() => {
    const savedRole = localStorage.getItem('app_role') as Role;
    const savedDonorName = localStorage.getItem('app_donor_name');
    if (savedRole) {
      setRole(savedRole);
    }
    if (savedDonorName) {
      setDonorName(savedDonorName);
    }
    setIsLoading(false);
  }, []);

  const login = (password: string) => {
    const adminPass = settings?.adminPassword || 'Accessadmin';
    const readPass = settings?.readPassword || 'readaccess';

    if (password === adminPass) {
      setRole('admin');
      setDonorName(undefined);
      localStorage.setItem('app_role', 'admin');
      localStorage.removeItem('app_donor_name');
      return true;
    } else if (password === readPass) {
      setRole('read');
      setDonorName(undefined);
      localStorage.setItem('app_role', 'read');
      localStorage.removeItem('app_donor_name');
      return true;
    } else if (settings?.donors) {
      const donor = settings.donors.find(d => d.password === password);
      if (donor) {
        setRole('donor');
        setDonorName(donor.name);
        localStorage.setItem('app_role', 'donor');
        localStorage.setItem('app_donor_name', donor.name);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    setDonorName(undefined);
    localStorage.removeItem('app_role');
    localStorage.removeItem('app_donor_name');
  };

  return (
    <AuthContext.Provider value={{ role, donorName, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
