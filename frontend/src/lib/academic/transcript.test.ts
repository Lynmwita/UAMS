import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTranscript } from './transcript';
import { gradesStore } from './grades';

test('transcripts group approved grades by actual academic period and count failed credits in GPA', () => {
  const records = [
    {...gradesStore[0],academic_year:'2025/2026',semester_label:'Semester 2',credit_hours:3,grade_point:4},
    {...gradesStore[0],academic_year:'2026/2027',semester_label:'Semester 1',credit_hours:3,grade_point:0},
    {...gradesStore[0],academic_year:'2026/2027',semester_label:'Semester 1',is_approved:false,credit_hours:20,grade_point:4},
  ];
  const result = buildTranscript({name:'Student',admissionNumber:'BCS/2026/1',program:'Computing',yearOfStudy:2,semesterNumber:1},records);
  assert.equal(result.semesterResults.length,2);
  assert.equal(result.semesterResults[0].academicYear,'2025/2026');
  assert.equal(result.totalCredits,6);
  assert.equal(result.cumulativeGpa,2);
  assert.equal(result.semesterResults[1].creditsEarned,0);
});

test('transcripts never invent a semester for missing legacy metadata', () => {
  const result=buildTranscript({name:'Student',admissionNumber:'BCS/2026/1',program:'Computing',yearOfStudy:2,semesterNumber:1},[gradesStore[0]]);
  assert.equal(result.semesterResults[0].academicYear,'Academic year not recorded');
});
