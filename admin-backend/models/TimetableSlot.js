const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const DaysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const TimetableSlotSchema = new Schema(
  {
    day: { 
      type: String, 
      enum: DaysOfWeek, 
      required: [true, 'Day is required'] 
    },
    startTime: { 
      type: String, 
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format']
    },
    endTime: { 
      type: String, 
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must be in HH:MM format']
    },
    location: {
      room: { type: String, trim: true },
      link: { type: String, trim: true },
    },
    class: { 
      type: Types.ObjectId, 
      ref: 'Class', 
      required: [true, 'Class is required'] 
    },
    subject: { 
      type: Types.ObjectId, 
      ref: 'Subject', 
      required: [true, 'Subject is required'] 
    },
    instructorName: { 
      type: String, 
      trim: true 
    }
  },
  { 
    timestamps: true, 
    collection: 'timetable_slots' 
  }
);

// Validation: endTime > startTime
TimetableSlotSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    if (endH * 60 + endM <= startH * 60 + startM) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Validation: must have at least one location
TimetableSlotSchema.pre('save', function(next) {
  if (!this.location || (!this.location.room && !this.location.link)) {
    return next(new Error('Either room or online meeting link must be provided'));
  }
  next();
});

// Index to prevent duplicates
TimetableSlotSchema.index(
  { class: 1, day: 1, startTime: 1, subject: 1 },
  { unique: true, name: 'unique_slot_index' }
);

// Helpful indexes
TimetableSlotSchema.index({ class: 1, day: 1 });
TimetableSlotSchema.index({ day: 1, startTime: 1 });

module.exports = model('TimetableSlot', TimetableSlotSchema);
