// backend/src/controllers/slotController.js
const db = require('../config/desss_db');

const formatSlot = (row) => ({
  id: row.id,
  date: row.exam_date instanceof Date 
    ? row.exam_date.toISOString().split('T')[0] 
    : String(row.exam_date),
  type: row.is_bcc ? 'BCC' : row.exam_type,
  startTime: row.start_time,
  endTime: row.end_time,
  capacity: row.capacity,
  credits: parseFloat(row.credits),
  appliedCount: parseInt(row.applied_count, 10) || 0,
  appliedFaculty: row.applied_faculty || []
});

const getAllSlots = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.*,
        COUNT(sa.faculty_id) as applied_count,
        COALESCE(ARRAY_AGG(
          CASE WHEN u.id IS NOT NULL THEN 
            json_build_object('id', u.id, 'name', u.name)
          END
        ) FILTER (WHERE u.id IS NOT NULL), '{}') as applied_faculty
      FROM exam_slots s
      LEFT JOIN slot_assignments sa ON s.id = sa.slot_id
      LEFT JOIN users u ON sa.faculty_id = u.id
      GROUP BY s.id
      ORDER BY s.exam_date, s.start_time;
    `;
    const result = await db.query(query);
    res.json(result.rows.map(formatSlot));
  } catch (error) {
    console.error("Get all slots error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMySlots = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const query = `
      SELECT 
        s.id, s.exam_date, s.exam_type, s.start_time, s.end_time, 
        s.capacity, s.credits, 
        COUNT(sa2.faculty_id) as applied_count,
        sa.is_bcc
      FROM exam_slots s
      INNER JOIN slot_assignments sa ON s.id = sa.slot_id
      LEFT JOIN slot_assignments sa2 ON s.id = sa2.slot_id
      WHERE sa.faculty_id = $1
      GROUP BY s.id, sa.is_bcc
      ORDER BY s.exam_date, s.start_time;
    `;
    const result = await db.query(query, [facultyId]);
    res.json(result.rows.map(formatSlot));
  } catch (error) {
    console.error("Get my slots error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const applyToSlot = async (req, res) => {
  const { id } = req.params;
  const facultyId = req.user.id;
  try {
    const slotRes = await db.query('SELECT * FROM exam_slots WHERE id = $1', [id]);
    if (slotRes.rows.length === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    const slot = slotRes.rows[0];

    const tutorRes = await db.query(
      'SELECT mta_load, final_load FROM users WHERE id = $1',
      [facultyId]
    );
    if (tutorRes.rows.length === 0) {
      return res.status(404).json({ message: 'Tutor not found' });
    }
    const { mta_load, final_load } = tutorRes.rows[0];

    const usageRes = await db.query(
      `SELECT 
        COALESCE(SUM(CASE 
          WHEN s.exam_type IN ('Midterm', 'Makeup') THEN s.credits
          WHEN s.exam_type = 'Online' AND s.credits <= 1.5 THEN s.credits
          ELSE 0 END), 0) as mta_used,
        COALESCE(SUM(CASE 
          WHEN s.exam_type = 'Final' THEN s.credits
          WHEN s.exam_type = 'Online' AND s.credits > 1.5 THEN s.credits
          ELSE 0 END), 0) as final_used
       FROM exam_slots s
       INNER JOIN slot_assignments sa ON s.id = sa.slot_id
       WHERE sa.faculty_id = $1`,
      [facultyId]
    );
    const { mta_used, final_used } = usageRes.rows[0];

    let wouldExceed = false;
    if (slot.exam_type === 'Online') {
      if (parseFloat(slot.credits) <= 1.5) {
        wouldExceed = (parseFloat(mta_used) + parseFloat(slot.credits)) > parseFloat(mta_load);
      } else {
        wouldExceed = (parseFloat(final_used) + parseFloat(slot.credits)) > parseFloat(final_load);
      }
    } else if (slot.exam_type === 'Final') {
      wouldExceed = (parseFloat(final_used) + parseFloat(slot.credits)) > parseFloat(final_load);
    } else {
      wouldExceed = (parseFloat(mta_used) + parseFloat(slot.credits)) > parseFloat(mta_load);
    }

    if (wouldExceed) {
      return res.status(400).json({ 
        message: 'Cannot apply: This would exceed your load limit.' 
      });
    }

    // ✅ ONLY BLOCK SAME TIME (not same day)
    const conflictRes = await db.query(
      `SELECT 1 FROM exam_slots s
       INNER JOIN slot_assignments sa ON s.id = sa.slot_id
       WHERE sa.faculty_id = $1
         AND s.exam_date = $2
         AND s.start_time = $3
         AND s.end_time = $4`,
      [facultyId, slot.exam_date, slot.start_time, slot.end_time]
    );
    if (conflictRes.rows.length > 0) {
      return res.status(400).json({ 
        message: 'You are already assigned to a slot at this time.' 
      });
    }

    const countRes = await db.query(
      'SELECT COUNT(*) as applied_count FROM slot_assignments WHERE slot_id = $1 AND is_bcc = false',
      [id]
    );
    if (parseInt(countRes.rows[0].applied_count, 10) >= slot.capacity) {
      return res.status(400).json({ message: 'Slot is full' });
    }

    await db.query(
      'INSERT INTO slot_assignments (slot_id, faculty_id, is_bcc) VALUES ($1, $2, false)',
      [id, facultyId]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Apply to slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const unapplyFromSlot = async (req, res) => {
  const { id } = req.params;
  const facultyId = req.user.id;
  try {
    // ✅ BLOCK unassigning BCC
    const result = await db.query(
      'DELETE FROM slot_assignments WHERE slot_id = $1 AND faculty_id = $2 AND is_bcc = false',
      [id, facultyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Assignment not found or is BCC (cannot unassign)' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Unapply from slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSlot = async (req, res) => {
  const { date, type, startTime, endTime, capacity, credits = 3 } = req.body;

  // ✅ Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  try {
    // ✅ Check for duplicate: include credits as NUMERIC
    const duplicateCheck = await db.query(
      `SELECT 1 FROM exam_slots 
       WHERE exam_date = $1 
         AND exam_type = $2 
         AND start_time = $3 
         AND end_time = $4
         AND credits = $5::NUMERIC`,
      [date, type, startTime, endTime, credits]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: 'A slot with this date, time, type, and credits already exists.' 
      });
    }

    // ✅ Insert new slot
    const result = await db.query(
      `INSERT INTO exam_slots (exam_date, exam_type, start_time, end_time, capacity, credits)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [date, type, startTime, endTime, capacity, credits]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Slot added successfully!',
      slot: formatSlot({ ...result.rows[0], applied_count: 0, applied_faculty: [] }) 
    });
  } catch (error) {
    console.error("Create slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};
const adminAssignToSlot = async (req, res) => {
  const { id } = req.params;
  const { facultyId } = req.body;
  try {
    const existing = await db.query(
      'SELECT 1 FROM slot_assignments WHERE slot_id = $1 AND faculty_id = $2',
      [id, facultyId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Faculty already assigned to this slot' });
    }

    const slotRes = await db.query('SELECT capacity FROM exam_slots WHERE id = $1', [id]);
    if (slotRes.rows.length === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    const countRes = await db.query('SELECT COUNT(*) FROM slot_assignments WHERE slot_id = $1', [id]);
    if (parseInt(countRes.rows[0].count, 10) >= slotRes.rows[0].capacity) {
      return res.status(400).json({ message: 'Slot is full' });
    }

    await db.query(
      'INSERT INTO slot_assignments (slot_id, faculty_id) VALUES ($1, $2)',
      [id, facultyId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Admin assign to slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const adminUnassignFromSlot = async (req, res) => {
  const { id } = req.params;
  const { facultyId } = req.body;
  try {
    const result = await db.query(
      'DELETE FROM slot_assignments WHERE slot_id = $1 AND faculty_id = $2',
      [id, facultyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Admin unassign from slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSlot = async (req, res) => {
  const { id } = req.params;
  const { date, type, startTime, endTime, capacity, credits = 3 } = req.body;
  try {
    const result = await db.query(
      `UPDATE exam_slots 
       SET exam_date = $1, exam_type = $2, start_time = $3, end_time = $4, capacity = $5, credits = $6
       WHERE id = $7 RETURNING *;`,
      [date, type, startTime, endTime, capacity, credits, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.json(formatSlot({ ...result.rows[0], applied_count: 0, applied_faculty: [] }));
  } catch (error) {
    console.error("Update slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSlot = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM exam_slots WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete slot error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkUpsertSlots = async (req, res) => {
  const { slots } = req.body; // Array of { date, type, startTime, endTime, capacity, credits }

  if (!Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ message: 'Slots array is required and must not be empty.' });
  }

  const results = [];
  for (const slot of slots) {
    const { date, type, startTime, endTime, capacity, credits = 3 } = slot;

    try {
      // 🔁 UPSERT: Update if exists, insert if not
      const result = await db.query(
        `INSERT INTO exam_slots (exam_date, exam_type, start_time, end_time, capacity, credits)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (exam_date, exam_type, start_time, end_time, credits)
         DO UPDATE SET capacity = EXCLUDED.capacity
         RETURNING id, exam_date, exam_type, start_time, end_time, capacity, credits;`,
        [date, type, startTime, endTime, capacity, credits]
      );

      results.push(formatSlot({ ...result.rows[0], applied_count: 0, applied_faculty: [] }));
    } catch (error) {
      console.error("Bulk upsert error for slot:", slot, error);
      // Optionally skip invalid slots instead of failing all
    }
  }

  res.status(201).json({ 
    success: true, 
    message: `${results.length} slots processed successfully!`,
    slots: results 
  });
};

const assignAsBcc = async (req, res) => {
  const { id } = req.params;
  const { facultyId } = req.body;
  try {
    await db.query(
      'INSERT INTO slot_assignments (slot_id, faculty_id, is_bcc) VALUES ($1, $2, true)',
      [id, facultyId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllSlots,
  getMySlots,
  createSlot,
  applyToSlot,
  unapplyFromSlot,
  adminAssignToSlot,
  adminUnassignFromSlot,
  updateSlot,
  deleteSlot,
  bulkUpsertSlots,
  assignAsBcc
};