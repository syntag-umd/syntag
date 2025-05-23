docker build -t fast-api --build-context packages=../../packages .

cat .env.local .env.development > .env.merged.local

docker run --env-file .env.merged.local -d -p 8000:8000 --name fast-api-instance fast-api
