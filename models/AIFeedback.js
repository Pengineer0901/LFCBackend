import mongoose from 'mongoose';

const aiFeedbackSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  userFeedback: {
    type: String,
    enum: ['accurate', 'partially_accurate', 'inaccurate'],
    required: true
  },
  expectedResponse: {
    type: String
  },
  comments: {
    type: String
  },
  industry: String,
  organization: String,
  jobRole: String,
  competencyName: String,
  modelUsed: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: String,
  userEmail: String
}, {
  timestamps: true
});

aiFeedbackSchema.index({ createdAt: -1 });
aiFeedbackSchema.index({ userFeedback: 1 });
aiFeedbackSchema.index({ userId: 1 });

export default mongoose.model('AIFeedback', aiFeedbackSchema);
