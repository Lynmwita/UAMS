'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  FileCheck2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  UserCheck,
  Building,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { programsStore } from '@/lib/academic/structure';

type Tab = 'apply' | 'track' | 'kuccps_guide';

export default function ApplyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('apply');

  // Direct Application Form State
  const [formData, setFormData] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    gender: 'male',
    date_of_birth: '2005-01-01',
    program_code: 'BCS',
    program_name: 'Bachelor of Science in Computer Science',
    kcse_grade: 'B+',
    kcse_points: 72,
    kcse_index: '',
    national_id: '',
    previous_institution: '',
    intake: 'January',
    intake_year: 2027,
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    kcse_slip?: string;
    national_id_doc?: string;
    passport_photo?: string;
  }>({});

  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState<{
    reference_number: string;
    program_name: string;
  } | null>(null);

  // Security Challenge / Anti-Bot State
  const [captchaChallenge, setCaptchaChallenge] = useState<{ question: string; challenge_token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const loadCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      setCaptchaFailed(false);
      const res = await fetch('/api/v1/admissions/challenge');
      const json = await res.json();
      if (json.success && json.data) {
        setCaptchaChallenge(json.data);
        setCaptchaAnswer('');
      } else {
        setCaptchaFailed(true);
      }
    } catch {
      setCaptchaFailed(true);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  // Tracking State
  const [trackRef, setTrackRef] = useState('');
  const [trackVerify, setTrackVerify] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);

  const handleProgramChange = (code: string) => {
    const prog = programsStore.find((p) => p.code === code);
    setFormData((prev) => ({
      ...prev,
      program_code: code,
      program_name: prog ? prog.name : code,
    }));
  };

  const handleFileUpload = (docType: 'kcse_slip' | 'national_id_doc' | 'passport_photo', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFiles((prev) => ({
        ...prev,
        [docType]: file.name,
      }));
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/admissions/public-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          documents: uploadedFiles,
          website_hp: honeypot,
          challenge_token: captchaChallenge?.challenge_token,
          captcha_answer: captchaAnswer,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        loadCaptcha();
        throw new Error(data.error || 'Failed to submit application.');
      }

      setApplySuccess({
        reference_number: data.reference_number,
        program_name: formData.program_name,
      });
      // Pre-fill tracking for instant convenience
      setTrackRef(data.reference_number);
      loadCaptcha();
    } catch (err: any) {
      setApplyError(err.message || 'Submission error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);
    setTrackingLoading(true);

    try {
      let url = `/api/v1/admissions/public-status?ref=${encodeURIComponent(trackRef.trim())}`;
      if (trackVerify.trim()) {
        url += `&verify=${encodeURIComponent(trackVerify.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'No matching application found.');
      setTrackResult(data.data);
    } catch (err: any) {
      setTrackError(err.message || 'Error looking up application status.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* University Hero Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-xl shadow-md">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold text-indigo-400">
                  Admissions & Enrolment Directorate
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  University of Advanced Management Sciences (UAMS)
                </h1>
                <p className="text-sm text-slate-400">
                  Online Admissions Portal • January 2027 Intake (KUCCPS & Direct Entry)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg border border-slate-700 transition"
              >
                Staff & Student Sign In →
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 mt-8 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('apply')}
              className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'apply'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Direct Entry Application (PSSP)
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'track'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              Track Status & Download Offer Letter
            </button>
            <button
              onClick={() => setActiveTab('kuccps_guide')}
              className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'kuccps_guide'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              KUCCPS Placed Students Guide
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {/* TAB 1: DIRECT APPLICATION */}
        {activeTab === 'apply' && (
          <div className="space-y-6">
            {applySuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center max-w-2xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Application Submitted Successfully!</h2>
                <p className="text-slate-600 text-sm">
                  Your application for <strong className="text-slate-900">{applySuccess.program_name}</strong> has been received by the Registrar&apos;s Admissions Office.
                </p>
                <div className="bg-white rounded-lg p-4 border border-emerald-200 max-w-md mx-auto shadow-sm">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your Tracking Reference Number</span>
                  <div className="text-2xl font-mono font-extrabold text-indigo-700 mt-1">
                    {applySuccess.reference_number}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    An SMS confirmation with your reference number has been sent to your mobile phone.
                  </p>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('track');
                      setTrackRef(applySuccess.reference_number);
                    }}
                    className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-indigo-700 shadow-sm transition"
                  >
                    Track Status Now →
                  </button>
                  <button
                    onClick={() => {
                      setApplySuccess(null);
                      setFormData({
                        applicant_name: '',
                        applicant_email: '',
                        applicant_phone: '',
                        gender: 'male',
                        date_of_birth: '2005-01-01',
                        program_code: 'BCS',
                        program_name: 'Bachelor of Science in Computer Science',
                        kcse_grade: 'B+',
                        kcse_points: 72,
                        kcse_index: '',
                        national_id: '',
                        previous_institution: '',
                        intake: 'January',
                        intake_year: 2027,
                      });
                      setUploadedFiles({});
                    }}
                    className="bg-slate-200 text-slate-800 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-slate-300 transition"
                  >
                    Submit Another Application
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Application Form */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                  <div className="border-b border-slate-200 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Direct Entry Application (Self-Sponsored / PSSP)</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Apply online for undergraduate and diploma degree programs for the January 2027 academic intake.
                    </p>
                  </div>

                  {applyError && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                      <span>{applyError}</span>
                    </div>
                  )}

                  <form onSubmit={handleApplySubmit} className="space-y-6">
                    {/* Section 1: Personal Details */}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> 1. Personal & Contact Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Full Legal Name (as on KCSE Certificate / National ID) *
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Christine Mutheu Mwangi"
                            value={formData.applicant_name}
                            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                          <input
                            required
                            type="email"
                            placeholder="e.g. christine.mwangi@example.com"
                            value={formData.applicant_email}
                            onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Mobile Phone Number (Kenyan Format) *
                          </label>
                          <input
                            required
                            type="tel"
                            placeholder="e.g. 0712345678 or +254..."
                            value={formData.applicant_phone}
                            onChange={(e) => setFormData({ ...formData, applicant_phone: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                          <input
                            required
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">National ID / Birth Cert No</label>
                          <input
                            type="text"
                            placeholder="e.g. 39123456"
                            value={formData.national_id}
                            onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Previous Secondary School</label>
                          <input
                            type="text"
                            placeholder="e.g. Alliance High School"
                            value={formData.previous_institution}
                            onChange={(e) => setFormData({ ...formData, previous_institution: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Academic Program Choice */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> 2. Degree Programme Choice
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Degree Programme *</label>
                          <select
                            value={formData.program_code}
                            onChange={(e) => handleProgramChange(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                          >
                            {programsStore.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name} ({p.code}) — {p.duration_years} Years
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Intake Term</label>
                          <input
                            readOnly
                            type="text"
                            value={`${formData.intake} ${formData.intake_year}`}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">KCSE Index Number *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. 12345678001/2025"
                            value={formData.kcse_index}
                            onChange={(e) => setFormData({ ...formData, kcse_index: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">KCSE Mean Grade *</label>
                          <select
                            value={formData.kcse_grade}
                            onChange={(e) => setFormData({ ...formData, kcse_grade: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                          >
                            {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'].map((g) => (
                              <option key={g} value={g}>
                                Grade {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">KCSE Aggregate Points *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            max="84"
                            value={formData.kcse_points}
                            onChange={(e) => setFormData({ ...formData, kcse_points: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Supporting Documents */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-2">
                        <Upload className="w-4 h-4" /> 3. Document Uploads (PDF / JPG)
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition">
                          <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                          <span className="block text-xs font-bold text-slate-800">KCSE Result Slip</span>
                          <span className="block text-[11px] text-slate-500 truncate mb-2">
                            {uploadedFiles.kcse_slip || 'Select file (PDF/JPG)'}
                          </span>
                          <label className="inline-block text-xs bg-white border border-slate-300 px-3 py-1 rounded cursor-pointer hover:bg-slate-50 font-medium">
                            Browse
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleFileUpload('kcse_slip', e)}
                            />
                          </label>
                        </div>

                        <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition">
                          <UserCheck className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                          <span className="block text-xs font-bold text-slate-800">National ID / Birth Cert</span>
                          <span className="block text-[11px] text-slate-500 truncate mb-2">
                            {uploadedFiles.national_id_doc || 'Select file (PDF/JPG)'}
                          </span>
                          <label className="inline-block text-xs bg-white border border-slate-300 px-3 py-1 rounded cursor-pointer hover:bg-slate-50 font-medium">
                            Browse
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleFileUpload('national_id_doc', e)}
                            />
                          </label>
                        </div>

                        <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition">
                          <GraduationCap className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                          <span className="block text-xs font-bold text-slate-800">Passport Photo</span>
                          <span className="block text-[11px] text-slate-500 truncate mb-2">
                            {uploadedFiles.passport_photo || 'Select photo (JPG/PNG)'}
                          </span>
                          <label className="inline-block text-xs bg-white border border-slate-300 px-3 py-1 rounded cursor-pointer hover:bg-slate-50 font-medium">
                            Browse
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleFileUpload('passport_photo', e)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Honeypot hidden input to trap automated scrapers/bots */}
                    <input
                      type="text"
                      name="website_hp"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      className="hidden"
                      aria-hidden="true"
                    />

                    {/* Security Verification & Abuse Protection */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          {captchaChallenge ? captchaChallenge.question : captchaFailed ? 'Security verification could not load. Press Refresh Question to try again.' : 'Loading security verification...'}
                        </span>
                        <button
                          type="button"
                          onClick={loadCaptcha}
                          disabled={captchaLoading}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Refresh Question
                        </button>
                      </div>
                      <input
                        required
                        type="number"
                        placeholder="Enter number answer"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        className="w-full sm:w-48 px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <p className="text-[11px] text-slate-500">
                        Anti-abuse security check to protect institutional messaging and admissions quota.
                      </p>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting Application...
                          </>
                        ) : (
                          <>
                            Submit Online Application <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  <div className="bg-indigo-900 text-white rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                      Admission Requirements
                    </h3>
                    <ul className="text-xs space-y-2.5 text-indigo-200">
                      <li>• <strong>Undergraduate Degree:</strong> Minimum KCSE Mean Grade of C+ (plus) with program specific subject cluster requirements.</li>
                      <li>• <strong>Diploma Programmes:</strong> Minimum KCSE Mean Grade of C- (minus) or equivalent certificate.</li>
                      <li>• <strong>Application Fee:</strong> Free online application for the January 2027 academic intake.</li>
                      <li>• <strong>Verification:</strong> Original academic slips and identification will be inspected during orientation.</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-500" /> Need Help?
                    </h3>
                    <p className="text-xs text-slate-600 mb-4">
                      Have questions regarding your course selection, cluster points, or HEF funding?
                    </p>
                    <div className="text-xs space-y-1.5 text-slate-700">
                      <p><strong>Admissions Office:</strong> 0790 000 111</p>
                      <p><strong>Email:</strong> admissions@university.ac.ke</p>
                      <p><strong>Hours:</strong> Mon - Fri, 8:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRACK APPLICATION & OFFER LETTER */}
        {activeTab === 'track' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="border-b border-slate-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-900">Track Application & Download Offer Letter</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Check review status, provisional admission status, and download your official letter.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Application Ref No or KCSE Index Number *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. UADM-2026-0001 or 12345678001/2025"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Verification Mobile Phone or Email (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Last 4 digits of phone or email"
                      value={trackVerify}
                      onChange={(e) => setTrackVerify(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg text-sm shadow-sm transition flex items-center justify-center gap-2"
                >
                  {trackingLoading ? 'Searching records...' : 'Check Status'}
                </button>
              </form>

              {trackError && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                  <span>{trackError}</span>
                </div>
              )}

              {/* Status Results Display */}
              {trackResult && (
                <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Applicant</span>
                      <h3 className="text-lg font-bold text-slate-900">{trackResult.applicant_name}</h3>
                      <p className="text-xs text-slate-600">
                        {trackResult.program_name} ({trackResult.program_code})
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <span className="text-xs text-slate-500 font-medium">Status</span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          trackResult.status === 'admitted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : trackResult.status === 'shortlisted'
                            ? 'bg-indigo-100 text-indigo-800'
                            : trackResult.status === 'under_review'
                            ? 'bg-amber-100 text-amber-800'
                            : trackResult.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {trackResult.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Visual Stepper */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                    <div className="p-2 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                      1. Submitted
                    </div>
                    <div
                      className={`p-2 rounded border ${
                        ['under_review', 'shortlisted', 'admitted'].includes(trackResult.status)
                          ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      2. Review
                    </div>
                    <div
                      className={`p-2 rounded border ${
                        ['shortlisted', 'admitted'].includes(trackResult.status)
                          ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      3. Shortlist
                    </div>
                    <div
                      className={`p-2 rounded border ${
                        trackResult.status === 'admitted'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      4. Admitted
                    </div>
                  </div>

                  {/* Admitted Offer Letter Card */}
                  {trackResult.status === 'admitted' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-emerald-950">
                          Congratulations! Your Provisional Admission Offer is Ready
                        </h4>
                        <p className="text-xs text-emerald-800 mt-1">
                          You have been admitted under Admission Number:{' '}
                          <strong className="font-mono text-sm">{trackResult.admission_number}</strong>
                        </p>
                      </div>

                      <div>
                        <Link
                          href={`/apply/letter/${encodeURIComponent(trackResult.reference_number)}`}
                          target="_blank"
                          className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow transition"
                        >
                          <FileText className="w-4 h-4" /> View & Print Official Admission Letter
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 font-semibold block">Channel</span>
                      <strong className="text-slate-900 text-sm">{trackResult.entry_type}</strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 font-semibold block">Intake</span>
                      <strong className="text-slate-900 text-sm">
                        {trackResult.intake} {trackResult.intake_year}
                      </strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 font-semibold block">KCSE Grade</span>
                      <strong className="text-slate-900 text-sm">{trackResult.kcse_grade}</strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 font-semibold block">Ref Number</span>
                      <strong className="text-slate-900 text-xs font-mono">{trackResult.reference_number}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: KUCCPS GUIDE */}
        {activeTab === 'kuccps_guide' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                  KUCCPS Placed Students Information & Registration Guide
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Information for government-sponsored students placed to UAMS by KUCCPS for the 2026/2027 Academic Year.
                </p>
              </div>

              <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-lg">
                  <h4 className="font-bold text-indigo-950 text-sm">Have you received your KUCCPS placement SMS?</h4>
                  <p className="text-xs text-indigo-900 mt-1">
                    If you were placed to UAMS by KUCCPS, your record is automatically imported into our admissions database.
                    You do NOT need to submit a new direct application.
                  </p>
                </div>

                <h3 className="font-bold text-slate-900 text-base">How to Download Your Admission Letter:</h3>
                <ol className="list-decimal pl-6 space-y-2 text-xs">
                  <li>
                    Click on the <strong>&quot;Track Status & Download Offer Letter&quot;</strong> tab above.
                  </li>
                  <li>
                    Enter your <strong>KCSE Index Number</strong> (e.g. <code>12345678001/2025</code>) in the search field.
                  </li>
                  <li>
                    Enter the phone number or email you registered with KUCCPS for verification.
                  </li>
                  <li>
                    Click <strong>&quot;View & Print Official Admission Letter&quot;</strong> to print your provisional admission letter.
                  </li>
                </ol>

                <h3 className="font-bold text-slate-900 text-base pt-2">Next Steps After Downloading Your Letter:</h3>
                <ul className="list-disc pl-6 space-y-2 text-xs text-slate-700">
                  <li>
                    <strong>Higher Education Financing (HEF / HELB):</strong> Apply for government scholarship and HELB loan via the official HEF portal (<code>portal.hef.co.ke</code>) using your UAMS Admission Number.
                  </li>
                  <li>
                    <strong>Medical Examination:</strong> Download the medical examination form attached to your offer letter and have it completed at a registered medical facility.
                  </li>
                  <li>
                    <strong>Reporting Day:</strong> Report to the Main Campus on the reporting date shown on your admission letter with your original KCSE slip, National ID, and 4 passport photographs.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
