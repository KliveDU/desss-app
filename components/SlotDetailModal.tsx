// components/SlotDetailModal.tsx
import React from 'react';
import type { User, ExamSlot } from '../types';
import { Role } from '../types';
import {
  UserCircleIcon, AcademicCapIcon, ClockIcon, StarIcon, XIcon
} from './icons';

interface SlotDetailModalProps {
  slot: ExamSlot;
  user: User;
  facultyList: User[];
  onClose: () => void;
  onApply: () => void;
  onUnapply: () => void;
  onAdminAssign: (facultyId: number) => void;
  onAdminUnassign: (facultyId: number) => void;
}

const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot, user, facultyList, onClose, onApply, onUnapply, onAdminAssign, onAdminUnassign
}) => {
  const isFull = slot.appliedCount >= slot.capacity;
  const hasApplied = slot.appliedFaculty.some(f => f.id === user.id);
  const isBcc = slot.type === 'BCC';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-custom-blue-darker">
            {slot.type} Slot Details
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-2 mb-6 text-text-light dark:text-text-dark">
          <p><span className="font-semibold">Date:</span> {new Date(slot.date).toLocaleDateString()}</p>
          <p><span className="font-semibold">Time:</span> {slot.startTime} – {slot.endTime}</p>
          <p><span className="font-semibold">Credits:</span> {slot.credits}</p>
          <p><span className="font-semibold">Capacity:</span> {slot.appliedCount} / {slot.capacity}</p>
        </div>

        {user.role === Role.TUTOR && (
          <>
            {hasApplied ? (
              isBcc ? (
                <p className="text-gray-500 text-sm">BCC assignment (cannot unassign)</p>
              ) : (
                <button
                  onClick={onUnapply}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  Unassign
                </button>
              )
            ) : (
              <button
                onClick={onApply}
                disabled={isFull}
                className={`w-full font-bold py-2 px-4 rounded ${
                  isFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-custom-blue hover:bg-custom-blue-darker text-white'
                }`}
              >
                {isFull ? 'Slot is Full' : 'Apply to This Slot'}
              </button>
            )}
          </>
        )}

        {user.role === Role.ADMIN && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-bold mb-2 text-text-light dark:text-text-dark">
              Applied Faculty ({slot.appliedCount}/{slot.capacity})
            </h4>
            {slot.appliedFaculty.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No applications yet.</p>
            ) : (
              <ul className="space-y-2">
                {slot.appliedFaculty.map(faculty => (
                  <li key={faculty.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <span className="text-text-light dark:text-text-dark">{faculty.name}</span>
                    <button
                      onClick={() => onAdminUnassign(faculty.id)}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                Assign Faculty
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const fid = Number(e.target.value);
                  if (fid) onAdminAssign(fid);
                }}
                className="w-full p-2 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark rounded"
              >
                <option value="">Select faculty...</option>
                {facultyList
                  .filter(f => f.role === Role.TUTOR)
                  .filter(f => !slot.appliedFaculty.some(a => a.id === f.id))
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.faculty ? `(${f.faculty})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotDetailModal; 