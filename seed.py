SCHEMA = """
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  budget REAL NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  salary REAL NOT NULL,
  hired_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  project_id INTEGER REFERENCES projects(id),
  role TEXT NOT NULL,
  hours INTEGER NOT NULL
);
"""

DEPARTMENTS = [
    (1, 'Engineering', 1200000),
    (2, 'Sales', 600000),
    (3, 'Marketing', 450000),
    (4, 'Support', 300000),
    (5, 'Finance', 500000),
]

EMPLOYEES = [
    (1, 'Ivan', 'Petrov', 'ivan.petrov@corp.ru', 1, 180000, '2019-03-11', 1),
    (2, 'Maria', 'Ivanova', 'maria.ivanova@corp.ru', 1, 165000, '2020-07-01', 1),
    (3, 'Alexey', 'Smirnov', 'alexey.smirnov@corp.ru', 1, 210000, '2017-01-20', 1),
    (4, 'Olga', 'Kuznetsova', 'olga.kuznetsova@corp.ru', 2, 120000, '2021-02-15', 1),
    (5, 'Dmitry', 'Volkov', 'dmitry.volkov@corp.ru', 2, 135000, '2018-09-03', 1),
    (6, 'Anna', 'Sokolova', 'anna.sokolova@corp.ru', 3, 110000, '2022-05-30', 1),
    (7, 'Sergey', 'Popov', 'sergey.popov@corp.ru', 3, 95000, '2023-01-09', 1),
    (8, 'Ekaterina', 'Lebedeva', 'ekaterina.lebedeva@corp.ru', 4, 88000, '2021-11-22', 1),
    (9, 'Nikolai', 'Kozlov', 'nikolai.kozlov@corp.ru', 4, 92000, '2019-06-17', 0),
    (10, 'Tatiana', 'Novikova', 'tatiana.novikova@corp.ru', 5, 150000, '2016-04-05', 1),
    (11, 'Pavel', 'Morozov', 'pavel.morozov@corp.ru', 5, 142000, '2020-10-12', 1),
    (12, 'Elena', 'Vasileva', 'elena.vasileva@corp.ru', 1, 195000, '2018-12-01', 0),
    (13, 'Andrey', 'Zaitsev', 'andrey.zaitsev@corp.ru', None, 75000, '2024-02-01', 1),
]

PROJECTS = [
    (1, 'Core Platform', 1, '2022-01-10', None),
    (2, 'Mobile App', 1, '2023-03-01', None),
    (3, 'CRM Rollout', 2, '2021-06-15', '2022-08-30'),
    (4, 'Brand Refresh', 3, '2023-09-05', None),
    (5, 'Helpdesk 2.0', 4, '2020-02-20', '2021-04-10'),
    (6, 'Audit Automation', 5, '2024-01-08', None),
]

ASSIGNMENTS = [
    (1, 1, 1, 'backend', 320),
    (2, 2, 1, 'frontend', 280),
    (3, 3, 1, 'lead', 400),
    (4, 3, 2, 'lead', 150),
    (5, 1, 2, 'backend', 190),
    (6, 4, 3, 'analyst', 210),
    (7, 5, 3, 'manager', 260),
    (8, 6, 4, 'designer', 175),
    (9, 7, 4, 'copywriter', 120),
    (10, 8, 5, 'support', 300),
    (11, 9, 5, 'support', 240),
    (12, 10, 6, 'accountant', 130),
    (13, 11, 6, 'auditor', 145),
    (14, 2, 2, 'frontend', 95),
]
