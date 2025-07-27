-- Create initial system settings
INSERT INTO system_settings (
  id,
  working_hours_start,
  working_hours_end,
  break_duration,
  late_threshold,
  overtime_threshold,
  geofence_radius,
  office_latitude,
  office_longitude,
  allow_remote_work,
  require_face_recognition,
  auto_calculate_salary,
  created_at,
  updated_at
) VALUES (
  'settings_001',
  '09:00',
  '17:00',
  60,
  15,
  8.0,
  100,
  40.7128,
  -74.0060,
  true,
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create admin user
INSERT INTO users (
  id,
  email,
  password,
  first_name,
  last_name,
  employee_id,
  department,
  position,
  role,
  salary,
  join_date,
  is_active,
  created_at,
  updated_at
) VALUES (
  'admin_001',
  'admin@rubaagencies.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  'Admin',
  'User',
  'EMP001',
  'Administration',
  'System Administrator',
  'ADMIN',
  100000.00,
  '2024-01-01',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create sample employees
INSERT INTO users (
  id,
  email,
  password,
  first_name,
  last_name,
  employee_id,
  department,
  position,
  role,
  salary,
  join_date,
  is_active,
  phone,
  created_at,
  updated_at
) VALUES 
(
  'emp_001',
  'john.doe@rubaagencies.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'John',
  'Doe',
  'EMP002',
  'Engineering',
  'Senior Developer',
  'EMPLOYEE',
  75000.00,
  '2024-01-15',
  true,
  '+1234567890',
  NOW(),
  NOW()
),
(
  'emp_002',
  'jane.smith@rubaagencies.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Jane',
  'Smith',
  'EMP003',
  'Marketing',
  'Marketing Manager',
  'MANAGER',
  65000.00,
  '2024-02-01',
  true,
  '+1234567891',
  NOW(),
  NOW()
),
(
  'emp_003',
  'mike.johnson@rubaagencies.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Mike',
  'Johnson',
  'EMP004',
  'Human Resources',
  'HR Specialist',
  'HR',
  55000.00,
  '2024-02-15',
  true,
  '+1234567892',
  NOW(),
  NOW()
);

-- Create sample attendance records for current month
INSERT INTO attendance_records (
  id,
  user_id,
  date,
  check_in_time,
  check_out_time,
  total_hours,
  status,
  check_in_method,
  created_at,
  updated_at
) VALUES 
(
  'att_001',
  'emp_001',
  CURRENT_DATE - INTERVAL '1 day',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '09:00:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '17:30:00',
  8.5,
  'PRESENT',
  'MANUAL',
  NOW(),
  NOW()
),
(
  'att_002',
  'emp_002',
  CURRENT_DATE - INTERVAL '1 day',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '09:15:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '17:00:00',
  7.75,
  'LATE',
  'FACE_RECOGNITION',
  NOW(),
  NOW()
),
(
  'att_003',
  'emp_003',
  CURRENT_DATE - INTERVAL '1 day',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '08:45:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '17:15:00',
  8.5,
  'PRESENT',
  'GEOLOCATION',
  NOW(),
  NOW()
);

-- Create sample leave requests
INSERT INTO leave_requests (
  id,
  user_id,
  leave_type,
  start_date,
  end_date,
  total_days,
  reason,
  status,
  created_at,
  updated_at
) VALUES 
(
  'leave_001',
  'emp_001',
  'ANNUAL',
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '9 days',
  3,
  'Family vacation',
  'PENDING',
  NOW(),
  NOW()
),
(
  'leave_002',
  'emp_002',
  'SICK',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE - INTERVAL '1 day',
  2,
  'Flu symptoms',
  'APPROVED',
  NOW(),
  NOW()
);
