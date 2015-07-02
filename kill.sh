#!/bin/sh
npid=$(ps -efl | grep node | grep -v grep | awk '{print $2}')
kill -9 "$npid"
