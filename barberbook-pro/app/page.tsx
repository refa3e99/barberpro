"use client";

import { useAuth } from '@/components/auth-provider';
import { loginWithGoogle } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Scissors, Calendar, Clock, Star, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!loading && user && profile) {
      router.push('/dashboard');
    }
  }, [user, profile, loading, router]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      toast.success(t('auth.signed_in_as'));
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request') {
        // No-op for cancelled request
      } else {
        toast.error(t('common.toast.error_generic'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white top-0 z-10 sticky">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-2 rounded-lg text-white">
            <Scissors className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">BarberBook Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLanguage}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
          >
            <Languages className="w-4 h-4" />
            {i18n.language === 'ar' ? 'English' : 'عربي'}
          </button>
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? t('common.loading') : t('auth.login')}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-4xl space-y-8">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('landing.hero_title_1')}<br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-900"> {t('landing.hero_title_2')}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            {t('landing.subtitle')}
          </p>
          
          <div className="pt-4">
             <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={`px-8 py-4 text-lg font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoggingIn ? t('common.loading') : t('landing.book_now')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20">
            <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col items-center text-center gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-900">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{t('landing.easy_scheduling')}</h3>
              <p className="text-slate-500">{t('landing.easy_scheduling_desc')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col items-center text-center gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-900">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{t('landing.expert_barbers')}</h3>
              <p className="text-slate-500">{t('landing.expert_barbers_desc')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col items-center text-center gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-900">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{t('landing.instant_confirm')}</h3>
              <p className="text-slate-500">{t('landing.instant_confirm_desc')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
