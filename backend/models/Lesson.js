import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a lesson title']
  },
  description: {
    type: String,
    default: ''
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  videoUrl: {
    type: String,
    default: ''
  },
  videoDuration: {
    type: Number, // in seconds
    default: 0
  },
  videoThumbnail: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  attachments: [{
    name: String,
    url: String,
    type: String, // pdf, doc, ppt, etc.
    size: Number
  }],
  order: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFree: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
LessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Lesson', LessonSchema);