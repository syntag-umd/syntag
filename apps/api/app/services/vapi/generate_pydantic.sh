#!/bin/bash

# Create a new virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

pip install 'datamodel-code-generator[http]'

datamodel-codegen  --url https://api.vapi.ai/api-json --output generated_models.py --output-model-type typing.TypedDict --use-schema-description --reuse-model  --enum-field-as-literal all --collapse-root-models
