import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not fully configured in the environment.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order
 * Call Razorpay API to create an order
 */
router.post('/create-order', protect, async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Amount is required.' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum amount must be 100 paise.' });
    }

    let rzp;
    try {
      rzp = getRazorpayInstance();
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    const orderOptions = {
      amount: Math.round(numericAmount),
      currency: currency || 'INR',
      receipt: receipt || `receipt_gen_${Date.now()}`
    };

    const order = await rzp.orders.create(orderOptions);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Check if it's an authorization/keys error
    if (error.statusCode === 401 || error.message?.includes('auth') || error.message?.includes('signature')) {
      return res.status(401).json({ success: false, message: 'Razorpay authentication failed.' });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: error.description || error.message || 'Failed to create order with Razorpay.' 
    });
  }
});

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment
 * Verify that the signature matches the order and payment details
 */
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const order_id = req.body.order_id || req.body.razorpay_order_id || req.body.razorpayOrderId;
    const payment_id = req.body.payment_id || req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const signature = req.body.signature || req.body.razorpay_signature || req.body.razorpaySignature;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({ success: false, message: 'Missing required payment verification fields.' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ success: false, message: 'Razorpay secret key is not configured.' });
    }

    // HMAC-SHA256 signature generation: order_id + "|" + payment_id
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(generated_signature);
    const receivedBuffer = Buffer.from(signature);
    
    const signatureMatches = expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!signatureMatches) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.'
    });
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
});

export default router;
