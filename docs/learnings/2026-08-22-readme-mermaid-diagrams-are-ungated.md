# 2026-08-22 - readme mermaid diagrams are ungated

ts: 2026-08-22T20:01:05Z
commit: c04d55b
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: the README ships 8 mermaid diagrams and no gate in the repo parses them - a syntax error would ship silently; a real parse needs mermaid + jsdom installed OUTSIDE the repo (mermaid.parse touches the DOM, so a bare node import is not enough), and all 8 parsed clean as flowchart-v2 under mermaid 11.17.0
basis: date -u -> 2026-08-22T20:01:05Z; grep -c mermaid README.md -> 8 (all 8 are fence lines; zero prose mentions); in a scratch dir outside the repo: npm i mermaid@11 jsdom, then a script setting globalThis.window/document from JSDOM and calling mermaid.parse on each fenced block -> 'block 1..8: OK (flowchart-v2)', '8 blocks, 0 failing'; node -e require('mermaid/package.json').version -> 11.17.0
re-verify: grep -c mermaid README.md
