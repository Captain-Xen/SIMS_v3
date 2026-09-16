import { db } from './db'
import { hashPassword } from './auth'

const SUBJECTS = ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Spanish', 'Physical Education', 'Information Technology']
const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const FIRST_NAMES = ['Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Joshua', 'Aaliyah', 'Tyrone', 'Kesha', 'Andre', 'Roshane', 'Tanya', 'Malik', 'Khadijah', 'Devon', 'Shanice', 'Jevonte', 'Asha', 'Ricardo', 'Petra']
const LAST_NAMES = ['Doe', 'Brown', 'Williams', 'Cameron', 'Stewart', 'Haye', 'Reid', 'Grant', 'Bennett', 'Foster', 'Miller', 'Thompson', 'Gordon', 'Henry', 'Parker', 'Sinclair', 'Wright', 'Clarke', 'Lawson', 'Morris']
const BLOOD = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-']

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}
function randId(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(3, '0')}`
}

export async function seedDatabase() {
  // wipe
  await db.notification.deleteMany()
  await db.submission.deleteMany()
  await db.assignment.deleteMany()
  await db.message.deleteMany()
  await db.calendarEvent.deleteMany()
  await db.discipline.deleteMany()
  await db.fee.deleteMany()
  await db.attendance.deleteMany()
  await db.grade.deleteMany()
  await db.announcement.deleteMany()
  await db.user.deleteMany()
  await db.schoolSettings.deleteMany()
  await db.loan.deleteMany()
  await db.book.deleteMany()
  await db.exam.deleteMany()

  // school settings
  await db.schoolSettings.create({
    data: {
      id: 'singleton',
      name: 'School Name',
      tagline: 'School Information Management System (SIMS)',
      accent: '5,150,105|4,120,87|16,185,129',
      email: 'info@educenter.edu',
      phone: '+1 876 555 0100',
      address: '123 Education Lane, Kingston, Jamaica',
    },
  })

  // staff — demo passwords are hashed with scrypt (same scheme as production logins)
  const [pwAdmin, pwPrincipal, pwStaff, pwNurse, pwStudent] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('principal123'),
    hashPassword('staff123'),
    hashPassword('nurse123'),
    hashPassword('student123'),
  ])
  const admin = await db.user.create({ data: { email: 'admin@edu.edu', name: 'Dr. Admin', password: pwAdmin, role: 'Admin', status: 'Active', bio: 'System Administrator overseeing all school operations.', department: 'Administration', phone: '555-0100', points: 196, level: 2, badges: 3 } })
  const principal = await db.user.create({ data: { email: 'principal@edu.edu', name: 'Mrs. principal', password: pwPrincipal, role: 'Principal', status: 'Active', bio: 'Principal of the school.', department: 'Administration', phone: '555-0101' } })
  const teacher = await db.user.create({ data: { email: 'staff@edu.edu', name: 'Ms. Teacher', password: pwStaff, role: 'Teacher', status: 'Active', bio: 'Mathematics & Physics educator passionate about STEM.', department: 'Sciences', subjects: JSON.stringify(['Mathematics', 'Physics']), phone: '555-0102', points: 142, level: 2, badges: 2 } })
  const teacher2 = await db.user.create({ data: { email: 'english@edu.edu', name: 'Mr. Shakespeare', password: pwStaff, role: 'Teacher', status: 'Active', bio: 'English Language & Literature teacher.', department: 'Languages', subjects: JSON.stringify(['English Language', 'History']), phone: '555-0103', points: 110, level: 1, badges: 1 } })
  const nurse = await db.user.create({ data: { email: 'nurse@edu.edu', name: 'Nurse Betty', password: pwNurse, role: 'Nurse', status: 'Active', bio: 'School nurse.', department: 'Health', phone: '555-0104' } })

  // students
  const studentUsers = []
  let sCount = 0
  for (let g = 7; g <= 11; g++) {
    for (const cls of [`${g}A`, `${g}B`]) {
      for (let i = 0; i < 4; i++) {
        sCount++
        const name = `${pick(FIRST_NAMES, sCount)} ${pick(LAST_NAMES, sCount + 3)}`
        const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${sCount}@edu.edu`
        const feeStatus = sCount % 3 === 0 ? 'Paid' : 'Pending'
        const student = await db.user.create({
          data: {
            email,
            name,
            password: pwStudent,
            role: 'Student',
            status: 'Active',
            dob: `200${(g - 7) + 5}-0${(i % 9) + 1}-1${i % 9}`,
            gender: sCount % 2 === 0 ? 'Male' : 'Female',
            bloodGroup: pick(BLOOD, sCount),
            admissionNo: randId('EDU', sCount),
            grade: g,
            className: cls,
            guardian: `${pick(FIRST_NAMES, sCount + 5)} ${pick(LAST_NAMES, sCount + 1)}`,
            phone: `555-0${100 + sCount}`,
            bio: `Student in Form ${g - 6}, class ${cls}.`,
            points: 40 + ((sCount * 7) % 160),
            level: 1 + (sCount % 3),
            badges: sCount % 4,
          },
        })
        studentUsers.push({ ...student, feeStatus })
      }
    }
  }

  // the canonical demo student
  const demoStudent = await db.user.create({
    data: {
      email: 'student@edu.edu',
      name: 'Jane Doe',
      password: pwStudent,
      role: 'Student',
      status: 'Active',
      dob: '2008-05-12',
      gender: 'Female',
      bloodGroup: 'O+',
      admissionNo: 'EDU-001',
      grade: 10,
      className: '10A',
      guardian: 'Alice Doe',
      phone: '555-0100',
      bio: 'Dedicated 4th Form student who loves biology and the chess club.',
      points: 196,
      level: 2,
      badges: 3,
    },
  })
  studentUsers.push({ ...demoStudent, feeStatus: 'Pending' })

  // announcements
  await db.announcement.createMany({
    data: [
      { title: 'Midterm Exams Approaching', body: 'Midterm examinations begin Monday. Please ensure all students are prepared and arrive 15 minutes early.', authorId: admin.id },
      { title: 'Science Fair Registration Open', body: 'Sign up at the front office for the annual Science Fair. Prizes for top 3 projects!', authorId: teacher.id },
      { title: 'PTA Meeting Scheduled', body: 'The next Parent-Teacher Association meeting is scheduled for the 20th at 5:30 PM in the main hall.', authorId: principal.id },
      { title: 'Library Extended Hours', body: 'The library will now stay open until 6 PM on weekdays to support exam preparation.', authorId: admin.id },
    ],
  })

  // grades
  const gradeSubjects = ['Mathematics', 'English Language', 'Biology']
  for (const s of studentUsers) {
    for (const subject of gradeSubjects) {
      await db.grade.create({
        data: {
          studentId: s.id,
          teacherId: teacher.id,
          subject,
          score: 60 + Math.floor(Math.random() * 40),
          term: 'Term 1',
        },
      })
    }
  }

  // attendance (today)
  const today = new Date().toISOString().slice(0, 10)
  for (const s of studentUsers) {
    const r = Math.random()
    const status = r > 0.12 ? 'Present' : r > 0.06 ? 'Late' : 'Absent'
    await db.attendance.create({ data: { studentId: s.id, date: today, status } })
  }

  // fees
  for (const s of studentUsers) {
    await db.fee.create({
      data: {
        studentId: s.id,
        amount: 1200,
        status: s.feeStatus,
        dueDate: `${new Date().getFullYear()}-12-15`,
        term: 'Term 1',
      },
    })
  }

  // discipline
  if (studentUsers.length > 5) {
    await db.discipline.create({ data: { studentId: studentUsers[2].id, issuerId: principal.id, type: 'Detention', reason: 'Repeated lateness', date: today } })
    await db.discipline.create({ data: { studentId: studentUsers[5].id, issuerId: principal.id, type: 'Warning', reason: 'Uniform violation', date: today } })
  }

  // calendar events
  const yr = new Date().getFullYear()
  const mo = String(new Date().getMonth() + 1).padStart(2, '0')
  await db.calendarEvent.createMany({
    data: [
      { title: 'Math Exam', date: `${yr}-${mo}-05`, type: 'Exam' },
      { title: 'Science Fair', date: `${yr}-${mo}-12`, type: 'Event' },
      { title: 'Public Holiday', date: `${yr}-${mo}-15`, type: 'Holiday' },
      { title: 'PTA Meeting', date: `${yr}-${mo}-20`, type: 'Meeting' },
      { title: 'Sports Day', date: `${yr}-${mo}-25`, type: 'Event' },
    ],
  })

  // assignments
  await db.assignment.createMany({
    data: [
      { teacherId: teacher.id, title: 'Algebra Worksheet 4', description: 'Complete problems 1-20 on solving linear equations. Show all working.', subject: 'Mathematics', className: '10A', dueDate: `${yr}-${mo}-18` },
      { teacherId: teacher.id, title: 'Newton\'s Laws Lab Report', description: 'Write a 2-page lab report on the pendulum experiment conducted in class.', subject: 'Physics', className: '10A', dueDate: `${yr}-${mo}-22` },
      { teacherId: teacher2.id, title: 'Shakespeare Essay', description: 'Write a 500-word essay analyzing the theme of ambition in Macbeth.', subject: 'English Language', className: '10A', dueDate: `${yr}-${mo}-25` },
    ],
  })

  // exams
  await db.exam.createMany({
    data: [
      { title: 'Mathematics Midterm', subject: 'Mathematics', className: '10A', date: `${yr}-${mo}-05`, startTime: '09:00', duration: 120, room: 'Hall A', totalMarks: 100, passingMarks: 40, notes: 'Bring calculator and geometry set.', createdById: admin.id },
      { title: 'English Language Midterm', subject: 'English Language', className: '10A', date: `${yr}-${mo}-07`, startTime: '09:00', duration: 150, room: 'Hall B', totalMarks: 100, passingMarks: 40, notes: 'Essay + comprehension sections.', createdById: admin.id },
      { title: 'Biology Midterm', subject: 'Biology', className: '10A', date: `${yr}-${mo}-09`, startTime: '13:00', duration: 90, room: 'Lab 1', totalMarks: 80, passingMarks: 32, notes: 'Lab coat required.', createdById: admin.id },
      { title: 'Physics Midterm', subject: 'Physics', className: '10A', date: `${yr}-${mo}-11`, startTime: '09:00', duration: 120, room: 'Hall A', totalMarks: 100, passingMarks: 40, notes: 'Formula sheet provided.', createdById: admin.id },
      { title: 'History Midterm', subject: 'History', className: '9A', date: `${yr}-${mo}-06`, startTime: '10:00', duration: 90, room: 'Room 204', totalMarks: 60, passingMarks: 24, createdById: admin.id },
    ],
  })

  // messages (welcome)
  await db.message.createMany({
    data: [
      { fromId: teacher.id, toId: demoStudent.id, body: 'Welcome to the new school term, Jane! Let me know if you need help with the algebra worksheet.' },
      { fromId: admin.id, toId: teacher.id, body: 'Reminder: grade submission deadline is this Friday.' },
    ],
  })

  // notifications
  await db.notification.createMany({
    data: [
      { userId: admin.id, title: 'New student registered', body: 'A new admission form was submitted.', type: 'info' },
      { userId: teacher.id, title: 'Grades due Friday', body: 'Term 1 grade submission closes this Friday.', type: 'warning' },
      { userId: demoStudent.id, title: 'New assignment', body: 'Algebra Worksheet 4 is now due.', type: 'assignment' },
      { userId: demoStudent.id, title: 'Message from Ms. Teacher', body: 'Welcome to the new school term!', type: 'message' },
    ],
  })

  // library books
  const books = [
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', category: 'Fiction', copies: 5, shelf: 'F-12' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', copies: 3, shelf: 'S-08' },
    { title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '9781285741550', category: 'Mathematics', copies: 8, shelf: 'M-03' },
    { title: 'The Diary of a Young Girl', author: 'Anne Frank', isbn: '9780553296983', category: 'History', copies: 4, shelf: 'H-15' },
    { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', category: 'Fiction', copies: 6, shelf: 'F-07' },
    { title: 'Chemistry: The Central Science', author: 'Theodore L. Brown', isbn: '9780321910417', category: 'Science', copies: 5, shelf: 'S-11' },
    { title: '1984', author: 'George Orwell', isbn: '9780451524935', category: 'Fiction', copies: 7, shelf: 'F-21' },
    { title: 'The Oxford English Dictionary', author: 'Oxford University Press', isbn: '9780198610498', category: 'Reference', copies: 2, shelf: 'R-01' },
    { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '9780385474542', category: 'Fiction', copies: 4, shelf: 'F-14' },
    { title: 'Physics for Scientists and Engineers', author: 'Serway & Jewett', isbn: '9781285073839', category: 'Science', copies: 4, shelf: 'S-05' },
    { title: 'The Caribbean: A History of the Region', author: 'Bridget Brereton', isbn: '9789766402005', category: 'History', copies: 3, shelf: 'H-09' },
    { title: 'Advanced Mathematics', author: 'R. R. Sharma', isbn: '9788121923456', category: 'Mathematics', copies: 6, shelf: 'M-07' },
  ]
  for (const b of books) {
    await db.book.create({ data: { ...b, available: b.copies } })
  }

  // a couple of active loans
  const loanToday = new Date()
  const borrowDate = loanToday.toISOString().slice(0, 10)
  const dueDate = new Date(loanToday.getTime() + 14 * 86400000).toISOString().slice(0, 10)
  await db.loan.create({ data: { bookId: (await db.book.findFirst({ where: { title: '1984' } }))!.id, userId: demoStudent.id, borrowDate, dueDate, status: 'Borrowed' } })
  await db.loan.create({ data: { bookId: (await db.book.findFirst({ where: { title: 'Things Fall Apart' } }))!.id, userId: studentUsers[0].id, borrowDate, dueDate: new Date(loanToday.getTime() - 2 * 86400000).toISOString().slice(0, 10), status: 'Overdue' } })

  return { staff: 5, students: studentUsers.length, grades: studentUsers.length * 3, books: books.length }
}
