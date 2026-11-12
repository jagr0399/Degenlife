#!/bin/sh
# usage: tools/test.sh [pattern]  -> runs tests/*.test.js (needs Node.js 20+)
cd "$(dirname "$0")/.."
node --test --test-reporter=dot "tests/${1:-*}.test.js" 2>&1
