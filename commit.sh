#!/bin/bash
git add -A
git commit -m "$1"
git push origin master
git push tentacle
#git push heroku master