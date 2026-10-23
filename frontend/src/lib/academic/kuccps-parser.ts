/**
 * KUCCPS Placement List Parser & Validator
 * Compliant with KUCCPS official placement list export formats,
 * Kenyan phone number sanitization (E.164), and grade verification.
 */

import { KuccpsPlacementRecord } from '@/types';
import { normalizeKenyanPhone } from '@/lib/communications/phone-sanitizer';

export interface KuccpsParseError {
  row: number;
  error: string;
  raw: Record<string, string>;
}

export interface KuccpsParseResult {
  validRecords: KuccpsPlacementRecord[];
  errors: KuccpsParseError[];
  duplicatesInFile: number;
  totalRows: number;
}

const KCSE_GRADE_POINTS: Record<string, number> = {
  'A': 82,
  'A-': 76,
  'B+': 70,
  'B': 63,
  'B-': 56,
  'C+': 49,
  'C': 42,
  'C-': 35,
  'D+': 28,
  'D': 21,
  'D-': 14,
  'E': 9,
};

function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseKuccpsCsv(csvContent: string, defaultIntakeYear = 2026): KuccpsParseResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { validRecords: [], errors: [], duplicatesInFile: 0, totalRows: 0 };
  }

  // Parse header
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  // Field mapper
  const findHeader = (aliases: string[]): number => {
    return headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
  };

  const idxMap = {
    kcse_index: findHeader(['kcse_index', 'index_number', 'index_no', 'index', 'cand_no', 'kcse_no']),
    name: findHeader(['applicant_name', 'name', 'full_name', 'student_name', 'candidate_name', 'names']),
    gender: findHeader(['gender', 'sex']),
    phone: findHeader(['applicant_phone', 'phone', 'phone_number', 'mobile', 'tel', 'cell']),
    email: findHeader(['applicant_email', 'email', 'email_address']),
    program: findHeader(['program_code', 'programme_code', 'course_code', 'prog_code', 'programme', 'course', 'degree']),
    program_name: findHeader(['program_name', 'programme_name', 'course_name', 'degree_name']),
    cluster: findHeader(['cluster_weight', 'cluster_points', 'weight', 'cluster', 'weighted_cluster']),
    grade: findHeader(['kcse_grade', 'mean_grade', 'grade', 'kcse_mean']),
    points: findHeader(['kcse_points', 'points', 'aggregate_points', 'agg_points']),
    national_id: findHeader(['national_id', 'id_number', 'id_no', 'birth_cert', 'national_id_no', 'huduma']),
  };

  // Critical headers required
  if (idxMap.kcse_index === -1 && idxMap.name === -1 && idxMap.program === -1) {
    return {
      validRecords: [],
      errors: [
        {
          row: 1,
          error: `Unrecognized CSV headers. Expected columns: KCSE Index, Full Name, Gender, Phone, Email, Programme Code. Found: ${rawHeaders.join(', ')}`,
          raw: { header: lines[0] },
        },
      ],
      duplicatesInFile: 0,
      totalRows: 0,
    };
  }

  const validRecords: KuccpsPlacementRecord[] = [];
  const errors: KuccpsParseError[] = [];
  const seenIndexes = new Set<string>();
  let duplicatesInFile = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i]);
    if (rawCols.every((c) => !c)) continue; // skip blank line

    const rawMap: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rawMap[h] = rawCols[colIdx] || '';
    });

    const getCol = (pos: number): string => (pos >= 0 && pos < rawCols.length ? rawCols[pos] : '').trim();

    const rawIndex = getCol(idxMap.kcse_index);
    const rawName = getCol(idxMap.name);
    const rawGender = getCol(idxMap.gender).toLowerCase();
    const rawPhone = getCol(idxMap.phone);
    const rawEmail = getCol(idxMap.email);
    const rawProgram = getCol(idxMap.program).toUpperCase();
    const rawProgramName = getCol(idxMap.program_name);
    const rawCluster = getCol(idxMap.cluster);
    const rawGrade = getCol(idxMap.grade).toUpperCase();
    const rawPoints = getCol(idxMap.points);
    const rawNationalId = getCol(idxMap.national_id);

    // Validations
    if (!rawIndex) {
      errors.push({ row: i + 1, error: 'KCSE Index is missing.', raw: rawMap });
      continue;
    }

    // Clean KCSE Index (e.g. 12345678001 or 12345678001/2025)
    const kcseIndexClean = rawIndex.replace(/\s+/g, '');
    if (seenIndexes.has(kcseIndexClean)) {
      duplicatesInFile++;
      errors.push({
        row: i + 1,
        error: `Duplicate KCSE Index in file: ${kcseIndexClean}.`,
        raw: rawMap,
      });
      continue;
    }
    seenIndexes.add(kcseIndexClean);

    if (!rawName || rawName.length < 2) {
      errors.push({ row: i + 1, error: 'Applicant full name is missing or too short.', raw: rawMap });
      continue;
    }

    if (!rawProgram) {
      errors.push({ row: i + 1, error: 'Programme Code is missing.', raw: rawMap });
      continue;
    }

    // Gender normalization
    let gender: 'male' | 'female' | 'other' = 'other';
    if (rawGender.startsWith('m')) gender = 'male';
    else if (rawGender.startsWith('f')) gender = 'female';

    // Phone sanitization with E.164 normalization
    let applicantPhone = '+254700000000';
    if (rawPhone) {
      const sanitized = normalizeKenyanPhone(rawPhone);
      if (sanitized.valid && sanitized.normalized) {
        applicantPhone = sanitized.normalized;
      } else {
        errors.push({
          row: i + 1,
          error: `Invalid Kenyan phone number '${rawPhone}': ${sanitized.carrier || 'Must be valid format e.g. 0712345678 or +254...'}`,
          raw: rawMap,
        });
        continue;
      }
    }

    // Email fallback
    const emailCandidate = rawEmail.toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate);
    const applicantEmail = isValidEmail
      ? emailCandidate
      : `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.')}.${kcseIndexClean.slice(-4)}@applicants.university.ac.ke`;

    // Grade and Points
    const cleanGrade = rawGrade.replace(/[^A-E+-]/g, '') || 'C+';
    let kcsePoints = Number(rawPoints);
    if (!Number.isFinite(kcsePoints) || kcsePoints <= 0) {
      kcsePoints = KCSE_GRADE_POINTS[cleanGrade] || 49;
    }

    // Cluster weight
    const clusterWeight = rawCluster ? parseFloat(rawCluster) : undefined;

    validRecords.push({
      kcse_index: kcseIndexClean,
      applicant_name: rawName,
      gender,
      applicant_phone: applicantPhone,
      applicant_email: applicantEmail,
      program_code: rawProgram,
      program_name: rawProgramName || undefined,
      cluster_weight: Number.isFinite(clusterWeight) ? clusterWeight : undefined,
      kcse_grade: cleanGrade,
      kcse_points: kcsePoints,
      national_id: rawNationalId || undefined,
      intake_year: defaultIntakeYear,
      intake: 'September',
    });
  }

  return {
    validRecords,
    errors,
    duplicatesInFile,
    totalRows: lines.length - 1,
  };
}

export function generateKuccpsTemplateCsv(): string {
  const headers = [
    'KCSE Index',
    'Full Name',
    'Gender',
    'Phone Number',
    'Email Address',
    'Programme Code',
    'Programme Name',
    'Cluster Weight',
    'KCSE Mean Grade',
    'KCSE Points',
    'National ID',
  ];

  const sampleRows = [
    [
      '12345678001/2025',
      'Faith Cherotich',
      'Female',
      '0712345678',
      'faith.cherotich@gmail.com',
      'BCS',
      'Bachelor of Science in Computer Science',
      '42.845',
      'A',
      '82',
      '39876543',
    ],
    [
      '12345678002/2025',
      'Kennedy Omondi',
      'Male',
      '0722987654',
      'kennedy.omondi@gmail.com',
      'BIT',
      'Bachelor of Science in Information Technology',
      '39.512',
      'B+',
      '71',
      '39876544',
    ],
    [
      '12345678003/2025',
      'Amina Hassan',
      'Female',
      '0733112233',
      'amina.hassan@gmail.com',
      'BIS',
      'Bachelor of Information Systems',
      '37.210',
      'B',
      '64',
      '39876545',
    ],
    [
      '12345678004/2025',
      'Peter Mutua',
      'Male',
      '0798001122',
      'peter.mutua@gmail.com',
      'BBA',
      'Bachelor of Business Administration',
      '35.980',
      'B-',
      '57',
      '39876546',
    ],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
}
