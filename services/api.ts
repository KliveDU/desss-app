// services/api.ts
import {
  User,
  Role,
  ExamSlot,
  CreateSlotData,
  BulkTutorData,
  BccAssignment,
  CreateBccAssignment,
} from '../types';

const API_BASE_URL = 'http://localhost:5000/api';
let authToken: string | null = localStorage.getItem('token');

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok) {
    const errorData = await response.json(); 
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const login = (username: string, password: string): Promise<{ token: string; user: User }> => {
  return request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

// ========================
// SLOT OPERATIONS
// ========================
export const getSlots = (): Promise<ExamSlot[]> => {
  return request<ExamSlot[]>('/slots');
};

export const getMySlots = (): Promise<ExamSlot[]> => {
  return request<ExamSlot[]>('/slots/my');
};

export const createSlot = (slotData: CreateSlotData): Promise<{ success: boolean; message: string; slot: ExamSlot }> => {
  return request<{ success: boolean; message: string; slot: ExamSlot }>('/slots', {
    method: 'POST',
    body: JSON.stringify(slotData),
  });
};

export const updateSlot = (slotId: number, slotData: Partial<ExamSlot>): Promise<ExamSlot> => {
  return request<ExamSlot>(`/slots/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify(slotData),
  });
};

export const deleteSlot = (slotId: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/slots/${slotId}`, {
    method: 'DELETE',
  });
};

export const applyToSlot = (slotId: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/slots/${slotId}/apply`, {
    method: 'POST',
  });
};

export const unapplyFromSlot = (slotId: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/slots/${slotId}/unapply`, {
    method: 'DELETE',
  });
};

export const adminAssignToSlot = (slotId: number, facultyId: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/slots/${slotId}/admin-assign`, {
    method: 'POST',
    body: JSON.stringify({ facultyId }),
  });
};

export const adminUnassignFromSlot = (slotId: number, facultyId: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/slots/${slotId}/admin-unassign`, {
    method: 'POST',
    body: JSON.stringify({ facultyId }),
  });
};

// ========================
// USER OPERATIONS
// ========================
export const getUsers = (): Promise<User[]> => {
  return request<User[]>('/users');
};

export const addUser = (userData: Omit<User, 'id'>): Promise<User> => {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUser = (userId: number, updateData: Partial<User>): Promise<User> => {
  return request<User>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
};

export const deleteUser = (userId: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/users/${userId}`, {
    method: 'DELETE',
  });
};

export const getSelf = (): Promise<User> => {
  return request<User>('/users/self');
};

export const bulkAddTutors = (tutors: BulkTutorData[]): Promise<{ success: boolean; message: string }> => {
  return request<{ success: boolean; message: string }>('/users/bulk', {
    method: 'POST',
    body: JSON.stringify({ tutors }),
  });
};

export const bulkUpsertSlots = (slots: CreateSlotData[]): Promise<{ success: boolean; message: string; slots: ExamSlot[] }> => {
  return request('/slots/bulk-upsert', {
    method: 'POST',
    body: JSON.stringify({ slots }),
  });
};

// BCC Management
export const getBccAssignments = (): Promise<BccAssignment[]> => {
  return request<BccAssignment[]>('/bcc');
};

export const createBccAssignment = (assignment: CreateBccAssignment): Promise<{ success: boolean; bcc: BccAssignment }> => {
  return request<{ success: boolean; bcc: BccAssignment }>('/bcc', {
    method: 'POST',
    body: JSON.stringify(assignment),
  });
};

export const bulkCreateBccAssignments = (assignments: CreateBccAssignment[]): Promise<{ success: boolean; message: string; assignments: BccAssignment[] }> => {
  return request<{ success: boolean; message: string; assignments: BccAssignment[] }>('/bcc/bulk', {
    method: 'POST',
    body: JSON.stringify({ assignments }),
  });
};

export const deleteBccAssignment = (id: number): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/bcc/${id}`, {
    method: 'DELETE',
  });
};

export const assignAsBcc = (slotId: number, facultyId: number): Promise<{ success: boolean }> => {
  return request(`/slots/${slotId}/assign-bcc`, {
    method: 'POST',
    body: JSON.stringify({ facultyId }),
  });
};

export const assignBccToSlot = (data: {
  examDate: string;
  startTime: string;
  endTime: string;
  course: string;
  proctorId: number;
}): Promise<{ success: boolean; message: string }> => {
  return request('/bcc/assign', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
