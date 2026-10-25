/**
 * KUCCPS Placement Importer & Admission Dispatch Service
 * Handles deduplication, provisional admission numbering,
 * applicant portal staging, and automated offer letter dispatch.
 */

import { KuccpsPlacementRecord, UamsAdmissionApplication } from '@/types';
import { admissionsStore, generateAdmissionNumber, generateReferenceNumber } from './admissions';
// Canonical dispatcher (lib/messaging): the port never copies lib/communications.
// Mode (mock/sandbox/live) is decided by the dispatcher from environment, never
// faked here — with no keys configured this is honest mock, never a live send.
import { dispatchNotification } from '@/lib/messaging/dispatcher';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export interface KuccpsImportOptions {
  reviewerEmail: string;
  reviewerRole?: string;
  autoAdmit?: boolean;
  notifyApplicants?: boolean;
  originUrl?: string;
  intakeYear?: number;
  intakeTerm?: string;
}

export interface KuccpsImportResult {
  total: number;
  importedCount: number;
  skippedDuplicates: number;
  duplicateIndexes: string[];
  applications: UamsAdmissionApplication[];
  notificationsDispatched: number;
}

export async function importKuccpsPlacements(
  records: KuccpsPlacementRecord[],
  options: KuccpsImportOptions
): Promise<KuccpsImportResult> {
  const intakeYear = options.intakeYear || 2026;
  const intakeTerm = options.intakeTerm || 'September';
  const autoAdmit = options.autoAdmit ?? true;
  const notifyApplicants = options.notifyApplicants ?? false;
  const originUrl = options.originUrl || 'https://uams.university.ac.ke';

  // Build lookup of existing applicants by kcse_index or email
  const existingKcseIndexes = new Set<string>();
  const existingEmails = new Set<string>();

  for (const app of admissionsStore) {
    if (app.kcse_index) existingKcseIndexes.add(app.kcse_index.toLowerCase());
    if (app.applicant_email) existingEmails.add(app.applicant_email.toLowerCase());
  }
  // NOTE (named follow-up): admissionsStore is in-memory only. KUCCPS imports
  // and applications do not survive a redeploy or share across instances until
  // Supabase persistence for admissions is built. Nothing in the UI may claim
  // otherwise.

  const createdApplications: UamsAdmissionApplication[] = [];
  const duplicateIndexes: string[] = [];
  let notificationsDispatched = 0;

  for (const record of records) {
    const kcseKey = record.kcse_index.toLowerCase();
    // Only de-duplicate on email when an email was actually provided.
    const emailKey = record.applicant_email ? record.applicant_email.toLowerCase() : null;

    if (existingKcseIndexes.has(kcseKey) || (emailKey && existingEmails.has(emailKey))) {
      duplicateIndexes.push(record.kcse_index);
      continue;
    }

    const nextSeq = admissionsStore.length + 1;
    const refNo = generateReferenceNumber('KUCCPS', intakeYear, nextSeq);
    const createdAt = new Date().toISOString();

    let admissionNumber: string | undefined = undefined;
    let status: UamsAdmissionApplication['status'] = 'submitted';

    if (autoAdmit) {
      status = 'admitted';
      const existingInProg = admissionsStore.filter(
        (a) => a.program_code === record.program_code && a.admission_number
      ).length;
      admissionNumber = generateAdmissionNumber(record.program_code, intakeYear, existingInProg + 1);
    }

    const application: UamsAdmissionApplication = {
      id: `adm-kuccps-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      reference_number: refNo,
      applicant_name: record.applicant_name,
      applicant_email: record.applicant_email,
      applicant_phone: record.applicant_phone,
      gender: record.gender,
      // No date of birth in a KUCCPS placement list: stored as undefined
      // (shown as "not provided"), never as an invented date.
      program_code: record.program_code,
      program_name: record.program_name || record.program_code,
      intake: intakeTerm,
      intake_year: intakeYear,
      kcse_grade: record.kcse_grade,
      kcse_points: record.kcse_points,
      kcse_index: record.kcse_index,
      national_id: record.national_id,
      cluster_weight: record.cluster_weight,
      entry_type: 'KUCCPS',
      status,
      admission_number: admissionNumber,
      reviewed_by: options.reviewerEmail,
      reviewed_at: autoAdmit ? createdAt.slice(0, 10) : undefined,
      offer_letter_generated_at: autoAdmit ? createdAt : undefined,
      submitted_at: createdAt.slice(0, 10),
    };

    admissionsStore.push(application);
    existingKcseIndexes.add(kcseKey);
    if (emailKey) existingEmails.add(emailKey);
    createdApplications.push(application);

    // Automated dispatch if enabled, via the canonical dispatcher.
    if (notifyApplicants && application.applicant_phone) {
      try {
        const msg = autoAdmit && admissionNumber
          ? `UAMS ADMISSIONS: Dear ${record.applicant_name.split(' ')[0]}, you have been placed under KUCCPS into ${record.program_code}. Adm No: ${admissionNumber}. Download your offer letter at ${originUrl}/apply.`
          : `UAMS ADMISSIONS: Dear ${record.applicant_name.split(' ')[0]}, your KUCCPS placement into ${record.program_code} has been received (Ref: ${refNo}). Track your status at ${originUrl}/apply.`;

        const { result } = await dispatchNotification({
          recipientIdentifier: application.applicant_phone,
          channel: 'sms',
          messageContent: msg,
        });
        if (result.status === 'sent') notificationsDispatched++;
      } catch (e) {
        console.error('Failed to dispatch admission notification for', application.reference_number, e);
      }
    }
  }

  // Record audit log
  recordAuditEvent({
    actor_email: options.reviewerEmail,
    actor_role: options.reviewerRole || 'registrar',
    action: 'KUCCPS_BULK_PLACEMENT_IMPORTED',
    entity_type: 'admission_applications',
    entity_id: `batch-${Date.now()}`,
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: {
      total_records: records.length,
      imported_count: createdApplications.length,
      skipped_duplicates: duplicateIndexes.length,
      auto_admitted: autoAdmit,
      notifications_dispatched: notificationsDispatched,
    },
  });

  return {
    total: records.length,
    importedCount: createdApplications.length,
    skippedDuplicates: duplicateIndexes.length,
    duplicateIndexes,
    applications: createdApplications,
    notificationsDispatched,
  };
}
