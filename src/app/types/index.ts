export type UserRole = 'admin' | 'cleaner';

export type TaskStatus = 'pending' | 'confirmed' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

export type NotificationType =
  | 'task_assigned'
  | 'task_confirmed'
  | 'task_declined'
  | 'task_completed'
  | 'task_cancelled'
  | 'message'
  | 'system';

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  email_notifications: boolean;
  language: string;
  created_at: string;
  updated_at: string;
  tenants?: { name: string } | null;
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  floor: string | null;
  notes: string | null;
  default_start: string | null;
  default_end: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  properties?: Property[];
}

export interface Room {
  name: string;
}

export interface Property {
  id: string;
  tenant_id: string;
  location_id: string;
  name: string;
  size_m2: number | null;
  floor: string | null;
  rooms: Room[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  location?: Location;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface CleaningTask {
  id: string;
  tenant_id: string;
  location_id: string;
  property_id: string | null;
  cleaner_id: string;
  assigned_by: string;
  date: string;
  start_time: string;
  end_time: string;
  status: TaskStatus;
  notes: string | null;
  checklist: ChecklistItem[];
  assigned_rooms: Room[];
  clock_in: string | null;
  clock_out: string | null;
  duration_hours: number | null;
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  location?: Location;
  property?: Property;
  cleaner?: Profile;
  assigner?: Profile;
}

export interface Unavailability {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

// Task status labels in Estonian
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Ootel',
  confirmed: 'Kinnitatud',
  declined: 'Keeldutud',
  in_progress: 'Pooleli',
  completed: 'Tehtud',
  cancelled: 'Tühistatud',
};

// Task status colors
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  declined: 'bg-red-500/20 text-red-400 border-red-500/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};
