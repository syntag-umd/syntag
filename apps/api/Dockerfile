#
FROM python:3.9 as requirements-stage

#
WORKDIR /tmp

#
RUN pip install poetry

#
COPY ./pyproject.toml ./poetry.lock* /tmp/

#
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

#
FROM python:3.9

#
WORKDIR /code

#
COPY --from=requirements-stage /tmp/requirements.txt /code/requirements.txt

#
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY --from=packages /nlp-python /tmp/nlp-syntag

RUN pip install /tmp/nlp-syntag \
    && rm -rf /tmp/nlp-syntag

#
COPY ./app /code/app

ENV PORT 8000
EXPOSE 8000

#
CMD ["uvicorn", "app.main:app","--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "90"]
