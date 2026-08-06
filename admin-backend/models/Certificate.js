const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true, index: true },
    recipientName: { type: String, required: true, trim: true },
    title: { type: String, default: 'Certificate', trim: true },
    subtitle: { type: String, default: 'OF APPRECIATION', trim: true },
    bodyLine: { type: String, default: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO', trim: true },
    description: { type: String, default: '', trim: true },
    academyName: { type: String, default: 'Academy Name', trim: true },
    companyName: { type: String, default: 'Company Name', trim: true },
    courseName: { type: String, default: '', trim: true },
    studentId: { type: String, default: '', index: true },
    classId: { type: String, default: '', index: true },
    className: { type: String, default: '', trim: true },
    leftSignerName: { type: String, default: 'Principal Name', trim: true },
    leftSignerRole: { type: String, default: 'Principal', trim: true },
    rightSignerName: { type: String, default: 'Director Name', trim: true },
    rightSignerRole: { type: String, default: 'Director', trim: true },
    leftSignatureDataUrl: { type: String, default: '' },
    rightSignatureDataUrl: { type: String, default: '' },
    sealText: { type: String, default: 'AWARD', trim: true },
    issueDate: { type: String, default: '' },
    templateId: { type: String, default: 'classic-maroon-gold', trim: true },
    mode: { type: String, enum: ['upload', 'template'], default: 'template' },
    pdfData: { type: Buffer, default: null },
    verified: { type: Boolean, default: true },
    generatedBy: {
      id: { type: String, default: '' },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
  },
  { timestamps: true, collection: 'certificates' }
);

module.exports = mongoose.models.Certificate || mongoose.model('Certificate', CertificateSchema);
