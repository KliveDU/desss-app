// components/Calendar.tsx
import React from 'react';
import type { ExamSlot } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

// ✅ SAFE: Parse "YYYY-MM-DD" as LOCAL date (not UTC)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

interface CalendarProps {
  slots: ExamSlot[];
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
  currentDate: Date;
  onWeekChange: (newDate: Date) => void;
  slotFilter: 'paper' | 'online';
}

const Calendar: React.FC<CalendarProps> = ({
  slots,
  onDayClick,
  selectedDate,
  currentDate,
  onWeekChange,
  slotFilter
}) => {
  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    onWeekChange(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    onWeekChange(next);
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isSelected = (date: Date) => selectedDate && isSameDay(date, selectedDate);
  const isToday = (date: Date) => isSameDay(date, new Date());

  // ✅ Generate Saturday (6) to Friday (5)
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 6 ? 0 : day + 1; // Sat=0, Sun=1, ..., Fri=6
  startOfWeek.setDate(startOfWeek.getDate() - diff);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }

  // Filter slots
  const paperTypes = ['Midterm', 'Final', 'Makeup'];
  const filteredSlots = slots.filter(slot => {
    return slotFilter === 'paper'
      ? paperTypes.includes(slot.type)
      : slot.type === 'Online';
  });

  // Group slots by LOCAL date string
  const slotsByDate = filteredSlots.reduce((acc, slot) => {
    const localDate = parseLocalDate(slot.date);
    const key = localDate.toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {} as Record<string, ExamSlot[]>);

  return (
    <div className="bg-white dark:bg-surface-dark p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-xl font-bold text-custom-blue-darker">
          {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' – '}
          {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRightIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 dark:text-gray-300 mb-2">
        {days.map((d) => (
          <div key={d.getDay()} className="py-2">
            {d.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, index) => {
          const daySlots = slotsByDate[d.toDateString()] || [];
          return (
            <div
              key={index}
              onClick={() => onDayClick(d)}
              className={`min-h-[100px] p-2 border cursor-pointer transition-colors
                bg-white dark:bg-surface-dark
                ${isSelected(d) ? 'bg-custom-blue-light border-custom-blue' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}
                ${isToday(d) ? 'relative' : ''}
              `}
            >
              {isToday(d) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-1 text-xs">
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`p-1 rounded text-white text-center ${
                      slot.appliedCount >= slot.capacity ? 'bg-red-500' : 'bg-custom-blue'
                    }`}
                  >
                    {slot.startTime}–{slot.endTime}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;