import json
import sys

try:
    with open('lint_report.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
        for file in data:
            if file['messages']:
                print(f"File: {file['filePath']}")
                for msg in file['messages']:
                    print(f"  Line {msg['line']}: {msg['message']}")
except Exception as e:
    print(f"Error: {e}")
