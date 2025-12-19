import mongoose from 'mongoose';

const aiConfigurationSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    default: 'openai'
  },
  apiKey: {
    type: String,
    required: true
  },
  modelName: {
    type: String,
    required: true,
    default: 'gpt-4'
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2
  },
  maxTokens: {
    type: Number,
    default: 1500
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

aiConfigurationSchema.index({ createdBy: 1, isActive: 1 });

export default mongoose.model('AIConfiguration', aiConfigurationSchema);
