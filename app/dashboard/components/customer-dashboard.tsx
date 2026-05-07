"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Appointment, Service, UserProfile } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { handleFirestoreError, OperationType } from '@/lib/error-handling';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/confirm-modal';
import { toast } from 'sonner';

export function CustomerDashboard() {
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barber, setBarber] = useState<UserProfile | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);

  // Booking Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [formError, setFormError] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const startBooking = () => {
    if (profile && !customerName) {
      setCustomerName(profile.name || '');
    }
    setIsBooking(true);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Load user's appointments
      const apptsQ = query(collection(db, 'appointments'), where('customerId', '==', user.uid));
      const apptsSnap = await getDocs(apptsQ);
      setAppointments(apptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
      
      // Load active services
      const srvQ = query(collection(db, 'services'), where('isActive', '==', true));
      const srvSnap = await getDocs(srvQ);
      setServices(srvSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));

      // Load admin as the barber
      const adminQ = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnap = await getDocs(adminQ);
      if (!adminSnap.empty) {
        setBarber(adminSnap.docs[0].data() as UserProfile);
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError(t('common.complete_all_fields'));
      return;
    }

    const phoneRegex = /^(?:00962|\+962|0)7[789]\d{7}$/;
    if (!phoneRegex.test(customerPhone)) {
      setFormError(t('common.valid_phone_jordan'));
      return;
    }

    if (!selectedService || !barber || !selectedDate) {
      setFormError(t('common.complete_all_fields'));
      return;
    }
    
    // Convert local datetime to Firestore Timestamp
    const startDate = new Date(selectedDate);
    const now = new Date();

    if (startDate <= now) {
      setFormError(t('common.future_only'));
      return;
    }

    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    const endDate = new Date(startDate.getTime() + service.duration * 60000);

    try {
      await addDoc(collection(db, 'appointments'), {
        customerId: user?.uid,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        barberId: barber.userId,
        serviceId: selectedService,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsBooking(false);
      setSelectedService('');
      setSelectedDate('');
      setCustomerPhone('');
      loadData();
      toast.success(t('common.toast.success_booking'));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'appointments');
      toast.error(t('common.toast.error_generic'));
    }
  };

  const handleCancel = async () => {
    if (!cancelAppointment) return;
    try {
      await updateDoc(doc(db, 'appointments', cancelAppointment.id!), {
        status: 'canceled',
        updatedAt: serverTimestamp()
      });
      setCancelAppointment(null);
      loadData();
      toast.success(t('common.toast.success_cancel'));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${cancelAppointment.id}`);
      toast.error(t('common.toast.error_generic'));
    }
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-slate-500 font-bold">{t('common.loading')}</div>;

  return (
    <div className="space-y-8">
      {/* Booking Dialog Simple Inline */}
      {isBooking ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('dashboard.new_booking')}</h2>
          <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
            {formError && (
              <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-bold">
                {formError}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.customer_name')} <span className="text-red-500">*</span></label>
              <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('dashboard.customer_name')} className="w-full border-slate-200 rounded-lg px-4 py-2.5 border outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.customer_phone')} <span className="text-red-500">*</span></label>
              <input required type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="07XXXXXXXX" className="w-full border-slate-200 rounded-lg px-4 py-2.5 border outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
              <p className="text-[10px] text-slate-400 font-medium">{t('common.valid_phone_jordan')}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.service')} <span className="text-red-500">*</span></label>
              <select required value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2.5 border outline-none focus:ring-2 focus:ring-slate-900 font-medium transition-all">
                <option value="" disabled>{t('dashboard.service')}...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - {s.duration} {t('dashboard.mins')} ({s.price} {t('dashboard.currency')})</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.timing')} <span className="text-red-500">*</span></label>
              <input type="datetime-local" required value={selectedDate} min={format(new Date(), "yyyy-MM-dd'T'HH:mm")} onChange={e => setSelectedDate(e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2.5 border outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium" />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
              <button type="submit" className="w-full sm:w-auto order-1 sm:order-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95">{t('dashboard.confirm_booking')}</button>
              <button type="button" onClick={() => setIsBooking(false)} className="w-full sm:w-auto order-2 sm:order-1 px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">{t('dashboard.new_booking')}</h2>
            <p className="text-slate-500">{t('landing.subtitle')}</p>
          </div>
          <button onClick={startBooking} className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
            {t('dashboard.new_booking')}
          </button>
        </div>
      )}

      {/* Appointments List */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.my_appointments')}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.filter(a => a.status !== 'canceled' && a.status !== 'completed')
            .sort((a,b) => a.startTime?.toMillis() - b.startTime?.toMillis())
            .map(a => {
            const service = services.find(s => s.id === a.serviceId);
            const startTime = a.startTime?.toDate();
            const endTime = a.endTime?.toDate();
            const isCurrent = startTime && endTime && now >= startTime && now <= endTime;
            
            return (
              <div key={a.id} className={`p-5 rounded-xl border flex flex-col h-full shadow-sm hover:shadow-md transition-all ${isCurrent ? 'bg-green-50/70 border-green-600 border-2' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                    isCurrent ? 'bg-green-600 text-white animate-pulse' :
                    a.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isCurrent ? t('dashboard.live_now') : t(`status.${a.status}`)}
                  </span>
                  <span className="text-slate-400 font-bold text-xs">{service?.price || '0'} {t('dashboard.currency')}</span>
                </div>
                <div className="mb-4">
                  <h4 className={`font-bold text-lg leading-tight ${isCurrent ? 'text-green-900' : 'text-slate-900'}`}>{service?.name || t('dashboard.unknown_service')}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {service?.duration} {t('dashboard.mins')}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-sm mb-6 flex flex-col gap-1 ${isCurrent ? 'bg-green-100/50 text-green-900' : 'bg-slate-50 text-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 opacity-50" />
                    <span>{a.startTime?.toDate ? format(a.startTime.toDate(), 'EEEE, MMMM d', { locale: i18n.language === 'ar' ? ar : enUS }) : t('dashboard.invalid_date')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-50" />
                    <span className="font-medium">{a.startTime?.toDate ? format(a.startTime.toDate(), 'HH:mm', { locale: i18n.language === 'ar' ? ar : enUS }) : t('dashboard.invalid_time')}</span>
                  </div>
                </div>
                <div className="mt-auto border-t border-slate-100 pt-3">
                  <button onClick={() => setCancelAppointment(a)} className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            );
          })}
          {appointments.filter(a => a.status !== 'canceled' && a.status !== 'completed').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
              {t('dashboard.no_appointments')}
            </div>
          )}
        </div>
      </div>
      
      {/* Past/Canceled */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 opacity-60">{t('dashboard.appointments')}</h3>
        <div className="space-y-3">
          {appointments.filter(a => a.status === 'canceled' || a.status === 'completed').map(a => {
            const service = services.find(s => s.id === a.serviceId);
            return (
              <div key={a.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-bold text-slate-900 whitespace-nowrap">{service?.name || t('dashboard.service')}</span>
                  <span className="text-slate-500 text-sm">
                    {a.startTime?.toDate ? a.startTime.toDate().toLocaleDateString(i18n.language === 'ar' ? 'ar' : 'en-US') : ''}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                  {t(`status.${a.status}`)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!cancelAppointment}
        onClose={() => setCancelAppointment(null)}
        onConfirm={handleCancel}
      />
    </div>
  );
}
