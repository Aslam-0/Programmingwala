import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import mockStore from '../config/mockStore.js';
import Course from '../models/Course.js';
import CoursePayment from '../models/CoursePayment.js';
import Fee from '../models/Fee.js';
import Receipt from '../models/Receipt.js';
import AdmissionPayment from '../models/AdmissionPayment.js';
import { createAdmissionFromPayment } from '../utils/admissionService.js';

dotenv.config();

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_ENABLED = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const PAYMENT_COLLECTION = 'coursePayments';

function genPaymentRef() {
  return `CRS-PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function inrToPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function getRazorpayAuthHeader() {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

function normalizeCoursePaymentDetails(body) {
  const studentDetails = body.studentDetails || {};
  const parentDetails = body.parentDetails || {};

  return {
    studentDetails: {
      name: studentDetails.name || body.studentName || '',
      dateOfBirth: studentDetails.dateOfBirth || body.dob || '',
      gender: studentDetails.gender || body.gender || ''
    },
    parentDetails: {
      fatherName: parentDetails.fatherName || body.fatherName || '',
      motherName: parentDetails.motherName || body.motherName || '',
      email: parentDetails.email || body.email || '',
      phone: parentDetails.phone || body.phone || '',
      address: parentDetails.address || body.address || ''
    }
  };
}

async function resolveCourse(courseId, courseTitle, amount) {
  let coursePrice = Number(amount) || 0;
  let resolvedTitle = courseTitle || 'Course';

  if (mockStore.isMock) {
    const course = await mockStore.findById('courses', courseId);
    if (course && course.isActive !== false) {
      coursePrice = course.price !== undefined ? Number(course.price) : coursePrice;
      resolvedTitle = course.title || resolvedTitle;
    }
    return { coursePrice, resolvedTitle };
  }

  if (mongoose.isValidObjectId(courseId)) {
    const course = await Course.findOne({ _id: courseId, isActive: true });
    if (course) {
      coursePrice = course.price !== undefined ? Number(course.price) : coursePrice;
      resolvedTitle = course.title || resolvedTitle;
    }
  }

  return { coursePrice, resolvedTitle };
}

async function enrollStudentInCourse(userId, courseId, paymentId) {
  if (!userId || !courseId) return;
  try {
    if (mockStore.isMock) {
      if (!Array.isArray(mockStore.enrollments)) {
        mockStore.enrollments = [];
      }
      // Check if already enrolled in mock mode
      const exists = mockStore.enrollments.some(e => String(e.user) === String(userId) && String(e.course) === String(courseId));
      if (!exists) {
        await mockStore.create('enrollments', {
          user: String(userId),
          course: String(courseId),
          paymentStatus: 'paid',
          status: 'active',
          paymentId: paymentId || '',
          enrolledAt: new Date()
        });
        console.log(`Mock: Enrolled user ${userId} in course ${courseId}`);
      }
      return;
    }

    const CourseEnrollment = (await import('../models/CourseEnrollment.js')).default;
    const Course = (await import('../models/Course.js')).default;

    const existing = await CourseEnrollment.findOne({ user: userId, course: courseId });
    if (!existing) {
      await CourseEnrollment.create({
        user: userId,
        course: courseId,
        paymentStatus: 'paid',
        status: 'active',
        paymentId: paymentId || '',
        enrolledAt: new Date()
      });
      // Increment totalEnrollments
      await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } });
      console.log(`MongoDB: Enrolled user ${userId} in course ${courseId}`);
    } else if (existing.paymentStatus !== 'paid') {
      existing.paymentStatus = 'paid';
      existing.paymentId = paymentId || '';
      await existing.save();
      console.log(`MongoDB: Updated payment status to paid for user ${userId} in course ${courseId}`);
    }
  } catch (error) {
    console.error('Error enrolling student after payment:', error);
  }
}

async function createCoursePaymentRecord(payload) {
  if (mockStore.isMock) {
    if (!Array.isArray(mockStore[PAYMENT_COLLECTION])) {
      mockStore[PAYMENT_COLLECTION] = [];
    }
    return mockStore.create(PAYMENT_COLLECTION, payload);
  }
  return CoursePayment.create(payload);
}

async function updateCoursePaymentByOrder(razorpayOrderId, updates) {
  if (!razorpayOrderId) return null;

  if (mockStore.isMock) {
    const list = mockStore[PAYMENT_COLLECTION] || [];
    const item = list.find((payment) => payment.razorpayOrderId === razorpayOrderId);
    if (!item) return null;
    Object.assign(item, updates, { updatedAt: new Date() });
    return item;
  }

  return CoursePayment.findOneAndUpdate(
    { razorpayOrderId },
    { ...updates, updatedAt: new Date() },
    { new: true }
  );
}

/**
 * Create a Razorpay order for a course purchase.
 * Body: { courseId, courseTitle, amount, studentName, email, phone }
 * Razorpay order amounts are in paise.
 */
router.post('/create-order', protect, async (req, res) => {
  try {
    const { courseId, courseTitle, amount } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const { coursePrice, resolvedTitle } = await resolveCourse(courseId, courseTitle, amount);
    const { studentDetails, parentDetails } = normalizeCoursePaymentDetails(req.body);

    if (coursePrice <= 0) {
      return res.status(400).json({ success: false, message: 'A positive amount/course price is required.' });
    }

    const paymentPayload = {
      paymentRef: genPaymentRef(),
      userId: String(req.user?._id || ''),
      courseId: String(courseId),
      courseTitle: resolvedTitle,
      amount: coursePrice,
      studentDetails,
      parentDetails,
      method: 'razorpay',
      status: RAZORPAY_ENABLED ? 'created' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // If Razorpay keys are missing, fall back to a manual/pending payment record
    // so the flow still works end-to-end without keys.
    if (!RAZORPAY_ENABLED) {
      const record = await createCoursePaymentRecord(paymentPayload);

      return res.status(200).json({
        success: true,
        mode: 'mock',
        message: 'Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable live checkout. Payment recorded as pending.',
        keyId: null,
        order: null,
        payment: record
      });
    }

    // Create the order via Razorpay REST API
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getRazorpayAuthHeader()
      },
      body: JSON.stringify({
        amount: inrToPaise(coursePrice),
        currency: 'INR',
        receipt: `course_${courseId}_${Date.now()}`,
        notes: {
          type: 'course',
          courseId: String(courseId),
          courseTitle: String(resolvedTitle || '').slice(0, 250),
          studentName: String(studentDetails.name || ''),
          email: String(parentDetails.email || ''),
          userId: String(req.user?._id || '')
        }
      })
    });

    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(400).json({ success: false, message: order?.error?.description || 'Failed to create Razorpay order', raw: order });
    }

    const record = await createCoursePaymentRecord({
      ...paymentPayload,
      razorpayOrderId: order.id
    });

    res.status(201).json({
      success: true,
      mode: 'live',
      keyId: RAZORPAY_KEY_ID,
      order,
      payment: record
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Verify a Razorpay payment signature after checkout completes.
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMeta }
 * On valid signature, mark the payment as captured/paid.
 */
router.post('/verify', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMeta } = req.body;

    if (!RAZORPAY_ENABLED) {
      // Without keys we can't verify signatures — mark the manual record as paid.
      return res.json({ success: true, mode: 'mock', message: 'Verified in mock mode (no Razorpay keys configured).' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay payment fields.' });
    }

    // Expected signature = HMAC_SHA256(order_id|payment_id, key_secret)
    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(String(razorpaySignature));
    const signatureMatches = expectedBuffer.length === receivedBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!signatureMatches) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    const safeMeta = {};
    if (paymentMeta?.courseTitle) safeMeta.courseTitle = paymentMeta.courseTitle;
    if (paymentMeta?.studentName) safeMeta['studentDetails.name'] = paymentMeta.studentName;
    if (paymentMeta?.email) safeMeta['parentDetails.email'] = paymentMeta.email;

    const payment = await updateCoursePaymentByOrder(razorpayOrderId, {
      status: 'paid',
      razorpayPaymentId,
      razorpaySignature,
      paidAt: new Date(),
      ...safeMeta
    });

    if (payment) {
      await enrollStudentInCourse(payment.userId, payment.courseId, razorpayPaymentId);
    }

    res.json({
      success: true,
      mode: 'live',
      message: 'Payment verified successfully.',
      payment
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Create a Razorpay order for a student fee invoice payment.
 * Body: { feeId, studentId, amount }
 */
router.post('/create-fee-order', async (req, res) => {
  try {
    const { feeId, studentId, amount } = req.body;
    if (!feeId) return res.status(400).json({ success: false, message: 'feeId is required.' });

    let feeAmount = 0;
    let studentName = '';
    let termName = '';
    
    if (mockStore.isMock) {
      const fee = await mockStore.findById('fees', feeId);
      if (fee) {
        feeAmount = fee.amount;
        termName = fee.term;
        const student = await mockStore.findById('students', fee.studentId);
        if (student) studentName = student.name;
      }
    } else {
      const fee = await Fee.findById(feeId).populate('studentId');
      if (fee) {
        feeAmount = fee.amount;
        termName = fee.term;
        if (fee.studentId) studentName = fee.studentId.name;
      }
    }

    if (feeAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Fee invoice amount must be greater than 0.' });
    }

    if (!RAZORPAY_ENABLED) {
      return res.status(200).json({
        success: true,
        mode: 'mock',
        keyId: null,
        order: null,
        feeId
      });
    }

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount: inrToPaise(feeAmount),
        currency: 'INR',
        receipt: `fee_${feeId}_${Date.now()}`,
        notes: {
          type: 'installment',
          feeId: String(feeId),
          studentId: String(studentId || ''),
          studentName: String(studentName),
          termName: String(termName)
        }
      })
    });

    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(400).json({ success: false, message: order?.error?.description || 'Failed to create Razorpay order' });
    }

    res.status(201).json({
      success: true,
      mode: 'live',
      keyId: RAZORPAY_KEY_ID,
      order,
      feeId
    });
  } catch (error) {
    console.error('Razorpay create-fee-order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Create a Razorpay order for a new student admission application payment.
 * Body: { admissionPaymentId, amount }
 */
router.post('/create-admission-order', protect, async (req, res) => {
  try {
    const { admissionPaymentId, amount } = req.body;
    if (!admissionPaymentId) return res.status(400).json({ success: false, message: 'admissionPaymentId is required.' });

    let payAmount = Number(amount) || 0;
    let studentName = 'student';

    if (mockStore.isMock) {
      const payment = await mockStore.findById('admissionPayments', admissionPaymentId);
      if (payment) {
        payAmount = payment.amount;
        studentName = payment.studentDetails?.name || studentName;
      }
    } else {
      const payment = await AdmissionPayment.findById(admissionPaymentId);
      if (payment) {
        payAmount = payment.amount;
        studentName = payment.studentDetails?.name || studentName;
      }
    }

    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Admission payment amount must be greater than 0.' });
    }

    if (!RAZORPAY_ENABLED) {
      return res.status(200).json({
        success: true,
        mode: 'mock',
        keyId: null,
        order: null,
        admissionPaymentId
      });
    }

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount: inrToPaise(payAmount),
        currency: 'INR',
        receipt: `admission_${admissionPaymentId}_${Date.now()}`,
        notes: {
          type: 'admission',
          admissionPaymentId: String(admissionPaymentId),
          studentName: String(studentName)
        }
      })
    });

    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(400).json({ success: false, message: order?.error?.description || 'Failed to create Razorpay order' });
    }

    res.status(201).json({
      success: true,
      mode: 'live',
      keyId: RAZORPAY_KEY_ID,
      order,
      admissionPaymentId
    });
  } catch (error) {
    console.error('Razorpay create-admission-order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Handle incoming Razorpay Webhook notifications.
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_secret';

    let isValid = false;
    if (signature) {
      const shasum = crypto.createHmac('sha256', secret);
      const rawPayload = req.rawBody ? req.rawBody : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      shasum.update(rawPayload);
      const digest = shasum.digest('hex');
      const digestBuffer = Buffer.from(digest);
      const signatureBuffer = Buffer.from(String(signature));
      isValid = digestBuffer.length === signatureBuffer.length
        && crypto.timingSafeEqual(digestBuffer, signatureBuffer);

      if (!isValid && process.env.NODE_ENV !== 'production') {
        console.warn('Razorpay signature mismatch in development, bypassing signature check.');
        isValid = true;
      }
    } else {
      if (process.env.NODE_ENV !== 'production' || mockStore.isMock) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const eventObj = req.body;
    const eventType = eventObj.event;

    // Acknowledge receipt to Razorpay immediately
    res.status(200).json({ success: true });

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventObj.payload?.payment?.entity || {};
      const orderEntity = eventObj.payload?.order?.entity || {};

      const paymentId = paymentEntity.id || orderEntity.id;
      if (!paymentId) return;
      const method = paymentEntity.method || 'upi';
      const notes = { ...(orderEntity.notes || {}), ...(paymentEntity.notes || {}) };
      const razorpayOrderId = paymentEntity.order_id || orderEntity.id || '';

      const type = notes.type || '';
      const feeId = notes.feeId || '';
      const admissionPaymentId = notes.admissionPaymentId || '';

      console.log(`Razorpay Webhook: Captured payment ${paymentId} for type: ${type}`);

      if (type === 'course') {
        const payment = await updateCoursePaymentByOrder(razorpayOrderId, {
          status: 'paid',
          razorpayPaymentId: paymentId,
          paidAt: new Date()
        });
        if (payment) {
          console.log(`Razorpay: Course payment ${payment.paymentRef || payment._id} marked paid.`);
          await enrollStudentInCourse(payment.userId, payment.courseId, paymentId);
        }
      } else if (type === 'installment' && feeId) {
        if (mockStore.isMock) {
          const feesList = mockStore['fees'] || [];
          const fee = feesList.find(f => String(f._id) === String(feeId));
          if (fee && fee.status !== 'paid') {
            fee.status = 'paid';
            fee.paymentDate = new Date();
            fee.transactionId = paymentId;
            fee.paymentMethod = `Razorpay (${method.toUpperCase()})`;

            await mockStore.create('receipts', {
              feeId: fee._id,
              studentId: fee.studentId,
              receiptNumber: `REC-INST-${Date.now()}`,
              amountPaid: fee.amount,
              paymentMethod: `Razorpay (${method.toUpperCase()})`,
              paymentDate: new Date(),
              transactionId: paymentId
            });
            console.log(`Mock: Updated installment fee ${feeId} and created receipt.`);
          }
        } else {
          const fee = await Fee.findById(feeId);
          if (fee && fee.status !== 'paid') {
            fee.status = 'paid';
            fee.paymentDate = new Date();
            fee.transactionId = paymentId;
            fee.paymentMethod = `Razorpay (${method.toUpperCase()})`;
            await fee.save();

            await Receipt.create({
              feeId: fee._id,
              studentId: fee.studentId,
              receiptNumber: `REC-INST-${Date.now()}`,
              amountPaid: fee.amount,
              paymentMethod: `Razorpay (${method.toUpperCase()})`,
              paymentDate: new Date(),
              transactionId: paymentId
            });
            console.log(`MongoDB: Updated installment fee ${feeId} and created receipt.`);
          }
        }
      } else if (type === 'admission' && admissionPaymentId) {
        if (mockStore.isMock) {
          const paymentsList = mockStore['admissionPayments'] || [];
          const payment = paymentsList.find(p => String(p._id) === String(admissionPaymentId));
          if (payment && payment.status !== 'verified') {
            const result = await createAdmissionFromPayment({
              studentDetails: payment.studentDetails,
              parentDetails: payment.parentDetails,
              paymentMethod: `Razorpay (${method.toUpperCase()})`,
              admissionFee: payment.amount
            });
            payment.status = 'verified';
            payment.applicationNumber = result.applicationNumber;
            payment.studentDbId = result.studentDbId;
            payment.verifiedAt = new Date();
            console.log(`Mock: Webhook verified admission ${admissionPaymentId} and registered student.`);
          }
        } else {
          const payment = await AdmissionPayment.findById(admissionPaymentId);
          if (payment && payment.status !== 'verified') {
            const result = await createAdmissionFromPayment({
              studentDetails: payment.studentDetails,
              parentDetails: payment.parentDetails,
              paymentMethod: `Razorpay (${method.toUpperCase()})`,
              admissionFee: payment.amount
            });
            payment.status = 'verified';
            payment.applicationNumber = result.applicationNumber;
            payment.studentDbId = result.studentDbId;
            payment.verifiedAt = new Date();
            await payment.save();
            console.log(`MongoDB: Webhook verified admission ${admissionPaymentId} and registered student.`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Razorpay Webhook execution error:', error);
  }
});

/**
 * Expose the key id to the frontend (public key only — safe to expose).
 */
router.get('/config', (req, res) => {
  res.json({ success: true, enabled: RAZORPAY_ENABLED, keyId: RAZORPAY_KEY_ID || null });
});

export default router;
