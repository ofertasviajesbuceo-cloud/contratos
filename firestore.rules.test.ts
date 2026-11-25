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
  assert.match(rules, /'insurancePolicies' in data/);
  assert.match(rules, /'insurancePolicyNumber' in data/);
  assert.match(rules, /'insuranceCertificateNumber' in data/);
  assert.match(rules, /data\.installmentCount in \[1, 2, 3, 4, 5, 6\]/);
  assert.match(rules, /'flightDetails'/);
  assert.match(rules, /'flightPrice'/);
  assert.match(rules, /'flightPaymentMode'/);
  assert.match(rules, /isMapList\(data\.installmentLines, 25\)/);
  assert.match(rules, /match \/accessUsers\/\{accessUserId\}/);
  assert.match(rules, /existing\(\)\.isPrimary == false/);
  assert.match(rules, /match \/signatureRequests\/\{requestId\}/);
  assert.match(rules, /requestId\.size\(\) >= 20/);
  assert.match(rules, /existing\(\)\.status == 'pending'/);
  assert.match(rules, /'clientSignatureDataUrl'/);
  assert.match(rules, /'agencyCopySentAt'/);
  assert.match(rules, /'agencyCopyEmail'/);
  assert.match(rules, /existing\(\)\.status == 'signed' &&/);
  assert.match(rules, /resource == null && requestId\.size\(\) >= 20/);
  assert.match(rules, /resource != null && existing\(\)\.ownerId == request\.auth\.uid/);
});

test('firestore.rules keys match firebase-blueprint.json entities and allow update lists', () => {
  const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8')) as {
    entities: Record<string, { properties: Record<string, unknown>; required?: string[] }>;
  };

  const extractKeys = (pattern: RegExp, label: string): string[] => {
    const match = rules.match(pattern);
    assert.ok(match, `Missing block for ${label}`);
    return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  };

  const agencyHasOnly = extractKeys(
    /function isValidAgencyProfile[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/,
    'AgencyProfile hasOnly'
  );
  const clientHasOnly = extractKeys(
    /function isValidClient[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/,
    'Client hasOnly'
  );
  const templateHasOnly = extractKeys(
    /function isValidTripTemplate[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/,
    'TripTemplate hasOnly'
  );
  const contractHasOnly = extractKeys(
    /function isValidTravelContract[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/,
    'TravelContract hasOnly'
  );
  const contractUpdateOnly = extractKeys(
    /match \/contracts\/\{contractId\}[\s\S]*?affectedKeys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/,
    'contracts update affectedKeys'
  );
  const sigHasOnly = extractKeys(
    /function isValidSignatureRequest[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/,
    'SignatureRequest hasOnly'
  );

  assert.deepEqual(
    [...agencyHasOnly].sort(),
    Object.keys(blueprint.entities.AgencyProfile.properties).sort()
  );
  assert.deepEqual(
    [...clientHasOnly].sort(),
    Object.keys(blueprint.entities.Client.properties).sort()
  );
  assert.deepEqual(
    [...templateHasOnly].sort(),
    Object.keys(blueprint.entities.TripTemplate.properties).sort()
  );
  assert.deepEqual(
    [...contractHasOnly].sort(),
    Object.keys(blueprint.entities.TravelContract.properties).sort()
  );
  assert.deepEqual(
    [...contractUpdateOnly].sort(),
    contractHasOnly.filter((k) => k !== 'ownerId' && k !== 'createdAt').sort()
  );
  assert.deepEqual(
    [...sigHasOnly].sort(),
    Object.keys(blueprint.entities.SignatureRequest.properties).sort()
  );
});
