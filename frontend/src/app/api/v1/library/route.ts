import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import type { LibraryBook, LibraryLoan } from '@/types';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import {
  libraryBooksStore as libraryBooks,
  libraryLoansStore as libraryLoans,
  libraryReservationsStore,
  libraryBatchesStore,
  getLibraryPolicies,
  refreshLoanStates,
  getLibraryMemberStudents,
  todayYmd,
} from '@/lib/library/store';

export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, ['student','admin','super_admin','registrar','hod','lecturer','librarian']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(req,auth.user,'library');

  const { user } = auth;
  refreshLoanStates();
  const visibleBooks = libraryBooks.filter((b) => !b.is_archived);
  let filteredLoans = [...libraryLoans];

  if (user.role === 'student') {
    filteredLoans = filteredLoans.filter(
      (ln) =>
        ln.student_id === user.id ||
        (user.email === 'student@university.ac.ke' && ln.admission_number === 'BIT/2023/8849')
    );
  }
  if (user.role === 'lecturer' || user.role === 'hod') filteredLoans = filteredLoans.filter(l => l.student_id === user.id);

  const reservations = ['librarian', 'admin', 'super_admin'].includes(user.role)
    ? libraryReservationsStore.filter((r) => r.status === 'queued')
    : [];

  return NextResponse.json({
    success: true,
    data: {
      books: visibleBooks,
      loans: filteredLoans,
      reservations,
      member_count: getLibraryMemberStudents().length,
      policies: getLibraryPolicies(),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireServerAuth(req, ['student', 'admin', 'super_admin', 'registrar', 'librarian']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(req,auth.user,'library');

  const { user } = auth;

  try {
    const body = await req.json();
    const { action, book_id, loan_id } = body;

    if (action === 'add_book') {
      if (user.role !== 'super_admin' && user.role !== 'librarian') {
        return NextResponse.json({ success: false, error: 'Only Super Admin and Librarian roles can add books to the catalogue.' }, { status: 403 });
      }
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const author = typeof body.author === 'string' ? body.author.trim() : '';
      const isbn = typeof body.isbn === 'string' ? body.isbn.trim() : '';
      const totalCopies = Number(body.total_copies);
      if (!title || !author || !isbn || !Number.isInteger(totalCopies) || totalCopies < 1) {
        return NextResponse.json({ success: false, error: 'Title, author, ISBN and a total copy count of at least 1 are required.' }, { status: 400 });
      }
      const book: LibraryBook = {
        id: `bk-${Date.now()}`,
        isbn,
        title,
        author,
        publisher: typeof body.publisher === 'string' ? body.publisher : '',
        category: typeof body.category === 'string' && body.category ? body.category : 'General',
        total_copies: totalCopies,
        available_copies: totalCopies,
        shelf_location: typeof body.shelf_location === 'string' ? body.shelf_location : '',
        is_ebook_available: false,
      };
      libraryBooks.unshift(book);
      return NextResponse.json({ success: true, message: `Book "${title}" added to the catalogue.`, data: book });
    }

    if (action === 'borrow') {
      const book = libraryBooks.find((b) => b.id === book_id);
      if (!book || book.available_copies <= 0) {
        return NextResponse.json({ success: false, error: 'No copies available for borrowing.' }, { status: 400 });
      }

      book.available_copies -= 1;
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 14);

      // IDOR / BOLA Prevention: Students can only borrow for themselves
      const effectiveStudentId = user.role === 'student' ? user.id : body.student_id || user.id;
      const effectiveName =
        user.role === 'student'
          ? user.email === 'student@university.ac.ke'
            ? 'Faith Wanjiku'
            : 'Enrolled Student'
          : body.student_name || 'Borrowing Student';
      const effectiveAdmission =
        user.role === 'student'
          ? user.email === 'student@university.ac.ke'
            ? 'BIT/2023/8849'
            : `STU/${user.id.slice(-4)}`
          : body.admission_number || 'BIT/2023/8849';

      const newLoan: LibraryLoan = {
        id: `ln-${Date.now()}`,
        book_id,
        book_title: book.title,
        student_id: effectiveStudentId,
        student_name: effectiveName,
        admission_number: effectiveAdmission,
        borrow_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'borrowed',
        fine_amount: 0,
      };

      libraryLoans.unshift(newLoan);
      return NextResponse.json({ success: true, message: `Loan recorded for "${book.title}".`, data: newLoan });
    }

    if (action === 'return') {
      const loan = libraryLoans.find((l) => l.id === loan_id);
      if (!loan) {
        return NextResponse.json({ success: false, error: 'Loan record not found.' }, { status: 404 });
      }

      // IDOR guard on book returns: Students cannot return or alter other students' loans
      if (
        user.role === 'student' &&
        loan.student_id !== user.id &&
        !(user.email === 'student@university.ac.ke' && loan.admission_number === 'BIT/2023/8849')
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You cannot modify another student\'s loan record.' },
          { status: 403 }
        );
      }

      if (loan.status === 'returned') return NextResponse.json({success:true,message:'Book already returned.',data:loan});
      loan.status = 'returned';
      loan.return_date = new Date().toISOString().split('T')[0];

      const book = libraryBooks.find((b) => b.id === loan.book_id);
      if (book) {
        book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
      }

      return NextResponse.json({ success: true, message: 'Book returned successfully.', data: loan });
    }

    const isLibrarianish = ['librarian', 'admin', 'super_admin'].includes(user.role);
    const isAdminish = ['admin', 'super_admin'].includes(user.role);
    const audit = (action: string, details?: Record<string, unknown>) =>
      recordAuditEvent({
        actor_email: user.email, actor_role: user.role, action,
        entity_type: 'library', entity_id: String(body.book_id || body.loan_id || body.batch_id || 'n/a'),
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
        status: 'SUCCESS', details,
      });

    if (action === 'renew') {
      if (!isLibrarianish) return NextResponse.json({ success: false, error: 'Only library staff can renew loans.' }, { status: 403 });
      const loan = libraryLoans.find((l) => l.id === loan_id);
      if (!loan || loan.status === 'returned') return NextResponse.json({ success: false, error: 'Loan not found or already returned.' }, { status: 404 });
      if (loan.renewed) return NextResponse.json({ success: false, error: 'This loan has already been renewed once.' }, { status: 400 });
      const policies = getLibraryPolicies();
      const due = new Date(loan.due_date);
      due.setDate(due.getDate() + policies.loan_rules.undergrad.loan_days);
      loan.due_date = due.toISOString().split('T')[0];
      loan.renewed = true;
      loan.status = 'borrowed';
      refreshLoanStates();
      audit('LIBRARY_LOAN_RENEWED', { loan_id: loan.id });
      return NextResponse.json({ success: true, message: 'Loan renewed once.', data: loan });
    }

    if (action === 'record_fine_payment') {
      if (!isLibrarianish) return NextResponse.json({ success: false, error: 'Only library staff can record fine payments.' }, { status: 403 });
      const loan = libraryLoans.find((l) => l.id === loan_id);
      if (!loan) return NextResponse.json({ success: false, error: 'Loan not found.' }, { status: 404 });
      if (!loan.fine_amount || loan.fine_amount <= 0) return NextResponse.json({ success: false, error: 'This loan has no outstanding fine.' }, { status: 400 });
      if (loan.fine_paid) return NextResponse.json({ success: false, error: 'Fine already recorded as paid.' }, { status: 400 });
      const ref = typeof body.reference === 'string' ? body.reference.trim() : '';
      if (!ref) return NextResponse.json({ success: false, error: 'A payment reference (receipt / M-Pesa code) is required.' }, { status: 400 });
      loan.fine_paid = true;
      loan.fine_payment_ref = ref;
      loan.fine_paid_at = todayYmd();
      audit('LIBRARY_FINE_PAID', { loan_id: loan.id, amount: loan.fine_amount, reference: ref });
      return NextResponse.json({ success: true, message: `Fine of KES ${loan.fine_amount} recorded as paid.`, data: loan });
    }

    if (action === 'reserve') {
      if (!isLibrarianish && user.role !== 'student') return NextResponse.json({ success: false, error: 'Not permitted.' }, { status: 403 });
      const book = libraryBooks.find((b) => b.id === book_id && !b.is_archived);
      if (!book) return NextResponse.json({ success: false, error: 'Book not found.' }, { status: 404 });
      const admission = typeof body.admission_number === 'string' ? body.admission_number.trim() : '';
      const name = typeof body.student_name === 'string' ? body.student_name.trim() : '';
      if (!admission || !name) return NextResponse.json({ success: false, error: 'Student name and admission number are required.' }, { status: 400 });
      const dup = libraryReservationsStore.find((r) => r.book_id === book_id && r.admission_number === admission && r.status === 'queued');
      if (dup) return NextResponse.json({ success: false, error: 'This student already has a queued reservation for this book.' }, { status: 409 });
      const res = {
        id: `rsv-${Date.now()}`,
        book_id, book_title: book.title,
        student_id: body.student_id || admission,
        student_name: name, admission_number: admission,
        reserved_date: todayYmd(), status: 'queued' as const,
      };
      libraryReservationsStore.unshift(res);
      audit('LIBRARY_RESERVATION_CREATED', { book_id, admission_number: admission });
      return NextResponse.json({ success: true, message: 'Reservation queued.', data: res });
    }

    if (action === 'fulfill_reservation') {
      if (!isLibrarianish) return NextResponse.json({ success: false, error: 'Only library staff can fulfill reservations.' }, { status: 403 });
      const rsv = libraryReservationsStore.find((r) => r.id === body.reservation_id && r.status === 'queued');
      if (!rsv) return NextResponse.json({ success: false, error: 'Reservation not found or not queued.' }, { status: 404 });
      const book = libraryBooks.find((b) => b.id === rsv.book_id);
      if (!book || book.available_copies <= 0) return NextResponse.json({ success: false, error: 'No copies available to fulfill.' }, { status: 400 });
      rsv.status = 'fulfilled';
      audit('LIBRARY_RESERVATION_FULFILLED', { reservation_id: rsv.id, book_id: rsv.book_id });
      return NextResponse.json({ success: true, message: `Reservation fulfilled — notify ${rsv.student_name} (${rsv.admission_number}).`, data: rsv });
    }

    if (action === 'cancel_reservation') {
      if (!isLibrarianish) return NextResponse.json({ success: false, error: 'Only library staff can cancel reservations.' }, { status: 403 });
      const rsv = libraryReservationsStore.find((r) => r.id === body.reservation_id && r.status === 'queued');
      if (!rsv) return NextResponse.json({ success: false, error: 'Reservation not found or not queued.' }, { status: 404 });
      rsv.status = 'cancelled';
      audit('LIBRARY_RESERVATION_CANCELLED', { reservation_id: rsv.id });
      return NextResponse.json({ success: true, message: 'Reservation cancelled.', data: rsv });
    }

    if (action === 'search_members') {
      if (!isLibrarianish) return NextResponse.json({ success: false, error: 'Only library staff can search members.' }, { status: 403 });
      const q = (typeof body.query === 'string' ? body.query : '').toLowerCase().trim();
      if (!q) return NextResponse.json({ success: true, data: [] });
      const hits = getLibraryMemberStudents()
        .filter((st) =>
          `${st.first_name} ${st.last_name}`.toLowerCase().includes(q) ||
          st.admission_number.toLowerCase().includes(q)
        )
        .slice(0, 10)
        .map((st) => ({
          student_id: st.id,
          student_name: `${st.first_name} ${st.last_name}`,
          admission_number: st.admission_number,
          program_name: st.program_name,
        }));
      return NextResponse.json({ success: true, data: hits });
    }

    if (action === 'list_batches') {
      if (!isAdminish) return NextResponse.json({ success: false, error: 'Only admin can view batch queues.' }, { status: 403 });
      return NextResponse.json({ success: true, data: libraryBatchesStore });
    }

    if (action === 'submit_batch') {
      if (!isLibrarianish) return NextResponse.json({ success: false, error: 'Only library staff can submit catalogue batches.' }, { status: 403 });
      const books = Array.isArray(body.books) ? body.books : [];
      if (books.length === 0 || books.length > 200) return NextResponse.json({ success: false, error: 'Batch must contain 1-200 books.' }, { status: 400 });
      for (const [i, b] of books.entries()) {
        if (!b.title || !b.author || !b.isbn || !Number.isInteger(Number(b.total_copies)) || Number(b.total_copies) < 1) {
          return NextResponse.json({ success: false, error: `Row ${i + 1}: title, author, ISBN and total_copies (≥1) are required.` }, { status: 400 });
        }
      }
      const batch = {
        id: `bat-${Date.now()}`,
        submitted_by_email: user.email,
        submitted_at: new Date().toISOString(),
        books: books.map((b: Record<string, unknown>) => ({
          title: String(b.title).trim(),
          author: String(b.author).trim(),
          isbn: String(b.isbn).trim(),
          publisher: typeof b.publisher === 'string' ? b.publisher : '',
          category: typeof b.category === 'string' && b.category ? String(b.category) : 'General',
          shelf_location: typeof b.shelf_location === 'string' ? String(b.shelf_location) : '',
          total_copies: Number(b.total_copies),
        })),
        status: 'pending' as const,
      };
      libraryBatchesStore.unshift(batch);
      audit('LIBRARY_BATCH_SUBMITTED', { batch_id: batch.id, count: batch.books.length });
      return NextResponse.json({ success: true, message: `Batch of ${batch.books.length} books submitted for admin approval.`, data: batch });
    }

    if (action === 'approve_batch' || action === 'reject_batch') {
      if (!isAdminish) return NextResponse.json({ success: false, error: 'Only admin can approve or reject catalogue batches.' }, { status: 403 });
      const batch = libraryBatchesStore.find((b) => b.id === body.batch_id && b.status === 'pending');
      if (!batch) return NextResponse.json({ success: false, error: 'Batch not found or already reviewed.' }, { status: 404 });
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (action === 'reject_batch' && !reason) return NextResponse.json({ success: false, error: 'A rejection reason is required.' }, { status: 400 });
      batch.status = action === 'approve_batch' ? 'approved' : 'rejected';
      batch.reviewed_by_email = user.email;
      batch.reviewed_at = new Date().toISOString();
      batch.review_reason = reason;
      if (batch.status === 'approved') {
        for (const b of batch.books) {
          libraryBooks.unshift({
            id: `bk-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            isbn: b.isbn, title: b.title, author: b.author, publisher: b.publisher || '',
            category: b.category || 'General', total_copies: b.total_copies,
            available_copies: b.total_copies, shelf_location: b.shelf_location || '',
            is_ebook_available: false,
          });
        }
      }
      audit(action === 'approve_batch' ? 'LIBRARY_BATCH_APPROVED' : 'LIBRARY_BATCH_REJECTED', { batch_id: batch.id, reason });
      return NextResponse.json({ success: true, message: `Batch ${batch.status}.`, data: batch });
    }

    if (action === 'write_off') {
      if (!isAdminish) return NextResponse.json({ success: false, error: 'Only admin can write off catalogue assets.' }, { status: 403 });
      const book = libraryBooks.find((b) => b.id === book_id && !b.is_archived);
      if (!book) return NextResponse.json({ success: false, error: 'Book not found or already archived.' }, { status: 404 });
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (reason.length < 10) return NextResponse.json({ success: false, error: 'A write-off reason (min 10 chars, e.g. damaged/lost/obsolete) is required.' }, { status: 400 });
      const openLoans = libraryLoans.filter((l) => l.book_id === book_id && l.status !== 'returned').length;
      if (openLoans > 0) return NextResponse.json({ success: false, error: `Cannot archive: ${openLoans} open loan(s) on this title.` }, { status: 400 });
      book.is_archived = true;
      book.archived_reason = reason;
      audit('LIBRARY_BOOK_WRITTEN_OFF', { book_id, reason });
      return NextResponse.json({ success: true, message: `Book archived. Loan history preserved.`, data: book });
    }

    return NextResponse.json({ success: false, error: 'Invalid library action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Library operation failed.' }, { status: 500 });
  }
}
