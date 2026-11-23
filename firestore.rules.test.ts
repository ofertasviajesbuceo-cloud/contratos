import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules enforces global default deny and Eight Pillars invariants', () => {
  assert.match(rules, /rules_version = '2';/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /existing\(\)\.status != 'archived'/);
  assert.match(rules, /incoming\(\)\.ownerId == existing\(\)\.ownerId/);
  assert.match(rules, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rules, /allow list: if false;/);
  assert.match(rules, /allow list: if isVerified\(\) && existing\(\)\.ownerId == request\.auth\.uid;/);
  assert.match(rules, /'publicDomain' in data/);
  assert.match(rules, /match \/accessUsers\/\{accessUserId\}/);
  assert.match(rules, /existing\(\)\.isPrimary == false/);
});
