"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, Timestamp, where } from 'firebase/firestore';
import { Service, UserProfile, Appointment } from '@/lib/types';
import { handleFirestoreError, OperationType } from '@/lib/error-handling';
import { useAuth } from '@/components/auth-provider';
import { Plus, Trash2, Edit, Scissors, CalendarCheck, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  startOfDay,
  endOfDay,
  addDays
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/confirm-modal';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'services' | 'appointments' | 'availability'>('services');
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <TabButton icon={<Scissors className="w-4 h-4"/>} label={t('dashboard.services_catalog')} active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
          <TabButton icon={<CalendarCheck className="w-4 h-4"/>} label={t('dashboard.salon_schedule')} active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
          <TabButton icon={<Clock className="w-4 h-4"/>} label={t('dashboard.availability')} active={activeTab === 'availability'} onClick={() => setActiveTab('availability')} />
        </div>
      </div>

      {activeTab === 'services' && <ManageServices />}
      {activeTab === 'appointments' && <ManageAppointments />}
      {activeTab === 'availability' && <ManageAvailability />}
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ManageServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', duration: 30, price: 25, isActive: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  const loadServices = useCallback(async () => {
    try {
      const q = query(collection(db, 'services'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadServices();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadServices]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), {
          name: formData.name,
          duration: formData.duration,
          price: formData.price,
          isActive: formData.isActive
        });
        toast.success(t('common.toast.success_update'));
      } else {
        await addDoc(collection(db, 'services'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success(t('common.toast.success_add'));
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', duration: 30, price: 25, isActive: true });
      loadServices();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'services');
      toast.error(t('common.toast.error_generic'));
    }
  };

  const handleEdit = (service: Service) => {
    setFormData({ 
      name: service.name, 
      duration: service.duration, 
      price: service.price, 
      isActive: service.isActive 
    });
    setEditingId(service.id!);
    setIsAdding(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'services', deleteId));
      setDeleteId(null);
      loadServices();
      toast.success(t('common.toast.success_delete'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `services/${deleteId}`);
      toast.error(t('common.toast.error_generic'));
    }
  };

  const handleToggleActive = async (id: string, current: boolean, service: Service) => {
    try {
      await updateDoc(doc(db, 'services', id), {
        name: service.name,
        duration: service.duration,
        price: service.price,
        isActive: !current,
        createdAt: service.createdAt
      });
      loadServices();
      toast.success(t('common.toast.success_status'));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `services/${id}`);
      toast.error(t('common.toast.error_generic'));
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12 text-slate-500 font-bold">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.services_catalog')}</h2>
          <p className="text-sm text-slate-500">{t('dashboard.manage_salon_offers')}</p>
        </div>
        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', duration: 30, price: 25, isActive: true }); }} className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-sm hover:shadow-md">
          <Plus className="w-4 h-4" /> {t('common.add_service')}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-end flex-wrap gap-5">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.service_name')} <span className="text-red-500">*</span></label>
            <input required type="text" placeholder={t('dashboard.service_name_placeholder')} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
          </div>
          <div className="flex gap-5 w-full lg:w-auto">
            <div className="flex flex-col gap-1.5 flex-1 lg:w-32">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.duration')} <span className="text-red-500">*</span></label>
              <input required type="number" min="5" step="5" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 lg:w-32">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.price')} <span className="text-red-500">*</span></label>
              <input required type="number" min="0" step="1" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 w-full lg:w-auto">
            <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 transition-all" />
            <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer whitespace-nowrap">{t('common.active')}</label>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 ml-auto w-full lg:w-auto pt-2 lg:pt-0">
            <button type="submit" className="w-full sm:w-auto order-1 sm:order-2 px-6 py-2.5 text-sm bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-sm transition-all whitespace-nowrap">{t('dashboard.save_service')}</button>
            <button type="button" onClick={() => setIsAdding(false)} className="w-full sm:w-auto order-2 sm:order-1 px-6 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition-colors whitespace-nowrap">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {services.map(s => (
            <div key={s.id} className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 text-[10px] rounded-md font-bold uppercase tracking-wider ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                  {s.isActive ? t('common.active') : t('common.inactive')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.price} {t('dashboard.currency')}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg leading-tight">{s.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-slate-400" /> {s.duration} {t('dashboard.mins')}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                <button 
                  onClick={() => handleToggleActive(s.id!, s.isActive, s)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {s.isActive ? t('common.inactive') : t('common.active')}
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(s)} 
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> {t('common.edit')}
                  </button>
                  <button 
                    onClick={() => setDeleteId(s.id!)} 
                    className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{t('common.actions')}</th>
                <th className="px-4 py-3">{t('dashboard.duration')}</th>
                <th className="px-4 py-3">{t('dashboard.price')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.duration}</td>
                  <td className="px-4 py-3 text-slate-600">{s.price} {t('dashboard.currency')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(s.id!, s.isActive, s)} className={`px-2 py-1 text-xs rounded-full font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {s.isActive ? t('common.active') : t('common.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(s)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(s.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {services.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-500 bg-white">{t('dashboard.no_services')}</div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ManageAvailability() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotType, setSlotType] = useState<'working' | 'blocked'>('working');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  const loadAvailability = useCallback(async () => {
    if (!user) return;
    try {
      const q = collection(db, 'users', user.uid, 'availability');
      const snapshot = await getDocs(q);
      setAvailability(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${user?.uid}/availability`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAvailability();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAvailability]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users', user!.uid, 'availability'), {
        type: slotType,
        startTime: Timestamp.fromDate(new Date(startDate)),
        endTime: Timestamp.fromDate(new Date(endDate)),
      });
      setStartDate('');
      setEndDate('');
      loadAvailability();
      toast.success(t('common.toast.success_add'));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user?.uid}/availability`);
      toast.error(t('common.toast.error_generic'));
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'users', user!.uid, 'availability', deleteId));
      setDeleteId(null);
      loadAvailability();
      toast.success(t('common.toast.success_delete'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user?.uid}/availability/${deleteId}`);
      toast.error(t('common.toast.error_generic'));
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12 text-slate-500 font-bold">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5"/> {t('dashboard.add_slot')}
        </h3>
        <form onSubmit={handleAddSlot} className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 flex-1 w-full">
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.slot_type')}</label>
              <select value={slotType} onChange={e => setSlotType(e.target.value as any)} className="w-full border-slate-200 rounded-lg px-4 py-2.5 border outline-none focus:ring-2 focus:ring-slate-900 font-medium transition-all">
                <option value="working">{t('dashboard.working_hours')}</option>
                <option value="blocked">{t('dashboard.blocked_time')}</option>
              </select>
            </div>
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.start_time')}</label>
              <input required type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium" />
            </div>
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.end_time')}</label>
              <input required type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium" />
            </div>
          </div>
          <button type="submit" className="w-full lg:w-auto px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-md transition-all active:scale-95 whitespace-nowrap">{t('dashboard.add_slot')}</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {availability.map(slot => (
            <div key={slot.id} className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${slot.type === 'working' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {slot.type === 'working' ? t('dashboard.working_hours') : t('dashboard.blocked_time')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.availability')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-widest mb-1 text-[9px]">{t('dashboard.start_time')}</div>
                  <div className="text-slate-900 font-semibold">
                    {slot.startTime?.toDate?.() ? format(slot.startTime.toDate(), 'EEEE, MMM d, HH:mm', { locale: i18n.language === 'ar' ? ar : enUS }) : t('dashboard.na')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-widest mb-1 text-[9px]">{t('dashboard.end_time')}</div>
                  <div className="text-slate-900 font-semibold">
                    {slot.endTime?.toDate?.() ? format(slot.endTime.toDate(), 'EEEE, MMM d, HH:mm', { locale: i18n.language === 'ar' ? ar : enUS }) : t('dashboard.na')}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-50 flex justify-end">
                <button onClick={() => setDeleteId(slot.id!)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{t('dashboard.start_time')}</th>
                <th className="px-4 py-3">{t('dashboard.end_time')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {availability.map(slot => (
                <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 capitalize font-medium text-slate-900">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${slot.type === 'working' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {slot.type === 'working' ? t('dashboard.working_hours') : t('dashboard.blocked_time')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {slot.startTime?.toDate?.() ? format(slot.startTime.toDate(), 'EEEE, MMM d, yyyy HH:mm', { locale: i18n.language === 'ar' ? ar : enUS }) : t('dashboard.na')}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {slot.endTime?.toDate?.() ? format(slot.endTime.toDate(), 'EEEE, MMM d, yyyy HH:mm', { locale: i18n.language === 'ar' ? ar : enUS }) : t('dashboard.na')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteId(slot.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {availability.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-500 bg-white">{t('dashboard.no_appointments')}</div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteSlot}
      />
    </div>
  );
}

function ManageAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'day'>('day');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // Update every minute for highlighting
    return () => clearInterval(interval);
  }, []);

  // Form Data
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    startTime: '',
    status: 'pending' as const
  });

  const { user } = useAuth();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const apptsQ = query(collection(db, 'appointments'));
      const apptsSnap = await getDocs(apptsQ);
      setAppointments(apptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));

      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(doc => doc.data() as UserProfile);
      setCustomers(allUsers.filter(u => u.role === 'customer'));

      const servicesSnap = await getDocs(query(collection(db, 'services'), where('isActive', '==', true)));
      setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName.trim()) {
        toast.error(t('common.toast.enter_customer_name'));
        return;
    }

    const phoneRegex = /^(?:00962|\+962|0)7[789]\d{7}$/;
    if (!phoneRegex.test(formData.customerPhone)) {
      toast.error(t('common.toast.valid_phone_jordan'));
      return;
    }

    const service = services.find(s => s.id === formData.serviceId);
    if (!service) {
      toast.error(t('common.toast.select_service'));
      return;
    }

    if (!user) return;

    const start = new Date(formData.startTime);
    if (isNaN(start.getTime())) {
        toast.error(t('common.toast.invalid_start_time'));
        return;
    }

    const now = new Date();
    if (start <= now) {
      toast.error(t('common.toast.future_only'));
      return;
    }
    
    const end = new Date(start.getTime() + service.duration * 60000);

    try {
      await addDoc(collection(db, 'appointments'), {
        customerId: 'manual-entry', // Admin manual entry
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        barberId: user.uid,
        serviceId: formData.serviceId,
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        status: formData.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
      setFormData({ customerName: '', customerPhone: '', serviceId: '', startTime: '', status: 'pending' });
      loadData();
      toast.success(t('common.toast.success_booking'));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'appointments');
      toast.error(t('common.toast.error_generic'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'appointments', deleteId));
      setDeleteId(null);
      loadData();
      toast.success(t('common.toast.success_delete'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `appointments/${deleteId}`);
      toast.error(t('common.toast.error_generic'));
    }
  };

  // Calendar Helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const threeDays = eachDayOfInterval({ 
    start: startOfDay(new Date()), 
    end: addDays(startOfDay(new Date()), 2) 
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  if (loading) return <div className="flex items-center justify-center p-12 text-slate-500 font-bold">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('dashboard.salon_schedule')}</h2>
          <p className="text-sm text-slate-500 font-medium">{t('dashboard.coordinate_appointments')}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
           <button 
            onClick={() => setView(view === 'calendar' ? 'day' : 'calendar')} 
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
          >
            {view === 'calendar' ? t('dashboard.day_view') : t('dashboard.calendar_view')}
          </button>
          <button 
            onClick={() => setIsAdding(true)} 
            className="flex-1 md:flex-none px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" /> {t('dashboard.new_booking')}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4">{t('dashboard.new_booking')}</h3>
          <form onSubmit={handleAddAppointment} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.customer_name')} <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                placeholder={t('dashboard.customer_name')}
                className="w-full border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 border"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.customer_phone')} <span className="text-red-500">*</span></label>
              <input 
                required
                type="tel" 
                placeholder="07XXXXXXXX"
                className="w-full border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 border"
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 font-medium">{t('common.valid_phone_jordan')}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.service')} <span className="text-red-500">*</span></label>
              <select required value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})} className="w-full border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 border">
                <option value="">{t('dashboard.service')}</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} {t('dashboard.mins')} - {s.price} {t('dashboard.currency')})</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.start_time')} <span className="text-red-500">*</span></label>
              <input required type="datetime-local" min={format(new Date(), "yyyy-MM-dd'T'HH:mm")} value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 border" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.status')} <span className="text-red-500">*</span></label>
              <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 border">
                <option value="pending">{t('status.pending')}</option>
                <option value="confirmed">{t('status.confirmed')}</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 lg:col-span-3">
              <button type="submit" className="w-full sm:w-auto order-1 sm:order-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95">{t('dashboard.confirm_booking')}</button>
              <button type="button" onClick={() => setIsAdding(false)} className="w-full sm:w-auto order-2 sm:order-1 px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {view === 'calendar' ? (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h3 className="text-lg font-bold text-slate-900">
              <span className="md:hidden">{t('dashboard.next_3_days')}</span>
              <span className="hidden md:inline">{format(currentDate, 'MMMM yyyy', { locale: i18n.language === 'ar' ? ar : enUS })}</span>
            </h3>
            <div className="flex gap-1">
              <div className="hidden md:flex gap-1" dir="ltr">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5"/></button>
              </div>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {t('common.today')}
              </button>
            </div>
          </div>
          
          {/* Mobile 3-Day View */}
          <div className="md:hidden space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {threeDays.map((day, idx) => {
                const dayAppointments = appointments.filter(a => isSameDay(a.startTime?.toDate(), day));
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div key={idx} className="flex flex-col">
                    <div className={`text-center py-2 rounded-t-xl text-[10px] font-bold uppercase tracking-widest ${isToday ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                      {t(`dashboard.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day.getDay()]}`)}
                    </div>
                    <div className={`text-center py-3 border-x border-b border-slate-100 rounded-b-xl ${isToday ? 'bg-slate-50/50' : 'bg-white'}`}>
                      <div className={`text-lg font-black ${isToday ? 'text-slate-900' : 'text-slate-400'}`}>{format(day, 'd')}</div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {dayAppointments.length > 0 ? (
                        dayAppointments.sort((a,b) => a.startTime?.toMillis() - b.startTime?.toMillis()).map(a => {
                          const service = services.find(s => s.id === a.serviceId);
                          return (
                            <div key={a.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-slate-900">{format(a.startTime.toDate(), 'HH:mm')}</span>
                              <span className="text-[9px] font-medium text-slate-500 truncate">{service?.name || t('dashboard.service')}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-[9px] text-slate-300 font-bold uppercase tracking-tighter italic">{t('dashboard.free')}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Month View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden shadow-sm min-w-[700px]">
            {[t('dashboard.sun'), t('dashboard.mon'), t('dashboard.tue'), t('dashboard.wed'), t('dashboard.thu'), t('dashboard.fri'), t('dashboard.sat')].map(day => (
              <div key={day} className="bg-slate-50 py-3 text-center text-xs font-bold text-slate-500 tracking-widest uppercase">{day}</div>
            ))}
            {days.map((day, idx) => {
              const dayAppointments = appointments.filter(a => isSameDay(a.startTime?.toDate(), day));
              return (
                <div key={idx} className={`bg-white min-h-[140px] p-2 flex flex-col gap-1 transition-all ${!isSameMonth(day, monthStart) ? 'bg-slate-50 opacity-40' : ''}`}>
                  <div className={`text-sm font-medium mb-1 flex items-center justify-center w-7 h-7 rounded-full ${isSameDay(day, new Date()) ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </div>
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                      {dayAppointments.slice(0, 3).map(a => {
                        const service = services.find(s => s.id === a.serviceId);
                        return (
                          <div key={a.id} className={`px-2 py-1 text-[10px] rounded-md font-semibold truncate ${a.status === 'canceled' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {format(a.startTime.toDate(), 'HH:mm')} - {service?.name || t('dashboard.service')}
                          </div>
                        )
                      })}
                      {dayAppointments.length > 3 && (
                        <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayAppointments.length - 3} {t('dashboard.more')}</div>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md" dir="ltr">
            <button 
              onClick={() => setSelectedDay(addDays(selectedDay, -1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-slate-900">
                {format(selectedDay, 'EEEE, MMM d, yyyy', { locale: i18n.language === 'ar' ? ar : enUS })}
              </span>
              {isSameDay(selectedDay, new Date()) && (
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{t('common.today')}</span>
              )}
            </div>
            <button 
              onClick={() => setSelectedDay(addDays(selectedDay, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {appointments
                .filter(a => isSameDay(a.startTime.toDate(), selectedDay))
                .sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())
                .map((a, idx, filtered) => {
                  const customer = customers.find(c => c.userId === a.customerId);
                  const service = services.find(s => s.id === a.serviceId);
                  const startTime = a.startTime.toDate();
                  const endTime = a.endTime.toDate();
                  
                  const isCurrent = now >= startTime && now <= endTime;
                  const upcoming = filtered.find(appt => appt.startTime.toDate() > now && appt.status !== 'canceled');
                  const isUpcoming = !isCurrent && upcoming && upcoming.id === a.id;

                  return (
                    <div key={a.id} className={`p-4 flex flex-col gap-3 transition-all ${isCurrent ? 'bg-green-50/70 border-l-4 border-l-green-600' : isUpcoming ? 'bg-amber-50/30' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-sm font-bold ${isCurrent ? 'text-green-700' : 'text-slate-900'}`}>
                            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                          </span>
                          {isCurrent && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-tighter animate-pulse">
                              <Clock className="w-2.5 h-2.5" /> {t('dashboard.live_now')}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                          a.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          a.status === 'completed' ? 'bg-green-100 text-green-700' :
                          a.status === 'canceled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {t(`status.${a.status}`)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {(a.customerName || customer?.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 text-sm">{a.customerName || customer?.name}</div>
                          <div className="text-xs text-slate-500 font-medium">{a.customerPhone}</div>
                        </div>
                        <button 
                          onClick={() => setDeleteId(a.id!)} 
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                        <span className="text-xs font-semibold text-slate-700">{service?.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{service?.price} {t('dashboard.currency')} • {service?.duration} {t('dashboard.mins')}</span>
                      </div>
                    </div>
                  );
                })}
              {appointments.filter(a => isSameDay(a.startTime.toDate(), selectedDay)).length === 0 && (
                <div className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarIcon className="w-10 h-10 text-slate-200" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">{t('dashboard.no_appointments_day')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">{t('dashboard.timing')}</th>
                    <th className="px-4 py-3">{t('dashboard.customer')}</th>
                    <th className="px-4 py-3">{t('dashboard.service')}</th>
                    <th className="px-4 py-3 text-center">{t('common.status')}</th>
                    <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments
                    .filter(a => isSameDay(a.startTime.toDate(), selectedDay))
                    .sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())
                    .map((a, idx, filtered) => {
                      const customer = customers.find(c => c.userId === a.customerId);
                      const service = services.find(s => s.id === a.serviceId);
                      const startTime = a.startTime.toDate();
                      const endTime = a.endTime.toDate();
                      
                      // Logic for highlighting the current or upcoming reservation
                      const isCurrent = now >= startTime && now <= endTime;
                      const upcoming = filtered.find(appt => appt.startTime.toDate() > now && appt.status !== 'canceled');
                      const isUpcoming = !isCurrent && upcoming && upcoming.id === a.id;

                      return (
                        <tr key={a.id} className={`transition-all duration-300 ${isCurrent ? 'bg-green-50/70 border-l-4 border-l-green-600 shadow-inner' : isUpcoming ? 'bg-amber-50/30' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className={`font-bold ${isCurrent ? 'text-green-700' : 'text-slate-900'}`}>
                                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                              </span>
                              {isCurrent && (
                                <span className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-tighter animate-pulse">
                                  <Clock className="w-2.5 h-2.5" /> {t('dashboard.live_now')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                                {(a.customerName || customer?.name || '?')[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{a.customerName || customer?.name}</span>
                                <span className="text-xs text-slate-500 font-medium">{a.customerPhone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">{service?.name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{service?.price} {t('dashboard.currency')} • {service?.duration} {t('dashboard.mins')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                              a.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              a.status === 'completed' ? 'bg-green-100 text-green-700' :
                              a.status === 'canceled' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {t(`status.${a.status}`)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button 
                              onClick={() => setDeleteId(a.id!)} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {appointments.filter(a => isSameDay(a.startTime.toDate(), selectedDay)).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CalendarIcon className="w-10 h-10 text-slate-200" />
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">{t('dashboard.no_appointments_day')}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
