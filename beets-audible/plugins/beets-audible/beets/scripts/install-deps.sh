#!/bin/bash
echo "Installing dependencies..."
# copyartifacts is optional but recommended
pip install --no-cache-dir requests markdownify natsort beets-copyartifacts3
