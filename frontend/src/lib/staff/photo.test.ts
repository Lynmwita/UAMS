import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStaffPhoto,
  initialsForStaffName,
  isValidStaffPhoto,
  MAX_PHOTO_DATA_URL_LENGTH,
} from './photo';

// Staff profile photo (2026-10-29): one photo per staff member, UAMS-only
// (staff records never sync to the Student Hub). Mirrors the student photo
// validation rules exactly.

test('isValidStaffPhoto accepts data URLs and https URLs', () => {
  const dataUrl = 'data:image/jpeg;base64,' + 'a'.repeat(100);
  assert.equal(isValidStaffPhoto(dataUrl), true);
  assert.equal(isValidStaffPhoto('https://example.com/photo.jpg'), true);
});

test('isValidStaffPhoto rejects bad values', () => {
  assert.equal(isValidStaffPhoto(''), false);
  assert.equal(isValidStaffPhoto('http://example.com/photo.jpg'), false);
  assert.equal(isValidStaffPhoto('data:image/gif;base64,aaaa'), false);
  assert.equal(isValidStaffPhoto('not a url'), false);
  assert.equal(isValidStaffPhoto(null), false);
  assert.equal(isValidStaffPhoto(undefined), false);
  assert.equal(isValidStaffPhoto('data:image/jpeg;base64,' + 'a'.repeat(MAX_PHOTO_DATA_URL_LENGTH)), false);
});

test('extractStaffPhoto: undefined leaves, empty removes, value passes through', () => {
  assert.equal(extractStaffPhoto({}), undefined);
  assert.equal(extractStaffPhoto({ photo_url: '' }), null);
  assert.equal(extractStaffPhoto({ photo_url: '   ' }), null);
  // Explicit null falls through the ?? chain, same as the student helper.
  assert.equal(extractStaffPhoto({ photo_url: null }), undefined);
  const url = 'https://example.com/p.jpg';
  assert.equal(extractStaffPhoto({ photo_url: url }), url);
  assert.equal(extractStaffPhoto({ avatar_url: url }), url);
});

test('initialsForStaffName', () => {
  assert.equal(initialsForStaffName('Jane Mwangi'), 'JM');
  assert.equal(initialsForStaffName('Madonna'), 'MA');
  assert.equal(initialsForStaffName(''), '?');
});
