export enum Role {
  ADMIN = 'admin',
  TUTOR = 'faculty',
}

export enum Faculty {
  BUSINESS = 'Business',
  EDUCATION = 'Education',
  ENGLISH = 'English',
  ELU = 'ELU',
  IT = 'IT',
}

export enum ExamType {
  MIDTERM = 'Midterm',
  FINAL = 'Final',
  MAKEUP = 'Makeup',
  ONLINE = 'Online',
}

export interface ExamSlot {
  id: number;
  date: string;
  type: ExamType;
  startTime: string;
  endTime: string;
  capacity: number;
  credits: number;
  appliedCount: number;
  appliedFaculty: { id: number; name: string }[];
}

export interface CreateSlotData {
  date: string;
  type: ExamType;
  startTime: string;
  endTime: string;
  capacity: number;
  credits: number;
}

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  password?: string;
  maxShifts?: number;
  faculty?: Faculty;
  mtaLoad?: number;
  finalLoad?: number;
  employmentType?: 'Part time' | 'Full time';
}

export interface BulkTutorData {
  name: string;
  username: string;
  password: string;
  faculty: Faculty;
  mtaLoad: number;
  finalLoad: number;
  employmentType: 'Part time' | 'Full time';
}

export interface ExamSlot extends CreateSlotData {
  id: number;
  appliedCount: number;
  appliedFaculty: { id: number; name: string }[];
}

export interface BccAssignment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  credits: number;
  proctorId: number;
  proctor: { id: number; name: string; username: string };
  createdAt: string;
}

export interface CreateBccAssignment {
  date: string;
  startTime: string;
  endTime: string;
  credits: number;
  proctorId: number;
  examType: ExamType; 
}

export interface AssignBccData {
  examDate: string;
  startTime: string;
  endTime: string;
  course: string;
  proctorId: number;
}