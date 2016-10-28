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

SNAPS=(../sounds/SNAP_*.mp3)

SYSLOG_BUFCNT=0
SYSLOG_BUF=""
SYSLOG_BUFTHRESHOLD=15  # buffer 15 messages before sending

syslog_flush()
{
    curl -s --max-time .5 -X POST -F msg="$SYSLOG_BUF" -F token=$TOKEN $HOST/syslog >/dev/null &
    SYSLOG_BUFCNT=0
    SYSLOG_BUF=""
}

syslog()
{
    echo $*
    ((SYSLOG_BUFCNT++))
    SYSLOG_BUF="$SYSLOG_BUF\n$*"
    [[ $SYSLOG_BUFCNT -lt $SYSLOG_BUFTHRESHOLD ]] && return
    syslog_flush
}

CURSTATE="idle"

logstate()
{
    [[ "$*" = "$CURSTATE" ]] && return;
    CURSTATE="$*"
    syslog "logstate: $*"
    curl -s --max-time 2 -X POST -F state="$*" -F token=$TOKEN $HOST/logstate >/dev/null
}

cleanup()
{
    echo
    syslog "Cleaning up..."
    turn_off_light
    teardown_gpios
    killall mpg123
    pkill -f serial_stream.py
    syslog_flush
    sleep 2
}

trap cleanup EXIT

play_sound()
{
    mpg123 $* >/dev/null 2>&1
}

play_snapshot_sound()
{
    local rand_ind
    ((rand_ind = $RANDOM % ${#SNAPS[*]} ))
    play_sound ${SNAPS[$rand_ind]}
}

GPIONUM=23

ensure_gpio()
{
    [[ -e /sys/class/gpio/gpio${GPIONUM} ]] || echo ${GPIONUM} > /sys/class/gpio/export
    sleep .5  # necessary? who knows. seems to be.
    echo out > /sys/class/gpio/gpio${GPIONUM}/direction
}

teardown_gpios()
{
    echo in > /sys/class/gpio/gpio${GPIONUM}/direction
    echo $GPIONUM > /sys/class/gpio/unexport
}

turn_on_light()
{
    ensure_gpio
    echo 1 > /sys/class/gpio/gpio${GPIONUM}/value
}

turn_off_light()
{
    ensure_gpio
    echo 0 > /sys/class/gpio/gpio${GPIONUM}/value
}

upload_img()
{
    curl -X POST -F file=@$1 -F token=$TOKEN $HOST/upload
    echo
}

upload_from_cam()
{
    logstate "snapshot-in-progress"
    syslog "Taking snapshot"
    turn_on_light
    play_snapshot_sound
    local img=$(mktemp -p $PWD tmp.XXXXXXXXX.jpg)
    fswebcam -r 1280x720 --no-banner $img
    upload_img $img
    rm $img
    turn_off_light
}

# from https://voat.co/v/bash/comments/37335
abs() {
    [ $1 -lt 0 ] && echo $((-$1)) || echo $1
}


# start ye olde sound effects

killall mpg123 2>/dev/null
play_sound --loop -1 ../sounds/background.mp3 &


DIFF_THRESHOLD=12               # must be 1 foot away from normal for snap
NUM_DIFFS_THRESHOLD=5           # must get 5 diffs for snap

cur_diffs=0
waiting_for_frame_exit=0
ignores=0

if [[ "$1" = "" ]]; then
    while read line; do
        grep -q -e "Current: .* Ave: " <<<"$line" && { echo "Calibration: $line"; continue; }
        if [[ $ignores -gt 0 ]]; then
            echo "Ignoring during debounce: $line"
            ((ignores--))
            continue
        fi
        syslog "[UART: $line]"
        if [[ $waiting_for_frame_exit -gt 1 ]]; then
            logstate "waiting-for-frame-exit"
            ((waiting_for_frame_exit--))
            syslog "min party exit time ($waiting_for_frame_exit)... ignoring current line."
            continue
        fi
        # data lines look like: inches=17 normal=37 diffCount=0
        [[ "$line" =~ ^inches= ]] || continue
        inches=$(cut    -d' ' -f1 <<<"$line" | cut -d= -f2)
        normal=$(cut    -d' ' -f2 <<<"$line" | cut -d= -f2)
        diffCount=$(cut -d' ' -f3 <<<"$line" | cut -d= -f2)
        [[ $inches -eq 0 ]] && { syslog "bogus data. Skipping."; continue; }
        (( diff=inches-normal ))
        diff=$(abs $diff)
        if [[ $diff -gt $DIFF_THRESHOLD ]]; then
            # if we just took a snapshot and we're still over the threshold
            # then they're still in frame.
            [[ $waiting_for_frame_exit = 1 ]] && { syslog "still waiting for last party to exit frame..."; continue; }

            (( cur_diffs++ ))
            if [[ $cur_diffs -gt $NUM_DIFFS_THRESHOLD ]]; then
                syslog "   >>> Time for a snapshot <<<"
                upload_from_cam
                cur_diffs=0
                waiting_for_frame_exit=15
                ignores=20
            fi
        else
            cur_diffs=0
            # if we just took a snapshot and now we're under the threshold
            # that means they exited the frame.
            waiting_for_frame_exit=0
            logstate "idle"
        fi
    done < <(./env/bin/python serial_stream.py)
else
    [[ -r "$1" ]] || { syslog "Couldn't read $1"; usage; exit 1; }
    upload_img $1
fi
