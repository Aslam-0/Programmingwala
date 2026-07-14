import mongoose from 'mongoose';

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a module title']
  },
  description: {
    type: String,
    default: ''
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for lessons belonging to this module
ModuleSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

ModuleSchema.set('toJSON', { virtuals: true });
ModuleSchema.set('toObject', { virtuals: true });

// Update the updatedAt field on save
ModuleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Module', ModuleSchema);