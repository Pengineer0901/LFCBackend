import mongoose from 'mongoose';

const idpSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
    trim: true
  },
  assessmentPeriod: {
    type: String,
    required: true,
    trim: true
  },
  jobRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRole',
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['job_role_sort', 'individual_sort'],
    default: 'job_role_sort'
  },
  competencies: [{
    competencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

idpSchema.index({ jobRoleId: 1 });
idpSchema.index({ userId: 1 });
idpSchema.index({ createdBy: 1 });

export default mongoose.model('IDP', idpSchema);
