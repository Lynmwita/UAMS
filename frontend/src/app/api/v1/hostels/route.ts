import { NextResponse } from 'next/server';
import { HostelBlock, HostelRoom, HostelAllocation } from '@/types';

let hostelBlocks: HostelBlock[] = [
  { id: 'blk-01', code: 'BLK-A', name: 'Kilimanjaro Hall (Male)', gender_designation: 'male', total_floors: 4, total_capacity: 320, warden_name: 'Mr. David Omondi', warden_phone: '+254711223344', is_active: true },
  { id: 'blk-02', code: 'BLK-B', name: 'Mara Hall (Female)', gender_designation: 'female', total_floors: 4, total_capacity: 300, warden_name: 'Mrs. Grace Wanjiku', warden_phone: '+254722334455', is_active: true },
  { id: 'blk-03', code: 'BLK-C', name: 'Ruwenzori Executive Hall', gender_designation: 'mixed', total_floors: 3, total_capacity: 150, warden_name: 'Dr. Kennedy Mutiso', warden_phone: '+254733445566', is_active: true },
];

let hostelRooms: HostelRoom[] = [
  { id: 'rm-101', block_id: 'blk-01', room_number: 'A-101', floor_number: 1, capacity: 4, occupied_beds: 3, semester_fee: 15000, is_available: true },
  { id: 'rm-102', block_id: 'blk-01', room_number: 'A-102', floor_number: 1, capacity: 4, occupied_beds: 4, semester_fee: 15000, is_available: false },
  { id: 'rm-201', block_id: 'blk-02', room_number: 'B-201', floor_number: 2, capacity: 4, occupied_beds: 2, semester_fee: 16000, is_available: true },
  { id: 'rm-301', block_id: 'blk-03', room_number: 'C-301', floor_number: 3, capacity: 2, occupied_beds: 1, semester_fee: 25000, is_available: true },
];

let hostelAllocations: HostelAllocation[] = [
  { id: 'alc-01', student_id: 'std-01', student_name: 'Alex Kiptoo Kimutai', admission_number: 'BIT/2023/8849', room_id: 'rm-101', block_name: 'Kilimanjaro Hall (Male)', room_number: 'A-101', bed_number: 1, payment_status: 'cleared', status: 'checked_in' },
  { id: 'alc-02', student_id: 'std-02', student_name: 'Faith Chebet Korir', admission_number: 'BCS/2023/9102', room_id: 'rm-201', block_name: 'Mara Hall (Female)', room_number: 'B-201', bed_number: 1, payment_status: 'paid', status: 'allocated' },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      blocks: hostelBlocks,
      rooms: hostelRooms,
      allocations: hostelAllocations,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { student_id, student_name, admission_number, room_id, bed_number, semester_fee } = body;

    const selectedRoom = hostelRooms.find((r) => r.id === room_id);
    const selectedBlock = hostelBlocks.find((b) => b.id === selectedRoom?.block_id);

    const newAllocation: HostelAllocation = {
      id: `alc-${Date.now()}`,
      student_id: student_id || `std-${Date.now()}`,
      student_name: student_name || 'Allocated Student',
      admission_number: admission_number || 'STU/2026/0001',
      room_id: room_id || 'rm-101',
      block_name: selectedBlock?.name || 'Main Hall',
      room_number: selectedRoom?.room_number || 'A-101',
      bed_number: Number(bed_number || 1),
      payment_status: 'paid',
      status: 'allocated',
    };

    if (selectedRoom) {
      selectedRoom.occupied_beds = Math.min(selectedRoom.capacity, selectedRoom.occupied_beds + 1);
      selectedRoom.is_available = selectedRoom.occupied_beds < selectedRoom.capacity;
    }

    hostelAllocations.unshift(newAllocation);

    return NextResponse.json({
      success: true,
      message: `Room ${newAllocation.room_number} successfully allocated.`,
      data: newAllocation,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to allocate room.' }, { status: 400 });
  }
}
