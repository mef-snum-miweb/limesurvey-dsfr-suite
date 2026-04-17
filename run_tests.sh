#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run_tests.sh — Lance tous les tests (unitaires + E2E + a11y) et génère un
# rapport HTML unifié avec synthèse dans test-reports/<timestamp>/
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
REPORT_DIR="./test-reports/${TIMESTAMP}"
mkdir -p "${REPORT_DIR}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

UNIT_OK=0
E2E_OK=0
UNIT_JSON="${REPORT_DIR}/vitest-results.json"
E2E_JSON="${REPORT_DIR}/playwright-results.json"
SUMMARY_HTML="${REPORT_DIR}/index.html"

# ─────────────────────────────────────────────────────────────────────────────
# 1. Tests unitaires (Vitest)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}▶ 1/2 — Tests unitaires (Vitest)${NC}\n"

if npx vitest run --reporter=verbose --reporter=json --outputFile="${UNIT_JSON}" 2>&1 | tee "${REPORT_DIR}/vitest.log"; then
  UNIT_OK=1
  echo -e "\n${GREEN}✔ Tests unitaires : OK${NC}"
else
  echo -e "\n${RED}✘ Tests unitaires : ÉCHECS${NC}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Tests E2E + a11y (Playwright)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}▶ 2/2 — Tests E2E + a11y (Playwright)${NC}\n"

# On surcharge les reporters pour pointer vers notre dossier unifié
if PLAYWRIGHT_JSON_OUTPUT_FILE="${E2E_JSON}" \
   npx playwright test \
     --reporter=list,json,html \
     --output="${REPORT_DIR}/artifacts" 2>&1 | tee "${REPORT_DIR}/playwright.log"; then
  E2E_OK=1
  echo -e "\n${GREEN}✔ Tests E2E + a11y : OK${NC}"
else
  echo -e "\n${RED}✘ Tests E2E + a11y : ÉCHECS${NC}"
fi

# Déplacer le rapport HTML Playwright dans notre dossier
if [ -d "playwright-report" ]; then
  mv playwright-report "${REPORT_DIR}/playwright-html"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Extraire les métriques et générer le rapport HTML de synthèse
# ─────────────────────────────────────────────────────────────────────────────

# --- Métriques Vitest ---
if [ -f "${UNIT_JSON}" ]; then
  UNIT_TOTAL=$(python3 -c "
import json, sys
d = json.load(open('${UNIT_JSON}'))
print(d.get('numTotalTests', 0))
" 2>/dev/null || echo "?")
  UNIT_PASSED=$(python3 -c "
import json, sys
d = json.load(open('${UNIT_JSON}'))
print(d.get('numPassedTests', 0))
" 2>/dev/null || echo "?")
  UNIT_FAILED=$(python3 -c "
import json, sys
d = json.load(open('${UNIT_JSON}'))
print(d.get('numFailedTests', 0))
" 2>/dev/null || echo "?")
  UNIT_FILES=$(python3 -c "
import json, sys
d = json.load(open('${UNIT_JSON}'))
print(d.get('numTotalTestSuites', 0))
" 2>/dev/null || echo "?")
  UNIT_DURATION=$(python3 -c "
import json, sys
d = json.load(open('${UNIT_JSON}'))
ms = d.get('testResults', [{}])[-1].get('endTime', 0) - d.get('startTime', 0) if d.get('testResults') else 0
print(f'{ms/1000:.1f}')
" 2>/dev/null || echo "?")
else
  UNIT_TOTAL="?" UNIT_PASSED="?" UNIT_FAILED="?" UNIT_FILES="?" UNIT_DURATION="?"
fi

# --- Métriques Playwright ---
if [ -f "${E2E_JSON}" ]; then
  read -r E2E_TOTAL E2E_PASSED E2E_FAILED E2E_SKIPPED E2E_FLAKY E2E_DURATION < <(python3 -c "
import json, sys
d = json.load(open('${E2E_JSON}'))
stats = d.get('stats', {})
total = stats.get('expected', 0) + stats.get('unexpected', 0) + stats.get('skipped', 0) + stats.get('flaky', 0)
passed = stats.get('expected', 0)
failed = stats.get('unexpected', 0)
skipped = stats.get('skipped', 0)
flaky = stats.get('flaky', 0)
duration = stats.get('duration', 0) / 1000
print(f'{total} {passed} {failed} {skipped} {flaky} {duration:.1f}')
" 2>/dev/null || echo "? ? ? ? ? ?")
else
  E2E_TOTAL="?" E2E_PASSED="?" E2E_FAILED="?" E2E_SKIPPED="?" E2E_FLAKY="?" E2E_DURATION="?"
fi

# --- Détails par fichier Vitest ---
VITEST_DETAILS=""
if [ -f "${UNIT_JSON}" ]; then
  VITEST_DETAILS=$(python3 -c "
import json
d = json.load(open('${UNIT_JSON}'))
for suite in d.get('testResults', []):
    name = suite.get('name', '').split('tests/unit/')[-1]
    passed = sum(1 for t in suite.get('assertionResults', []) if t.get('status') == 'passed')
    failed = sum(1 for t in suite.get('assertionResults', []) if t.get('status') == 'failed')
    total = passed + failed
    icon = '✅' if failed == 0 else '❌'
    duration = suite.get('endTime', 0) - suite.get('startTime', 0)
    print(f'<tr><td>{icon}</td><td>{name}</td><td>{passed}</td><td>{failed}</td><td>{total}</td><td>{duration}ms</td></tr>')
" 2>/dev/null || echo "")
fi

# --- Détails par fichier Playwright ---
PW_DETAILS=""
if [ -f "${E2E_JSON}" ]; then
  PW_DETAILS=$(python3 -c "
import json
d = json.load(open('${E2E_JSON}'))
files = {}
for suite in d.get('suites', []):
    for spec in suite.get('suites', []) if suite.get('suites') else [suite]:
        for inner in (spec.get('suites', []) or [spec]):
            for s in (inner.get('specs', []) + spec.get('specs', [])):
                fname = s.get('file', suite.get('title', '?')).split('tests/e2e/')[-1].split('tests/a11y/')[-1]
                if fname not in files:
                    files[fname] = {'passed': 0, 'failed': 0, 'skipped': 0}
                if s.get('ok'):
                    files[fname]['passed'] += 1
                else:
                    files[fname]['failed'] += 1

# Deduplicate by walking the tree properly
files2 = {}
for suite in d.get('suites', []):
    fname = suite.get('title', '?')
    def walk(node):
        for s in node.get('specs', []):
            if fname not in files2:
                files2[fname] = {'passed': 0, 'failed': 0}
            if s.get('ok'):
                files2[fname]['passed'] += 1
            else:
                files2[fname]['failed'] += 1
        for child in node.get('suites', []):
            walk(child)
    walk(suite)

for name, counts in sorted(files2.items()):
    p = counts['passed']
    f = counts['failed']
    icon = '✅' if f == 0 else '❌'
    print(f'<tr><td>{icon}</td><td>{name}</td><td>{p}</td><td>{f}</td><td>{p+f}</td></tr>')
" 2>/dev/null || echo "")
fi

# --- Verdict global ---
if [ "$UNIT_OK" -eq 1 ] && [ "$E2E_OK" -eq 1 ]; then
  VERDICT="PASS"
  VERDICT_COLOR="#18753c"
  VERDICT_BG="#b8fec9"
  VERDICT_ICON="✅"
else
  VERDICT="FAIL"
  VERDICT_COLOR="#ce0500"
  VERDICT_BG="#fec9c9"
  VERDICT_ICON="❌"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Générer le HTML
# ─────────────────────────────────────────────────────────────────────────────
cat > "${SUMMARY_HTML}" <<HTMLEOF
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport de tests — ${TIMESTAMP}</title>
<style>
  :root { --blue-france: #000091; --red-marianne: #e1000f; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Marianne", system-ui, -apple-system, sans-serif; background: #f6f6f6; color: #161616; padding: 2rem; }
  h1 { color: var(--blue-france); font-size: 1.75rem; margin-bottom: .5rem; }
  h2 { color: var(--blue-france); font-size: 1.25rem; margin: 2rem 0 1rem; border-bottom: 2px solid var(--blue-france); padding-bottom: .25rem; }
  .meta { color: #666; font-size: .875rem; margin-bottom: 2rem; }
  .verdict { display: inline-block; font-size: 1.5rem; font-weight: 700; padding: .75rem 2rem; border-radius: .5rem; color: ${VERDICT_COLOR}; background: ${VERDICT_BG}; margin-bottom: 1.5rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #fff; border-radius: .5rem; padding: 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  .card h3 { font-size: .875rem; color: #666; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5rem; }
  .card .value { font-size: 2rem; font-weight: 700; }
  .card .value.green { color: #18753c; }
  .card .value.red { color: #ce0500; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: .5rem; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.1); margin-bottom: 1rem; }
  th { background: var(--blue-france); color: #fff; text-align: left; padding: .625rem .75rem; font-size: .875rem; }
  td { padding: .5rem .75rem; border-bottom: 1px solid #eee; font-size: .875rem; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f0f0ff; }
  .links { margin-top: 2rem; }
  .links a { display: inline-block; margin-right: 1rem; padding: .5rem 1rem; background: var(--blue-france); color: #fff; text-decoration: none; border-radius: .25rem; font-size: .875rem; }
  .links a:hover { background: #1212ff; }
  footer { margin-top: 3rem; color: #999; font-size: .75rem; text-align: center; }
</style>
</head>
<body>

<h1>Rapport de tests — limesurvey-dsfr-suite</h1>
<p class="meta">${TIMESTAMP} · theme-dsfr/scripts/custom.js</p>

<div class="verdict">${VERDICT_ICON} ${VERDICT}</div>

<div class="cards">
  <div class="card">
    <h3>Tests unitaires</h3>
    <div class="value ${UNIT_FAILED:+$([ "${UNIT_FAILED}" = "0" ] && echo green || echo red)}">${UNIT_PASSED} / ${UNIT_TOTAL}</div>
    <div>${UNIT_FILES} fichiers · ${UNIT_DURATION}s</div>
  </div>
  <div class="card">
    <h3>Tests E2E + a11y</h3>
    <div class="value ${E2E_FAILED:+$([ "${E2E_FAILED}" = "0" ] && echo green || echo red)}">${E2E_PASSED} / ${E2E_TOTAL}</div>
    <div>${E2E_DURATION}s · ${E2E_SKIPPED} skip · ${E2E_FLAKY} flaky</div>
  </div>
  <div class="card">
    <h3>Total</h3>
    <div class="value">$(( ${UNIT_TOTAL:-0} + ${E2E_TOTAL:-0} )) tests</div>
    <div>$(( ${UNIT_PASSED:-0} + ${E2E_PASSED:-0} )) pass · $(( ${UNIT_FAILED:-0} + ${E2E_FAILED:-0} )) fail</div>
  </div>
</div>

<h2>Détail — Tests unitaires (Vitest)</h2>
<table>
  <thead><tr><th></th><th>Fichier</th><th>Pass</th><th>Fail</th><th>Total</th><th>Durée</th></tr></thead>
  <tbody>
${VITEST_DETAILS}
  </tbody>
</table>

<h2>Détail — Tests E2E + a11y (Playwright)</h2>
<table>
  <thead><tr><th></th><th>Fichier</th><th>Pass</th><th>Fail</th><th>Total</th></tr></thead>
  <tbody>
${PW_DETAILS}
  </tbody>
</table>

<div class="links">
  <a href="playwright-html/index.html">📊 Rapport Playwright détaillé</a>
  <a href="vitest.log">📄 Log Vitest</a>
  <a href="playwright.log">📄 Log Playwright</a>
</div>

<footer>Généré par run_tests.sh · limesurvey-dsfr-suite</footer>
</body>
</html>
HTMLEOF

# ─────────────────────────────────────────────────────────────────────────────
# 5. Synthèse terminale
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  SYNTHÈSE DES TESTS — ${TIMESTAMP}${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Unitaires (Vitest)  : ${UNIT_PASSED}/${UNIT_TOTAL} pass  (${UNIT_FILES} fichiers, ${UNIT_DURATION}s)"
echo -e "  E2E + a11y (PW)     : ${E2E_PASSED}/${E2E_TOTAL} pass  (${E2E_DURATION}s)"
echo -e "  ────────────────────────────────────────────"
echo -e "  Total               : $(( ${UNIT_PASSED:-0} + ${E2E_PASSED:-0} )) / $(( ${UNIT_TOTAL:-0} + ${E2E_TOTAL:-0} )) tests"
echo ""

if [ "$UNIT_OK" -eq 1 ] && [ "$E2E_OK" -eq 1 ]; then
  echo -e "  ${GREEN}${BOLD}✅ VERDICT : PASS${NC}"
else
  echo -e "  ${RED}${BOLD}❌ VERDICT : FAIL${NC}"
fi

echo ""
echo -e "  📁 Rapport HTML : ${REPORT_DIR}/index.html"
echo -e "  📊 Playwright   : ${REPORT_DIR}/playwright-html/index.html"
echo ""

# Retour code non-zéro si des tests ont échoué
[ "$UNIT_OK" -eq 1 ] && [ "$E2E_OK" -eq 1 ]
