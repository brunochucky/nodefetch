#!/bin/sh
current_time=$(date "+%H%M%s")
echo "Deploy started : $current_time"
git add . && git commit -m "auto-deploy-$current_time" && git push -q
finish_time=$(date "+%H:%M:%S")
echo "Deploy finished : $finish_time"
