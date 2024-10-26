## To install an internal package
poetry add --group repo ../../packages/nlp-python --editable

## To build with internal package
1. Look at Dockerfile in /apps/api
2. Pass in `--build-context packages=../../packages ` argument to the docker build command
   