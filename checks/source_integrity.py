"""Small, dependency-free check for the observed broken local JS imports."""
from pathlib import Path
import json
import re
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "source"
src = root / "frontend" / "src"
errors = []
checked = 0
for path in sorted(src.rglob("*")):
    if path.suffix not in {".js", ".jsx"}:
        continue
    text = path.read_text(encoding="utf-8")
    for match in re.finditer(r'^\s*(?:import|export)\s+(?:[^\n]*?\s+from\s+)?["\']([^"\']+)["\']', text, re.MULTILINE):
        name = match.group(1)
        if not name.startswith((".", "@/")):
            continue
        checked += 1
        target = src / name[2:] if name.startswith("@/") else path.parent / name
        candidates = [target, *[Path(str(target) + s) for s in (".js", ".jsx", ".json", ".css")], target / "index.js", target / "index.jsx"]
        if not any(p.is_file() for p in candidates):
            errors.append({"file": str(path.relative_to(root)), "line": text[:match.start()].count("\n") + 1, "missing": name})
print(json.dumps({"local_imports_checked": checked, "missing": errors}, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
