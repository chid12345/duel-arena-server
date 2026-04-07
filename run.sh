#!/bin/bash

echo "========================================"
echo "      ZEN DUEL ARENA BOT LAUNCHER"
echo "========================================"
echo

echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 not found!"
    echo "Please install Python 3.7+ from https://python.org"
    exit 1
fi

python3 --version

echo
echo "Installing dependencies..."
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi

echo
echo "Checking bot token..."
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "WARNING: TELEGRAM_BOT_TOKEN not set!"
    echo "Please set environment variable:"
    echo "export TELEGRAM_BOT_TOKEN=your_bot_token_here"
    echo
    echo "Starting with placeholder token..."
fi

echo
echo "========================================"
echo "       STARTING ZEN DUEL ARENA BOT"
echo "========================================"
echo

python3 main.py

echo
echo "Bot stopped. Press Enter to exit..."
read
