import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/auth-provider';
import { LanguageProvider } from '@/components/language-provider';

export const metadata: Metadata = {
  title: 'BarberBook Pro',
  description: 'Barbershop reservation system',
};

import { Toaster } from 'sonner';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl">
      <body suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-center" expand={false} richColors />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
