export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: any;
}

export interface Service {
  id?: string;
  name: string;
  duration: number; // minutes
  price: number;
  isActive: boolean;
  createdAt: any;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'canceled';

export interface Appointment {
  id?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  barberId: string;
  serviceId: string;
  startTime: any;
  endTime: any;
  status: AppointmentStatus;
  createdAt: any;
  updatedAt: any;
}

export type SlotType = 'working' | 'blocked';

export interface BarberAvailability {
  id?: string;
  startTime: any;
  endTime: any;
  type: SlotType;
}
