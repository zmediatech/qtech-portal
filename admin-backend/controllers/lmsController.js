const mongoose = require('mongoose');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Student = require('../models/Student');

function resolveId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

function hasAccessToCourse(user, course) {
  if (!user || !course) return false;
  if (user.role === 'admin') return true;
  const teacherId = resolveId(course.teacher);
  const courseClasses = (course.classIds || []).map(resolveId).filter(Boolean);
  const courseSubjects = (course.subjectIds || []).map(resolveId).filter(Boolean);

  const classIds = new Set((user.assignedClasses || []).map(String));
  const subjectIds = new Set((user.assignedSubjects || []).map(String));

  if (user.role === 'teacher') {
    if (course.scopeType === 'general') return teacherId === String(user._id);
    if (teacherId === String(user._id)) return true;
    if (course.scopeType === 'classwise') return courseClasses.some((id) => classIds.has(id));
    if (course.scopeType === 'subjectwise') return courseSubjects.some((id) => subjectIds.has(id));
    return courseClasses.some((id) => classIds.has(id)) || courseSubjects.some((id) => subjectIds.has(id));
  }

  if (user.role === 'student') {
    const studentClass = user.studentClass ? String(user.studentClass) : null;
    if (!studentClass) return false;
    if (course.scopeType === 'general') return true;
    if (course.scopeType === 'classwise') return courseClasses.includes(studentClass);
    return courseClasses.includes(studentClass) || courseSubjects.length > 0;
  }

  if (user.role === 'parent') {
    return true;
  }

  return false;
}

async function buildAudienceFilter(user) {
  if (!user) return {};
  if (user.role === 'admin') return {};
  if (user.role === 'teacher') {
    return {
      $or: [
        { teacher: user._id },
        ...(user.assignedClasses?.length ? [{ classIds: { $in: user.assignedClasses } }] : []),
        ...(user.assignedSubjects?.length ? [{ subjectIds: { $in: user.assignedSubjects } }] : []),
      ],
    };
  }
  if (user.role === 'student') {
    return {
      $or: [
        { scopeType: 'general' },
        ...(user.studentClass ? [{ classIds: user.studentClass }] : []),
      ],
    };
  }
  if (user.role === 'parent') {
    return { $or: [{ scopeType: 'general' }] };
  }
  return {};
}

async function getMySchedule(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const filter = {};
    if (user.role === 'teacher') {
      const classIds = user.assignedClasses || [];
      const subjectIds = user.assignedSubjects || [];
      if (classIds.length) filter.class = { $in: classIds };
      if (subjectIds.length) filter.subject = { $in: subjectIds };
    } else if (user.role === 'student') {
      if (user.studentClass) filter.class = user.studentClass;
    } else if (user.role === 'parent') {
      const studentIds = user.parentStudentIds || [];
      if (studentIds.length) {
        const students = await Student.find({ _id: { $in: studentIds } }).select('class').lean();
        const classIds = students.map((s) => s.class).filter(Boolean);
        if (classIds.length) filter.class = { $in: classIds };
      }
    }

    const slots = await mongoose.model('TimetableSlot')
      .find(filter)
      .sort({ day: 1, startTime: 1 })
      .populate('class', 'name')
      .populate('subject', 'name code')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          role: user.role,
          name: user.name,
        },
        slots,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function listCourses(req, res) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const filter = await buildAudienceFilter(user);
    const courses = await Course.find(filter)
      .sort({ createdAt: -1 })
      .populate('teacher', 'name email role')
      .populate('classIds', 'name')
      .populate('subjectIds', 'name code')
      .lean();

    return res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function createCourse(req, res) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!['admin', 'teacher'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Only admins and teachers can create courses' });
    }

    const {
      title,
      description,
      scopeType = 'general',
      classIds = [],
      subjectIds = [],
      status = 'published',
      coverImageUrl = '',
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const course = await Course.create({
      title: String(title).trim(),
      description: String(description || '').trim(),
      teacher: user._id,
      scopeType,
      classIds: Array.isArray(classIds) ? classIds : [],
      subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
      status,
      coverImageUrl,
    });

    const populated = await Course.findById(course._id)
      .populate('teacher', 'name email role')
      .populate('classIds', 'name')
      .populate('subjectIds', 'name code')
      .lean();

    return res.status(201).json({ success: true, message: 'Course created', data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function updateCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'admin' && resolveId(course.teacher) !== String(user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this course' });
    }

    const payload = {};
    ['title', 'description', 'scopeType', 'status', 'coverImageUrl'].forEach((key) => {
      if (typeof req.body[key] === 'string') payload[key] = req.body[key].trim();
    });
    if (Array.isArray(req.body.classIds)) payload.classIds = req.body.classIds;
    if (Array.isArray(req.body.subjectIds)) payload.subjectIds = req.body.subjectIds;

    const updated = await Course.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
      .populate('teacher', 'name email role')
      .populate('classIds', 'name')
      .populate('subjectIds', 'name code')
      .lean();

    return res.status(200).json({ success: true, message: 'Course updated', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function deleteCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'admin' && resolveId(course.teacher) !== String(user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this course' });
    }

    await Lecture.deleteMany({ course: course._id });
    await Enrollment.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(course._id);

    return res.status(200).json({ success: true, message: 'Course deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function getCourseById(req, res) {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name email role')
      .populate('classIds', 'name')
      .populate('subjectIds', 'name code')
      .lean();

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const user = await User.findById(req.user.id).lean();
    if (!user || !hasAccessToCourse(user, course)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const lectures = await Lecture.find({ course: course._id }).sort({ order: 1, createdAt: 1 }).lean();
    const enrollmentCount = await Enrollment.countDocuments({ course: course._id });

    return res.status(200).json({
      success: true,
      data: {
        ...course,
        lectures,
        enrollmentCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function addLecture(req, res) {
  try {
    const user = await User.findById(req.user.id).lean();
    const course = await Course.findById(req.params.courseId).lean();
    if (!user || !course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    if (user.role !== 'admin' && resolveId(course.teacher) !== String(user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to add lectures to this course' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const file = req.file;
    const lecture = await Lecture.create({
      course: course._id,
      title,
      description: String(req.body.description || '').trim(),
      order: Number(req.body.order || 1),
      resourceUrl: file ? `/uploads/lectures/${file.filename}` : String(req.body.resourceUrl || '').trim(),
      fileName: file?.originalname || String(req.body.fileName || '').trim(),
      mimeType: file?.mimetype || String(req.body.mimeType || '').trim(),
      fileSize: file?.size || Number(req.body.fileSize || 0),
      uploadedBy: user._id,
    });

    return res.status(201).json({ success: true, message: 'Lecture added', data: lecture });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function enrollInCourse(req, res) {
  try {
    const user = await User.findById(req.user.id);
    const course = await Course.findById(req.params.courseId);
    if (!user || !course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!hasAccessToCourse(user, course)) {
      return res.status(403).json({ success: false, message: 'Course is not available to this user' });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { course: course._id, user: user._id },
      {
        course: course._id,
        user: user._id,
        enrolledBy: user._id,
        source: user.role === 'admin' ? 'manual' : 'self',
        status: 'active',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, message: 'Enrolled successfully', data: enrollment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function getMyEnrollments(req, res) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const enrollments = await Enrollment.find({ user: user._id })
      .populate({
        path: 'course',
        populate: [
          { path: 'teacher', select: 'name email role' },
          { path: 'classIds', select: 'name' },
          { path: 'subjectIds', select: 'name code' },
        ],
      })
      .lean();

    return res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

async function listLectureByCourse(req, res) {
  try {
    const user = await User.findById(req.user.id).lean();
    const course = await Course.findById(req.params.courseId).lean();
    if (!user || !course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!hasAccessToCourse(user, course)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const lectures = await Lecture.find({ course: course._id }).sort({ order: 1, createdAt: 1 }).lean();
    return res.status(200).json({ success: true, count: lectures.length, data: lectures });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports = {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  addLecture,
  enrollInCourse,
  getMyEnrollments,
  listLectureByCourse,
  getMySchedule,
};
