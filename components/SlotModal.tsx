// components/SlotModal.tsx
import React, { useState } from 'react';
import type { ExamSlot, ExamType } from '../types';
import { ExamType as ExamTypeEnum } from '../types';
import * as api from '../services/api';
import * as XLSX from 'xlsx';
import {
  ClockIcon, AcademicCapIcon, StarIcon, UploadIcon, XIcon
} from './icons';

// ✅ Parse Excel date (number or string)
const parseExcelDate = (input: any): string | null => {
  if (input == null || input === '') return null;
  if (typeof input === 'number') {
    const date = new Date(Math.round((input - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  const str = String(input).trim();
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return null;
};

// ✅ Bulletproof time normalizer for Excel files
const normalizeTime = (input: any): string | null => {
  if (input == null || input === '') return null;

  let totalSeconds: number;

  if (typeof input === 'number') {
    if (input >= 1) {
      totalSeconds = Math.round((input % 1) * 24 * 60 * 60);
    } else {
      totalSeconds = Math.round(input * 24 * 60 * 60);
    }
  } else {
    const str = String(input).trim();
    if (str === '') return null;
    if (/^(\d{1,2}):(\d{2})$/.test(str)) {
      const [_, h, m] = str.match(/^(\d{1,2}):(\d{2})$/) || [];
      const hours = parseInt(h, 10);
      const minutes = parseInt(m, 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    const dateFallback = new Date(`1970-01-01 ${str}`);
    if (!isNaN(dateFallback.getTime())) {
      const hours = dateFallback.getHours();
      const minutes = dateFallback.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return null;
  }

  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// ================================
// MANUAL SLOT FORM
// ================================
const ManualSlotForm: React.FC<{
  initialData?: Partial<ExamSlot>;
  onSubmit: (slot: ExamSlot) => void;
}> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    type: initialData?.type || ExamTypeEnum.MIDTERM,
    startTime: initialData?.startTime || '09:30',
    endTime: initialData?.endTime || '11:30',
    capacity: initialData?.capacity || 3,
    credits: initialData?.credits || 3,
  });

  const paperTimeOptions = {
    [ExamTypeEnum.MIDTERM]: [
      { start: '09:30', end: '11:30' },
      { start: '12:00', end: '14:00' },
      { start: '14:30', end: '16:30' },
      { start: '17:00', end: '19:00' },
    ],
    [ExamTypeEnum.FINAL]: [
      { start: '09:30', end: '12:30' },
      { start: '13:00', end: '16:00' },
      { start: '16:30', end: '19:30' },
    ],
    [ExamTypeEnum.MAKEUP]: [
      { start: '09:30', end: '11:30' },
      { start: '12:00', end: '14:00' },
      { start: '14:30', end: '16:30' },
      { start: '17:00', end: '19:00' },
    ],
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' || name === 'credits' ? Number(value) : value
    }));
  };

  const handleTimeSelect = (start: string, end: string) => {
    setFormData(prev => ({ ...prev, startTime: start, endTime: end }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: 0,
      ...formData,
      appliedCount: 0,
      appliedFaculty: [],
    });
  };

  const isPaperType = formData.type !== ExamTypeEnum.ONLINE;
  const timeOptions = paperTimeOptions[formData.type as keyof typeof paperTimeOptions];

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
        required
      />

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
      <select
        name="type"
        value={formData.type}
        onChange={handleChange}
        className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
      >
        {Object.values(ExamTypeEnum).map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      {isPaperType && timeOptions ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Slot</label>
          <div className="grid grid-cols-2 gap-2">
            {timeOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTimeSelect(opt.start, opt.end)}
                className={`p-2 text-sm rounded font-medium transition-colors ${
                  formData.startTime === opt.start && formData.endTime === opt.end
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {opt.start} – {opt.end}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
          <input
            type="time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
            required
          />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
          <input
            type="time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
            required
          />
        </>
      )}

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
      <input
        type="number"
        name="capacity"
        min="1"
        value={formData.capacity}
        onChange={handleChange}
        className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
        required
      />

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
      <input
        type="number"
        name="credits"
        min="0.5"
        step="0.5"
        value={formData.credits}
        onChange={handleChange}
        className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
        required
      />

      <button
        type="submit"
        onClick={handleSubmit}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        {initialData ? 'Update' : 'Add'} Slot
      </button>
    </div>
  );
};

// ================================
// PAPER EXAM EXCEL UPLOAD
// ================================
const PaperExamUpload: React.FC<{
  onSlotsCreated: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onSlotsCreated, setError, setSuccess }) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          setError('File is empty');
          return;
        }

        const headers = data[0] as string[];
        const normalized = headers.map(h => h.toLowerCase().trim());
        const colMap: Record<string, number> = {};
        const findCol = (aliases: string[]) =>
          normalized.findIndex(h => aliases.some(a => h.includes(a)));

        colMap.date = findCol(['date']);
        colMap.from = findCol(['from']);
        colMap.to = findCol(['to']);
        colMap.class = findCol(['class']);
        colMap.course = findCol(['course']);
        colMap.credits = findCol(['credit']);

        if (colMap.date === -1 || colMap.from === -1 || colMap.to === -1) {
          setError('Required columns missing: Date, from, to');
          return;
        }

        const slotMap = new Map<string, number>();
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];

          const courseVal = colMap.course !== -1 ? String(row[colMap.course] || '').trim() : '';
          if (!courseVal) continue;

          const classVal = colMap.class !== -1 ? String(row[colMap.class] || '').trim() : '';
          if (classVal === 'BCC' || classVal === 'Backup') continue;

          const date = parseExcelDate(row[colMap.date]);
          if (!date) {
            setError(`Row ${i + 1}: Invalid date`);
            return;
          }

          const startTime = normalizeTime(row[colMap.from]);
          const endTime = normalizeTime(row[colMap.to]);
          if (!startTime || !endTime) {
            setError(`Row ${i + 1}: Invalid time`);
            return;
          }

          let credits = 3;
          if (colMap.credits !== -1) {
            const raw = row[colMap.credits];
            if (raw != null && raw !== '') {
              let str = typeof raw === 'number' 
                ? raw.toString()
                : String(raw).replace(',', '.').trim();
              const parsed = parseFloat(str);
              if (!isNaN(parsed) && parsed > 0) {
                credits = parsed;
              }
            }
          }

          const key = `${date}|${startTime}|${endTime}|${credits}`;
          slotMap.set(key, (slotMap.get(key) || 0) + 1);
        }

        if (slotMap.size === 0) {
          setError('No valid slots found after filtering.');
          return;
        }

        const slotArray = Array.from(slotMap.entries()).map(([key, capacity]) => {
          const [date, startTime, endTime, creditsStr] = key.split('|');
          const duration = parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]);
          const type = duration >= 3 ? ExamTypeEnum.FINAL : ExamTypeEnum.MIDTERM;
          return {
            date,
            type,
            startTime,
            endTime,
            capacity,
            credits: parseFloat(creditsStr),
          };
        });

        api.bulkUpsertSlots(slotArray)
          .then(result => {
            setSuccess(result.message);
            onSlotsCreated();
          })
          .catch(err => {
            console.error('Bulk upsert error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload exam schedule.');
          });
      } catch (err) {
        console.error('Excel parsing error:', err);
        setError('Invalid Excel file. Please use the correct format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
      </p>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">.xlsx only</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept=".xlsx" 
          onChange={handleFileUpload} 
        />
      </label>
    </div>
  );
};

// ================================
// ONLINE EXAM EXCEL UPLOAD (for table-6fb8c07a-....xlsx)
// ================================
const OnlineExamUpload: React.FC<{
  onSlotsCreated: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onSlotsCreated, setError, setSuccess }) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          setError('File is empty');
          return;
        }

        const headers = data[0] as string[];
        const normalized = headers.map(h => h.toLowerCase().trim());
        const colMap: Record<string, number> = {};

        // Map exact columns from your file
        colMap.date = normalized.findIndex(h => h === 'date');
        colMap.from = normalized.findIndex(h => h === 'from');
        colMap.to = normalized.findIndex(h => h === 'to');
        colMap.credits = normalized.findIndex(h => h === 'credit');

        if (colMap.date === -1 || colMap.from === -1 || colMap.to === -1) {
          setError('Required columns missing: Date, From, To, Credit');
          return;
        }

        const slotMap = new Map<string, number>();
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];

          const date = parseExcelDate(row[colMap.date]);
          if (!date) {
            setError(`Row ${i + 1}: Invalid date`);
            return;
          }

          const startTime = normalizeTime(row[colMap.from]);
          const endTime = normalizeTime(row[colMap.to]);
          if (!startTime || !endTime) {
            setError(`Row ${i + 1}: Invalid time`);
            return;
          }

          let credits = 3;
          if (colMap.credits !== -1) {
            const raw = row[colMap.credits];
            if (raw != null && raw !== '') {
              const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
              if (!isNaN(parsed) && parsed > 0) {
                credits = parsed;
              }
            }
          }

          const key = `${date}|${startTime}|${endTime}|${credits}`;
          slotMap.set(key, (slotMap.get(key) || 0) + 1);
        }

        if (slotMap.size === 0) {
          setError('No valid online exam slots found.');
          return;
        }

        const slotArray = Array.from(slotMap.entries()).map(([key, capacity]) => {
          const [date, startTime, endTime, creditsStr] = key.split('|');
          return {
            date,
            type: ExamTypeEnum.ONLINE, // ✅ All online
            startTime,
            endTime,
            capacity,
            credits: parseFloat(creditsStr),
          };
        });

        api.bulkUpsertSlots(slotArray)
          .then(result => {
            setSuccess(result.message);
            onSlotsCreated();
          })
          .catch(err => {
            console.error('Online exam upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload online exam schedule.');
          });
      } catch (err) {
        console.error('Excel parsing error:', err);
        setError('Invalid Excel file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400"></p>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">.xlsx only</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept=".xlsx" 
          onChange={handleFileUpload} 
        />
      </label>
    </div>
  );
};
// ================================
// MAIN MODAL
// ================================
const SlotModal: React.FC<{
  slot?: ExamSlot;
  isEditing?: boolean;
  onClose: () => void;
  onSlotAdded: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ slot, isEditing = false, onClose, onSlotAdded, setError, setSuccess }) => {
  const initialTab = isEditing ? 'manual' : 'paper';
  const [activeTab, setActiveTab] = useState<'manual' | 'paper' | 'online'>(initialTab);
  const canSwitchTabs = !isEditing;

  const handleSave = async (slotData: ExamSlot) => {
    try {
      if (slot?.id) {
        await api.updateSlot(slot.id, slotData);
        setSuccess('Slot updated successfully!');
      } else {
        await api.createSlot(slotData);
        setSuccess('Slot added successfully!');
      }
      onSlotAdded();
      onClose();
    } catch (err) {
      console.error('Save slot error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save slot.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blue-600">
            {slot ? 'Edit Slot' : 'Add New Slot'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {canSwitchTabs && (
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab('paper')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
                activeTab === 'paper'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <UploadIcon className="h-4 w-4" /> Paper
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
                activeTab === 'online'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <UploadIcon className="h-4 w-4" /> Online
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'manual'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              Manual
            </button>
          </div>
        )}

        {canSwitchTabs ? (
          <>
            {activeTab === 'paper' && (
              <PaperExamUpload onSlotsCreated={onSlotAdded} setError={setError} setSuccess={setSuccess} />
            )}
            {activeTab === 'online' && (
              <OnlineExamUpload onSlotsCreated={onSlotAdded} setError={setError} setSuccess={setSuccess} />
            )}
            {activeTab === 'manual' && (
              <ManualSlotForm initialData={slot} onSubmit={handleSave} />
            )}
          </>
        ) : (
          <ManualSlotForm initialData={slot} onSubmit={handleSave} />
        )}
      </div>
    </div>
  );
};

export default SlotModal;