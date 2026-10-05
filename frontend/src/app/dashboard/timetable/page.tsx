'use client';

import { useState } from 'react';
import { Calendar, Plus, Clock, MapPin, User, X, Filter } from 'lucide-react';

export default function TimetablePage() {
  const [selectedDay, setSelectedDay] = useState('All');

  const [schedule, setSchedule] = useState([
    { id: '1', day: 'Monday', time: '08:00 - 11:00 AM', courseCode: 'BCS 311', courseTitle: 'Advanced Database Systems', room: 'Lecture Hall 04 (Main Campus)', lecturer: 'Dr. Jane Mwangi' },
    { id: '2', day: 'Monday', time: '02:00 - 05:00 PM', courseCode: 'BIT 312', courseTitle: 'Distributed Systems & Cloud Computing', room: 'Computing Lab 01', lecturer: 'Prof. David Kamau' },
    { id: '3', day: 'Tuesday', time: '11:00 - 01:00 PM', courseCode: 'BCS 314', courseTitle: 'Software Engineering Architecture', room: 'Lecture Theater 02', lecturer: 'Eng. Eric Ochieng' },
    { id: '4', day: 'Wednesday', time: '08:00 - 11:00 AM', courseCode: 'BCS 316', courseTitle: 'Network & System Security', room: 'Cybersecurity Lab 03', lecturer: 'Dr. Jane Mwangi' },
    { id: '5', day: 'Thursday', time: '02:00 - 05:00 PM', courseCode: 'BBA 201', courseTitle: 'Principles of Financial Accounting', room: 'Lecture Hall 01', lecturer: 'Dr. Martin Omondi' },
    { id: '6', day: 'Friday', time: '09:00 - 12:00 PM', courseCode: 'BCS 311', courseTitle: 'Database Practical Lab', room: 'Computing Lab 02', lecturer: 'Dr. Jane Mwangi' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day: 'Monday',
    time: '08:00 - 11:00 AM',
    courseCode: 'BCS 311',
    courseTitle: 'Advanced Database Systems',
    room: 'Lecture Hall 04 (Main Campus)',
    lecturer: 'Dr. Jane Mwangi',
  });

  const days = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const filteredSchedule = selectedDay === 'All' ? schedule : schedule.filter((s) => s.day === selectedDay);

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = {
      id: `tt-${Date.now()}`,
      day: newSlot.day,
      time: newSlot.time,
      courseCode: newSlot.courseCode,
      courseTitle: newSlot.courseTitle,
      room: newSlot.room,
      lecturer: newSlot.lecturer,
    };
    setSchedule([...schedule, entry]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Academic Timetable & Lecture Scheduling
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Weekly semester lecture allocations, assigned computer labs, lecture theaters, and lecturer rosters.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Schedule Lecture Slot</span>
        </button>
      </div>

      {/* Day Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              selectedDay === day
                ? 'bg-academic-navy-900 text-white shadow'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Active Lecture Session Schedule</h2>
          <span className="text-xs font-medium text-slate-500">{filteredSchedule.length} Scheduled Slots</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Day</th>
                <th className="px-5 py-3.5">Time Interval</th>
                <th className="px-5 py-3.5">Course Unit</th>
                <th className="px-5 py-3.5">Assigned Venue / Lab</th>
                <th className="px-5 py-3.5">Lecturer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedule.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-bold text-academic-navy-950">
                    <span className="px-2.5 py-1 rounded bg-slate-100 text-xs font-bold text-academic-navy-900">
                      {item.day}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-700 font-semibold flex items-center space-x-1.5 pt-4">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{item.time}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-academic-navy-800">{item.courseCode}</span>
                    <p className="text-xs text-slate-500">{item.courseTitle}</p>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800 text-xs">
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5 text-academic-gold-600" />
                      <span>{item.room}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{item.lecturer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Schedule Lecture Allocation</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Day of Week</label>
                  <select
                    value={newSlot.day}
                    onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Time Slot</label>
                  <select
                    value={newSlot.time}
                    onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value="08:00 - 11:00 AM">08:00 - 11:00 AM</option>
                    <option value="11:00 - 01:00 PM">11:00 - 01:00 PM</option>
                    <option value="02:00 - 05:00 PM">02:00 - 05:00 PM</option>
                    <option value="05:30 - 08:30 PM">05:30 - 08:30 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Unit</label>
                <select
                  value={newSlot.courseCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const titles: Record<string, string> = {
                      'BCS 311': 'Advanced Database Systems',
                      'BIT 312': 'Distributed Systems & Cloud Computing',
                      'BCS 314': 'Software Engineering Architecture',
                      'BCS 316': 'Network & System Security',
                      'BBA 201': 'Principles of Financial Accounting',
                    };
                    setNewSlot({ ...newSlot, courseCode: code, courseTitle: titles[code] || code });
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                >
                  <option value="BCS 311">BCS 311 - Advanced Database Systems</option>
                  <option value="BIT 312">BIT 312 - Distributed Systems & Cloud</option>
                  <option value="BCS 314">BCS 314 - Software Engineering Architecture</option>
                  <option value="BCS 316">BCS 316 - Network & System Security</option>
                  <option value="BBA 201">BBA 201 - Principles of Financial Accounting</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Hall / Lab</label>
                  <select
                    value={newSlot.room}
                    onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value="Lecture Hall 04 (Main Campus)">Lecture Hall 04 (Main Campus)</option>
                    <option value="Lecture Theater 02">Lecture Theater 02</option>
                    <option value="Computing Lab 01">Computing Lab 01</option>
                    <option value="Computing Lab 02">Computing Lab 02</option>
                    <option value="Cybersecurity Lab 03">Cybersecurity Lab 03</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lecturer</label>
                  <select
                    value={newSlot.lecturer}
                    onChange={(e) => setNewSlot({ ...newSlot, lecturer: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value="Dr. Jane Mwangi">Dr. Jane Mwangi</option>
                    <option value="Prof. David Kamau">Prof. David Kamau</option>
                    <option value="Eng. Eric Ochieng">Eng. Eric Ochieng</option>
                    <option value="Dr. Martin Omondi">Dr. Martin Omondi</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
