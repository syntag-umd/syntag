### Example of folder structure and usage:

#### installing/adding dependency
poetry add ../nlp-python
#### using in python code
from nlp_syntag import ...
#### inside a pyproject.toml
nlp-syntag = {path = "../../packages/nlp-python", develop = true}

### Command used to generate this 
poetry new nlp-python --src --name nlp_syntag