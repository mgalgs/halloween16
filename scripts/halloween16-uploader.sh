#!/bin/bash

PROGGIE=$0

cd $(dirname $0)

HOST=${HOST:-https://scaryphotobooth.com}

usage()
{
    echo "$PROGGIE auth_token [image_file]"
}

[[ "$1" = "-h" || "$1" = "--help" ]] && { usage; exit 1; }

TOKEN=$1
shift
[[ "$TOKEN" = "" ]] && { echo "Missing auth token"; usage; exit 1; }

upload_img()
{
    curl -X POST -F file=@$1 -F token=$TOKEN $HOST/upload
    echo
}

upload_from_cam()
{
    echo "Taking snapshot"
    local img=$(mktemp -p $PWD tmp.XXXXXXXXX.jpg)
    fswebcam -r 1280x720 --no-banner $img
    upload_img $img
    rm $img
}

if [[ "$1" = "" ]]; then
    while read line; do
        echo "UART: $line"
        [[ $line = 'Snapshot!' ]] && upload_from_cam
    done < <(./env/bin/python serial_stream.py)
else
    [[ -r "$1" ]] || { echo "Couldn't read $1"; usage; exit 1; }
    upload_img $1
fi
