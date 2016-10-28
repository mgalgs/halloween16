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

# from https://voat.co/v/bash/comments/37335
abs() {
    [ $1 -lt 0 ] && echo $((-$1)) || echo $1
}

DIFF_THRESHOLD=12               # must be 1 foot away from normal for snap
NUM_DIFFS_THRESHOLD=5           # must get 5 diffs for snap

cur_diffs=0
waiting_for_frame_exit=no

if [[ "$1" = "" ]]; then
    while read line; do
        echo "[UART: $line]"
        # data lines look like: inches=17 normal=37 diffCount=0
        [[ "$line" =~ ^inches= ]] || continue
        inches=$(cut    -d' ' -f1 <<<"$line" | cut -d= -f2)
        normal=$(cut    -d' ' -f2 <<<"$line" | cut -d= -f2)
        diffCount=$(cut -d' ' -f3 <<<"$line" | cut -d= -f2)
        [[ $inches -eq 0 ]] && { echo "bogus data. Skipping."; continue; }
        (( diff=inches-normal ))
        diff=$(abs $diff)
        if [[ $diff -gt $DIFF_THRESHOLD ]]; then
            # if we just took a snapshot and we're still over the threshold
            # then they're still in frame.
            [[ $waiting_for_frame_exit = yes ]] && { echo "still waiting for last party to exit frame..."; continue; }

            (( cur_diffs++ ))
            if [[ $cur_diffs -gt $NUM_DIFFS_THRESHOLD ]]; then
                echo "   >>> Time for a snapshot <<<"
                upload_from_cam
                cur_diffs=0
                waiting_for_frame_exit=yes
            fi
        else
            cur_diffs=0
            # if we just took a snapshot and now we're under the threshold
            # that means they exited the frame.
            waiting_for_frame_exit=no
        fi
    done < <(./env/bin/python serial_stream.py)
else
    [[ -r "$1" ]] || { echo "Couldn't read $1"; usage; exit 1; }
    upload_img $1
fi
