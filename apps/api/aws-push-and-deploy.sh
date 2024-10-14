aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 529930182114.dkr.ecr.us-west-2.amazonaws.com

docker build --platform=linux/amd64 -t max/fast-api .

docker tag max/fast-api:latest 529930182114.dkr.ecr.us-west-2.amazonaws.com/max/fast-api:latest

docker push 529930182114.dkr.ecr.us-west-2.amazonaws.com/max/fast-api:latest
