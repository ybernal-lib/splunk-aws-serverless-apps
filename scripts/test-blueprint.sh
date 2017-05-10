#!/usr/bin/env bash

set -e

if [ "$0" != "./scripts/test-blueprint.sh" ]; then
    echo "'test-blueprint.sh' should be run from repository root"
    exit 1
fi

function usage(){
  >&2 echo "
 Usage:
    $0 [blueprint-name]

 Ex:
    $0;                # Run test on all blueprints
    $0 splunk-logging; # Run test on splunk-logging blueprint only
"
  exit 1
}

function test() {
    name=$1

    echo "Testing blueprint ${name} against ${SPLUNK_HEC_URL}"
    echo ""
    
    pushd ${name}
    
    npm install
    npm test
    node wrapper.js
    
    popd
    
    echo ""
    echo "Blueprint ${name} test complete"
}

if [ "$#" -gt 1 ]; then
    usage
fi

pushd blueprints

if [ -z "$1" ]; then
    for blueprint in *; do
        if [[ -d $blueprint && $blueprint != "lib" ]]; then
           test $blueprint
        fi
    done
else
    test $1
fi

popd blueprints
