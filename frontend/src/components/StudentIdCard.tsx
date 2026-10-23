'use client';

import { initialsForName } from '@/lib/students/photo';

export type StudentIdCardData = {
  name: string;
  admissionNo: string;
  program: string;
  faculty?: string;
  department?: string;
  campusCode?: string;
  year?: number;
  semester?: number;
  status?: string;
  photoUrl?: string;
  expiryDate?: string;
};

/** Round profile photo. Falls back to navy/gold initials when there is no photo. */
export function StudentAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={`Profile photo of ${name}`} className={`${dims} rounded-full object-cover border-2 border-academic-gold-400 flex-shrink-0`} />;
  }
  return (
    <div
      aria-hidden="true"
      className={`${dims} rounded-full bg-academic-navy-900 text-academic-gold-400 font-extrabold flex items-center justify-center border-2 border-academic-gold-400 flex-shrink-0`}
    >
      {initialsForName(name)}
    </div>
  );
}

/**
 * On-screen Student ID Card (front), styled to match the downloaded PDF card:
 * navy header, gold rule, photo on the left, details on the right.
 * The photo shown here is the student's one profile photo - the same image
 * used in the registry list and in the PDF.
 */
export function StudentIdCard({ student, compact = false }: { student: StudentIdCardData; compact?: boolean }) {
  const displayName = (student.name || 'Student Name').toUpperCase();
  return (
    <div
      data-testid="student-id-card"
      className="w-full max-w-[340px] mx-auto bg-white rounded-xl overflow-hidden border border-slate-300 shadow-md text-left"
      style={{ aspectRatio: '85.6 / 54' }}
    >
      {/* Header */}
      <div className="bg-academic-navy-950 px-3 pt-2 pb-1.5 text-center">
        <p className="text-white font-extrabold tracking-wide" style={{ fontSize: compact ? 10 : 11 }}>
          UNIVERSITY INSTITUTION
        </p>
        <p className="text-academic-gold-400 font-semibold tracking-[0.18em]" style={{ fontSize: compact ? 6 : 7 }}>
          STUDENT IDENTIFICATION CARD
        </p>
      </div>
      <div className="h-[3px] bg-academic-gold-500" />

      {/* Body */}
      <div className="flex gap-3 px-3 py-2.5">
        {/* The one profile photo */}
        <div className="flex-shrink-0">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photoUrl}
              alt={`Photo of ${student.name} on student ID card`}
              className="w-[68px] h-[88px] object-cover rounded-md border border-slate-300"
            />
          ) : (
            <div className="w-[68px] h-[88px] rounded-md bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500">
              <span className="font-extrabold text-academic-navy-900" style={{ fontSize: 16 }}>
                {initialsForName(student.name || '?')}
              </span>
              <span className="tracking-widest" style={{ fontSize: 7 }}>PHOTO</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-academic-navy-950 truncate" style={{ fontSize: compact ? 11 : 12.5 }}>
            {displayName}
          </p>
          <p className="mt-1" style={{ fontSize: compact ? 8 : 9 }}>
            <span className="font-bold text-academic-gold-600">ADM NO: </span>
            <span className="font-bold font-mono text-academic-navy-900">{student.admissionNo || '—'}</span>
          </p>
          <p className="mt-1 leading-snug" style={{ fontSize: compact ? 7.5 : 8.5 }}>
            <span className="font-bold text-slate-500">PROGRAM: </span>
            <span className="text-academic-navy-900">{student.program || '—'}</span>
          </p>
          {(student.year || student.campusCode) && (
            <p className="mt-1" style={{ fontSize: compact ? 7.5 : 8.5 }}>
              {student.year ? (
                <>
                  <span className="font-bold text-slate-500">YEAR: </span>
                  <span className="text-academic-navy-900">{student.year}{student.semester ? `, Sem ${student.semester}` : ''}</span>{' '}
                </>
              ) : null}
              {student.campusCode ? (
                <>
                  <span className="font-bold text-slate-500">CAMPUS: </span>
                  <span className="text-academic-navy-900">{student.campusCode}</span>
                </>
              ) : null}
            </p>
          )}
          <p className="mt-1" style={{ fontSize: compact ? 7.5 : 8.5 }}>
            <span className="font-bold text-slate-500">EXPIRY: </span>
            <span className="text-academic-navy-900">{student.expiryDate || 'DECEMBER 2027'}</span>
          </p>
          {student.status && student.status !== 'active' && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
              {student.status}
            </span>
          )}
        </div>
      </div>

      {/* Footer strip */}
      <div className="bg-academic-navy-950 px-3 py-1 mt-auto">
        <p className="text-white text-center tracking-wide" style={{ fontSize: 6.5 }}>
          PROPERTY OF THE UNIVERSITY • MUST BE RETURNED UPON DEMAND
        </p>
      </div>
    </div>
  );
}

/** Back of the card, shown under the front in the ID Card viewer. */
export function StudentIdCardBack({ admissionNo }: { admissionNo: string }) {
  return (
    <div className="w-full max-w-[340px] mx-auto bg-slate-50 rounded-xl overflow-hidden border border-slate-300 shadow-md text-left">
      <div className="bg-slate-900 h-6 mt-3" />
      <div className="px-3 py-2.5">
        <p className="font-bold text-academic-navy-950" style={{ fontSize: 9 }}>CONDITIONS OF ISSUE &amp; USAGE:</p>
        <ol className="text-slate-600 mt-1 space-y-0.5" style={{ fontSize: 8 }}>
          <li>1. This card is non-transferable and remains valid while the student is enrolled.</li>
          <li>2. Lost cards must be reported immediately to the Dean of Students office.</li>
          <li>3. If found, please return to any university campus administration or security.</li>
        </ol>
        <p className="font-mono font-bold text-center text-academic-navy-900 mt-2 tracking-widest" style={{ fontSize: 10 }}>
          *{admissionNo || '—'}*
        </p>
      </div>
    </div>
  );
}
