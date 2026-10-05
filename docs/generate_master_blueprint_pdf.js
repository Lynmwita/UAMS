const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

function createMasterBlueprintPDF() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const NAVY = [15, 23, 42]; // #0f172a
  const GOLD = [217, 119, 6]; // #d97706
  const SLATE = [100, 116, 139]; // #64748b

  function addPageHeader(title) {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(0, 24, 210, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('UNIVERSITY ADMINISTRATION MANAGEMENT SYSTEM (UAMS)', 105, 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Enterprise Master Project Blueprint & Technical Specification', 105, 18, { align: 'center' });

    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), 14, 34);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 37, 196, 37);
  }

  function addPageFooter(pageNum, totalPages) {
    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 14, 196, pageHeight - 14);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.text('UAMS Master Technical Blueprint • Confidential & Property of Zetech University', 14, pageHeight - 9);
    doc.text(`Page ${pageNum} of ${totalPages}`, 196, pageHeight - 9, { align: 'right' });
  }

  // ================= PAGE 1: COVER & EXECUTIVE SUMMARY =================
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 75, 210, 5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('UAMS ENTERPRISE', 105, 52, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(251, 191, 36);
  doc.text('University Administration Management System', 105, 62, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text('Master Technical Blueprint, System Architecture & Implementation Dossier', 105, 70, { align: 'center' });

  // Executive Overview Card
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(20, 95, 170, 85, 3, 3, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(20, 95, 170, 85, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(251, 191, 36);
  doc.text('1. EXECUTIVE SUMMARY & PLATFORM OBJECTIVES', 28, 108);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(241, 245, 249);
  const execSummary = [
    'UAMS is a next-generation academic enterprise platform engineered to centralize, digitize, and automate university academic, financial, examination, governance, and student lifecycle operations.',
    '',
    'Benchmarked against top Kenyan and international university systems (Strathmore AMS, USIU CX, UoN SMIS), UAMS delivers high-security role-tailored workspaces for Super Admins (VC Office), Registrars, Deans, Lecturers, Finance Bursars, and Students.',
    '',
    'Key Highlights:',
    '• Real-time Safaricom M-Pesa Daraja STK Push Paybill 522533 reconciliation',
    '• 4.0 Scale GPA & CGPA Grading Engine with Senate Transcript Sealing',
    '• 75% Class Attendance Enforcement with Dynamic Live QR Code Projection',
    '• Cryptographic Exam Clearance Passes & CR80 PVC Student ID Card Generator',
  ];
  doc.text(execSummary, 28, 116, { maxWidth: 154 });

  // Metadata Card
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(20, 190, 170, 75, 3, 3, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(20, 190, 170, 75, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36);
  doc.text('PROJECT RELEASE SPECIFICATIONS', 28, 203);

  const metaItems = [
    ['Platform Release:', 'UAMS Enterprise v1.0.0 (Production Ready)'],
    ['Institution:', 'Zetech University & Summit Metropolitan System'],
    ['Official Paybill Channel:', 'M-Pesa Paybill 522533 (Account: Student Admission No)'],
    ['Repository Remote:', 'https://github.com/Lynmwita/UAMS.git'],
    ['Primary Architecture:', '3-Tier Decoupled Next.js / Node.js / Supabase Core'],
    ['Authentication Model:', 'Role-Based Access Control (RBAC) + JWT Session'],
    ['Date of Generation:', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];

  let metaY = 212;
  metaItems.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(k, 28, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(v, 75, metaY);
    metaY += 7.5;
  });

  // ================= PAGE 2: TECH STACK & 3-TIER ARCHITECTURE =================
  doc.addPage();
  addPageHeader('2. Complete Technology Stack & 3-Tier Architecture');

  // Tech Stack Table
  autoTable(doc, {
    startY: 42,
    head: [['Architectural Layer', 'Technologies & Frameworks', 'Core Responsibilities & Capabilities']],
    body: [
      ['Frontend UI & Portal', 'Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons', 'Responsive multi-role dashboard, client caching, modal workflows, Oxford Navy theme.'],
      ['Backend API & Services', 'Next.js API Route Handlers + Standalone Node.js Express Microservice', 'REST API endpoints, STK push dispatcher, Daraja webhook callback, authentication.'],
      ['Database & Security Core', 'PostgreSQL 15+ / Supabase Cloud Engine, Row Level Security (RLS)', 'Relational data store, multi-tenant isolation, foreign keys, constraints, audit trail.'],
      ['Payment Gateway', 'Safaricom Daraja M-Pesa API (Paybill 522533) + Bank Reconciliation', 'Instant mobile STK push, automatic ledger crediting, fee invoice reconciliation.'],
      ['Document Generation', 'jsPDF & jsPDF-AutoTable Vector Engine', 'Official Senate Transcripts, Fee Statements, Exam Clearance Passes, PVC ID Cards.'],
      ['Quality & Testing', 'Node.js Test Runner, TSX, ESLint, TypeScript Typecheck', 'GPA calculation testing, Daraja phone sanitization, role normalization verification.'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 85 },
    },
    margin: { left: 14, right: 14 },
  });

  let currentY = doc.lastAutoTable.finalY + 8;

  // 3-Tier Topology Explanation Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 80, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 80, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('3-TIER ARCHITECTURAL TOPOLOGY', 18, currentY + 8);

  const archBullets = [
    '• Tier 1: Client & Portal Layer — Role-customized Next.js interfaces for Students, Faculty, Registrars, Bursars, and Super Admins with instant 1-click role switcher.',
    '• Tier 2: Business Logic & Gateway Layer — Centralized validation rules, GPA & CGPA credit-weighting algorithms, Daraja STK Push dispatcher, and audit logger.',
    '• Tier 3: Data & Security Storage Layer — PostgreSQL relational database governed by Row-Level Security (RLS) policies ensuring students access only their data, while faculty access assigned department course rosters.',
    '• External Integration Bus — Safaricom Daraja Webhook endpoint receiving instantaneous JSON callbacks upon mobile PIN entry to clear invoices without manual cashier intervention.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(archBullets, 18, currentY + 16, { maxWidth: 174 });

  addPageFooter(2, 4);

  // ================= PAGE 3: RBAC MATRIX & FUNCTIONAL MODULES =================
  doc.addPage();
  addPageHeader('3. Role-Based Access Control (RBAC) & Implemented Modules');

  // RBAC Matrix Table
  autoTable(doc, {
    startY: 42,
    head: [['Module / Resource', 'Super Admin', 'Registrar', 'Dean / HOD', 'Lecturer', 'Finance', 'Student']],
    body: [
      ['Student Admissions', 'Full CRUD', 'Full CRUD', 'Dept View', 'Roster View', 'Ledger View', 'Self Profile'],
      ['Academic Structure', 'Full CRUD', 'Read-Only', 'Read-Only', 'Read-Only', 'Read-Only', 'Read-Only'],
      ['Course Units & Curricula', 'Full CRUD', 'Manage', 'Manage', 'Assigned View', 'Read-Only', 'Register / Drop'],
      ['Attendance & Live QR', 'Audit View', 'View Dept', 'Review Dept', 'Conduct / QR', 'No Access', 'Self Turnout'],
      ['Marks & Gradebook', 'Audit View', 'Seal / Approve', 'Moderate', 'Enter (CAT+Exam)', 'No Access', 'View Approved'],
      ['Senate Transcripts', 'Full Export', 'Official Issue', 'Dept View', 'Assigned View', 'No Access', 'Download Slip'],
      ['Fee Invoices & M-Pesa', 'Full View', 'Clearance View', 'No Access', 'No Access', 'Full Ledger', 'Pay M-Pesa'],
      ['Exam Clearance Passes', 'Full View', 'Approve All', 'Dept View', 'Invigilate', 'Block / Clear', 'Download Pass'],
      ['Student PVC ID Cards', 'Full Generate', 'Batch Print', 'View Dept', 'No Access', 'No Access', 'Download ID'],
      ['Timetable & Venue Alloc.', 'Manage All', 'Manage All', 'Manage Dept', 'Teaching Sched.', 'View', 'Personal Sched.'],
      ['Audit Trail & Logs', 'Full Audit', 'No Access', 'No Access', 'No Access', 'No Access', 'No Access'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 23, halign: 'center' },
      2: { cellWidth: 23, halign: 'center' },
      3: { cellWidth: 23, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 23, halign: 'center' },
      6: { cellWidth: 23, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Implemented Modules Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('KEY DELIVERED MODULES & BUSINESS CAPABILITIES', 14, currentY);

  const modulesList = [
    '1. Students Hub: Roster search, admission number filtering, registration modal, Exam Pass & ID Card PDF export.',
    '2. Examinations & Senate Grades: CAT 30% + Exam 70% calculator, 4.0 GPA conversion, and official transcript generation.',
    '3. Finance & M-Pesa Paybill 522533: STK push simulator, student admission reference, live ledger crediting, and statement PDF.',
    '4. Attendance & QR Projector: Live projected QR code, 10-min expiration countdown, mobile beacon simulation, and 75% threshold.',
    '5. Timetable Scheduler: Day tabs (Mon-Fri), venue/computing lab allocations, time slots, and lecturer clash checks.',
    '6. Official Bulletins: Broadcast notices with urgency badges (Urgent, Important, Normal) and targeted audience dispatches.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(modulesList, 14, currentY + 6, { maxWidth: 182 });

  addPageFooter(3, 4);

  // ================= PAGE 4: IMPLEMENTATION STEPS & CHRONOLOGY =================
  doc.addPage();
  addPageHeader('4. Step-by-Step Implementation Chronology & Setup Guide');

  // Chronology Table
  autoTable(doc, {
    startY: 42,
    head: [['Phase / Step', 'Delivered Artifacts & Components', 'Verification & Git Commits']],
    body: [
      ['Phase 1: Architecture & DB Specs', '3-Tier architecture blueprints, PostgreSQL DDL (01_schema_init.sql), RLS security policies (02_rls_policies.sql), seed data.', 'Commit: 2a87af1\nVerified relational integrity.'],
      ['Phase 2: App Router Workspace', 'Next.js 14 setup, Tailwind CSS styling with Oxford Navy (#0f172a) and University Gold (#d97706), multi-role navbar and sidebar.', 'Commit: 954790c & aa3a52d\nVerified responsive viewport.'],
      ['Phase 3: Core Dashboards & Paybill', '10 functional views (students, courses, structure, grades, finance, timetable, announcements, audit), Paybill 522533 routing.', 'Commit: 8ac8d28 & 7229bb8\nVerified Paybill STK push.'],
      ['Phase 4: PDF Export & Admissions', 'jsPDF vector engine for Official Transcripts, Fee Statements, Exam Clearance Passes, and Student Registration modal.', 'Commit: e2f13b7\nAll 6 test suites passed.'],
      ['Phase 5: Interactive Workflows & Standalone Backend', 'Dynamic Attendance QR Projector, Timetable Scheduler, PVC ID Cards, Notice Publisher, and Standalone Express API backend.', 'Commit: f4eb81d\n23/23 routes generated.'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 95 },
      2: { cellWidth: 45 },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Local & Production Run Instructions Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 70, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 70, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('RUNNING & DEPLOYING THE SYSTEM', 18, currentY + 8);

  const runSteps = [
    '1. Frontend Web Portal (Next.js):',
    '   cd /home/lynnaz/projects/uams/frontend && npm install && npm run build && npm run start -- -p 3000',
    '   Access in browser: http://localhost:3000',
    '',
    '2. Standalone Backend API (Express):',
    '   cd /home/lynnaz/projects/uams/backend && npm install && npm start',
    '   API server runs on: http://localhost:8000',
    '',
    '3. Database Migration on Supabase / PostgreSQL:',
    '   Execute database/01_schema_init.sql, 02_rls_policies.sql, and 03_seed_data.sql in PostgreSQL console.',
  ];

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(runSteps, 18, currentY + 16);

  addPageFooter(4, 4);

  const outputPath = path.join(__dirname, 'UAMS_Master_Project_Blueprint_&_Technical_Documentation.pdf');
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log('Master Blueprint PDF written to:', outputPath);
  return outputPath;
}

createMasterBlueprintPDF();
