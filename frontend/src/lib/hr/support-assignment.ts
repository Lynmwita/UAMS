/**
 * Support roster labels, personalised by the person's own assignment.
 *
 * One shared support dashboard shape, but the roster card must read as
 * personal to each category: a cleaner sees cleaning zones, a cook sees
 * kitchen shifts, a driver sees routes, a security officer sees posts, a
 * gardener sees grounds zones, a library attendant sees library desk
 * shifts. The labels below are driven ONLY by assignment detail the staff
 * record already carries (job title, department) — no shifts, zones,
 * routes or times are invented here. When a person has no roster data,
 * the card shows the honest empty state; the labels only change what the
 * empty card is called.
 *
 * A library attendant stays on the support dashboard: 'library attendant'
 * is a support title, not the 'library' legacy value that maps to the
 * librarian role.
 */
export type SupportRosterLabels = {
  title: string;
  empty: string;
  hint: string;
};

type Category = 'cleaning' | 'kitchen' | 'routes' | 'posts' | 'grounds' | 'libraryDesk' | 'desk' | 'general';

const LABELS: Record<Category, SupportRosterLabels> = {
  cleaning: {
    title: 'My cleaning zones and shifts',
    empty: 'No cleaning zones assigned yet.',
    hint: 'Your supervisor posts your zones, blocks and times here once they are assigned.',
  },
  kitchen: {
    title: 'My kitchen shifts and meal services',
    empty: 'No kitchen shifts assigned yet.',
    hint: 'Your supervisor posts your kitchen shifts and meal-service times here once they are assigned.',
  },
  routes: {
    title: 'My routes and trips',
    empty: 'No routes or trips assigned yet.',
    hint: 'Your supervisor posts your routes and trips here once they are assigned.',
  },
  posts: {
    title: 'My posts and gates',
    empty: 'No posts assigned yet.',
    hint: 'Your supervisor posts your posts and gates here once they are assigned.',
  },
  grounds: {
    title: 'My grounds zones',
    empty: 'No grounds zones assigned yet.',
    hint: 'Your supervisor posts your grounds zones here once they are assigned.',
  },
  libraryDesk: {
    title: 'My library desk shifts',
    empty: 'No library desk shifts assigned yet.',
    hint: 'Your supervisor posts your library desk shifts here once they are assigned. Library attendants use this support dashboard, not the librarian book and loan dashboard.',
  },
  desk: {
    title: 'My desk shifts',
    empty: 'No desk shifts assigned yet.',
    hint: 'Your supervisor posts your desk shifts here once they are assigned.',
  },
  general: {
    title: 'My duty roster',
    empty: 'No shifts assigned yet.',
    hint: 'Duty rosters are managed by your supervisor; your shifts will appear here once they are posted.',
  },
};

function categoryFor(jobTitle: string | null | undefined): Category {
  const title = (jobTitle || '').toLowerCase();
  if (title.includes('clean')) return 'cleaning';
  if (title.includes('cook') || title.includes('kitchen') || title.includes('cater')) return 'kitchen';
  if (title.includes('driver') || title.includes('transport')) return 'routes';
  if (title.includes('secur') || title.includes('guard')) return 'posts';
  if (title.includes('garden') || title.includes('grounds')) return 'grounds';
  if (title.includes('librar') && title.includes('attendant')) return 'libraryDesk';
  if (title.includes('attendant')) return 'desk';
  return 'general';
}

export function describeSupportAssignment(
  jobTitle: string | null | undefined,
  departmentName?: string | null
): SupportRosterLabels & { assignmentLine: string | null } {
  const labels = LABELS[categoryFor(jobTitle)];
  const parts = [jobTitle?.trim(), departmentName?.trim()].filter(Boolean);
  return { ...labels, assignmentLine: parts.length > 0 ? parts.join(' · ') : null };
}
