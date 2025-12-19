import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    enum: ['csv', 'json'],  // ✅ Strictly CSV/JSON only for fine-tuning
    required: true,
    lowercase: true
  },

  // 🔥 FINE-TUNING DATASET ANALYSIS (from your router code)
  datasetAnalysis: {
    rowCount: {
      type: Number,
      default: 0
    },
    sampleRecords: {
      type: Number,
      default: 0
    },
    valid: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    prompt: {
      type: String,
      default: ''
    },
    samplePreview: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },

  fineTuningJobId: {
    type: mongoose.Schema.Types.ObjectId,  // Remove or make optional
    ref: 'FineTuningJob',
    default: null  // ✅ Safe default
  },

  fineTuningStatus: {
    type: String,
    enum: ['pending', 'running', 'succeeded', 'failed', 'cancelled', null],
    default: null
  },

  // Processing status
  status: {
    type: String,
    enum: [
      'uploaded',
      'processing',
      'analyzing_dataset',
      'fine_tuning_ready',  // ✅ New: dataset processed, ready to train
      'fine_tuning_in_progress',
      'fine_tuning_completed',
      'processing_failed',
      'failed',
      'validating'
    ],
    default: 'uploaded'
  },

  purpose: {
    type: String,
    enum: ['fine-tuning'],  // ✅ Only fine-tuning for CSV/JSON
    default: 'fine-tuning',
    required: true
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedByName: {  // Denormalized for admin UI
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 🔥 Optimized indexes for fine-tuning workflow
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ purpose: 1 });
documentSchema.index({ fileType: 1 });
documentSchema.index({ 'fineTuningJobId': 1 });
documentSchema.index({ status: 1, purpose: 1 });
documentSchema.index({ uploadedBy: 1, purpose: 1 });
documentSchema.index({ 'datasetAnalysis.readyForTraining': 1 }); // Quick find ready datasets

// Virtuals for admin UI
documentSchema.virtual('isFineTuningReady').get(function () {
  return this.status === 'fine_tuning_ready' && this.datasetAnalysis.readyForTraining;
});

documentSchema.virtual('isUsedInFineTuning').get(function () {
  return !!this.fineTuningJobId;
});

documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Document', documentSchema);
