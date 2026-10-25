'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Download, ShieldCheck, CheckCircle2, Building, Calendar, Award } from 'lucide-react';
import { UamsAdmissionApplication } from '@/types';

export default function AdmissionLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [application, setApplication] = useState<UamsAdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/v1/admissions/public-status?ref=${encodeURIComponent(resolvedParams.id)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load admission details');
        setApplication(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Generating Official Admission Letter...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Offer Letter Unavailable</h2>
          <p className="text-sm text-slate-600">{error || 'Application not found or provisional letter not yet approved.'}</p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Applicant Portal
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 print:p-0 print:bg-white text-slate-900">
      {/* Top action bar - Hidden during print */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/apply"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Official Letter Document */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-300 print:shadow-none print:border-none print:m-0 p-8 sm:p-12 font-serif text-[15px] leading-relaxed">
        {/* University Crest & Letterhead */}
        <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center">
          <div className="flex justify-center items-center gap-3 mb-2">
            <Building className="w-12 h-12 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-950 font-sans">
            University of Advanced Management Sciences
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-600 font-sans font-semibold mt-0.5">
            Office of the Registrar (Academic & Student Affairs)
          </p>
          <p className="text-xs text-slate-500 font-sans mt-1">
            P.O. Box 9000 - 00100, Nairobi, Kenya • Tel: +254 (0) 20 790 0000 • Email: admissions@university.ac.ke
          </p>
        </div>

        {/* Letter Metadata */}
        <div className="flex flex-col sm:flex-row justify-between text-xs font-sans font-semibold text-slate-700 mb-6 gap-2">
          <div>
            <p><span className="text-slate-500">REF:</span> UAMS/REG/ADM/{application.intake_year || 2026}/{application.reference_number}</p>
            <p><span className="text-slate-500">CHANNEL:</span> {application.entry_type === 'KUCCPS' ? 'KUCCPS Government Placement' : 'Direct Entry / Self-Sponsored'}</p>
          </div>
          <div className="sm:text-right">
            <p><span className="text-slate-500">DATE:</span> {today}</p>
            <p><span className="text-slate-500">ADMISSION NO:</span> <strong className="text-indigo-900 font-bold">{application.admission_number || 'PENDING'}</strong></p>
          </div>
        </div>

        {/* Recipient Address */}
        <div className="mb-6 font-sans text-sm">
          <p className="font-bold text-slate-900">{application.applicant_name}</p>
          {application.kcse_index && <p className="text-slate-600">KCSE Index No: <strong>{application.kcse_index}</strong> (Grade: {application.kcse_grade})</p>}
          <p className="text-slate-600">Republic of Kenya</p>
        </div>

        {/* Subject */}
        <div className="mb-6 font-sans">
          <p className="font-bold text-slate-950 text-base uppercase border-y border-slate-300 py-2">
            OFFER OF PROVISIONAL ADMISSION FOR {application.intake?.toUpperCase() || 'SEPTEMBER'} {application.intake_year || 2026} INTAKE
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 text-justify text-slate-800">
          <p>
            Dear <strong>{application.applicant_name}</strong>,
          </p>
          <p>
            I am pleased to inform you that following your academic qualifications, you have been offered provisional
            admission to the University of Advanced Management Sciences (UAMS) in the 2026/2027 Academic Year to pursue
            studies leading to the degree of:
          </p>

          <div className="bg-slate-50 border-l-4 border-indigo-600 p-4 my-4 font-sans">
            <p className="text-base font-bold text-indigo-950">{application.program_name} ({application.program_code})</p>
            <p className="text-xs text-slate-600 mt-1">Programme Duration: 4 Academic Years • Mode of Study: Full-Time Regular</p>
          </div>

          <p>
            <strong>1. Reporting & Orientation Date:</strong> You are required to report in person at the Main Campus,
            Nairobi, on <strong>Monday, 7th September 2026 at 8:00 A.M.</strong> for formal document verification, biometric
            registration, and student orientation.
          </p>

          <p>
            <strong>2. Verification Documents:</strong> This provisional offer is subject to verification of your original
            academic certificates and legal documents. On the date of reporting, you MUST present:
          </p>

          <ul className="list-disc pl-8 font-sans text-xs space-y-1 text-slate-700">
            <li>Original Kenya Certificate of Secondary Education (KCSE) result slip or certificate, plus two photocopies.</li>
            <li>Original National Identity Card or Birth Certificate, plus one photocopy.</li>
            <li>Four (4) recent coloured passport-size photographs (taken on a white background).</li>
            <li>Completed and signed Student Medical Examination Report.</li>
            <li>Official bank deposit slip or M-Pesa receipt for the 1st semester statutory & tuition fees, or Higher Education Financing (HEF / HELB) provisional scholarship award confirmation letter.</li>
          </ul>

          <p>
            <strong>3. Student Regulations:</strong> All students admitted to the University are bound by the Statutes, Rules,
            and Regulations of the University of Advanced Management Sciences.
          </p>

          <p>
            May I take this opportunity to congratulate you on your academic achievement and welcome you to the University.
          </p>
        </div>

        {/* Signatures & Seal */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 font-sans">
          <div>
            <div className="h-14 flex items-end">
              <span className="font-serif italic font-bold text-xl text-slate-900 border-b border-slate-700 pb-1">
                Prof. Joseph N. Mwangi
              </span>
            </div>
            <p className="font-bold text-xs uppercase text-slate-900 mt-1">Registrar (Academic Affairs)</p>
            <p className="text-[11px] text-slate-500">University of Advanced Management Sciences</p>
          </div>

          <div className="w-32 h-32 rounded-full border-4 border-dashed border-indigo-200 flex flex-col items-center justify-center text-center p-2 text-indigo-900">
            <ShieldCheck className="w-6 h-6 text-indigo-600 mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-wider">OFFICIAL SEAL</span>
            <span className="text-[8px] text-indigo-600">VERIFIED PROVISIONAL</span>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center font-sans text-[10px] text-slate-400">
          This is an official computer-generated document issued under the authority of UAMS Academic Senate. Reference No: {application.reference_number}.
        </div>
      </div>
    </div>
  );
}
