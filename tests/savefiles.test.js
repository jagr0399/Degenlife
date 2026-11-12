const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeSave, readSave } = require('../app/savefiles.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'degen-save-'));

test('write_then_read', () => {
  const d = tmp();
  writeSave(d, '{"a":1}');
  assert.deepStrictEqual(readSave(d), { json: '{"a":1}', from: 'main' });
});

test('second_write_keeps_backup', () => {
  const d = tmp();
  writeSave(d, '{"a":1}');
  writeSave(d, '{"a":2}');
  assert.strictEqual(fs.readFileSync(path.join(d, 'slot1.json'), 'utf8'), '{"a":2}');
  assert.strictEqual(fs.readFileSync(path.join(d, 'slot1.bak.json'), 'utf8'), '{"a":1}');
  assert.strictEqual(fs.existsSync(path.join(d, 'slot1.tmp')), false);
});

test('corrupt_save_uses_backup', () => {
  const d = tmp();
  writeSave(d, '{"a":1}');
  writeSave(d, '{"a":2}');
  fs.writeFileSync(path.join(d, 'slot1.json'), '{bad');
  assert.deepStrictEqual(readSave(d), { json: '{"a":1}', from: 'backup' });
});

test('both_bad_gives_null', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'slot1.json'), '{bad');
  fs.writeFileSync(path.join(d, 'slot1.bak.json'), '');
  assert.deepStrictEqual(readSave(d), { json: null, from: null });
  assert.deepStrictEqual(readSave(tmp()), { json: null, from: null });
});

test('no_rotate_keeps_backup', () => {
  const d = tmp();
  writeSave(d, '{"good":1}');
  writeSave(d, '{"good":2}');
  writeSave(d, '{"bad":1}');            // parses, but the game could not decode it
  writeSave(d, '{"fresh":1}', { rotate: false });
  assert.strictEqual(fs.readFileSync(path.join(d, 'slot1.bak.json'), 'utf8'), '{"good":2}');
  assert.strictEqual(fs.readFileSync(path.join(d, 'slot1.json'), 'utf8'), '{"fresh":1}');
});

test('read_returns_backup_too', () => {
  const d = tmp();
  writeSave(d, '{"a":1}'); writeSave(d, '{"a":2}');
  const r = readSave(d);
  assert.strictEqual(r.backup, '{"a":1}');
});

test('slots_are_separate_and_listed', () => {
  const { listSlots } = require('../app/savefiles.js');
  const d = tmp();
  writeSave(d, '{"s":2}', { slot: 2, meta: { day: 5 } });
  assert.strictEqual(readSave(d, 2).json, '{"s":2}');
  assert.strictEqual(readSave(d, 1).json, null);
  const l = listSlots(d);
  assert.deepStrictEqual(l.map((x) => x.has), [false, true, false]);
  assert.strictEqual(l[1].meta.day, 5);
});
