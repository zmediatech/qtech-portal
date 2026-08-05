require("dotenv").config();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const ClassModel = require("./models/Class");
const Subject = require("./models/Subject");
const Student = require("./models/Student");
const TimetableSlot = require("./models/TimetableSlot");
const Attendance = require("./models/Attendance");
const Exam = require("./models/Exam");
const Expense = require("./models/Expense");
const FeeRecord = require("./models/FeeRecord");
const Mark = require("./models/Mark");
const Course = require("./models/Course");
const Lecture = require("./models/Lecture");
const Enrollment = require("./models/Enrollment");

function monthsAgo(offset, day = 10) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - offset, day, 10, 0, 0, 0);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pct(obtained, total) {
  return Math.round((obtained / total) * 10000) / 100;
}

function gradeFromPercentage(p) {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
}

async function resetCollections() {
  if (process.env.RESET_SEED_DATA !== "true") return;

  await Promise.all([
    Attendance.deleteMany({}),
    Mark.deleteMany({}),
    FeeRecord.deleteMany({}),
    Exam.deleteMany({}),
    Lecture.deleteMany({}),
    Enrollment.deleteMany({}),
    Course.deleteMany({}),
    TimetableSlot.deleteMany({}),
    Student.deleteMany({}),
    Subject.deleteMany({}),
    ClassModel.deleteMany({}),
    Expense.deleteMany({}),
  ]);
}

async function seedUsers() {
  const adminEmail = "superadmin@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "super@ADMIN099";
  const teacherEmail = "teacher.one@qtech.local";
  const teacherPassword = "teacher123";
  const studentEmail = "ayaan.khan@example.com";
  const studentPassword = "student123";
  const parentEmail = "imran.khan@example.com";
  const parentPassword = "parent123";

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const teacherHash = await bcrypt.hash(teacherPassword, 10);
  const studentHash = await bcrypt.hash(studentPassword, 10);
  const parentHash = await bcrypt.hash(parentPassword, 10);

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    { name: "SuperAdmin", email: adminEmail, password: adminHash, role: "admin" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const teacher = await User.findOneAndUpdate(
    { email: teacherEmail },
    { name: "Teacher One", email: teacherEmail, password: teacherHash, role: "teacher" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const student = await User.findOneAndUpdate(
    { email: studentEmail },
    { name: "Ayaan Khan", email: studentEmail, password: studentHash, role: "student" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const parent = await User.findOneAndUpdate(
    { email: parentEmail },
    { name: "Imran Khan", email: parentEmail, password: parentHash, role: "parent" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    admin,
    teacher,
    student,
    parent,
    adminPassword,
    teacherPassword,
    studentPassword,
    parentPassword,
  };
}

async function seedClassesAndSubjects() {
  const class10A = await ClassModel.findOneAndUpdate(
    { name: "Class 10 A" },
    {
      name: "Class 10 A",
      description: "Matric science batch",
      courses: ["Mathematics", "Physics", "Chemistry", "English"],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const class9B = await ClassModel.findOneAndUpdate(
    { name: "Class 9 B" },
    {
      name: "Class 9 B",
      description: "Foundation and junior science batch",
      courses: ["Mathematics", "Biology", "Computer", "Urdu"],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const class8C = await ClassModel.findOneAndUpdate(
    { name: "Class 8 C" },
    {
      name: "Class 8 C",
      description: "Prep class for younger students",
      courses: ["Mathematics", "English", "Science", "Islamiyat"],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const math = await Subject.findOneAndUpdate(
    { code: "MATH-101" },
    { name: "Mathematics", code: "MATH-101" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const english = await Subject.findOneAndUpdate(
    { code: "ENG-101" },
    { name: "English", code: "ENG-101" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const cs = await Subject.findOneAndUpdate(
    { code: "CS-101" },
    { name: "Computer Science", code: "CS-101" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const physics = await Subject.findOneAndUpdate(
    { code: "PHY-101" },
    { name: "Physics", code: "PHY-101" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const biology = await Subject.findOneAndUpdate(
    { code: "BIO-101" },
    { name: "Biology", code: "BIO-101" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const urdu = await Subject.findOneAndUpdate(
    { code: "URD-101" },
    { name: "Urdu", code: "URD-101" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await ClassModel.updateOne(
    { _id: class10A._id },
    { $set: { subjects: [math._id, english._id, cs._id, physics._id] } }
  );
  await ClassModel.updateOne(
    { _id: class9B._id },
    { $set: { subjects: [math._id, cs._id, biology._id, urdu._id] } }
  );
  await ClassModel.updateOne(
    { _id: class8C._id },
    { $set: { subjects: [math._id, english._id, urdu._id] } }
  );

  return {
    classes: { class10A, class9B, class8C },
    subjects: {
      math,
      english,
      cs,
      physics,
      biology,
      urdu,
    },
  };
}

async function seedStudents(classes) {
  const records = [
    {
      regNo: "QTECH-1001",
      name: "Ayaan Khan",
      fatherName: "Imran Khan",
      phone: "03001234501",
      email: "ayaan.khan@example.com",
      address: "Street 1, Karachi",
      class: classes.class10A._id,
      category: "Paid",
      status: "Active",
      feeStatus: "Paid",
      dateOfBirth: "2008-05-12",
      admissionDate: "2025-03-01",
    },
    {
      regNo: "QTECH-1002",
      name: "Maham Ali",
      fatherName: "Nadeem Ali",
      phone: "03001234502",
      email: "maham.ali@example.com",
      address: "Street 2, Karachi",
      class: classes.class10A._id,
      category: "Paid",
      status: "Active",
      feeStatus: "Unpaid",
      dateOfBirth: "2009-01-20",
      admissionDate: "2025-03-02",
    },
    {
      regNo: "QTECH-1003",
      name: "Huzaifa Malik",
      fatherName: "Sajid Malik",
      phone: "03001234503",
      email: "huzaifa.malik@example.com",
      address: "Street 3, Karachi",
      class: classes.class10A._id,
      category: "Free",
      status: "Active",
      feeStatus: "Partial",
      dateOfBirth: "2008-11-09",
      admissionDate: "2025-03-03",
    },
    {
      regNo: "QTECH-2001",
      name: "Sara Ahmed",
      fatherName: "Ahmed Raza",
      phone: "03001234504",
      email: "sara.ahmed@example.com",
      address: "Street 4, Lahore",
      class: classes.class9B._id,
      category: "Paid",
      status: "Active",
      feeStatus: "Paid",
      dateOfBirth: "2009-08-14",
      admissionDate: "2025-04-01",
    },
    {
      regNo: "QTECH-2002",
      name: "Bilal Hassan",
      fatherName: "Hassan Ali",
      phone: "03001234505",
      email: "bilal.hassan@example.com",
      address: "Street 5, Lahore",
      class: classes.class9B._id,
      category: "Paid",
      status: "Active",
      feeStatus: "Overdue",
      dateOfBirth: "2010-02-27",
      admissionDate: "2025-04-04",
    },
    {
      regNo: "QTECH-3001",
      name: "Noor Fatima",
      fatherName: "Shahid Hussain",
      phone: "03001234506",
      email: "noor.fatima@example.com",
      address: "Street 6, Islamabad",
      class: classes.class8C._id,
      category: "Free",
      status: "Inactive",
      feeStatus: "Unpaid",
      dateOfBirth: "2011-07-01",
      admissionDate: "2025-05-01",
    },
    {
      regNo: "QTECH-3002",
      name: "Hamza Javed",
      fatherName: "Javed Iqbal",
      phone: "03001234507",
      email: "hamza.javed@example.com",
      address: "Street 7, Islamabad",
      class: classes.class8C._id,
      category: "Paid",
      status: "Active",
      feeStatus: "Paid",
      dateOfBirth: "2011-03-19",
      admissionDate: "2025-05-02",
    },
    {
      regNo: "QTECH-3003",
      name: "Emaan Shah",
      fatherName: "Shahzad Khan",
      phone: "03001234508",
      email: "emaan.shah@example.com",
      address: "Street 8, Islamabad",
      class: classes.class8C._id,
      category: "Paid",
      status: "Active",
      feeStatus: "Partial",
      dateOfBirth: "2011-12-10",
      admissionDate: "2025-05-03",
    },
  ];

  const students = [];
  for (const record of records) {
    const doc = await Student.findOneAndUpdate(
      { regNo: record.regNo },
      record,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    students.push(doc);
  }

  return students;
}

async function seedTimetable(classes, subjects) {
  const slots = [
    {
      day: "Monday",
      startTime: "08:00",
      endTime: "09:00",
      location: { room: "A-1" },
      class: classes.class10A._id,
      subject: subjects.math._id,
      instructorName: "Sir Farhan",
    },
    {
      day: "Monday",
      startTime: "09:15",
      endTime: "10:15",
      location: { room: "A-2" },
      class: classes.class10A._id,
      subject: subjects.physics._id,
      instructorName: "Sir Usman",
    },
    {
      day: "Tuesday",
      startTime: "08:00",
      endTime: "09:00",
      location: { room: "B-1" },
      class: classes.class9B._id,
      subject: subjects.biology._id,
      instructorName: "Madam Hira",
    },
    {
      day: "Wednesday",
      startTime: "10:30",
      endTime: "11:30",
      location: { room: "C-1" },
      class: classes.class8C._id,
      subject: subjects.english._id,
      instructorName: "Miss Ayesha",
    },
  ];

  const docs = [];
  for (const slot of slots) {
    const doc = await TimetableSlot.findOneAndUpdate(
      {
        class: slot.class,
        day: slot.day,
        startTime: slot.startTime,
        subject: slot.subject,
      },
      slot,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }
  return docs;
}

async function seedLms(classes, subjects, teacherId, studentUserId) {
  const courses = [
    {
      title: "Class 10 Mathematics Mastery",
      description: "Weekly algebra and geometry lessons for Class 10 A.",
      teacher: teacherId,
      scopeType: "classwise",
      classIds: [classes.class10A._id],
      subjectIds: [subjects.math._id],
      status: "published",
    },
    {
      title: "Physics Fundamentals",
      description: "General physics course for students assigned to science tracks.",
      teacher: teacherId,
      scopeType: "subjectwise",
      classIds: [classes.class10A._id],
      subjectIds: [subjects.physics._id],
      status: "published",
    },
  ];

  const docs = [];
  for (const course of courses) {
    const doc = await Course.findOneAndUpdate(
      { title: course.title, teacher: course.teacher },
      course,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }

  const lectures = [
    {
      course: docs[0]._id,
      title: "Introduction to Quadratic Equations",
      description: "Recorded lecture with examples and short notes.",
      order: 1,
      resourceUrl: "https://example.com/lectures/quadratics",
      uploadedBy: teacherId,
    },
    {
      course: docs[1]._id,
      title: "Motion and Force Basics",
      description: "Starter lesson for the physics course.",
      order: 1,
      resourceUrl: "https://example.com/lectures/force",
      uploadedBy: teacherId,
    },
  ];

  for (const lecture of lectures) {
    await Lecture.findOneAndUpdate(
      { course: lecture.course, title: lecture.title },
      lecture,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Enrollment.findOneAndUpdate(
    { course: docs[0]._id, user: studentUserId },
    {
      course: docs[0]._id,
      user: studentUserId,
      enrolledBy: studentUserId,
      source: "self",
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return docs;
}

async function seedAttendance(classes, students) {
  const byClass = (classId) => students.filter((s) => String(s.class) === String(classId));

  const class10 = byClass(classes.class10A._id);
  const class9 = byClass(classes.class9B._id);

  const items = [
    {
      date: startOfDay(monthsAgo(0, 3)),
      class: classes.class10A._id,
      totalStudents: class10.length,
      presentStudents: [class10[0]._id, class10[2]._id],
      absentStudents: [class10[1]._id],
      lateStudents: [],
      notes: "Morning assembly delayed by 10 minutes.",
    },
    {
      date: startOfDay(monthsAgo(1, 12)),
      class: classes.class9B._id,
      totalStudents: class9.length,
      presentStudents: [class9[0]._id, class9[1]._id],
      absentStudents: [],
      lateStudents: [],
      notes: "Quiz day, all students arrived on time.",
    },
  ];

  const docs = [];
  for (const item of items) {
    const doc = await Attendance.findOneAndUpdate(
      { class: item.class, date: item.date },
      item,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }
  return docs;
}

async function seedExams(classes, subjects, teacherId) {
  const exams = [
    {
      title: "Midterm Mathematics",
      classId: classes.class10A._id,
      subjectId: subjects.math._id,
      className: classes.class10A.name,
      subjectName: subjects.math.name,
      startAt: monthsAgo(0, 18),
      durationMinutes: 90,
      instructions: "Show all workings. Calculator allowed.",
      status: "published",
      createdBy: teacherId,
      questions: [
        {
          order: 1,
          type: "multiple-choice",
          text: "What is 12 x 8?",
          options: ["84", "96", "108", "112"],
          correctOptionIndex: 1,
          marks: 2,
        },
        {
          order: 2,
          type: "short-answer",
          text: "Define a prime number.",
          correctAnswerText: "A number greater than 1 with exactly two factors.",
          answerText: "A number greater than 1 with exactly two factors.",
          marks: 3,
        },
      ],
    },
    {
      title: "Science Fundamentals",
      classId: classes.class9B._id,
      subjectId: subjects.biology._id,
      className: classes.class9B.name,
      subjectName: subjects.biology.name,
      startAt: monthsAgo(1, 8),
      durationMinutes: 75,
      instructions: "Answer in complete sentences.",
      status: "published",
      createdBy: teacherId,
      questions: [
        {
          order: 1,
          type: "multiple-choice",
          text: "Which organ pumps blood?",
          options: ["Lungs", "Heart", "Kidney", "Liver"],
          correctOptionIndex: 1,
          marks: 2,
        },
        {
          order: 2,
          type: "essay",
          text: "Explain photosynthesis in a few lines.",
          answerText: "Plants use sunlight, water and carbon dioxide to make food.",
          marks: 5,
        },
      ],
    },
  ];

  const docs = [];
  for (const exam of exams) {
    const doc = await Exam.findOneAndUpdate(
      { title: exam.title, classId: exam.classId, subjectId: exam.subjectId },
      exam,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }
  return docs;
}

async function seedMarks(exams, students, classes, subjects) {
  const examMath = exams[0];
  const examBio = exams[1];
  const class10 = students.filter((s) => String(s.class) === String(classes.class10A._id));
  const class9 = students.filter((s) => String(s.class) === String(classes.class9B._id));

  const rows = [
    {
      student: class10[0]._id,
      class: classes.class10A._id,
      subject: subjects.math._id,
      exam: examMath._id,
      totalMarks: 100,
      obtainedMarks: 88,
      percentage: pct(88, 100),
      grade: gradeFromPercentage(pct(88, 100)),
    },
    {
      student: class10[1]._id,
      class: classes.class10A._id,
      subject: subjects.math._id,
      exam: examMath._id,
      totalMarks: 100,
      obtainedMarks: 73,
      percentage: pct(73, 100),
      grade: gradeFromPercentage(pct(73, 100)),
    },
    {
      student: class9[0]._id,
      class: classes.class9B._id,
      subject: subjects.biology._id,
      exam: examBio._id,
      totalMarks: 100,
      obtainedMarks: 91,
      percentage: pct(91, 100),
      grade: gradeFromPercentage(pct(91, 100)),
    },
    {
      student: class9[1]._id,
      class: classes.class9B._id,
      subject: subjects.biology._id,
      exam: examBio._id,
      totalMarks: 100,
      obtainedMarks: 64,
      percentage: pct(64, 100),
      grade: gradeFromPercentage(pct(64, 100)),
    },
  ];

  const docs = [];
  for (const row of rows) {
    const doc = await Mark.findOneAndUpdate(
      { student: row.student, subject: row.subject, exam: row.exam },
      row,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }
  return docs;
}

async function seedExpenses() {
  const rows = [
    { category: "Salaries", amount: 120000, date: monthsAgo(0, 5), description: "Monthly staff salaries" },
    { category: "Utilities", amount: 18000, date: monthsAgo(1, 6), description: "Electricity and internet" },
    { category: "Maintenance", amount: 25000, date: monthsAgo(2, 7), description: "Classroom repairs" },
    { category: "Stationery", amount: 9000, date: monthsAgo(3, 4), description: "Books and stationery" },
    { category: "Transport", amount: 15000, date: monthsAgo(4, 8), description: "School van fuel" },
    { category: "Events", amount: 22000, date: monthsAgo(5, 10), description: "Annual function setup" },
  ];

  const docs = [];
  for (const row of rows) {
    const doc = await Expense.findOneAndUpdate(
      { category: row.category, amount: row.amount, date: row.date },
      row,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }
  return docs;
}

async function seedFeeRecords(students, classes) {
  const byRegNo = Object.fromEntries(students.map((s) => [s.regNo, s]));

  const rows = [
    {
      student: byRegNo["QTECH-1001"]._id,
      classroom: classes.class10A._id,
      regNo: "QTECH-1001",
      studentName: "Ayaan Khan",
      className: classes.class10A.name,
      feeType: "Monthly Tuition",
      amount: 15000,
      date: monthsAgo(0, 2),
      method: "Online",
      status: "Paid",
      referenceNo: "TXN-1001",
      notes: "Paid through bank app",
    },
    {
      student: byRegNo["QTECH-1002"]._id,
      classroom: classes.class10A._id,
      regNo: "QTECH-1002",
      studentName: "Maham Ali",
      className: classes.class10A.name,
      feeType: "Monthly Tuition",
      amount: 15000,
      date: monthsAgo(0, 4),
      method: "Cash",
      status: "Pending",
      notes: "Waiting for receipt",
    },
    {
      student: byRegNo["QTECH-1003"]._id,
      classroom: classes.class10A._id,
      regNo: "QTECH-1003",
      studentName: "Huzaifa Malik",
      className: classes.class10A.name,
      feeType: "Monthly Tuition",
      amount: 15000,
      date: monthsAgo(1, 5),
      method: "Bank Transfer",
      status: "Unpaid",
      notes: "Reminder sent",
    },
    {
      student: byRegNo["QTECH-2001"]._id,
      classroom: classes.class9B._id,
      regNo: "QTECH-2001",
      studentName: "Sara Ahmed",
      className: classes.class9B.name,
      feeType: "Monthly Tuition",
      amount: 12000,
      date: monthsAgo(1, 9),
      method: "Cash",
      status: "Paid",
      referenceNo: "CASH-2001",
    },
    {
      student: byRegNo["QTECH-2002"]._id,
      classroom: classes.class9B._id,
      regNo: "QTECH-2002",
      studentName: "Bilal Hassan",
      className: classes.class9B.name,
      feeType: "Monthly Tuition",
      amount: 12000,
      date: monthsAgo(2, 10),
      method: "Online",
      status: "Paid",
      referenceNo: "TXN-2002",
    },
    {
      student: byRegNo["QTECH-3002"]._id,
      classroom: classes.class8C._id,
      regNo: "QTECH-3002",
      studentName: "Hamza Javed",
      className: classes.class8C.name,
      feeType: "Monthly Tuition",
      amount: 10000,
      date: monthsAgo(3, 11),
      method: "Cash",
      status: "Paid",
      referenceNo: "CASH-3002",
    },
  ];

  const docs = [];
  for (const row of rows) {
    const doc = await FeeRecord.findOneAndUpdate(
      { regNo: row.regNo, date: row.date, feeType: row.feeType },
      row,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }
  return docs;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  await connectDB(uri);
  await resetCollections();

  const { admin, teacher, student, parent, adminPassword, teacherPassword, studentPassword, parentPassword } = await seedUsers();
  const { classes, subjects } = await seedClassesAndSubjects();
  const students = await seedStudents(classes);
  await User.updateOne(
    { _id: teacher._id },
    {
      $set: {
        assignedClasses: [classes.class10A._id, classes.class9B._id],
        assignedSubjects: [subjects.math._id, subjects.physics._id],
      },
    }
  );
  await User.updateOne(
    { _id: student._id },
    { $set: { studentClass: classes.class10A._id } }
  );
  await User.updateOne(
    { _id: parent._id },
    { $set: { parentStudentIds: [students[0]._id] } }
  );
  const timetable = await seedTimetable(classes, subjects);
  const attendance = await seedAttendance(classes, students);
  const exams = await seedExams(classes, subjects, teacher._id);
  const marks = await seedMarks(exams, students, classes, subjects);
  const expenses = await seedExpenses();
  const feeRecords = await seedFeeRecords(students, classes);
  const lmsCourses = await seedLms(classes, subjects, teacher._id, student._id);

  console.log("Demo data seeded successfully.");
  console.log(`Admin login: ${admin.email} / ${adminPassword}`);
  console.log(`Teacher login: ${teacher.email} / ${teacherPassword}`);
  console.log(`Student login: ${student.email} / ${studentPassword}`);
  console.log(`Parent login: ${parent.email} / ${parentPassword}`);
  console.log(`Classes: ${classes.class10A.name}, ${classes.class9B.name}, ${classes.class8C.name}`);
  console.log(`Students: ${students.length}`);
  console.log(`Subjects: 6`);
  console.log(`Timetable slots: ${timetable.length}`);
  console.log(`Attendance records: ${attendance.length}`);
  console.log(`Exams: ${exams.length}`);
  console.log(`Marks: ${marks.length}`);
  console.log(`Expenses: ${expenses.length}`);
  console.log(`Fee records: ${feeRecords.length}`);
  console.log(`LMS courses: ${lmsCourses.length}`);
  if (process.env.RESET_SEED_DATA === "true") {
    console.log("RESET_SEED_DATA=true was set, so collections were cleared before seeding.");
  } else {
    console.log("Safe mode: records were upserted without wiping existing data.");
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed demo data:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
