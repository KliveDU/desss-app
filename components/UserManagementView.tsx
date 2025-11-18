// components/UserManagementView.tsx
import React, { useState, useMemo } from 'react';
import type { User, Faculty } from '../types';
import { Role, Faculty as FacultyEnum } from '../types';
import * as api from '../services/api';
import {
  UserCircleIcon, IdentificationIcon, AcademicCapIcon,
  StarIcon, PencilIcon, TrashIcon, XIcon
} from './icons';
import FormInput from './FormInput';

const renderRoleBadge = (role: Role) => {
  const isTutor = role === Role.TUTOR;
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
      isTutor
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }`}>
      {isTutor ? 'Tutor' : 'Admin'}
    </span>
  );
};

const UserManagementView: React.FC<{
  userList: User[];
  currentUser: User;
  onUserUpdated: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
}> = ({ userList, currentUser, onUserUpdated, setError, setSuccess }) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [facultyFilter, setFacultyFilter] = useState<Faculty | 'all'>('all');

  const filteredUsers = useMemo(() => {
    return facultyFilter === 'all'
      ? userList
      : userList.filter(u => u.faculty === facultyFilter);
  }, [userList, facultyFilter]);

  const toggleSelect = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id)
        ? prev.filter(uid => uid !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedUserIds.length} tutor(s)?`)) return;
    try {
      const promises = selectedUserIds.map(id => api.deleteUser(id));
      await Promise.all(promises);
      setSuccess(`${selectedUserIds.length} tutor(s) deleted.`);
      setSelectedUserIds([]);
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, {
        name: editingUser.name,
        username: editingUser.username,
        role: editingUser.role,
        faculty: editingUser.role === Role.TUTOR ? editingUser.faculty : undefined,
        mtaLoad: editingUser.role === Role.TUTOR ? editingUser.mtaLoad : undefined,
        finalLoad: editingUser.role === Role.TUTOR ? editingUser.finalLoad : undefined,
        employmentType: editingUser.employmentType,
      });
      setSuccess('User updated successfully!');
      setEditingUser(null);
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteUser(userToDelete.id);
      setSuccess('User deleted successfully.');
      setUserToDelete(null);
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingUser) return;
    const { name, value } = e.target;
    setEditingUser({
      ...editingUser,
      [name]: name === 'mtaLoad' || name === 'finalLoad'
        ? value === '' ? undefined : Number(value)
        : value,
    });
  };

  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold">Manage Tutors</h2>
        <div className="flex gap-3">
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value as Faculty | 'all')}
            className="block rounded-md border-0 py-2 pl-3 pr-8 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
          >
            <option value="all">All Faculties</option>
            {Object.values(FacultyEnum).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          {selectedUserIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Delete Selected ({selectedUserIds.length})
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded text-custom-blue focus:ring-custom-blue"
                />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Faculty</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MTA</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Final</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employment</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-surface-dark divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="text-text-light dark:text-text-dark">
                <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleSelect(user.id)}
                    className="rounded text-custom-blue focus:ring-custom-blue"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{user.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{user.username}</td>
                <td className="px-4 py-3 whitespace-nowrap">{user.faculty || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{user.mtaLoad != null ? user.mtaLoad : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{user.finalLoad != null ? user.finalLoad : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{user.maxShifts != null ? user.maxShifts : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{user.employmentType || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderRoleBadge(user.role as Role)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-custom-blue hover:underline dark:text-custom-blue-light"
                  >
                    Edit
                  </button>
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="text-red-500 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-custom-blue-darker">
                Edit {editingUser.role === Role.TUTOR ? 'Tutor' : 'Admin'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <FormInput
                id="name"
                label="Full Name"
                type="text"
                name="name"
                value={editingUser.name}
                onChange={handleEditInputChange}
                icon={<UserCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
              />
              <FormInput
                id="username"
                label="Username"
                type="text"
                name="username"
                value={editingUser.username}
                onChange={handleEditInputChange}
                icon={<IdentificationIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
              />
              <div className="relative">
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
                <select
                  name="role"
                  value={editingUser.role}
                  onChange={handleEditInputChange}
                  className="block w-full rounded-md border-0 py-2.5 pl-3 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
                >
                  <option value={Role.TUTOR}>Tutor</option>
                  <option value={Role.ADMIN}>Admin</option>
                </select>
              </div>

              {/* ✅ TUTOR FIELDS */}
              {editingUser.role === Role.TUTOR && (
                <>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                      <AcademicCapIcon className="h-5 w-5" />
                    </div>
                    <select
                      name="faculty"
                      value={editingUser.faculty || FacultyEnum.IT}
                      onChange={handleEditInputChange}
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
                    name="mtaLoad"
                    min="0"
                    value={editingUser.mtaLoad ?? ''}
                    onChange={handleEditInputChange}
                    icon={<StarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
                  />
                  <FormInput
                    id="finalLoad"
                    label="Final Load"
                    type="number"
                    step="0.5"
                    name="finalLoad"
                    min="0"
                    value={editingUser.finalLoad ?? ''}
                    onChange={handleEditInputChange}
                    icon={<StarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
                  />
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <span className="font-medium">Total Load:</span> {(editingUser.mtaLoad || 0) + (editingUser.finalLoad || 0)}
                  </div>
                </>
              )}

              {/* ✅ EMPLOYMENT TYPE FOR ALL */}
              <div className="relative">
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Employment Type</label>
                <select
                  name="employmentType"
                  value={editingUser.employmentType || 'Part time'}
                  onChange={handleEditInputChange}
                  className="block w-full rounded-md border-0 py-2.5 pl-3 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
                >
                  <option value="Part time">Part time</option>
                  <option value="Full time">Full time</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-custom-blue hover:bg-custom-blue-darker text-white font-bold py-2 px-4 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-lg shadow-xl w-full max-w-md m-4">
            <h3 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold">{userToDelete.name}</span>?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setUserToDelete(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;