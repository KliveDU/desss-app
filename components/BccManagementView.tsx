// components/BccManagementView.tsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { User, BccAssignment, CreateBccAssignment, ExamType } from '../types';
import { Role, ExamType as ExamTypeEnum } from '../types';
import * as api from '../services/api';
import {
  UserCircleIcon, AcademicCapIcon, ClockIcon, StarIcon, UploadIcon,
  PlusCircleIcon, TrashIcon, XIcon
} from './icons';

interface BccManagementViewProps {
  userList: User[];
  onBccUpdated: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}

const BccManagementView: React.FC<BccManagementViewProps> = ({
  userList,
  onBccUpdated,
  setError,
  setSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload');
  const [bccList, setBccList] = useState<BccAssignment[]>([]);
  const [editingBcc, setEditingBcc] = useState<CreateBccAssignment | null>(null);
  const [selectedBccIds, setSelectedBccIds] = useState<number[]>([]);

  const loadBcc = async () => {
    try {
      const data = await api.getBccAssignments();
      setBccList(data);
      setSelectedBccIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BCC assignments');
    }
  };

  useEffect(() => {
    loadBcc();
  }, []);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
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

      // Map your exact columns from 12.xlsx
      const colMap = {
        date: normalized.findIndex(h => h === 'date'),
        from: normalized.findIndex(h => h === 'from'),
        to: normalized.findIndex(h => h === 'to'),
        course: normalized.findIndex(h => h === 'course'),
        proctor: normalized.findIndex(h => h === 'proctor'),
        class: normalized.findIndex(h => h === 'class'),
        // credit is not needed for BCC assignment
      };

      if (colMap.date === -1 || colMap.from === -1 || colMap.to === -1 || colMap.class === -1) {
        setError('Required columns missing: Date, From, To, Class');
        return;
      }

      let successCount = 0;
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        const classVal = colMap.class !== -1 ? String(row[colMap.class] || '').trim() : '';
        if (classVal !== 'BCC') continue;

        const date = parseExcelDate(row[colMap.date]);
        const startTime = normalizeTime(row[colMap.from]);
        const endTime = normalizeTime(row[colMap.to]);
        const course = colMap.course !== -1 ? String(row[colMap.course] || '').trim() : '';
        const proctorName = colMap.proctor !== -1 ? String(row[colMap.proctor] || '').trim() : '';

        if (!date || !startTime || !endTime || !proctorName) {
          console.warn(`Skipping invalid BCC row ${i + 1}`);
          continue;
        }

        const proctor = userList.find(u => 
          u.role === Role.TUTOR && 
          (u.name.toLowerCase() === proctorName.toLowerCase() || u.username.toLowerCase() === proctorName.toLowerCase())
        );

        if (!proctor) {
          console.warn(`Proctor not found: ${proctorName}`);
          continue;
        }

        try {
          await api.assignBccToSlot({
            examDate: date,
            startTime,
            endTime,
            course,
            proctorId: proctor.id
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to assign BCC for row ${i + 1}:`, err);
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} BCC assignments created!`);
        loadBcc();
      } else {
        setError('No valid BCC assignments found');
      }
    } catch (err) {
      console.error('Excel error:', err);
      setError('Invalid Excel file');
    }
  };
  reader.readAsBinaryString(file);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBcc) return;
    try {
      const slot = {
        date: editingBcc.date,
        type: editingBcc.examType,
        startTime: editingBcc.startTime,
        endTime: editingBcc.endTime,
        capacity: 1,
        credits: editingBcc.credits,
      };
      const slotRes = await api.createSlot(slot);
      await api.assignAsBcc(slotRes.slot.id, editingBcc.proctorId);
      setSuccess('BCC assignment added!');
      setEditingBcc(null);
      loadBcc();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add BCC');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this BCC assignment?')) return;
    try {
      await api.deleteBccAssignment(id);
      setSuccess('BCC assignment deleted');
      loadBcc();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBccIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedBccIds.length} BCC assignments?`)) return;
    try {
      await Promise.all(
        selectedBccIds.map(id => api.deleteBccAssignment(id))
      );
      setSuccess('BCC assignments deleted');
      loadBcc();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const toggleBccSelect = (id: number) => {
    setSelectedBccIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const parseExcelDate = (input: any): string | null => {
    if (input == null || input === '') return null;
    if (typeof input === 'number') {
      const date = new Date(Math.round((input - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    const str = String(input).trim();
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  const normalizeTime = (input: any): string | null => {
    if (input == null || input === '') return null;
    if (typeof input === 'number') {
      const totalSeconds = Math.round(input * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const str = String(input).trim();
    if (/^(\d{1,2}):(\d{2})$/.test(str)) {
      const [h, m] = str.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow w-full">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'upload'
              ? 'bg-custom-blue text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Upload & Add BCC
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'list'
              ? 'bg-custom-blue text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          BCC Members
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-2">Upload BCC Excel</h3>
            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800">
              <input
                id="bcc-excel-upload"
                type="file"
                accept=".xlsx"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <label
                htmlFor="bcc-excel-upload"
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
              >
                <UploadIcon className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">.xlsx only</p>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold mb-4">Manual Add BCC</h3>
            {editingBcc ? (
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={editingBcc.date}
                      onChange={(e) => setEditingBcc({ ...editingBcc, date: e.target.value })}
                      className="w-full p-2 bg-input-light dark:bg-input-dark rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Proctor</label>
                    <select
                      value={editingBcc.proctorId}
                      onChange={(e) => setEditingBcc({ ...editingBcc, proctorId: parseInt(e.target.value) })}
                      className="w-full p-2 bg-input-light dark:bg-input-dark rounded"
                      required
                    >
                      <option value="">Select Proctor</option>
                      {userList
                        .filter(u => u.role === Role.TUTOR)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.username})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editingBcc.startTime}
                      onChange={(e) => setEditingBcc({ ...editingBcc, startTime: e.target.value })}
                      className="w-full p-2 bg-input-light dark:bg-input-dark rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="time"
                      value={editingBcc.endTime}
                      onChange={(e) => setEditingBcc({ ...editingBcc, endTime: e.target.value })}
                      className="w-full p-2 bg-input-light dark:bg-input-dark rounded"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editingBcc.credits}
                    onChange={(e) => setEditingBcc({ ...editingBcc, credits: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 bg-input-light dark:bg-input-dark rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={editingBcc.examType}
                    onChange={(e) => setEditingBcc({ ...editingBcc, examType: e.target.value as ExamType })}
                    className="w-full p-2 bg-input-light dark:bg-input-dark rounded"
                    required
                  >
                    <option value={ExamTypeEnum.MIDTERM}>Midterm</option>
                    <option value={ExamTypeEnum.FINAL}>Final</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-custom-blue text-white px-4 py-2 rounded"
                  >
                    Add BCC
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBcc(null)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded dark:bg-gray-700 dark:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setEditingBcc({
                  date: new Date().toISOString().split('T')[0],
                  startTime: '09:30',
                  endTime: '11:30',
                  credits: 1,
                  proctorId: userList.find(u => u.role === Role.TUTOR)?.id || 0,
                  examType: ExamTypeEnum.MIDTERM,
                })}
                className="w-full flex items-center justify-center gap-2 bg-custom-blue text-white py-2 rounded"
              >
                <PlusCircleIcon className="h-5 w-5" /> Add BCC Manually
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-4">
          {selectedBccIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Delete Selected ({selectedBccIds.length})
            </button>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-8">
                    <input
                      type="checkbox"
                      checked={selectedBccIds.length === bccList.length && bccList.length > 0}
                      onChange={() => setSelectedBccIds(
                        selectedBccIds.length === bccList.length && bccList.length > 0
                          ? []
                          : bccList.map(b => b.id)
                      )}
                      className="rounded text-custom-blue focus:ring-custom-blue"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Credits</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Proctor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface-dark divide-y divide-gray-200 dark:divide-gray-700">
                {bccList.map(bcc => (
                  <tr key={bcc.id} className="text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedBccIds.includes(bcc.id)}
                        onChange={() => toggleBccSelect(bcc.id)}
                        className="rounded text-custom-blue focus:ring-custom-blue"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{bcc.date}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{bcc.startTime} – {bcc.endTime}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{bcc.credits}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{bcc.examType}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{bcc.proctor.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(bcc.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BccManagementView;