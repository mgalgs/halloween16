#!/bin/bash

PROGGIE=$0

HOST=${HOST:-https://scaryphotobooth.com}

usage()
{
    echo "$PROGGIE auth_token [image_file]"
}

[[ "$1" = "-h" || "$1" = "--help" ]] && { usage; exit 1; }

token=$1
shift
[[ "$token" = "" ]] && { echo "Missing auth token"; usage; exit 1; }

mkdir -p /tmp/ween16
if [[ "$1" = "" ]]; then
    img=$(mktemp -p /tmp/ween16 tmp.XXXXXXXXX.jpg)
    fswebcam -r 1280x720 --no-banner $img
else
    img=$1
    [[ -r "$img" ]] || { echo "Couldn't read $img"; usage; exit 1; }
fi

curl -X POST -F file=@$img -F token=$token $HOST/upload
echo
