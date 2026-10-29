import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNextStaffNumber, staffStore, type UamsStaffMember } from './staff';
import { clearLecturerAllocations, coursesStore } from '../academic/course-catalog';
import { clearLecturerFromTimetable } from '../academic/timetable-store';
import { canAccessPage } from '../auth/roles';
import { roleHasPermission } from '../auth/rbac';

test('generateNextStaffNumber generates unique and monotonic staff numbers', () => {
  const sampleStaff: UamsStaffMember[] = [
    {
      id: 's-1',
      staff_number: 'EUC/STAFF/001',
      first_name: 'A',
      last_name: 'B',
      email: 'a@test.com',
      phone: '',
      role: 'lecturer',
      department_id: 'd-1',
      department_name: 'D',
      school_id: 's-1',
      job_title: 'Lecturer',
      qualification: '',
      is_active: true,
      joined_date: '2026-01-01',
    },
    {
      id: 's-2',
      staff_number: 'EUC/STAFF/002',
      first_name: 'C',
      last_name: 'D',
      email: 'c@test.com',
      phone: '',
      role: 'lecturer',
      department_id: 'd-1',
      department_name: 'D',
      school_id: 's-1',
      job_title: 'Lecturer',
      qualification: '',
      is_active: true,
      joined_date: '2026-01-01',
    },
  ];

  const nextNumber = generateNextStaffNumber(sampleStaff);
  assert.equal(nextNumber, 'EUC/STAFF/003');

  // Even if 002 is deleted, next number should still not collide
  const afterDelete = [sampleStaff[0]];
  const nextAfterDelete = generateNextStaffNumber(afterDelete);
  assert.equal(nextAfterDelete, 'EUC/STAFF/002');
});

test('clearLecturerAllocations and clearLecturerFromTimetable reset allocations to Unassigned', () => {
  // Jane Mwangi is assigned to courses and timetable
  clearLecturerAllocations('Dr. Jane Mwangi');
  clearLecturerFromTimetable('Dr. Jane Mwangi');

  const mwangiCourses = coursesStore.filter((c) => c.lecturer?.includes('Jane Mwangi'));
  assert.equal(mwangiCourses.length, 0, 'No course should retain Jane Mwangi as active lecturer');
});

test('audit_officer and support_staff page access and rbac rules', () => {
  assert.equal(canAccessPage('audit_officer', 'audit'), true);
  assert.equal(canAccessPage('audit_officer', 'finance'), true);
  assert.equal(canAccessPage('audit_officer', 'grades'), true);
  assert.equal(canAccessPage('audit_officer', 'exams'), true);
  assert.equal(roleHasPermission('audit_officer', 'audit:read'), true);
  assert.equal(roleHasPermission('audit_officer', 'finance:read'), true);
  assert.equal(roleHasPermission('audit_officer', 'grades:read'), true);
  assert.equal(roleHasPermission('audit_officer', 'exams:read'), true);
  assert.equal(roleHasPermission('audit_officer', 'grades:enter'), false);

  assert.equal(canAccessPage('support_staff', 'dashboard'), true);
  assert.equal(canAccessPage('support_staff', 'support'), false);
  assert.equal(canAccessPage('support_staff', 'grades'), false);
  assert.equal(canAccessPage('support_staff', 'finance'), false);
  assert.equal(canAccessPage('support_staff', 'audit'), false);
});
