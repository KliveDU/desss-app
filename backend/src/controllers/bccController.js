// backend/src/controllers/bccController.js
const db = require('../config/desss_db');

// ✅ Format BCC assignment from exam_slots + slot_assignments
const formatBcc = (row) => ({
  id: row.id,
  date: row.exam_date instanceof Date 
    ? row.exam_date.toISOString().split('T')[0]
    : String(row.exam_date),
  startTime: row.start_time,
  endTime: row.end_time,
  credits: parseFloat(row.credits),
  examType: row.exam_type,
  proctorId: row.faculty_id,
  proctor: {
    id: row.faculty_id,
    name: row.proctor_name,
    username: row.proctor_username
  }
});

// ✅ Get all BCC assignments (is_bcc = true)
const getAllBcc = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.id, s.exam_date, s.exam_type, s.start_time, s.end_time, s.credits,
        sa.faculty_id,
        u.name as proctor_name,
        u.username as proctor_username
      FROM exam_slots s
      INNER JOIN slot_assignments sa ON s.id = sa.slot_id
      INNER JOIN users u ON sa.faculty_id = u.id
      WHERE sa.is_bcc = true
      ORDER BY s.exam_date, s.start_time
    `);
    res.json(result.rows.map(formatBcc));
  } catch (error) {
    console.error('Get BCC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const assignBccToSlot = async (req, res) => {
  const { examDate, startTime, endTime, proctorId } = req.body;

  try {
    // Find the exam slot
    const slotRes = await db.query(
      `SELECT id FROM exam_slots 
       WHERE exam_date = $1 AND start_time = $2 AND end_time = $3`,
      [examDate, startTime, endTime]
    );

    if (slotRes.rows.length === 0) {
      return res.status(404).json({ 
        message: `No exam slot found for ${examDate} ${startTime}-${endTime}` 
      });
    }

    const slotId = slotRes.rows[0].id;

    // Check if already assigned as BCC
    const existing = await db.query(
      'SELECT 1 FROM slot_assignments WHERE slot_id = $1 AND faculty_id = $2 AND is_bcc = true',
      [slotId, proctorId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'BCC assignment already exists' });
    }

    // ✅ Assign as BCC
    await db.query(
      'INSERT INTO slot_assignments (slot_id, faculty_id, is_bcc) VALUES ($1, $2, true)',
      [slotId, proctorId]
    );

    res.json({ success: true, message: 'BCC assigned successfully' });
  } catch (error) {
    console.error('Assign BCC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Delete BCC assignment
const deleteBcc = async (req, res) => {
  const { id } = req.params;
  try {
    // Find the slot assignment
    const assignment = await db.query(
      'SELECT id FROM slot_assignments WHERE id = $1 AND is_bcc = true',
      [id]
    );
    if (assignment.rows.length === 0) {
      return res.status(404).json({ message: 'BCC assignment not found' });
    }

    await db.query('DELETE FROM slot_assignments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete BCC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Bulk delete BCC assignments
const bulkDeleteBcc = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'BCC assignment IDs required' });
  }

  try {
    await db.query(
      'DELETE FROM slot_assignments WHERE id = ANY($1) AND is_bcc = true',
      [ids]
    );
    res.json({ success: true, message: `${ids.length} BCC assignments deleted` });
  } catch (error) {
    console.error('Bulk delete BCC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllBcc,
  assignBccToSlot, 
  deleteBcc,
  bulkDeleteBcc
};