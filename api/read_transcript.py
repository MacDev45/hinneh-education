import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
transcript_path = r"C:\Users\dagno\.gemini\antigravity-ide\brain\84fcaf65-3087-4c7f-9656-1153a2478989\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        data = json.loads(line)
        step_index = data.get("step_index", 0)
        if 105 <= step_index <= 115:
            print(f"Step {step_index}: source={data.get('source')} type={data.get('type')}")
            content = data.get("content", "")
            if isinstance(content, dict):
                content = json.dumps(content)
            print("Content:", content[:2000])
            print("*" * 80)
