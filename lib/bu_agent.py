"""Browser Use side of the bake-off: attaches to the shared guarded browser over CDP and fills the form with Sonnet 5.5. Args: cdp_url instruction_file cv_pdf out_json. Key in env ANTHROPIC_API_KEY (never printed)."""
import asyncio, json, sys, time
from browser_use import Agent, Browser, ChatAnthropic


class SonnetFiveChat(ChatAnthropic):
    # Browser Use 0.13.11 only knows fable/mythos as models that refuse a forced tool_choice; Sonnet 5.5 refuses it too (API 400, 13 Oct 2026). One-line glue, same model.
    def _requires_auto_tool_choice(self):
        return True


cdp, instr_file, cv, out = sys.argv[1:5]
allowed = sys.argv[5].split(',') if len(sys.argv) > 5 else None


async def main():
    task = open(instr_file).read()
    browser = Browser(cdp_url=cdp, keep_alive=True, allowed_domains=allowed)
    agent = Agent(task=task, llm=SonnetFiveChat(model='claude-sonnet-5-5'), browser=browser, available_file_paths=[cv], calculate_cost=True)
    started = time.time()
    result = {'tool': 'browser-use', 'error': ''}
    try:
        history = await agent.run(max_steps=30)
        result.update(steps=history.number_of_steps(), final=(history.final_result() or '')[:600], done=history.is_done(), successful=history.is_successful())
    except Exception as error:  # a crash is a result, not a stop
        result['error'] = f'{type(error).__name__}: {error}'[:400]
    result['seconds'] = round(time.time() - started, 1)
    try:
        summary = await agent.token_cost_service.get_usage_summary()
        result['usage'] = {'in': summary.total_prompt_tokens, 'out': summary.total_completion_tokens, 'usd_reported': summary.total_cost, 'calls': summary.entry_count}
    except Exception as error:
        result['usage_error'] = str(error)[:200]
    json.dump(result, open(out, 'w'))

asyncio.run(main())
