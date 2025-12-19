import mongoose from 'mongoose';

const competencySchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  effectivelyUsed: {
    type: String,
    trim: true
  },
  underused: {
    type: String,
    trim: true
  },
  overused: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  organization: {
    type: String,
    trim: true
  },
  jobRole: {
    type: String,
    trim: true
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

competencySchema.index({ categoryId: 1 });
competencySchema.index({ createdBy: 1 });

export default mongoose.model('Competency', competencySchema);
