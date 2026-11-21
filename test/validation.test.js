const assert = require('assert');
const V = require('../lib/validation');

assert.strictEqual(V.tcChecksumError('10000000146'), null, 'known-valid TC should pass');
assert.ok(V.tcChecksumError('10000000147'), 'bad 11th digit should fail');
assert.ok(V.tcChecksumError('01234567890'), 'leading 0 should fail');
assert.ok(V.tcChecksumError('123'), 'short should fail');
for (let i = 0; i < 500; i++) assert.strictEqual(V.tcChecksumError(V.generateDemoId()), null, 'demo IDs must be valid');

assert.strictEqual(V.validatePhone('+90 532 123 4567'), null);
assert.strictEqual(V.validatePhone('0 532 123 4567'), null);
assert.ok(V.validatePhone('0 212 123 4567'));
assert.ok(V.validatePhone('+44 7700 900123'));

assert.strictEqual(V.validateName('Ayşe Yılmaz'), null);
assert.strictEqual(V.validateName('İsmail Çağlar Öztürk'), null);
assert.ok(V.validateName('Al'));
assert.ok(V.validateName('John 3rd'));

assert.strictEqual(V.validateAmount(100000), null);
assert.strictEqual(V.validateAmount(50000000), null);
assert.ok(V.validateAmount(99999));
assert.ok(V.validateAmount(50000001));

const errs = V.validateApplication({ fullName: 'Ayşe Yılmaz', phone: '05321234567', nationalId: '10000000146', amount: 2500000, currency: 'TRY', consent: false });
assert.deepStrictEqual(Object.keys(errs), ['consent']);

console.log('All validation tests passed.');
