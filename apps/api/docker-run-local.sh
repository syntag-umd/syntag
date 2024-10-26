docker build -t fast-api --build-context packages=../../packages .

docker run --env-file .env.local -d -p 8000:8000 --name fast-api-instance fast-api
