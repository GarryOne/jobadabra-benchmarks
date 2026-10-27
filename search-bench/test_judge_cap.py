"""Guards the judge's spend cap (round 2026-10-20 went $0.23 over the owner's $1: a 1,393-job list cost $0.72 and nothing counted spend). Run: python3 -m unittest search-bench/test_judge_cap.py
Every case uses a fake `ask`, so no API call and no key is involved."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import judge  # noqa: E402

PERSONA = {'title': 'Nurse', 'city': 'Town', 'country': 'Land', 'language': 'Landish'}


def pool(count):
    return [{'tool': 'ours', 'title': f'Nurse {i}', 'company': f'Co {i % 7}', 'location': 'Town', 'provider': 'p'} for i in range(count)]


class Fake:
    """A stand-in for ask: counts its calls and reports a chosen token usage per call."""
    def __init__(self, tokens_in=1000, tokens_out=1000):
        self.calls, self.usage = 0, {'input_tokens': tokens_in, 'output_tokens': tokens_out}

    def __call__(self, key, profile, jobs):
        self.calls += 1
        return {j['n']: {'n': j['n'], 'role': 'yes', 'place': 'yes'} for j in jobs}, dict(self.usage)


class JudgeCap(unittest.TestCase):
    def ledger(self, spent=None):
        path = os.path.join(tempfile.mkdtemp(), 'judge-spend.json')
        if spent is not None:
            json.dump({'spent_usd': spent}, open(path, 'w'))
        return path

    def test_the_default_cap_is_the_approved_dollar(self):
        self.assertEqual((judge.CAP_USD, judge.MAX_JOBS), (1.0, 400))

    def test_a_list_like_persona_5_is_refused_before_any_call(self):
        fake = Fake()
        with self.assertRaises(judge.BudgetExceeded):
            judge.judge(PERSONA, 5, pool(1393), self.ledger(), fake)
        self.assertEqual(fake.calls, 0)

    def test_a_persona_that_does_not_fit_the_rest_of_the_cap_is_refused_before_any_call(self):
        fake = Fake()
        with self.assertRaises(judge.BudgetExceeded):
            judge.judge(PERSONA, 1, pool(300), self.ledger(spent=0.99), fake)
        self.assertEqual(fake.calls, 0)

    def test_the_estimate_is_never_below_what_a_batch_really_costs(self):
        # measured on round 2026-10-20: about 40 input and 44 output tokens per job
        jobs = [{'n': i + 1, 'title': f'Nurse {i}', 'company': f'Co {i % 7}', 'location': 'Town'} for i in range(60)]
        measured = 60 * 40 / 1e6 * judge.PRICE[0] + 60 * 44 / 1e6 * judge.PRICE[1]
        self.assertGreaterEqual(judge.estimate_usd('Profile: x', jobs), measured)

    def test_the_run_stops_before_the_batch_that_would_cross_the_cap(self):
        fake, ledger = Fake(tokens_in=10_000_000, tokens_out=0), self.ledger()   # one call really costs $20, far more than estimated
        with self.assertRaises(judge.BudgetExceeded):
            judge.judge(PERSONA, 2, pool(150), ledger, fake, cap=1.0)
        self.assertEqual(fake.calls, 1)   # the second batch was never sent
        self.assertGreater(judge.spent_usd(ledger), 1.0)

    def test_spend_adds_up_across_personas_in_one_ledger(self):
        fake, ledger = Fake(tokens_in=1000, tokens_out=1000), self.ledger()
        judge.judge(PERSONA, 1, pool(60), ledger, fake)
        first = judge.spent_usd(ledger)
        judge.judge(PERSONA, 2, pool(60), ledger, fake)
        self.assertAlmostEqual(judge.spent_usd(ledger), 2 * first, places=6)

    def test_the_plan_engine_is_not_capped_and_writes_no_ledger(self):
        fake, ledger = Fake(0, 0), self.ledger()   # the plan engine reports no tokens
        rows, count, _tokens, cost = judge.judge(PERSONA, 5, pool(1393), ledger, fake, plan=True, cap=0.0)
        self.assertEqual((count, cost, fake.calls), (1393, 0.0, 24))
        self.assertFalse(os.path.exists(ledger))


if __name__ == '__main__':
    unittest.main()
