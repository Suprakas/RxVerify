const mongoose = require('mongoose');
const { STATUS } = require('../constants');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    dosage: { type: String, trim: true, maxlength: 80, default: '' },
    quantity: { type: Number, min: 1, max: 1000, default: 1 },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiMedicineSchema = new mongoose.Schema(
  {
    name: String,
    dosage: String,
    quantity: Number,
    confidence: { type: String, enum: ['high', 'medium', 'low'] },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientName: { type: String, required: true, trim: true, maxlength: 80 },
    doctorName: { type: String, required: true, trim: true, maxlength: 80 },
    issueDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    medicines: { type: [medicineSchema], validate: (v) => v.length > 0 && v.length <= 20 },

    // Every upload is kept; the last one is the current file.
    files: { type: [fileSchema], default: [] },

    status: { type: String, enum: Object.values(STATUS), default: STATUS.SUBMITTED, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lockedUntil: { type: Date, default: null },
    decisionReason: { type: String, trim: true, maxlength: 500, default: '' },
    decidedAt: { type: Date, default: null },

    aiExtraction: {
      status: { type: String, enum: ['disabled', 'pending', 'done', 'failed'], default: 'disabled' },
      medicines: { type: [aiMedicineSchema], default: [] },
      model: String,
      error: String,
      extractedAt: Date,
    },
  },
  { timestamps: true }
);

// The review queue: filter by status, oldest first.
prescriptionSchema.index({ status: 1, createdAt: 1 });
// The lock sweeper looks for expired locks.
prescriptionSchema.index({ status: 1, lockedUntil: 1 });

prescriptionSchema.virtual('currentFile').get(function currentFile() {
  return this.files.length ? this.files[this.files.length - 1] : null;
});

module.exports = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);
