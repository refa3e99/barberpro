"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CustomerDashboard } from './components/customer-dashboard';
import { AdminDashboard } from './components/admin-dashboard';
import { logout } from '@/lib/firebase';
import { Scissors, LogOut, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push('/');
    }
  }, [user, profile, loading, router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b bg-white top-0 z-20 sticky gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-2 rounded-lg text-white shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">BarberBook Pro</span>
        </div>
        
        <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 border-t sm:border-0 pt-3 sm:pt-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Languages className="w-4 h-4" />
              {i18n.language === 'ar' ? 'English' : 'عربي'}
            </button>
            <div className="text-sm border-l border-slate-200 pl-4 h-6 flex items-center">
              <span className="text-slate-500 hidden sm:inline">{t('auth.signed_in_as')} </span>
              <span className="font-medium text-slate-900 ml-1">{profile.name}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 capitalize">
                {t(`role.${profile.role}`)}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
            title={t('auth.logout')}
          >
            <LogOut className="w-5 h-5" />
            <span className="sr-only">{t('auth.logout')}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {profile.role === 'customer' && <CustomerDashboard />}
        {profile.role === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}
