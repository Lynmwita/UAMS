'use client';

import { useState, useEffect } from 'react';
import { Home, Plus, CheckCircle2, Bed, Building, UserCheck, Phone, ShieldCheck } from 'lucide-react';
import { HostelBlock, HostelRoom, HostelAllocation } from '@/types';

export default function HostelPage() {
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [allocations, setAllocations] = useState<HostelAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'blocks' | 'allocations' | 'book'>('blocks');

  const [formData, setFormData] = useState({
    student_name: 'Alex Kiptoo Kimutai',
    admission_number: 'BIT/2023/8849',
    room_id: '',
    bed_number: 1,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/hostels');
      const json = await res.json();
      if (json.success) {
        setBlocks(json.data.blocks);
        setRooms(json.data.rooms);
        setAllocations(json.data.allocations);
        if (json.data.rooms.length > 0) {
          setFormData((prev) => ({ ...prev, room_id: json.data.rooms[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/v1/hostels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
        setActiveTab('allocations');
      } else {
        setMessage({ type: 'error', text: data.error || 'Allocation failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Home className="h-6 w-6 text-academic-navy-900" />
            Hostel & Accommodation Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage residential halls, room occupancy, bed allocations, and wardens.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'blocks' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Halls & Capacity
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'allocations' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Occupancy Roster
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'book' ? 'bg-academic-gold-500 text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Allocate Room
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
          {message.text}
        </div>
      )}

      {activeTab === 'blocks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blocks.map((b) => (
            <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 hover:border-academic-navy-600 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-academic-navy-50 text-academic-navy-900 border border-academic-navy-200 uppercase">
                  {b.code}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${b.gender_designation === 'male' ? 'bg-blue-50 text-blue-700' : b.gender_designation === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                  {b.gender_designation} Wing
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Building className="h-3.5 w-3.5" /> Floors: {b.total_floors} | Capacity: {b.total_capacity} beds
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5 text-academic-navy-700" /> {b.warden_name}</span>
                <span className="flex items-center gap-1 font-mono text-slate-500"><Phone className="h-3 w-3" /> {b.warden_phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'allocations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Current Semester Student Allocations</h2>
            <span className="text-xs font-mono text-slate-500">Total: {allocations.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Hall / Block</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Bed</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium text-academic-navy-900">{a.admission_number}</td>
                    <td className="p-3 font-semibold text-slate-900">{a.student_name}</td>
                    <td className="p-3 text-slate-600">{a.block_name}</td>
                    <td className="p-3 font-mono font-semibold">{a.room_number}</td>
                    <td className="p-3">Bed #{a.bed_number}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {a.payment_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'book' && (
        <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bed className="h-5 w-5 text-academic-navy-900" />
            Direct Room Bed Allocation
          </h2>
          <form onSubmit={handleAllocate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
              <input
                type="text"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number</label>
              <input
                type="text"
                value={formData.admission_number}
                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Available Room</label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id} disabled={!r.is_available}>
                      Room {r.room_number} (KES {r.semester_fee.toLocaleString()} - {r.capacity - r.occupied_beds} beds left)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bed Number</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={formData.bed_number}
                  onChange={(e) => setFormData({ ...formData, bed_number: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Confirm & Assign Bed Allocation
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
