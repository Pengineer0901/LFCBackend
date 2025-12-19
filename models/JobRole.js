import mongoose from 'mongoose';

const jobRoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  assessmentPeriod: {
    type: String,
    required: true,
    trim: true
  },
  competencies: [{
    competencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true
    },
    importance: {
      type: String,
      enum: ['essential', 'nice_to_have', 'not_essential'],
      default: 'nice_to_have'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

jobRoleSchema.index({ createdBy: 1 });

export default mongoose.model('JobRole', jobRoleSchema);
