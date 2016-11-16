#!/usr/bin/env bash

set -e

if [ "$0" != "./scripts/build-blueprint.sh" ]; then
    echo "'build-blueprint.sh' should be run from repository root"
    exit 1
fi

function usage(){
  >&2 echo "
 Usage:
    $0 blueprint-name

 Ex:
    $0 splunk-lambda
"
  exit 1
}

if [ "$#" -lt 1 ]; then
    usage
fi

export name=$1

echo "Building package for blueprint ${name}"
echo ""

pushd blueprints/${name}

npm install
zip -r ${name}.zip index.js lib/;

popd

echo ""
echo "Package ${name}.zip build complete"
