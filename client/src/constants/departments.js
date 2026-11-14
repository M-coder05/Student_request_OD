// keep in sync with backend/utils/departments.js
export const DEPARTMENTS = [
  {
    code: 'CSE',
    name: 'Computer Science and Engineering',
    aliases: ['cse', 'computer science', 'computer science and engineering'],
  },
  {
    code: 'IT',
    name: 'Information Technology',
    aliases: ['it', 'information technology'],
  },
  {
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    aliases: ['ece', 'electronics and communication', 'electronics and communication engineering'],
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    aliases: ['mech', 'mechanical', 'mechanical engineering'],
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    aliases: ['civil', 'civil engineering'],
  },
  {
    code: 'EEE',
    name: 'Electrical and Electronics Engineering',
    aliases: ['eee', 'electrical', 'electrical and electronics engineering'],
  },
  {
    code: 'MBA',
    name: 'Master of Business Administration',
    aliases: ['mba', 'master of business administration'],
  },
];

const canonicalize = (value) => value
  .trim()
  .replace(/&/g, ' and ')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const aliasToCode = new Map();
for (const department of DEPARTMENTS) {
  aliasToCode.set(canonicalize(department.code), department.code);
  for (const alias of department.aliases) {
    aliasToCode.set(canonicalize(alias), department.code);
  }
}

export const normalizeDepartment = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return aliasToCode.get(canonicalize(trimmed)) || trimmed;
};

export const sameDepartment = (a, b) => {
  const left = normalizeDepartment(a);
  const right = normalizeDepartment(b);
  return Boolean(left) && left === right;
};

export const departmentFullName = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const department = DEPARTMENTS.find(
    (item) => item.code.toLowerCase() === trimmed.toLowerCase()
  );
  return department ? department.name : value;
};

export const DEPARTMENT_CODES = DEPARTMENTS.map((department) => department.code);

export const displayDepartment = (value) => normalizeDepartment(value) || '';
