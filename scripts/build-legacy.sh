#!/usr/bin/env bash
# Builds Myrddin with its 2015 toolchain (ember-cli 0.2.7) on a modern machine.
#
# Needs:
#   - a modern Node/npm on PATH (for installing packages)
#   - NODE4: path to a Node 4.x `node` binary (for running the build)
#
# Usage:
#   NODE4=/path/to/node-v4.9.1/bin/node scripts/build-legacy.sh [production|development]
#
# Output goes to dist/. Used by .github/workflows/deploy.yml; works in Git Bash too.
set -euo pipefail

ENVIRONMENT="${1:-production}"
: "${NODE4:?Set NODE4 to the path of a Node 4.x node binary}"
cd "$(dirname "$0")/.."

NPM_FLAGS=(--ignore-scripts --legacy-peer-deps --no-audit --no-fund --no-package-lock)

echo "==> Installing npm packages as they were in mid-2016"
# Loose version ranges otherwise pull in 2024 releases that neither npm 2
# nor Node 4 can handle. (Before mid-2016, left-pad 0.0.3 doesn't exist.)
npm install --before=2016-06-01 "${NPM_FLAGS[@]}"

echo "==> Swapping in 2015 releases of the production build plugins"
# These packages' 2016 releases need a newer Broccoli than ember-cli 0.2.7.
SIDE="$(mktemp -d)"
(
  cd "$SIDE"
  echo '{"name":"side","version":"1.0.0","private":true}' > package.json
  npm install broccoli-asset-rev@2.2.0 ember-cli-uglify@1.2.0 broccoli-filter@0.1.14 \
    --before=2015-09-15 --install-strategy=nested "${NPM_FLAGS[@]}"
)
rm -rf node_modules/broccoli-asset-rev node_modules/ember-cli-uglify
cp -R "$SIDE/node_modules/broccoli-asset-rev" "$SIDE/node_modules/ember-cli-uglify" node_modules/
# broccoli-clean-css wants broccoli-filter ^0.1.6 but npm's flat layout hands it 1.x.
find node_modules -type d -name broccoli-clean-css -prune | while read -r dir; do
  mkdir -p "$dir/node_modules"
  rm -rf "$dir/node_modules/broccoli-filter"
  cp -R "$SIDE/node_modules/broccoli-filter" "$dir/node_modules/"
done
rm -rf "$SIDE"

echo "==> Restoring the nested layout two addons expect"
mkdir -p node_modules/ember-cli-font-awesome/node_modules node_modules/ember-cli-ic-ajax/node_modules
rm -rf node_modules/ember-cli-font-awesome/node_modules/font-awesome node_modules/ember-cli-ic-ajax/node_modules/ic-ajax
cp -R node_modules/font-awesome node_modules/ember-cli-font-awesome/node_modules/
cp -R node_modules/ic-ajax node_modules/ember-cli-ic-ajax/node_modules/

echo "==> Fetching node-sass's prebuilt binary for Node 4"
(cd node_modules/node-sass && "$NODE4" scripts/install.js)

echo "==> Installing bower packages"
npx --yes bower@1.8.14 install --allow-root --config.interactive=false
# Ember 1.12 refuses to boot with jQuery 1.12+.
rm -rf bower_components/jquery
npx --yes bower@1.8.14 install jquery#1.11.3 --allow-root --config.interactive=false
grep -q '"version": "1.11.3"' bower_components/jquery/.bower.json

echo "==> Building ($ENVIRONMENT) with Node $("$NODE4" -v)"
rm -rf dist
PATH="$(dirname "$NODE4"):$PATH" "$NODE4" node_modules/ember-cli/bin/ember build --environment="$ENVIRONMENT"
test -f dist/index.html
echo "==> Built dist/"
