import mongoose from 'mongoose';

const aiLogSchema = new mongoose.Schema({
  requestType: {
    type: String,
    required: true,
    enum: ['competency', 'idp_suggestion', 'other','playground_test','competency_detail_internal','competency_detail_api']
  },
  inputData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  outputData: {
    type: mongoose.Schema.Types.Mixed
  },
  modelUsed: {
    type: String
  },
  tokensUsed: {
    type: Number
  },
  responseTime: {
    type: Number
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

aiLogSchema.index({ userId: 1, createdAt: -1 });
aiLogSchema.index({ requestType: 1 });

export default mongoose.model('AILog', aiLogSchema);
