CREATE TABLE IF NOT EXISTS exam_slots (
  id SERIAL PRIMARY KEY,
  exam_date DATE NOT NULL,
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('Midterm', 'Final', 'Makeup', 'Online')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slot_assignments (
  slot_id INT REFERENCES exam_slots(id) ON DELETE CASCADE,
  faculty_id INT REFERENCES users(id) ON DELETE CASCADE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slot_id, faculty_id)
);

INSERT INTO exam_slots (exam_date, exam_type, start_time, end_time, capacity) VALUES
-- Midterm/Makeup slots (4 per day)
('2025-12-10', 'Midterm', '09:30:00', '11:30:00', 3),
('2025-12-10', 'Midterm', '12:00:00', '14:00:00', 3),
('2025-12-10', 'Midterm', '14:30:00', '16:30:00', 3),
('2025-12-10', 'Midterm', '17:00:00', '19:00:00', 3),
-- Final slots (3 per day)
('2025-12-15', 'Final', '09:30:00', '12:30:00', 4),
('2025-12-15', 'Final', '13:00:00', '16:00:00', 4),
('2025-12-15', 'Final', '16:30:00', '19:30:00', 4),
-- Online (custom times)
('2025-12-12', 'Online', '10:00:00', '12:00:00', 2),
('2025-12-13', 'Online', '09:00:00', '10:00:00', 2);