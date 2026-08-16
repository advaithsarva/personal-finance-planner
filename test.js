// One check per bug found in the original (see README, "What was broken").
// No pytest-equivalent, no fixtures, no network: `node test.js`, under a second.
// The same list is re-run against the original code by verify_tests.js.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const checks = [
  ['salary split conserves the money', (plan) => {
    const f = plan('salary', 100000).figures;
    assert.strictEqual(f.needsPerMonth + f.wantsPerMonth + f.savePerMonth, 100000,
      'the three buckets must add back up to the salary');
  }],

  ['salary figures are the documented arithmetic', (plan) => {
    const f = plan('salary', 100000, { years: 5 }).figures;
    assert.deepStrictEqual(
      [f.needsPerMonth, f.savePerMonth, f.emergencyFundTarget, f.monthsToFundEmergency, f.investedAfterYears],
      [50000, 20000, 300000, 15, 1200000]);
  }],

  ['projection has one row per year and grows', (plan) => {
    const p = plan('salary', 80000, { years: 7 });
    assert.strictEqual(p.projection.length, 7);
    const vals = p.projection.map(r => r.monthly);
    assert.ok(vals.every((v, i) => i === 0 || v > vals[i - 1]), 'salary projection must increase');
  }],

  ['savings keeps liquid + deployable equal to the input', (plan) => {
    const f = plan('savings', 250000).figures;
    assert.strictEqual(f.keepLiquid + f.deployable, 250000);
    assert.strictEqual(f.valueAfterYears - f.deployable, f.gain);
  }],

  ['investment allocation sums to the input and downside is below expected', (plan) => {
    const f = plan('investment', 500000, { age: 30 }).figures;
    assert.strictEqual(f.equity + f.debt, 500000);
    assert.strictEqual(f.equity, 350000, '100-minus-age at 30 is 70% equity');
    assert.ok(f.downsideAfterYears < f.expectedAfterYears);
  }],

  ['inflation-adjusted value is below the nominal one', (plan) => {
    const f = plan('savings', 100000, { years: 10 }).figures;
    assert.ok(f.realValueAfterYears < f.valueAfterYears);
  }],

  ['an unknown type is rejected, not answered generically', (plan) => {
    // The original fell through to `default: "Provide financial guidance."`
    // and produced confident advice for a category it did not understand.
    assert.throws(() => plan('crypto', 100000), /type must be one of/);
  }],

  ['junk amounts are rejected', (plan) => {
    // The original interpolated whatever it was given straight into the prompt.
    for (const bad of [0, -5000, NaN, Infinity, 'abc', null, undefined]) {
      assert.throws(() => plan('salary', bad), undefined, `accepted ${String(bad)}`);
    }
  }],

  ['out-of-range age and years are rejected, not clamped', (plan) => {
    assert.throws(() => plan('investment', 100000, { age: 4 }), /age/);
    assert.throws(() => plan('salary', 100000, { years: 99 }), /years/);
  }],

  ['no figure is ever NaN', (plan) => {
    for (const type of ['salary', 'savings', 'investment']) {
      for (const [k, v] of Object.entries(plan(type, 1).figures)) {
        assert.ok(Number.isFinite(v), `${type}.${k} is ${v}`);
      }
    }
  }],

  ['the page loads no local filesystem paths', (_plan, pagePath) => {
    // Dashboard.js pointed <img src> at C:/Users/advai/Downloads/. Browsers
    // block file: from an http: page, so the images failed with no error.
    const html = fs.readFileSync(pagePath, 'utf8');
    assert.ok(!/file:|[A-Za-z]:[\\/]?Users/.test(html), 'absolute local path in the page');
  }],
];

const PAGE = path.join(__dirname, 'public', 'index.html');

if (require.main === module) {
  const { test } = require('node:test');
  const { plan } = require('./finance');
  for (const [name, fn] of checks) test(name, () => fn(plan, PAGE));
}

module.exports = { checks };
