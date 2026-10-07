const test = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler } = require('../src/middleware/errorHandler');
const Patient = require('../src/models/Patient');

test('errorHandler transforms MySQL errno 1292 into 400 Bad Request', () => {
  let capturedStatus = null;
  let capturedJson = null;

  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(payload) {
      capturedJson = payload;
      return this;
    },
  };

  const err1292 = new Error("Incorrect date value: '' for column 'date_of_birth' at row 1");
  err1292.errno = 1292;
  err1292.code = 'ER_TRUNCATED_WRONG_VALUE';

  errorHandler(err1292, {}, mockRes, () => {});

  assert.equal(capturedStatus, 400);
  assert.equal(capturedJson.message, 'Invalid date or field format provided.');
});

test('Patient.create sanitizes empty string date_of_birth and other fields without throwing', async () => {
  // Verify sanitizeField behavior by examining create execution with null/empty strings
  const originalExecute = require('../src/config/database').execute;
  let passedValues = null;

  require('../src/config/database').execute = async (sql, values) => {
    if (sql.includes('INSERT INTO patients')) {
      passedValues = values;
      return [{ insertId: 1 }];
    }
    if (sql.includes('SELECT * FROM patients WHERE id = ?')) {
      return [[{ id: values[0], first_name: 'Test', last_name: 'Patient' }]];
    }
    return [[]];
  };

  try {
    const patient = await Patient.create({
      first_name: 'Jane',
      last_name: 'Doe',
      date_of_birth: '',
      phone: '   ',
      email: '',
      address: '',
      blood_group: '',
      allergies: '',
      chronic_conditions: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });

    assert.ok(patient);
    assert.equal(patient.first_name, 'Test');
    assert.ok(Array.isArray(passedValues));
    // Index 5 is date_of_birth, index 6 is gender, index 7 is phone, index 8 is email
    assert.equal(passedValues[5], null, 'Empty date_of_birth was not sanitized to null');
    assert.equal(passedValues[7], null, 'Whitespace phone was not sanitized to null');
    assert.equal(passedValues[8], null, 'Empty email was not sanitized to null');
    assert.equal(passedValues[9], null, 'Empty address was not sanitized to null');
    assert.equal(passedValues[10], null, 'Empty blood_group was not sanitized to null');
  } finally {
    require('../src/config/database').execute = originalExecute;
  }
});
