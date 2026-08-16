// INVARIANT: every rupee figure this file returns is computed here, in code,
// from the inputs — never by the language model. The model only explains
// numbers it is handed. That is the whole point of the split: the arithmetic
// is testable, the prose is not.
//
// All amounts are whole rupees (INR). Inputs are monthly for salary, lump sum
// for savings and investment.

// ponytail: defaults are Indian retail-finance rules of thumb, not law.
// They are the calibration knobs — override per request, don't hardcode deeper.
const DEFAULTS = {
  salaryGrowth: 0.08,   // annual CTC growth, typical Indian private sector
  inflation: 0.06,      // RBI's upper tolerance band
  equityReturn: 0.12,   // long-run Nifty total return
  debtReturn: 0.07,     // FD / debt fund
  savingsReturn: 0.07,  // liquid fund / high-yield sweep
  age: 30,
  years: 5,
};

const inr = (n) => Math.round(n);
const compound = (principal, rate, years) => principal * (1 + rate) ** years;

// 50/30/20: needs / wants / savings. The oldest budgeting rule that survives contact with data.
function salaryPlan(monthly, o) {
  const needs = monthly * 0.5;
  const wants = monthly * 0.3;
  const save = monthly * 0.2;
  const emergencyTarget = needs * 6;

  const projection = [];
  for (let y = 1; y <= o.years; y++) {
    const gross = compound(monthly, o.salaryGrowth, y);
    projection.push({
      year: y,
      monthly: inr(gross),
      realMonthly: inr(gross / (1 + o.inflation) ** y),
    });
  }

  return {
    basis: `50/30/20 split of ${inr(monthly)} INR/month; emergency fund = 6x monthly needs`,
    figures: {
      needsPerMonth: inr(needs),
      wantsPerMonth: inr(wants),
      savePerMonth: inr(save),
      emergencyFundTarget: inr(emergencyTarget),
      monthsToFundEmergency: Math.ceil(emergencyTarget / save),
      investedAfterYears: inr(save * 12 * o.years),
    },
    projection,
  };
}

// A lump sum sitting in savings: how much must stay liquid, what the rest does.
function savingsPlan(amount, o) {
  const liquid = Math.min(amount, amount * 0.3);
  const deployable = amount - liquid;
  const grown = compound(deployable, o.savingsReturn, o.years);

  return {
    basis: `30% held liquid, 70% deployed at ${(o.savingsReturn * 100).toFixed(1)}% for ${o.years} years`,
    figures: {
      keepLiquid: inr(liquid),
      deployable: inr(deployable),
      valueAfterYears: inr(grown),
      gain: inr(grown - deployable),
      realValueAfterYears: inr(grown / (1 + o.inflation) ** o.years),
    },
    projection: Array.from({ length: o.years }, (_, i) => ({
      year: i + 1,
      value: inr(compound(deployable, o.savingsReturn, i + 1)),
    })),
  };
}

// Age-based allocation: equity% = 100 - age. Crude, widely used, and honest
// about being crude — it beats "put it all in whatever the model suggests".
function investmentPlan(amount, o) {
  const equityPct = (100 - o.age) / 100;
  const equity = amount * equityPct;
  const debt = amount - equity;
  const blended = equityPct * o.equityReturn + (1 - equityPct) * o.debtReturn;
  const expected = compound(amount, blended, o.years);
  // Downside: equity sleeve flat for the whole period, debt still pays.
  const downside = equity + compound(debt, o.debtReturn, o.years);

  return {
    basis: `equity ${Math.round(equityPct * 100)}% / debt ${Math.round((1 - equityPct) * 100)}% from the 100-minus-age rule at age ${o.age}`,
    figures: {
      equity: inr(equity),
      debt: inr(debt),
      blendedReturn: Number((blended * 100).toFixed(2)),
      expectedAfterYears: inr(expected),
      downsideAfterYears: inr(downside),
      realExpectedAfterYears: inr(expected / (1 + o.inflation) ** o.years),
    },
    projection: Array.from({ length: o.years }, (_, i) => ({
      year: i + 1,
      value: inr(compound(amount, blended, i + 1)),
    })),
  };
}

const PLANS = { salary: salaryPlan, savings: savingsPlan, investment: investmentPlan };

// Validation lives here, not in the route, so every caller gets it.
// Raises rather than clamping — a clamped input is a wrong answer that looks right.
function plan(type, amount, opts = {}) {
  if (!PLANS[type]) throw new RangeError(`type must be one of ${Object.keys(PLANS).join(', ')}`);
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new RangeError('amount must be a finite number greater than 0');
  }
  if (amount > 1e12) throw new RangeError('amount above 1e12 INR is out of range');

  const o = { ...DEFAULTS, ...opts };
  if (!Number.isInteger(o.age) || o.age < 18 || o.age > 100) throw new RangeError('age must be an integer 18-100');
  if (!Number.isInteger(o.years) || o.years < 1 || o.years > 40) throw new RangeError('years must be an integer 1-40');

  return { type, amount: inr(amount), years: o.years, ...PLANS[type](amount, o) };
}

module.exports = { plan, DEFAULTS };
