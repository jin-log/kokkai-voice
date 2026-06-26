#!/bin/bash
cd "$(dirname "$0")"
echo "kokkai-voice sample: http://localhost:8770/"
npx --yes serve . -l 8770
