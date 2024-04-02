#!/bin/bash

# exit if a command returns a non-zero exit code and also print the commands and their args as they are executed
set -e -x

# Add the pulumi CLI to the PATH
export PATH=$PATH:$HOME/.pulumi/bin

yarn install
pulumi stack select dev
# The following is just a sample config setting that the hypothetical pulumi
# program needs.
# Learn more about pulumi configuration at: https://www.pulumi.com/docs/concepts/config/
# pulumi config set mysetting myvalue
pulumi up --yes # this line will be the pulumi preview command in pulumi-preview.sh