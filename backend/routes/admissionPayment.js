import express from 'express';
import AdmissionPayment from '../models/AdmissionPayment.js';
import { protect } from '../middleware/auth.js';
import mockStore from '../config/mockStore.js';
import { createAdmissionFromPayment } from '../utils/admissionService.js';
import { buildUpiDeepLink, buildUpiQrDataUrl, UPI_PAYEE_VPA } from '../utils/upi.js';
import { uploadAdmissions } from '../middleware/upload.js';
import Course from '../models/Course.js';

const router = express.Router();

const PAYMENT_COLLECTION = 'admissionPayments';

function genPaymentRef() {
  return `ADM-PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Local mock-store helpers operate on a fresh in-memory collection.
async function mockFindById(id) {
  const list = mockStore[PAYMENT_COLLECTION] || [];
  return list.find((p) => String(p._id) === String(id) || String(p.paymentRef) === String(id)) || null;
}
async function mockFindAll() {
  const list = mockStore[PAYMENT_COLLECTION] || [];
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
async function mockCreatePayment(payload) {
  if (!mockStore[PAYMENT_COLLECTION]) mockStore[PAYMENT_COLLECTION] = [];
  const record = await mockStore.create(PAYMENT_COLLECTION, payload);
  return record;
}
async function mockUpdatePayment(id, updates) {
  const item = await mockFindById(id);
  if (!item) return null;
  Object.assign(item, updates);
  return item;
}

// @desc    Create an admission payment attempt (cash or upi)
// @route   POST /api/admission-payment/create
// @access  Public (admin desk / public apply flow)
// Accepts multipart/form-data so the student photo can travel with the request.
router.post('/create', uploadAdmissions.single('photo'), async (req, res) => {
  // Fields arrive as JSON strings under multipart — parse them safely.
  const parseObj = (v, fallback = {}) => {
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
    return v || fallback;
  };
  const studentDetails = parseObj(req.body.studentDetails);
  const parentDetails = parseObj(req.body.parentDetails);
  const { amount, method, txnRef, paymentPlan = 'installments' } = req.body;
  const photoFile = req.file || null;

  // Reconstruct a multer-like object from a stored pendingPhoto (not used at create,
  // kept for symmetry) — here we just pass the live file through.
  const photoForService = photoFile
    ? { buffer: photoFile.buffer, mimetype: photoFile.mimetype, originalname: photoFile.originalname }
    : null;

  if (!studentDetails.name || !parentDetails.email) {
    return res.status(400).json({ success: false, message: 'Student name and parent email are required.' });
  }
  if (!['cash', 'upi'].includes(method)) {
    return res.status(400).json({ success: false, message: "Payment method must be 'cash' or 'upi'." });
  }

  const paymentRef = genPaymentRef();
  let amountNum = Number(amount) || 0;


  // Cash is collected at the desk → instantly verified.
  const baseStatus = method === 'cash' ? 'verified' : 'pending';

  const payload = {
    paymentRef,
    studentDetails,
    parentDetails,
    amount: amountNum,
    method,
    upiId: method === 'upi' ? UPI_PAYEE_VPA : '',
    txnRef: txnRef || '',
    status: baseStatus,
    verifiedAt: method === 'cash' ? new Date() : null,
    paymentPlan
  };
  // For UPI, stash the uploaded photo so it survives until verification.
  if (method === 'upi' && photoFile) {
    payload.pendingPhoto = {
      data: mockStore.isMock ? photoFile.buffer.toString('base64') : photoFile.buffer,
      contentType: photoFile.mimetype,
      filename: photoFile.originalname
    };
  }

  try {
    let record;
    if (mockStore.isMock) {
      record = await mockCreatePayment(payload);
    } else {
      record = await AdmissionPayment.create(payload);
    }

    let upiDeepLink = '';
    let upiQrDataUrl = '';
    if (method === 'upi') {
      upiDeepLink = buildUpiDeepLink({ amount: amountNum, txnRef: paymentRef, note: `Admission Fee - ${studentDetails.name}` });
      upiQrDataUrl = await buildUpiQrDataUrl(upiDeepLink);
    }

    // For cash, auto-register the student immediately (payment is already verified).
    if (method === 'cash') {
      try {
        const result = await createAdmissionFromPayment({
          studentDetails,
          parentDetails,
          paymentMethod: 'Cash',
          admissionFee: amountNum,
          photo: photoForService,
          paymentPlan: payload.paymentPlan
        });
        const update = {
          status: 'verified',
          applicationNumber: result.applicationNumber,
          studentDbId: result.studentDbId,
          verifiedAt: new Date()
        };
        if (mockStore.isMock) {
          await mockUpdatePayment(record._id, update);
          record = { ...record, ...update };
        } else {
          record = await AdmissionPayment.findByIdAndUpdate(record._id, update, { new: true });
        }
        return res.status(201).json({
          success: true,
          data: record,
          applicationNumber: result.applicationNumber,
          studentId: result.studentId,
          receipt: result.receipt,
          message: 'Cash payment collected. Student registered automatically.'
        });
      } catch (err) {
        console.error('Auto-admission (cash) failed:', err);
        return res.status(500).json({ success: false, message: 'Payment recorded but student registration failed: ' + err.message });
      }
    }

    res.status(201).json({
      success: true,
      data: record,
      upiDeepLink,
      upiQrDataUrl,
      message: 'UPI payment initiated. Scan the QR and pay, then verify.'
    });
  } catch (error) {
    console.error('Create admission payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Verify a UPI payment → auto-save the student
// @route   POST /api/admission-payment/verify/:id
// @access  Public (admin confirms at the desk; could be gated later)
router.post('/verify/:id', async (req, res) => {
  const { txnRef } = req.body;
  try {
    let payment;
    if (mockStore.isMock) {
      payment = await mockFindById(req.params.id);
    } else {
      payment = await AdmissionPayment.findById(req.params.id);
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment attempt not found.' });
    }
    if (payment.status === 'verified') {
      return res.json({ success: true, data: payment, message: 'Payment already verified.' });
    }

    // Reconstruct the uploaded photo (if any) from the stashed pendingPhoto.
    let photoForService = null;
    if (payment.pendingPhoto && payment.pendingPhoto.data) {
      const buf = Buffer.isBuffer(payment.pendingPhoto.data)
        ? payment.pendingPhoto.data
        : Buffer.from(payment.pendingPhoto.data, 'base64');
      photoForService = {
        buffer: buf,
        mimetype: payment.pendingPhoto.contentType || 'image/png',
        originalname: payment.pendingPhoto.filename || 'photo'
      };
    }

    // Auto-register the student once payment is confirmed.
    const result = await createAdmissionFromPayment({
      studentDetails: payment.studentDetails,
      parentDetails: payment.parentDetails,
      paymentMethod: 'UPI',
      admissionFee: payment.amount,
      photo: photoForService,
      paymentPlan: payment.paymentPlan || 'installments'
    });

    const update = {
      status: 'verified',
      txnRef: txnRef || payment.txnRef || '',
      applicationNumber: result.applicationNumber,
      studentDbId: result.studentDbId,
      verifiedAt: new Date()
    };

    if (mockStore.isMock) {
      await mockUpdatePayment(payment._id, update);
      payment = { ...payment, ...update };
    } else {
      payment = await AdmissionPayment.findByIdAndUpdate(payment._id, update, { new: true });
    }

    res.json({
      success: true,
      data: payment,
      applicationNumber: result.applicationNumber,
      studentId: result.studentId,
      receipt: result.receipt,
      message: 'Payment verified. Student registered automatically.'
    });
  } catch (error) {
    console.error('Verify admission payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Poll payment status (used by the frontend to auto-detect completion)
// @route   GET /api/admission-payment/status/:id
// @access  Public
router.get('/status/:id', async (req, res) => {
  try {
    let payment;
    if (mockStore.isMock) {
      payment = await mockFindById(req.params.id);
    } else {
      payment = await AdmissionPayment.findById(req.params.id);
    }
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment attempt not found.' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    List all admission payment attempts (admin overview)
// @route   GET /api/admission-payment
// @access  Private (admin)
router.get('/', protect, async (req, res) => {
  try {
    let list;
    if (mockStore.isMock) {
      list = await mockFindAll();
    } else {
      list = await AdmissionPayment.find().sort({ createdAt: -1 });
    }
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
