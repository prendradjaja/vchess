#!/usr/bin/env bash
set -ex

rm -f vchess.sqlite  # -f is only used to suppress error if file doesn't exist
sqlite3 vchess.sqlite < create.sql
sqlite3 vchess.sqlite < populate.sql
./sync_gamestat.py

npm start
