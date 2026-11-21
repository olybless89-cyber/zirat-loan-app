import assert from 'node:assert/strict';
import {
  tcChecksumError,
  generateDemoId,
  validatePhone,
  validateName,
  validateAmount,
  validateCurrency,
  validateApplication,
  monthlyInstalment,
  formatMoney,
} from '../lib/validation.js';

assert.equal(tcChecksumError('10000000146'), null, 'known-valid TC should pass');
assert.ok(tcChecksumError('10000000147'), 'bad 11th digit should fail');
assert.ok(tcChecksumError('01234567890'), 'leading 0 should fail');
assert.ok(tcChecksumError('123'), 'short should fail');
for (let i = 0; i < 500; i += 1) {
  assert.equal(tcChecksumError(generateDemoId()), null, 'demo IDs must be valid');
}

assert.equal(validatePhone('+90 532 123 4567'), null);
assert.equal(validatePhone('0 532 123 4567'), null);
assert.ok(validatePhone('0 212 123 4567'));
assert.ok(validatePhone('+44 7700 900123'));

assert.equal(validateName('Ayşe Yılmaz'), null);
assert.equal(validateName('İsmail Çağlar Öztürk'), null);
assert.ok(validateName('Al'));
assert.ok(validateName('John 3rd'));

assert.equal(validateAmount(100000), null);
assert.equal(validateAmount(50000000), null);
assert.ok(validateAmount(99999));
assert.ok(validateAmount(50000001));
assert.ok(validateCurrency('GBP') === null && validateCurrency('CHF'));

const errors = validateApplication({
  fullName: 'Ayşe Yılmaz',
  phone: '05321234567',
  nationalId: '10000000146',
  amount: 2500000,
  currency: 'TRY',
  consent: false,
});
assert.deepEqual(Object.keys(errors), ['consent']);

const payment = monthlyInstalment(2500000, 2.49, 36);
assert.ok(payment > 100000 && payment < 110000, 'instalment should sit in the expected range');
assert.equal(Math.round(monthlyInstalment(1200000, 0, 12)), 100000, 'zero rate is a straight division');
assert.equal(monthlyInstalment(0, 2.49, 36), null);

assert.equal(formatMoney(2500000, 'TRY'), '₺2,500,000');
assert.equal(formatMoney(105964.69, 'GBP', { decimals: 2 }), '£105,964.69');

console.log('All validation tests passed.');
