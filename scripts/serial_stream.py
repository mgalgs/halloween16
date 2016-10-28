#!/usr/bin/env python

import logging
logger = logging.getLogger(__name__)

import sys
import signal
from serial import Serial

# http://stackoverflow.com/a/31464349/209050
class GracefulKiller(object):
    kill_now = False

    def __init__(self):
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)

    def exit_gracefully(self, signum, frame):
        logger.info('Got a SIGINT or SIGTERM! Will cleanly shut down...')
        self.kill_now = True


def main():
    with Serial('/dev/ttyAMA0') as s:
        killer = GracefulKiller()
        while True:
            if killer.kill_now:
                logger.info('All done.')
                return
            print(s.readline().decode('ascii').strip())
            sys.stdout.flush()


if __name__ == "__main__":
    main()
