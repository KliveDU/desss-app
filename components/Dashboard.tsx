// components/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, ExamSlot, Faculty, BccAssignment } from '../types';
import { Role, Faculty as FacultyEnum, ExamType as ExamTypeEnum } from '../types';
import * as api from '../services/api';
import {
  ChartPieIcon, UserPlusIcon, DocumentPlusIcon, UsersIcon,
  UserCircleIcon, IdentificationIcon, AcademicCapIcon,
  PlusCircleIcon, ClockIcon, StarIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, UploadIcon
} from './icons';
import AddTutorTab from './AddTutorTab';
import UserManagementView from './UserManagementView';
import SlotModal from './SlotModal';
import SlotDetailModal from './SlotDetailModal';
import Calendar from './Calendar';
import BccManagementView from './BccManagementView';

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const Dashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [slots, setSlots] = useState<ExamSlot[]>([]);
  const [mySlots, setMySlots] = useState<ExamSlot[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingSlot, setViewingSlot] = useState<ExamSlot | null>(null);
  const [editingSlot, setEditingSlot] = useState<ExamSlot | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [calendarView, setCalendarView] = useState<'paper' | 'online'>('paper');
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const loadSlots = useCallback(async () => {
    try {
      const data = await api.getSlots();
      const cleanData = data.map(slot => ({
        ...slot,
        date: slot.date.split('T')[0],
      }));
      setSlots(cleanData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    }
  }, []);

  const loadMySlots = useCallback(async () => {
    if (user.role === Role.TUTOR) {
      try {
        const data = await api.getMySlots();
        setMySlots(data);
      } catch (err) {
        console.warn("Could not load my sessions", err);
      }
    }
  }, [user.role]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUserList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tutors');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = saved || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    loadSlots();
    loadMySlots();
    if (user.role === Role.ADMIN) loadUsers();
  }, [loadSlots, loadMySlots, loadUsers, user.role]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSaveSlot = async (slot: ExamSlot) => {
    try {
      const cleanSlot = {
        ...slot,
        date: slot.date.split('T')[0],
      };
      if (slot.id) {
        const updated = await api.updateSlot(slot.id, cleanSlot);
        setSlots(prev => prev.map(s => ({
          ...s,
          date: s.date.split('T')[0],
          ...(s.id === updated.id && { ...updated, date: updated.date.split('T')[0] })
        })));
        setSuccess('Session updated successfully!');
      } else {
        const result = await api.createSlot(cleanSlot);
        setSlots(prev => [...prev, { ...result.slot, date: result.slot.date.split('T')[0] }]);
        setSuccess(result.message);
      }
      setEditingSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    }
  };

  const handleApply = async () => {
    if (!viewingSlot) return;
    try {
      await api.applyToSlot(viewingSlot.id);
      loadSlots();
      loadMySlots();
      setViewingSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply');
    }
  };

  const handleUnapply = async () => {
    if (!viewingSlot) return;
    try {
      await api.unapplyFromSlot(viewingSlot.id);
      loadSlots();
      loadMySlots();
      setViewingSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign');
    }
  };

  const handleAdminAssign = async (facultyId: number) => {
    if (!viewingSlot) return;
    try {
      await api.adminAssignToSlot(viewingSlot.id, facultyId);
      loadSlots();
      setViewingSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign');
    }
  };

  const handleAdminUnassign = async (facultyId: number) => {
    if (!viewingSlot) return;
    try {
      await api.adminUnassignFromSlot(viewingSlot.id, facultyId);
      loadSlots();
      setViewingSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign');
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!window.confirm('Are you sure you want to delete this Session?')) return;
    try {
      await api.deleteSlot(slotId);
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const filteredSlots = useMemo(() => {
    let result = slots;
    const paperTypes = ['Midterm', 'Final', 'Makeup'];
    if (calendarView === 'paper') {
      result = result.filter(s => paperTypes.includes(s.type));
    } else {
      result = result.filter(s => s.type === 'Online');
    }
    if (selectedDate) {
      result = result.filter(s => parseLocalDate(s.date).toDateString() === selectedDate.toDateString());
    }
    return result;
  }, [slots, calendarView, selectedDate]);

  const creditUsage = useMemo(() => {
    let mtaUsed = 0;
    let finalUsed = 0;
    mySlots.forEach(slot => {
      if (slot.type === 'BCC' || slot.type === 'Midterm' || slot.type === 'Makeup') {
        mtaUsed += slot.credits;
      } else if (slot.type === 'Final') {
        finalUsed += slot.credits;
      } else if (slot.type === 'Online') {
        if (slot.credits <= 1.5) {
          mtaUsed += slot.credits;
        } else {
          finalUsed += slot.credits;
        }
      }
    });
    const mtaTotal = parseFloat(String(user.mtaLoad)) || 0;
    const finalTotal = parseFloat(String(user.finalLoad)) || 0;
    return { mtaUsed, finalUsed, mtaTotal, finalTotal };
  }, [mySlots, user.mtaLoad, user.finalLoad]);

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <header className="bg-white dark:bg-surface-dark shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-custom-blue-darker">DESSS</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 dark:text-gray-300">
              Welcome, <span className="font-semibold">{user.name}</span>
            </span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded">
            {success}
          </div>
        )}

        {user.role === Role.TUTOR && activeTab === 'dashboard' ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/4 space-y-6">
              <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-custom-blue-light dark:bg-custom-blue/20 flex items-center justify-center mx-auto">
                    <UserCircleIcon className="h-8 w-8 text-custom-blue dark:text-custom-blue-light" />
                  </div>
                  <h2 className="text-xl font-bold mt-3 text-text-light dark:text-text-dark">{user.name}</h2>
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 mt-2">
                    Tutor
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <span className="text-gray-600 dark:text-gray-400">Faculty</span>
                    <span className="font-medium text-text-light dark:text-text-dark">{user.faculty || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <span className="text-gray-600 dark:text-gray-400">Employment</span>
                    <span className="font-medium text-text-light dark:text-text-dark">{user.employmentType || 'Part time'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-3 text-text-light dark:text-text-dark">Credit Usage</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>MTA Load</span>
                      <span>{creditUsage.mtaUsed.toFixed(1)} / {creditUsage.mtaTotal.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mt-1">
                      <div 
                        className="bg-custom-blue h-2 rounded-full" 
                        style={{ width: `${creditUsage.mtaTotal ? (creditUsage.mtaUsed / creditUsage.mtaTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Final Load</span>
                      <span>{creditUsage.finalUsed.toFixed(1)} / {creditUsage.finalTotal.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${creditUsage.finalTotal ? (creditUsage.finalUsed / creditUsage.finalTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-3 text-text-light dark:text-text-dark">My Applied Slots</h3>
                {mySlots.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No slots applied yet.</p>
                ) : (
                  <div className="space-y-2">
                    {mySlots.map(slot => (
                      <div key={slot.id} className="p-2 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <p className="font-bold text-custom-blue-darker text-sm">{slot.type}</p>
                        <p className="text-xs text-text-light dark:text-text-dark">
                          {parseLocalDate(slot.date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-text-light dark:text-text-dark">
                          {slot.startTime} – {slot.endTime} ({slot.credits} credits)
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:w-3/4 space-y-6">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setCalendarView('paper')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    calendarView === 'paper'
                      ? 'bg-custom-blue text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  Paper
                </button>
                <button
                  onClick={() => setCalendarView('online')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    calendarView === 'online'
                      ? 'bg-custom-blue text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  Online
                </button>
              </div>
              <Calendar
                slots={slots}
                onDayClick={setSelectedDate}
                selectedDate={selectedDate}
                currentDate={currentWeek}
                onWeekChange={setCurrentWeek}
                slotFilter={calendarView}
              />
              <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">
                  {selectedDate
                    ? `Slots on ${parseLocalDate(selectedDate.toISOString().split('T')[0]).toLocaleDateString()}`
                    : `${calendarView === 'paper' ? 'Paper' : 'Online'} Sessions This Week`}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSlots.map(slot => (
                    <div
                      key={slot.id}
                      onClick={() => setViewingSlot(slot)}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <p className="font-bold text-custom-blue-darker">{slot.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {parseLocalDate(slot.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {slot.startTime} – {slot.endTime}
                      </p>
                      <p className="text-xs mt-1 text-text-light dark:text-text-dark">
                        Credits: {slot.credits}
                      </p>
                      <p className="text-xs mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          slot.appliedCount >= slot.capacity
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {slot.appliedCount} / {slot.capacity} assigned
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/4">
              <nav className="bg-white dark:bg-surface-dark rounded-lg shadow p-4">
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => { setActiveTab('dashboard'); clearMessages(); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md ${
                        activeTab === 'dashboard'
                          ? 'bg-custom-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <ChartPieIcon className="h-5 w-5" /> Dashboard
                    </button>
                  </li>
                  {user.role === Role.ADMIN && (
                    <>
                      <li>
                        <button
                          onClick={() => { setActiveTab('addSlot'); clearMessages(); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md ${
                            activeTab === 'addSlot'
                              ? 'bg-custom-blue text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          <DocumentPlusIcon className="h-5 w-5" /> Add Session
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => { setActiveTab('addTutor'); clearMessages(); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md ${
                            activeTab === 'addTutor'
                              ? 'bg-custom-blue text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          <UserPlusIcon className="h-5 w-5" /> Add Tutor
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => { setActiveTab('bcc'); clearMessages(); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md ${
                            activeTab === 'bcc'
                              ? 'bg-custom-blue text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          <AcademicCapIcon className="h-5 w-5" /> BCC
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => { setActiveTab('users'); clearMessages(); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md ${
                            activeTab === 'users'
                              ? 'bg-custom-blue text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          <UsersIcon className="h-5 w-5" /> Manage Tutors
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            </div>
            <div className="lg:w-3/4 space-y-6">
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex space-x-4 mb-4">
                    <button
                      onClick={() => setCalendarView('paper')}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        calendarView === 'paper'
                          ? 'bg-custom-blue text-white'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      Paper
                    </button>
                    <button
                      onClick={() => setCalendarView('online')}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        calendarView === 'online'
                          ? 'bg-custom-blue text-white'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      Online
                    </button>
                  </div>
                  <Calendar
                    slots={slots}
                    onDayClick={setSelectedDate}
                    selectedDate={selectedDate}
                    currentDate={currentWeek}
                    onWeekChange={setCurrentWeek}
                    slotFilter={calendarView}
                  />
                  <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">
                      {selectedDate
                        ? `Slots on ${parseLocalDate(selectedDate.toISOString().split('T')[0]).toLocaleDateString()}`
                        : `${calendarView === 'paper' ? 'Paper' : 'Online'} Sessions This Week`}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSlots.map(slot => (
                        <div
                          key={slot.id}
                          onClick={() => setViewingSlot(slot)}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          <p className="font-bold text-custom-blue-darker">{slot.type}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {parseLocalDate(slot.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {slot.startTime} – {slot.endTime}
                          </p>
                          <p className="text-xs mt-1 text-text-light dark:text-text-dark">
                            Credits: {slot.credits}
                          </p>
                          <p className="text-xs mt-1 text-text-light dark:text-text-dark">
                            {slot.appliedCount} / {slot.capacity} assigned
                          </p>
                          {user.role === Role.ADMIN && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingSlot(slot); }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'addSlot' && (
                <SlotModal
                  onClose={() => setActiveTab('dashboard')}
                  onSlotAdded={loadSlots}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}
              {activeTab === 'addTutor' && (
                <AddTutorTab
                  onTutorAdded={loadUsers}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}
              {activeTab === 'users' && (
                <UserManagementView
                  userList={userList}
                  currentUser={user}
                  onUserUpdated={loadUsers}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}
              {activeTab === 'bcc' && (
                <BccManagementView
                  userList={userList}
                  onBccUpdated={loadUsers}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}
            </div>
          </div>
        )}

        {viewingSlot && (
          <SlotDetailModal
            slot={viewingSlot}
            user={user}
            facultyList={userList}
            onClose={() => setViewingSlot(null)}
            onApply={handleApply}
            onUnapply={handleUnapply}
            onAdminAssign={handleAdminAssign}
            onAdminUnassign={handleAdminUnassign}
          />
        )}
        {editingSlot && (
          <SlotModal
            slot={editingSlot}
            isEditing={true}
            onClose={() => setEditingSlot(null)}
            onSave={handleSaveSlot}
            setError={setError}
            setSuccess={setSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;