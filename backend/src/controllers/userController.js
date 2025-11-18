const db = require('../config/desss_db');
const bcrypt = require('bcryptjs');

const getLoggedInUser = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, username, role, total_credits, faculty, mta_load, final_load, employment_type
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role.toLowerCase(),
      maxShifts: user.total_credits,
      faculty: user.faculty,
      mtaLoad: user.mta_load,
      finalLoad: user.final_load,
      employmentType: user.employment_type
    };

    res.json(response);
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, username, role, total_credits, faculty, mta_load, final_load, employment_type
      FROM users
      ORDER BY id;
    `);
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      role: row.role.toLowerCase(),
      maxShifts: row.total_credits,
      faculty: row.faculty,
      mtaLoad: row.mta_load,
      finalLoad: row.final_load,
      employmentType: row.employment_type
    }));
    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createUser = async (req, res) => {
  const { name, username, password, role, faculty, mtaLoad, finalLoad, employmentType } = req.body;
  // Parse as floats (or 0 if invalid)
  const mta = mtaLoad ? parseFloat(mtaLoad) : 0;
  const final = finalLoad ? parseFloat(finalLoad) : 0;
  const totalCredits = mta + final;

  try {
    const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserQuery = `
      INSERT INTO users (
        name, username, password, role, total_credits, faculty, mta_load, final_load, employment_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, username, role, total_credits, faculty, mta_load, final_load, employment_type;
    `;

    const result = await db.query(newUserQuery, [
      name, username, hashedPassword, role, totalCredits, faculty, mta, final, employmentType
    ]);

    const newUser = result.rows[0];
    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      role: newUser.role.toLowerCase(),
      maxShifts: parseFloat(newUser.total_credits),
      faculty: newUser.faculty,
      mtaLoad: parseFloat(newUser.mta_load),
      finalLoad: parseFloat(newUser.final_load),
      employmentType: newUser.employment_type
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error while creating tutor' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, username, faculty, mtaLoad, finalLoad, employmentType } = req.body;
  const totalCredits = (mtaLoad || 0) + (finalLoad || 0);

  try {
    const userExists = await db.query('SELECT * FROM users WHERE username = $1 AND id != $2', [username, id]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const updateQuery = `
      UPDATE users 
      SET name = $1, username = $2, total_credits = $3, faculty = $4, mta_load = $5, final_load = $6, employment_type = $7
      WHERE id = $8
      RETURNING id, name, username, role, total_credits, faculty, mta_load, final_load, employment_type;
    `;

    const result = await db.query(updateQuery, [
      name, username, totalCredits, faculty, mtaLoad, finalLoad, employmentType, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = result.rows[0];
    res.json({
      id: updated.id,
      name: updated.name,
      username: updated.username,
      role: updated.role.toLowerCase(),
      maxShifts: updated.total_credits,
      faculty: updated.faculty,
      mtaLoad: updated.mta_load,
      finalLoad: updated.final_load,
      employmentType: updated.employment_type
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    try {
        await db.query('UPDATE exams SET assigned_faculty_id = NULL WHERE assigned_faculty_id = $1', [id]);
        const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const bulkCreateUsers = async (req, res) => {
  const { tutors } = req.body;

  if (!Array.isArray(tutors) || tutors.length === 0) {
    return res.status(400).json({ message: 'Tutors array is required and cannot be empty' });
  }

  // ✅ FIX: db is the pool, so use db.connect() directly
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    for (const tutor of tutors) {
      const { name, username, password, faculty, mtaLoad, finalLoad, employmentType } = tutor;
      const role = 'faculty';
      const totalCredits = (mtaLoad || 0) + (finalLoad || 0);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 🔁 UPSERT: Insert or update if username exists
      const query = `
        INSERT INTO users (name, username, password, role, total_credits, mta_load, final_load, faculty, employment_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (username) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          password = EXCLUDED.password,
          total_credits = EXCLUDED.total_credits,
          mta_load = EXCLUDED.mta_load,
          final_load = EXCLUDED.final_load,
          faculty = EXCLUDED.faculty,
          employment_type = EXCLUDED.employment_type;
      `;

      await client.query(query, [
        name,
        username,
        hashedPassword,
        role,
        totalCredits,
        mtaLoad || 0,
        finalLoad || 0,
        faculty,
        employmentType || 'Part time'
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({ 
      success: true, 
      message: `${tutors.length} tutors processed successfully (inserted or updated)` 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk user creation/update error:', error);
    res.status(500).json({ message: error.message || 'Failed to process tutors' });
  } finally {
    client.release();
  }
};

module.exports = { 
  getAllUsers,
  createUser,
  updateUser,
  deleteUser, 
  getLoggedInUser,
  bulkCreateUsers,
};