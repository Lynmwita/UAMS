'use client';

import React, { useState } from 'react';
import { Download, Printer, X, Shield, QrCode } from 'lucide-react';
import { initialsForName } from '@/lib/students/photo';
import { generateStaffIDCardPDF } from '@/lib/pdf/generator';

export type StaffIdCardData = {
  name: string;
  staffNumber: string;
  jobTitle: string;
  department: string;
  role?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  joinedDate?: string;
  expiryDate?: string;
  isActive?: boolean;
};

/** Round staff profile avatar with fallback initials. */
export function StaffAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const dims =
    size === 'xl'
      ? 'h-20 w-20 text-xl'
      : size === 'lg'
      ? 'h-16 w-16 text-lg'
      : size === 'sm'
      ? 'h-8 w-8 text-[10px]'
      : 'h-10 w-10 text-xs';

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={`Profile photo of ${name}`}
        className={`${dims} rounded-full object-cover border-2 border-academic-gold-400 flex-shrink-0 shadow-xs`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${dims} rounded-full bg-academic-navy-950 text-academic-gold-400 font-extrabold flex items-center justify-center border-2 border-academic-gold-500 flex-shrink-0 shadow-xs`}
    >
      {initialsForName(name)}
    </div>
  );
}

/**
 * On-screen Staff ID Card (Front side).
 * CR80 Card Dimensions: 85.6mm x 54mm.
 */
export function StaffIdCard({
  staff,
  compact = false,
}: {
  staff: StaffIdCardData;
  compact?: boolean;
}) {
  const displayName = (staff.name || 'Staff Member').toUpperCase();
  const designation = (staff.jobTitle || staff.role || 'Staff Member').toUpperCase();
  const institution = process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'UNIVERSITY INSTITUTION';

  return (
    <div
      data-testid="staff-id-card"
      className="w-full max-w-[340px] mx-auto bg-white rounded-xl overflow-hidden border border-slate-300 shadow-md text-left select-none"
      style={{ aspectRatio: '85.6 / 54' }}
    >
      {/* Header */}
      <div className="bg-academic-navy-950 px-3 pt-2 pb-1.5 text-center">
        <p
          className="text-white font-extrabold tracking-wide truncate"
          style={{ fontSize: compact ? 9.5 : 10.5 }}
        >
          {institution}
        </p>
        <p
          className="text-academic-gold-400 font-bold tracking-[0.2em]"
          style={{ fontSize: compact ? 6 : 7 }}
        >
          STAFF IDENTIFICATION CARD
        </p>
      </div>
      <div className="h-[3px] bg-academic-gold-500" />

      {/* Card Body */}
      <div className="flex gap-3 px-3 py-2.5">
        {/* Photo Column */}
        <div className="flex-shrink-0 flex flex-col items-center">
          {staff.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staff.photoUrl}
              alt={`Photo of ${staff.name} on staff ID card`}
              className="w-[68px] h-[86px] object-cover rounded-md border border-slate-300 shadow-xs"
            />
          ) : (
            <div className="w-[68px] h-[86px] rounded-md bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500 shadow-xs">
              <span className="font-extrabold text-academic-navy-900" style={{ fontSize: 16 }}>
                {initialsForName(staff.name || '?')}
              </span>
              <span className="tracking-widest font-semibold text-slate-400" style={{ fontSize: 7 }}>
                STAFF PHOTO
              </span>
            </div>
          )}
          <span
            className="mt-1 px-1.5 py-0.2 text-academic-navy-900 bg-academic-gold-100 border border-academic-gold-300 font-bold rounded text-center tracking-wider uppercase"
            style={{ fontSize: compact ? 5.5 : 6.5 }}
          >
            OFFICIAL STAFF
          </span>
        </div>

        {/* Details Column */}
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <p
              className="font-extrabold text-academic-navy-950 truncate leading-tight"
              style={{ fontSize: compact ? 10.5 : 12 }}
            >
              {displayName}
            </p>
            <p className="mt-1" style={{ fontSize: compact ? 7.5 : 8.5 }}>
              <span className="font-bold text-academic-gold-600">STAFF NO: </span>
              <span className="font-bold font-mono text-academic-navy-900">
                {staff.staffNumber || 'EUC/STAFF/000'}
              </span>
            </p>
            <p className="mt-0.5 leading-tight" style={{ fontSize: compact ? 7 : 8 }}>
              <span className="font-bold text-slate-500">ROLE: </span>
              <span className="text-slate-800 font-semibold">{designation}</span>
            </p>
            <p className="mt-0.5 leading-tight truncate" style={{ fontSize: compact ? 7 : 8 }}>
              <span className="font-bold text-slate-500">DEPT: </span>
              <span className="text-slate-800 font-medium">
                {staff.department || 'General Administration'}
              </span>
            </p>
          </div>

          <div
            className="pt-1 border-t border-slate-200 flex justify-between items-center text-slate-600"
            style={{ fontSize: compact ? 6.5 : 7.5 }}
          >
            <div>
              <span className="font-bold text-slate-500">STATUS: </span>
              <span className="font-bold text-emerald-700">
                {staff.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500">EXPIRY: </span>
              <span className="font-bold text-academic-navy-950">
                {staff.expiryDate || 'DEC 2028'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Footer Strip */}
      <div className="bg-academic-navy-950 px-2 py-1 text-center flex items-center justify-center gap-1.5">
        <Shield className="h-2.5 w-2.5 text-academic-gold-400" />
        <span
          className="text-slate-300 font-semibold tracking-wider"
          style={{ fontSize: compact ? 5 : 6 }}
        >
          PROPERTY OF THE UNIVERSITY • FOR OFFICIAL USE ONLY
        </span>
      </div>
    </div>
  );
}

/** On-screen Staff ID Card (Back side). */
export function StaffIdCardBack({
  staff,
  compact = false,
}: {
  staff: StaffIdCardData;
  compact?: boolean;
}) {
  return (
    <div
      data-testid="staff-id-card-back"
      className="w-full max-w-[340px] mx-auto bg-slate-50 rounded-xl overflow-hidden border border-slate-300 shadow-md text-left flex flex-col justify-between select-none"
      style={{ aspectRatio: '85.6 / 54' }}
    >
      <div>
        {/* Magnetic stripe simulation */}
        <div className="h-7 bg-slate-900 w-full mt-2" />

        {/* Instructions */}
        <div className="px-3 pt-2 text-slate-600 space-y-1">
          <p
            className="font-bold text-academic-navy-950 tracking-wider uppercase"
            style={{ fontSize: compact ? 6.5 : 7.5 }}
          >
            Conditions of Issue & Security
          </p>
          <ul
            className="list-disc pl-3 text-slate-500 space-y-0.5 leading-snug"
            style={{ fontSize: compact ? 5.5 : 6.5 }}
          >
            <li>This card remains the property of the University and is non-transferable.</li>
            <li>Must be displayed or presented on demand by campus security or authorized personnel.</li>
            <li>Loss must be reported immediately to the Human Resources / Registrar Department.</li>
          </ul>
        </div>
      </div>

      {/* Barcode & Return Instructions */}
      <div className="px-3 pb-2 pt-1 border-t border-slate-200 bg-white">
        {/* Simulated Barcode */}
        <div className="flex items-center justify-center gap-[2px] h-5 py-0.5">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className={`bg-slate-900 h-full ${
                i % 4 === 0 ? 'w-[2.5px]' : i % 2 === 0 ? 'w-[1.5px]' : 'w-[1px]'
              }`}
            />
          ))}
        </div>
        <p
          className="text-center font-mono font-bold text-academic-navy-950 mt-0.5"
          style={{ fontSize: compact ? 6.5 : 7.5 }}
        >
          *{staff.staffNumber || 'EUC/STAFF/000'}*
        </p>
        <p
          className="text-center text-slate-400 font-medium tracking-tight mt-0.5"
          style={{ fontSize: compact ? 5 : 6 }}
        >
          If found, please return to University Security Office or call +254 700 000 000
        </p>
      </div>
    </div>
  );
}

/** Full Interactive Staff ID Card Modal with Download PDF & Print. */
export function StaffIdCardModal({
  staff,
  onClose,
}: {
  staff: StaffIdCardData;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = () => {
    setDownloading(true);
    try {
      const doc = generateStaffIDCardPDF({
        staff: {
          name: staff.name,
          staffNumber: staff.staffNumber,
          jobTitle: staff.jobTitle,
          department: staff.department,
          email: staff.email,
          phone: staff.phone,
        },
        photoDataUrl: staff.photoUrl,
        expiryDate: staff.expiryDate || 'DECEMBER 2028',
      });
      const filename = `Staff_ID_${(staff.staffNumber || 'Card').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Failed to generate staff ID card PDF', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-academic-navy-50 text-academic-navy-900 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-academic-navy-950">University Staff ID Card</h3>
              <p className="text-xs text-slate-500">Official CR80 digital badge and PVC layout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Both Front and Back side previews */}
        <div className="space-y-4 py-1 max-h-[65vh] overflow-y-auto px-1">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase mb-2 text-center">
              Front Side (Face)
            </p>
            <StaffIdCard staff={staff} />
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase mb-2 text-center">
              Back Side (Terms & Barcode)
            </p>
            <StaffIdCardBack staff={staff} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Card</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-academic-gold-400" />
              <span>{downloading ? 'Generating PDF...' : 'Download PDF ID'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
