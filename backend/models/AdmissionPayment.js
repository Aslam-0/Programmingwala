import mongoose from 'mongoose';

const AdmissionPaymentSchema = new mongoose.Schema({
  // Internal reference number for this payment attempt (e.g. ADM-PAY-<ts>)
  paymentRef: {
    type: String,
    required: true,
    unique: true
  },
  // Snapshot of the admission details captured at payment time.
  studentDetails: {
    name: { type: String, required: true },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },
    class: { type: String, default: '' }
  },
  parentDetails: {
    fatherName: { type: String, default: '' },
    motherName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  method: {
    type: String,
    enum: ['cash', 'upi'],
    required: true
  },
  // School UPI VPA used to generate the deep link / QR (upi method only).
  upiId: {
    type: String,
    default: ''
  },
  // Transaction reference entered by the parent/admin (UTR / Txn ID) when paying via UPI.
  txnRef: {
    type: String,
    default: ''
  },
  // Holds the uploaded student photo between payment-create and verify (UPI flow).
  pendingPhoto: {
    data: { type: Buffer },
    contentType: { type: String },
    filename: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  // Populated once the admission is auto-created after a verified payment.
  applicationNumber: {
    type: String,
    default: ''
  },
  studentDbId: {
    type: String,
    default: ''
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  paymentPlan: {
    type: String,
    enum: ['installments', 'full'],
    default: 'installments'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AdmissionPayment', AdmissionPaymentSchema);
