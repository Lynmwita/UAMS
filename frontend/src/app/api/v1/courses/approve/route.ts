import { NextRequest } from 'next/server';
import { approveCourseRegistrations } from '@/lib/academic/registration-approval';

export async function POST(request: NextRequest) {
  return approveCourseRegistrations(request, 'bulk');
}
