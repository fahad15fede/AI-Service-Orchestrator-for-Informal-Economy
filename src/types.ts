export type ServiceCategory = 'ac_technician' | 'plumber' | 'electrician' | 'tutor' | 'beautician';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Provider {
  id: string;
  name: string;
  category: ServiceCategory;
  categoryName: string;
  rating: number;
  locationSector: string;
  coordinates: Coordinates;
  priceRate: number;
  phone: string;
  availability: string[];
  avatar: string;
  completedJobs: number;
  experienceYears: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  categoryName: string;
  clientName: string;
  clientPhone: string;
  locationSector: string;
  timeSlot: string;
  date: string;
  price: number;
  status: BookingStatus;
  createdAt: string;
}

export type AgentRole = 'coordinator' | 'nlp_parser' | 'provider_discovery' | 'ranker_matcher' | 'execution_agent' | 'followup_agent';

export interface AgentLog {
  id: string;
  role: AgentRole;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'thinking';
  metadata?: any;
  threadId?: string;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

export interface Intent {
  serviceType: string;
  serviceCategory: ServiceCategory | null;
  location: string;
  time: string;
  confidence: number;
  language: 'English' | 'Urdu' | 'Roman Urdu' | 'Unknown';
}

export interface FollowupTask {
  id: string;
  bookingId: string;
  type: 'reminder' | 'status_assigned' | 'status_arrived' | 'status_completed' | 'feedback_request';
  triggerTime: number; // in timestamp ms (virtual time)
  status: 'pending' | 'sent';
  message: string;
}

export interface SystemState {
  providers: Provider[];
  bookings: Booking[];
  logs: AgentLog[];
  messages: AgentMessage[];
  followups: FollowupTask[];
  currentIntent: Intent | null;
  activeStep: number;
  isProcessing: boolean;
}
