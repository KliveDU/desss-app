// components/AddSlotTab.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import type { ExamSlot, ExamType } from '../types';
import { ExamType as ExamTypeEnum } from '../types';
import * as api from '../services/api';
import {
  UploadIcon, XIcon
} from './icons';

// ✅ Convert Excel serial date (e.g., 45976) to "YYYY-MM-DD"
const parseExcelDate = (input: any): string | null => {
  if (input == null || input === '') return null;
  if (typeof input === 'number') {
    // Excel epoch: 1899-12-30
    const excelEpoch = new Date('1899-12-30T00:00:00');
    const date = new Date(excelEpoch.getTime() + input * 86400000);
    return date.toISOString().split('T')[0];
  }
  const str = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString().split('T')[0];
  }
  return null;
};

// ================================
// MANUAL SLOT FORM
// ================================
const ManualSlotForm: React.FC<{
  onSlotAdded: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onSlotAdded, setError, setSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: ExamTypeEnum.MIDTERM,
    startTime: '09:30',
    endTime: '11:30',
    capacity: 3,
    credits: 3, // ✅ NEW
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ Send only CreateSlotData fields
      const result = await api.createSlot({
        date: formData.date,
        type: formData.type as ExamType,
        startTime: formData.startTime,
        endTime: formData.endTime,
        capacity: formData.capacity,
        credits: formData.credits, // ✅
      });
      setSuccess('Slot added successfully!');
      onSlotAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add slot.');
    }
  };

  const isPaperType = formData.type !== ExamTypeEnum.ONLINE;
  const timeOptions = paperTimeOptions[formData.type as keyof typeof paperTimeOptions];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* ✅ CREDITS FIELD */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
      <input
        type="number"
        name="credits"
        min="1"
        value={formData.credits}
        onChange={handleChange}
        className="block w-full rounded-md border-0 py-2.5 pl-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        Add Slot
      </button>
    </form>
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
        const normalized = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ''));
        const colMap: Record<string, number> = {};
        const aliases = {
          date: ['date', 'examdate'],
          timeFrom: ['timefrom', 'from', 'starttime', 'start'],
          timeTo: ['timeto', 'to', 'endtime', 'end'],
          class: ['class', 'classname', 'course'],
        };
        for (const [key, aliasList] of Object.entries(aliases)) {
          const idx = normalized.findIndex(h => aliasList.some(a => h.includes(a)));
          if (idx !== -1) colMap[key] = idx;
        }
        if (colMap.date === undefined || colMap.timeFrom === undefined || colMap.timeTo === undefined) {
          setError('Missing required columns: Date, Time From, Time To');
          return;
        }
        const slotMap = new Map<string, number>();
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          const classVal = colMap.class !== undefined ? String(row[colMap.class] || '').trim() : '';
          if (classVal === 'BCC') continue;
          const rawDate = row[colMap.date];
          const date = parseExcelDate(rawDate);
          if (!date) {
            setError(`Row ${i + 1}: Invalid date`);
            return;
          }
          const fromTime = String(row[colMap.timeFrom] || '').trim();
          const toTime = String(row[colMap.timeTo] || '').trim();
          if (!fromTime || !toTime) continue;
          const [fromH] = fromTime.split(':').map(Number);
          const [toH] = toTime.split(':').map(Number);
          const duration = toH - fromH;
          const type = duration >= 3 ? ExamTypeEnum.FINAL : ExamTypeEnum.MIDTERM;
          const key = `${date}|${fromTime}|${toTime}|${type}`;
          slotMap.set(key, (slotMap.get(key) || 0) + 1);
        }
        if (slotMap.size === 0) {
          setError('No valid slots found after filtering BCC.');
          return;
        }
        const promises = Array.from(slotMap.entries()).map(([key, capacity]) => {
          const [date, startTime, endTime, type] = key.split('|');
          return api.createSlot({
            date,
            type: type as ExamType,
            startTime,
            endTime,
            capacity,
            credits: 3, // ✅ Default credit for Excel
          });
        });
        Promise.all(promises)
          .then(() => {
            setSuccess(`${slotMap.size} paper exam slots created!`);
            onSlotsCreated();
          })
          .catch(err => {
            setError(err instanceof Error ? err.message : 'Failed to create paper exam slots.');
          });
      } catch (err) {
        console.error(err);
        setError('Invalid Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Upload an Excel file with columns: <strong>Date</strong>, <strong>Time From</strong>, <strong>Time To</strong>.
        Rows with <strong>Class = "BCC"</strong> will be ignored.
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
// MAIN ADD SLOT TAB
// ================================
const AddSlotTab: React.FC<{
  onSlotAdded: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onSlotAdded, setError, setSuccess }) => {
  const [activeSubTab, setActiveSubTab] = useState<'paper' | 'manual'>('paper');

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
      <div className="p-4 rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-600 mb-6">
        <h3 className="text-xl font-bold text-white">Add New Slot</h3>
      </div>

      {/* Sub-tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveSubTab('paper')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeSubTab === 'paper'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Paper Exam (Excel)
        </button>
        <button
          onClick={() => setActiveSubTab('manual')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeSubTab === 'manual'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Manual Slot
        </button>
      </div>

      {activeSubTab === 'paper' && (
        <PaperExamUpload
          onSlotsCreated={onSlotAdded}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
      {activeSubTab === 'manual' && (
        <ManualSlotForm
          onSlotAdded={onSlotAdded}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  );
};

export default AddSlotTab;