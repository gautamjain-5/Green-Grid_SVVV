export type ResourceType = "electricity" | "water" | "waste" | "paper";
export type WasteCategory = "recyclable" | "organic" | "electronic" | "general";
export type DisposalMethod = "recycled" | "composted" | "e-waste vendor" | "landfill";
export type ActionStatus = "planned" | "in_progress" | "completed" | "verified";

export interface ResourceRecord {
  id: string;
  type: ResourceType;
  quantity: number;
  unit: string;
  building: string;
  department: string;
  timestamp: string; // ISO
  notes?: string;
  createdBy: string;
}

export interface WasteRecord {
  id: string;
  category: WasteCategory;
  quantity: number; // kg
  unit: "kg";
  disposal: DisposalMethod;
  department: string;
  timestamp: string;
  notes?: string;
}

export interface SustainabilityAction {
  id: string;
  name: string;
  description: string;
  status: ActionStatus;
  estimatedSavings: string;
  resource: ResourceType;
  department: string;
  createdBy: string;
  createdAt: string;
}

export interface ResourceTarget {
  id: string;
  type: ResourceType;
  target: number; // per week, campus-wide
  period: "week";
  department: "Campus";
}

export interface Profile {
  fullName: string;
  role: string;
  department: string;
  college: string;
  email: string;
}

export interface NotificationPrefs {
  weeklyDigest: boolean;
  wastageAlerts: boolean;
  targetAlerts: boolean;
}

export interface AppState {
  resources: ResourceRecord[];
  waste: WasteRecord[];
  actions: SustainabilityAction[];
  targets: ResourceTarget[];
  profile: Profile;
  notifications: NotificationPrefs;
  signedIn: boolean;
}

export interface Department {
  name: string;
  building: string;
  headcount: number;
}
