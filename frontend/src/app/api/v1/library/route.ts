import { NextResponse } from 'next/server';
import { LibraryBook, LibraryLoan } from '@/types';

let libraryBooks: LibraryBook[] = [
  { id: 'bk-01', isbn: '978-0131103627', title: 'The C Programming Language (2nd Edition)', author: 'Brian Kernighan, Dennis Ritchie', publisher: 'Prentice Hall', category: 'Computer Science', total_copies: 15, available_copies: 12, shelf_location: 'CS-ST1-04', is_ebook_available: true },
  { id: 'bk-02', isbn: '978-0134685991', title: 'Effective Java (3rd Edition)', author: 'Joshua Bloch', publisher: 'Addison-Wesley', category: 'Software Engineering', total_copies: 10, available_copies: 7, shelf_location: 'SE-ST2-11', is_ebook_available: true },
  { id: 'bk-03', isbn: '978-0262033848', title: 'Introduction to Algorithms (CLRS)', author: 'Thomas Cormen, Charles Leiserson', publisher: 'MIT Press', category: 'Algorithms', total_copies: 20, available_copies: 14, shelf_location: 'AL-ST3-01', is_ebook_available: false },
  { id: 'bk-04', isbn: '978-1449331818', title: 'Learning Python (5th Edition)', author: 'Mark Lutz', publisher: "O'Reilly Media", category: 'Data Science', total_copies: 8, available_copies: 5, shelf_location: 'PY-ST1-09', is_ebook_available: true },
];

let libraryLoans: LibraryLoan[] = [
  { id: 'ln-01', book_id: 'bk-01', book_title: 'The C Programming Language', student_id: 'std-01', student_name: 'Alex Kiptoo Kimutai', admission_number: 'BIT/2023/8849', borrow_date: '2026-09-15', due_date: '2026-09-29', return_date: '2026-09-28', status: 'returned', fine_amount: 0 },
  { id: 'ln-02', book_id: 'bk-03', book_title: 'Introduction to Algorithms (CLRS)', student_id: 'std-02', student_name: 'Faith Chebet Korir', admission_number: 'BCS/2023/9102', borrow_date: '2026-09-20', due_date: '2026-10-04', status: 'overdue', fine_amount: 50 },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      books: libraryBooks,
      loans: libraryLoans,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, book_id, student_id, student_name, admission_number, loan_id } = body;

    if (action === 'borrow') {
      const book = libraryBooks.find((b) => b.id === book_id);
      if (!book || book.available_copies <= 0) {
        return NextResponse.json({ success: false, error: 'No copies available for borrowing.' }, { status: 400 });
      }

      book.available_copies -= 1;
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 14);

      const newLoan: LibraryLoan = {
        id: `ln-${Date.now()}`,
        book_id,
        book_title: book.title,
        student_id: student_id || `std-${Date.now()}`,
        student_name: student_name || 'Borrowing Student',
        admission_number: admission_number || 'BIT/2023/8849',
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

      loan.status = 'returned';
      loan.return_date = new Date().toISOString().split('T')[0];

      const book = libraryBooks.find((b) => b.id === loan.book_id);
      if (book) {
        book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
      }

      return NextResponse.json({ success: true, message: 'Book returned successfully.', data: loan });
    }

    return NextResponse.json({ success: false, error: 'Invalid library action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Library operation failed.' }, { status: 500 });
  }
}
