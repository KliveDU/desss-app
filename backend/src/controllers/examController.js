const db = require('../config/desss_db');

const mapExamToCamelCase = (exam) => ({
    id: exam.id,
    courseCode: exam.course_code,
    classroom: exam.classroom,
    dateTime: exam.date_time,
    credits: exam.credits,
    department: exam.department,
    assignedFacultyId: exam.assigned_faculty_id,
});


const getAllExams = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM exams ORDER BY date_time DESC');
        res.json(result.rows.map(mapExamToCamelCase));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createExam = async (req, res) => {
    const { courseCode, classroom, dateTime, credits, department, assignedFacultyId } = req.body;
    try {
        const createQuery = `
            INSERT INTO exams (course_code, classroom, date_time, credits, department, assigned_faculty_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await db.query(createQuery, [courseCode, classroom, dateTime, credits, department, assignedFacultyId || null]);
        res.status(201).json(mapExamToCamelCase(result.rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const approveExamForFaculty = async (req, res) => {
    const examId = req.params.id;
    const facultyId = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const examRes = await client.query('SELECT * FROM exams WHERE id = $1 FOR UPDATE', [examId]);
        const exam = examRes.rows[0];

        if (!exam) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Exam not found' });
        }
        if (exam.assigned_faculty_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Exam is already assigned' });
        }

        const facultyRes = await client.query('SELECT total_credits FROM users WHERE id = $1', [facultyId]);
        const faculty = facultyRes.rows[0];
        
        const creditsRes = await client.query('SELECT COALESCE(SUM(credits), 0) as approved_credits FROM exams WHERE assigned_faculty_id = $1', [facultyId]);
        const approvedCredits = parseInt(creditsRes.rows[0].approved_credits, 10);

        if ((approvedCredits + exam.credits) > faculty.total_credits) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Approving this exam would exceed your credit limit.' });
        }
        
        const updateRes = await client.query(
            'UPDATE exams SET assigned_faculty_id = $1 WHERE id = $2 RETURNING *',
            [facultyId, examId]
        );
        
        await client.query('COMMIT');
        res.json(mapExamToCamelCase(updateRes.rows[0]));

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

const unassignExamForFaculty = async (req, res) => {
    const examId = req.params.id;
    const facultyId = req.user.id;
    
    try {
        const examRes = await db.query('SELECT * FROM exams WHERE id = $1', [examId]);
        if (examRes.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        if (examRes.rows[0].assigned_faculty_id !== facultyId) {
            return res.status(403).json({ message: 'You are not assigned to this exam' });
        }

        const updateRes = await db.query('UPDATE exams SET assigned_faculty_id = NULL WHERE id = $1 RETURNING *', [examId]);
        res.json(mapExamToCamelCase(updateRes.rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const assignExamByAdmin = async (req, res) => {
    const examId = req.params.id;
    const { facultyId } = req.body; 

    try {
        const updateRes = await db.query(
            'UPDATE exams SET assigned_faculty_id = $1 WHERE id = $2 RETURNING *',
            [facultyId, examId]
        );
        if (updateRes.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        res.json(mapExamToCamelCase(updateRes.rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateExam = async (req, res) => {
  const { id } = req.params;
  const { courseCode, classroom, dateTime, credits, department, assignedFacultyId } = req.body;

  try {
    const updateQuery = `
      UPDATE exams 
      SET 
        course_code = COALESCE($1, course_code),
        classroom = COALESCE($2, classroom),
        date_time = COALESCE($3, date_time),
        credits = COALESCE($4, credits),
        department = COALESCE($5, department),
        assigned_faculty_id = $6
      WHERE id = $7
      RETURNING *;
    `;
    const result = await db.query(updateQuery, [
      courseCode,
      classroom,
      dateTime,
      credits,
      department,
      assignedFacultyId ?? null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(mapExamToCamelCase(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM exams WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllExams,
  createExam,
  approveExamForFaculty,
  unassignExamForFaculty,
  assignExamByAdmin,
  updateExam,
  deleteExam
};