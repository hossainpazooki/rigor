ts: 2026-08-19T03:00:44Z
commit: f4bca72
session: 62dcb1b1-ede9-4f82-8ed0-1f55032173d3 (re-audit sweep + data-eng settlement)
status: verified

fact: `go test -overlay=<json>` substitutes files at build time from a JSON
`{"Replace": {<disk path>: <backing path>}}` map, so a planted-twin polarity leg
can run against a mutated source file while the target repo's working tree stays
untouched. This is the Go answer to the standing polarity problem: rigor requires
a gate be shown red on known-bad input, but planting that input normally means
editing a repo that may hold uncommitted operator work. Used live at
treasury-intent-controller (which had 5 dirty operator files throughout) to flip
`ReferenceAdapter.OnAchieved` from first-writer-wins to the last-writer-wins
anti-pattern: the real adapter passed, the overlay twin turned
`TestOnAchievedSameKeyDifferentIntent` red, and `git status` was unchanged before
and after. The overlay map can also ADD a file that does not exist on disk, which
is how a whole new `_test.go` was run before any decision to land it.

basis:
```
$ go help build 2>&1 | grep -A3 -- "-overlay"
	-overlay file
		read a JSON config file that provides an overlay for build operations.
		The file is a JSON object with a single field, named 'Replace', that
		maps each disk file path (a string) to its backing file path, so that

# live use, 2026-08-18 (pre-dates this entry's anchor; tree since committed):
$ go test ./core/internal/adapter/...                      -> ok
$ go test -overlay=<twin>.json ./core/internal/adapter/... -> --- FAIL: TestOnAchievedSameKeyDifferentIntent
$ git status --short | wc -l                               -> 5 (unchanged, operator docs only)
```

re-verify: go help build 2>&1 | grep -c -- "-overlay file"
