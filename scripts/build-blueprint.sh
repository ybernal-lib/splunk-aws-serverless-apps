#!/usr/bin/env bash

set -e

if [ "$0" != "./scripts/build-blueprint.sh" ]; then
    echo "'build-blueprint.sh' should be run from repository root"
    exit 1
fi

function usage(){
  >&2 echo "
 Usage:
    $0 version [blueprint-name]

 Ex:
    $0 1.2.3;                # Run build on all blueprints
    $0 1.2.3 splunk-logging; # Run build on splunk-logging blueprint only
"
  exit 1
}

function build() {
    name=$1
    version=$2
    package="${name}.zip"

    echo "Building package for blueprint ${name}"
    echo ""
    
    pushd ${name}
    
    npm install
    npm test
    rm -f ${package}
    zip -r ${package} index.js lambda.json lib/
    aws s3 cp ${package} s3://splk-blueprints/${version}/ --acl public-read
    aws s3 cp ${package} s3://splk-blueprints/latest/ --acl public-read

    popd
    
    echo ""
    echo "Package ${package} build complete"
    sleep 2
}

if [[ "$#" -gt 2 || "$#" -lt 1 ]]; then
    usage
fi

version=$1
blueprint=$2

pushd blueprints

if [ -z $blueprint ]; then
    for dir in *; do
        if [[ -d $dir && $dir != "lib" ]]; then
           build $dir $version
        fi
    done
else
    build $blueprint $version
fi

popd blueprints
