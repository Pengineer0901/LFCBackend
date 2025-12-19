import mongoose from 'mongoose';
import crypto from 'crypto';

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  prefix: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

apiKeySchema.statics.generateKey = function() {
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = key.substring(0, 8);
  return { key, prefix };
};

apiKeySchema.index({ key: 1 });
apiKeySchema.index({ createdBy: 1 });

export default mongoose.model('APIKey', apiKeySchema);
