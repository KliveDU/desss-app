// components/AddTutorTab.tsx
import React, { useState } from 'react';
import type { Faculty } from '../types';
import { Role, Faculty as FacultyEnum } from '../types';
import * as api from '../services/api';
import * as XLSX from 'xlsx';
import {
  UserCircleIcon, IdentificationIcon, AcademicCapIcon,
  StarIcon, PlusCircleIcon, UploadIcon
} from './icons';
import FormInput from './FormInput';
// ==============================
// SMART COLUMN MAPPING
// ==============================
const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/\s+/g, '');
};

const getColumnMapping = (headers: string[]): Record<string, number> => {
  const mapping: Record<string, number> = {};
  const normalized = headers.map(h => normalizeHeader(h));
  const nameAliases = ['tutorname', 'name', 'fullname', 'tutor'];
  const nameIndex = normalized.findIndex(h => nameAliases.some(a => h.includes(a)));
  if (nameIndex !== -1) mapping.name = nameIndex;
  const usernameIndex = normalized.findIndex(h => h === 'username');
  if (usernameIndex !== -1) mapping.username = usernameIndex;
  const passwordIndex = normalized.findIndex(h => h === 'password');
  if (passwordIndex !== -1) mapping.password = passwordIndex;
  const facultyIndex = normalized.findIndex(h => h === 'faculty');
  if (facultyIndex !== -1) mapping.faculty = facultyIndex;
  const mtaAliases = ['mtaload', 'mta', 'midtermload', 'midterm'];
  const mtaIndex = normalized.findIndex(h => mtaAliases.some(a => h.includes(a)));
  if (mtaIndex !== -1) mapping.mtaLoad = mtaIndex;
  const finalAliases = ['finalload', 'final', 'finalexam'];
  const finalIndex = normalized.findIndex(h => finalAliases.some(a => h.includes(a)));
  if (finalIndex !== -1) mapping.finalLoad = finalIndex;
  const empAliases = ['employmenttype', 'employment', 'type', 'status'];
  const empIndex = normalized.findIndex(h => empAliases.some(a => h.includes(a)));
  if (empIndex !== -1) mapping.employmentType = empIndex;
  return mapping;
};

// ==============================
// EXCEL UPLOAD SECTION
// ==============================
const TutorFileUploadSection: React.FC<{
  onUploadSuccess: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onUploadSuccess, setError, setSuccess }) => {
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
        const mapping = getColumnMapping(headers);
        const required = ['name', 'username', 'password', 'faculty', 'mtaLoad', 'finalLoad', 'employmentType'];
        for (const field of required) {
          if (mapping[field] === undefined) {
            setError(`Missing column for: ${field}`);
            return;
          }
        }
        const tutors = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          const tutor = {
            name: row[mapping.name]?.toString().trim(),
            username: row[mapping.username]?.toString().trim(),
            password: row[mapping.password]?.toString(),
            faculty: row[mapping.faculty]?.toString().trim() as Faculty,
            mtaLoad: parseFloat(row[mapping.mtaLoad]) || 0,
            finalLoad: parseFloat(row[mapping.finalLoad]) || 0,
            employmentType: row[mapping.employmentType]?.toString().trim() as 'Part time' | 'Full time',
          };
          if (!tutor.name || !tutor.username || !tutor.password || !tutor.faculty) {
            setError(`Row ${i + 1}: Missing required data`);
            return;
          }
          if (!Object.values(FacultyEnum).includes(tutor.faculty)) {
            setError(`Row ${i + 1}: Invalid Faculty. Use: ${Object.values(FacultyEnum).join(', ')}`);
            return;
          }
          if (!['Part time', 'Full time'].includes(tutor.employmentType)) {
            const emp = tutor.employmentType.toLowerCase();
            if (emp.includes('part')) {
              tutor.employmentType = 'Part time';
            } else if (emp.includes('full')) {
              tutor.employmentType = 'Full time';
            } else {
              setError(`Row ${i + 1}: Employment must be "Part time" or "Full time"`);
              return;
            }
          }
          tutors.push({
            ...tutor,
            role: Role.TUTOR,
            maxShifts: tutor.mtaLoad + tutor.finalLoad,
          });
        }
        api.bulkAddTutors(tutors)
          .then(() => {
            setSuccess(`Successfully processed ${tutors.length} tutors!`);
            onUploadSuccess();
          })
          .catch(err => {
            setError(err instanceof Error ? err.message : 'Bulk upload failed');
          });
      } catch (err) {
        console.error(err);
        setError('Invalid Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Upload Tutors from Excel</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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

// ==============================
// MANUAL TUTOR FORM
// ==============================
const ManualTutorForm: React.FC<{
  onTutorAdded: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onTutorAdded, setError, setSuccess }) => {
  const [newTutor, setNewTutor] = useState({
    name: '',
    username: '',
    password: '',
    role: Role.TUTOR,
    faculty: FacultyEnum.IT,
    mtaLoad: '' as string | number,
    finalLoad: '' as string | number,
    employmentType: 'Part time' as 'Part time' | 'Full time',
  });

  const totalLoad = (Number(newTutor.mtaLoad) || 0) + (Number(newTutor.finalLoad) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...newTutor,
      mtaLoad: newTutor.mtaLoad === '' ? 0 : Number(newTutor.mtaLoad),
      finalLoad: newTutor.finalLoad === '' ? 0 : Number(newTutor.finalLoad),
      maxShifts: totalLoad,
    };
    try {
      await api.addUser(payload);
      setSuccess('Tutor added successfully!');
      setNewTutor({
        name: '',
        username: '',
        password: '',
        role: Role.TUTOR,
        faculty: FacultyEnum.IT,
        mtaLoad: '',
        finalLoad: '',
        employmentType: 'Part time',
      });
      onTutorAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tutor.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTutor(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        id="name"
        label="Full Name"
        type="text"
        value={newTutor.name}
        onChange={handleChange}
        icon={<UserCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
      />
      <FormInput
        id="username"
        label="Username"
        type="text"
        value={newTutor.username}
        onChange={handleChange}
        icon={<IdentificationIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
      />
      <FormInput
        id="password"
        label="Password"
        type="password"
        value={newTutor.password}
        onChange={handleChange}
        icon={<UploadIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
      />
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
          <AcademicCapIcon className="h-5 w-5" />
        </div>
        <select
          name="faculty"
          value={newTutor.faculty}
          onChange={handleChange}
          className="block w-full rounded-md border-0 py-2.5 pl-10 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
        >
          {Object.values(FacultyEnum).map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <FormInput
        id="mtaLoad"
        label="MTA Load"
        type="number"
        step="0.5"
        min="0"
        value={newTutor.mtaLoad}
        onChange={handleChange}
        icon={<StarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
      />
      <FormInput
        id="finalLoad"
        label="Final Load"
        type="number"
        step="0.5"
        min="0"
        value={newTutor.finalLoad}
        onChange={handleChange}
        icon={<StarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
      />
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
        <span className="font-medium">Total Load:</span> {totalLoad}
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employment Type</label>
        <select
          name="employmentType"
          value={newTutor.employmentType}
          onChange={handleChange}
          className="block w-full rounded-md border-0 py-2.5 pl-3 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
        >
          <option value="Part time">Part time</option>
          <option value="Full time">Full time</option>
        </select>
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
        <select
          name="role"
          value={newTutor.role}
          onChange={handleChange}
          className="block w-full rounded-md border-0 py-2.5 pl-3 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
        >
          <option value={Role.TUTOR}>Tutor</option>
          <option value={Role.ADMIN}>Admin</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full flex justify-center items-center gap-2 bg-custom-blue hover:bg-custom-blue-darker text-white font-bold py-2 px-4 rounded transition-colors"
      >
        <PlusCircleIcon className="h-6 w-6" /> Add Tutor
      </button>
    </form>
  );
};

// ==============================
// MAIN EXPORT
// ==============================
const AddTutorTab: React.FC<{
  onTutorAdded: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ onTutorAdded, setError, setSuccess }) => {
  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow-xl">
      <div className="p-4 rounded-t-lg bg-gradient-to-r from-custom-blue to-custom-blue-darker mb-6">
        <h3 className="text-xl font-bold text-white">Add New Tutor</h3>
      </div>
      <TutorFileUploadSection onUploadSuccess={onTutorAdded} setError={setError} setSuccess={setSuccess} />
      <ManualTutorForm onTutorAdded={onTutorAdded} setError={setError} setSuccess={setSuccess} />
    </div>
  );
};

export default AddTutorTab;