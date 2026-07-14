// Shared admission-creation logic.
// Used by both the admin "New Admission Entry" route and the admission-payment
// verify flow, so a verified payment automatically registers the student.
//
// Mirrors the behavior of the existing /api/admin/admissions/create handler:
// creates (or reuses) a parent User + Parent profile, the Student record, an
// approved Admission record, the admission-fee Fee + Receipt, and 12 monthly
// tuition invoices (month 1 marked paid).

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Parent from '../models/Parent.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import Admission from '../models/Admission.js';
import Fee from '../models/Fee.js';
import Receipt from '../models/Receipt.js';
import Course from '../models/Course.js';
import mockStore from '../config/mockStore.js';

const VALID_CLASSES = [
  'Pre-Nursery', 'Nursery', 'Junior KG', 'Senior KG', 'Preschool',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th',
  'Java Development', 'MERN Developer', 'Python Developer', 'Frontend Developer'
];

function genAppNo() {
  return `PRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
function genStudentId() {
  return `STD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
function genTxn(prefix) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

// Resolve the selected course/class into a valid Student.class enum value.
// IMPORTANT: the admin form offers coaching courses (e.g. "Java Development"),
// so a real selection must be preserved as-is. Only fall back when blank.
function normalizeClass(value) {
  const v = String(value || '').trim();
  if (!v) return 'Nursery';
  if (VALID_CLASSES.includes(v)) return v;
  // Allow raw grade numbers like "5" → "5th" when applicable.
  if (/^\d+$/.test(v) && VALID_CLASSES.includes(`${v}th`)) return `${v}th`;
  // Unknown but non-empty selection: keep it verbatim so the chosen course is
  // registered (the model enum is the single source of truth on validation).
  return v;
}

/**
 * Create a full admission (parent + student + admission record + fees) from a
 * verified payment. Works in both mock and MongoDB modes.
 *
 * @param {Object} args
 * @param {Object} args.studentDetails { name, dateOfBirth, gender, class }
 * @param {Object} args.parentDetails { fatherName, motherName, email, phone, address }
 * @param {String} args.paymentMethod  e.g. 'Cash' | 'UPI' | 'Admission Desk Cash'
 * @param {Number} args.admissionFee   amount collected for the admission fee
 * @param {String} [args.password]     optional parent password (defaults to parent123)
 * @param {Object} [args.photo]        optional multer file ({ buffer, mimetype, originalname }) for the student photo
 * @returns {Promise<{applicationNumber, studentId, studentDbId, receipt}>}
 */
export async function createAdmissionFromPayment({ studentDetails, parentDetails, paymentMethod = 'Cash', admissionFee = 0, password, photo }) {
  const isMock = mockStore.isMock;
  const appNo = genAppNo();
  const studentPublicId = genStudentId();

  // Build the student photo payload + a URL pointing at the photo endpoint.
  const buildPhotoData = (studentId, file) => {
    if (!file) return { photoData: undefined, photoPath: `/api/admin/students/photo/${studentId}` };
    return {
      photoData: {
        data: isMock ? file.buffer.toString('base64') : file.buffer,
        contentType: file.mimetype,
        filename: file.originalname
      },
      photoPath: `/api/admin/students/photo/${studentId}`
    };
  };

  const normalizedStudent = {
    name: studentDetails.name,
    dateOfBirth: studentDetails.dateOfBirth,
    gender: studentDetails.gender || 'Male',
    class: normalizeClass(studentDetails.class)
  };
  const normalizedParent = {
    fatherName: parentDetails.fatherName || parentDetails.motherName || '',
    motherName: parentDetails.motherName || '',
    email: parentDetails.email,
    phone: parentDetails.phone || '',
    address: parentDetails.address || ''
  };

  let receipt = null;

  if (isMock) {
    // ---- Parent user + profile ----
    let parentUser = await mockStore.findOne('users', { email: normalizedParent.email });
    let parentProfile;
    if (!parentUser) {
      const salt = bcrypt.genSaltSync(10);
      
      // Determine if this is an online course or school class
      const allCourses = await mockStore.find('courses') || [];
      const isCourseStudent = allCourses.some(c => String(c.title).toLowerCase() === String(normalizedStudent.class).toLowerCase());
      const resolvedRole = isCourseStudent ? 'user' : 'parent';

      parentUser = await mockStore.create('users', {
        name: normalizedParent.fatherName || normalizedParent.motherName,
        email: normalizedParent.email,
        password: bcrypt.hashSync(password || 'parent123', salt),
        role: resolvedRole
      });
      parentProfile = await mockStore.create('parents', {
        userId: parentUser._id,
        name: parentUser.name,
        email: parentUser.email,
        phone: normalizedParent.phone,
        address: normalizedParent.address,
        children: []
      });
    } else {
      parentProfile = await mockStore.findOne('parents', { userId: parentUser._id });
    }

    const teachers = await mockStore.find('teachers');
    const teacherId = teachers[0]?._id || null;
    const studentDbId = 'std_' + Math.random().toString(36).substr(2, 9);
    const studentPhoto = buildPhotoData(studentDbId, photo);

    const newStudent = await mockStore.create('students', {
      _id: studentDbId,
      name: normalizedStudent.name,
      studentId: studentPublicId,
      dateOfBirth: normalizedStudent.dateOfBirth,
      gender: normalizedStudent.gender,
      class: normalizedStudent.class,
      parentId: parentProfile._id,
      teacherId,
      photo: studentPhoto.photoPath,
      photoData: studentPhoto.photoData,
      attendance: [],
      progressReports: [],
      activities: []
    });
    parentProfile.children.push(newStudent._id);
    await mockStore.findByIdAndUpdate('parents', parentProfile._id, { children: parentProfile.children });

    await mockStore.create('admissions', {
      applicationNumber: appNo,
      studentDetails: normalizedStudent,
      parentDetails: normalizedParent,
      documents: {},
      documentData: {},
      status: 'approved',
      remarks: `Admission via ${paymentMethod} payment`,
      submissionDate: new Date()
    });

    const admissionFeeVal = Number(admissionFee) || 0;
    if (admissionFeeVal > 0) {
      const txnId = genTxn('TXN-ADM');
      const fee = await mockStore.create('fees', {
        studentId: newStudent._id,
        amount: admissionFeeVal,
        term: 'Admission Fee',
        dueDate: new Date(),
        status: 'paid',
        paymentDate: new Date(),
        transactionId: txnId,
        paymentMethod
      });
      receipt = await mockStore.create('receipts', {
        feeId: fee._id,
        studentId: newStudent._id,
        receiptNumber: `REC-ADM-${Date.now()}`,
        amountPaid: admissionFeeVal,
        paymentMethod,
        paymentDate: new Date(),
        transactionId: txnId
      });
    }

    let course = null;
    const courses = await mockStore.find('courses', { title: normalizedStudent.class });
    if (courses && courses.length > 0) {
      course = courses[0];
    } else {
      const allCourses = await mockStore.find('courses');
      course = allCourses.find(c => String(c.title).toLowerCase() === String(normalizedStudent.class).toLowerCase());
    }

    let totalAmount = 15000;

    if (course) {
      totalAmount = Number(course.price) || 0;
      
      // Auto-enroll the user in mock mode
      await mockStore.create('enrollments', {
        user: String(parentUser._id),
        course: String(course._id),
        paymentStatus: 'paid',
        status: 'active',
        enrolledAt: new Date()
      });
    }

    const durationMonths = 3; // exactly 3 installments monthly
    const installmentAmount = Math.round(totalAmount / 3);
    const lastInstallmentAmount = totalAmount - (installmentAmount * 2);

    for (let i = 1; i <= 3; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      const amt = i === durationMonths ? lastInstallmentAmount : installmentAmount;
      await mockStore.create('fees', {
        studentId: newStudent._id,
        amount: amt,
        term: `Month ${i} Installment`,
        dueDate,
        status: i === 1 ? 'paid' : 'pending',
        paymentDate: i === 1 ? new Date() : null,
        transactionId: i === 1 ? genTxn('TXN-INIT') : '',
        paymentMethod: i === 1 ? paymentMethod : ''
      });
    }

    return { applicationNumber: appNo, studentId: studentPublicId, studentDbId, receipt };
  }

  // ---- MongoDB ----
  let parentUser = await User.findOne({ email: normalizedParent.email });
  let parent;
  if (!parentUser) {
    // Check if class matches an online course in database
    const isCourseStudent = await Course.findOne({ title: { $regex: new RegExp(`^${normalizedStudent.class}$`, 'i') } });
    const resolvedRole = isCourseStudent ? 'user' : 'parent';

    parentUser = await User.create({
      name: normalizedParent.fatherName || normalizedParent.motherName,
      email: normalizedParent.email,
      password: password || 'parent123',
      role: resolvedRole
    });
    parent = await Parent.create({
      userId: parentUser._id,
      name: parentUser.name,
      email: parentUser.email,
      phone: normalizedParent.phone,
      address: normalizedParent.address,
      children: []
    });
  } else {
    parent = await Parent.findOne({ userId: parentUser._id });
  }

  const firstTeacher = await Teacher.findOne();
  const student = await Student.create({
    name: normalizedStudent.name,
    studentId: studentPublicId,
    dateOfBirth: normalizedStudent.dateOfBirth,
    gender: normalizedStudent.gender,
    class: normalizedStudent.class,
    parentId: parent._id,
    teacherId: firstTeacher ? firstTeacher._id : null
  });

  // Attach the uploaded photo (if any) now that the student id is known.
  const mongoPhoto = buildPhotoData(student._id, photo);
  if (mongoPhoto.photoData) {
    student.photoData = mongoPhoto.photoData;
    student.photo = mongoPhoto.photoPath;
    await student.save();
  } else {
    student.photo = mongoPhoto.photoPath;
    await student.save();
  }

  parent.children.push(student._id);
  await parent.save();

  await Admission.create({
    applicationNumber: appNo,
    studentDetails: normalizedStudent,
    parentDetails: normalizedParent,
    documents: {},
    documentData: {},
    status: 'approved',
    remarks: `Admission via ${paymentMethod} payment`
  });

  const admissionFeeVal = Number(admissionFee) || 0;
  if (admissionFeeVal > 0) {
    const txnId = genTxn('TXN-ADM');
    const fee = await Fee.create({
      studentId: student._id,
      amount: admissionFeeVal,
      term: 'Admission Fee',
      dueDate: new Date(),
      status: 'paid',
      paymentDate: new Date(),
      transactionId: txnId,
      paymentMethod
    });
    receipt = await Receipt.create({
      feeId: fee._id,
      studentId: student._id,
      receiptNumber: `REC-ADM-${Date.now()}`,
      amountPaid: admissionFeeVal,
      paymentMethod,
      paymentDate: new Date(),
      transactionId: txnId
    });
  }

  let course = await Course.findOne({ title: { $regex: new RegExp(`^${normalizedStudent.class}$`, 'i') } });
  let totalAmount = 15000;

  if (course) {
    totalAmount = Number(course.price) || 0;

    // Auto-enroll the user in MongoDB mode
    const CourseEnrollment = (await import('../models/CourseEnrollment.js')).default;
    await CourseEnrollment.findOneAndUpdate(
      { user: parentUser._id, course: course._id },
      { paymentStatus: 'paid', status: 'active', enrolledAt: new Date() },
      { upsert: true, new: true }
    );
    course.totalEnrollments = (course.totalEnrollments || 0) + 1;
    await course.save();
  }

  const durationMonths = 3; // exactly 3 installments monthly
  const installmentAmount = Math.round(totalAmount / 3);
  const lastInstallmentAmount = totalAmount - (installmentAmount * 2);

  for (let i = 1; i <= 3; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    const amt = i === durationMonths ? lastInstallmentAmount : installmentAmount;
    await Fee.create({
      studentId: student._id,
      amount: amt,
      term: `Month ${i} Installment`,
      dueDate,
      status: i === 1 ? 'paid' : 'pending',
      paymentDate: i === 1 ? new Date() : null,
      transactionId: i === 1 ? genTxn('TXN-INIT') : '',
      paymentMethod: i === 1 ? paymentMethod : ''
    });
  }

  return { applicationNumber: appNo, studentId: studentPublicId, studentDbId: String(student._id), receipt };
}
