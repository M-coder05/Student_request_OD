const assert = require('node:assert/strict');
const {
  DEPARTMENT_CODES,
  normalizeDepartment,
  sameDepartment,
  departmentFullName,
} = require('../utils/departments');

const normalizedCases = [
  ['CSE', 'CSE'],
  ['cse ', 'CSE'],
  ['Computer Science', 'CSE'],
  ['computer   science', 'CSE'],
  ['Computer Science and Engineering', 'CSE'],
  ['Electronics & Communication', 'ECE'],
  ['electronics and communication', 'ECE'],
  ['Mechanical', 'MECH'],
  ['Electrical', 'EEE'],
  ['Civil', 'CIVIL'],
  ['Information Technology', 'IT'],
  ['Marine', 'Marine'],
];

for (const [input, expected] of normalizedCases) {
  assert.equal(normalizeDepartment(input), expected, `normalizeDepartment(${JSON.stringify(input)})`);
}
console.log('PASS: Known department names and aliases normalize to canonical codes.');

for (const value of [null, undefined, 42, [], {}]) {
  assert.equal(normalizeDepartment(value), '', `normalizeDepartment(${JSON.stringify(value)})`);
}
console.log('PASS: Non-string and empty values normalize to an empty string without throwing.');

assert.equal(sameDepartment('CSE', 'Computer Science'), true);
assert.equal(sameDepartment('CSE', 'IT'), false);
assert.equal(sameDepartment('', ''), false);
assert.equal(sameDepartment(null, undefined), false);
console.log('PASS: sameDepartment matches aliases and rejects empty or different values.');

assert.equal(departmentFullName('CSE'), 'Computer Science and Engineering');
assert.equal(departmentFullName('cse'), 'Computer Science and Engineering');
assert.equal(departmentFullName('Computer Science'), 'Computer Science');
assert.equal(departmentFullName('Marine'), 'Marine');
console.log('PASS: departmentFullName expands codes only and leaves other values unchanged.');

assert.deepEqual(DEPARTMENT_CODES, ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL', 'EEE', 'MBA']);
console.log('PASS: DEPARTMENT_CODES is in the expected order.');
