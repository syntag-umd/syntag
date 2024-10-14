docker build -t squire-booking .

cat .env.local .env.development > .env.merged.local

docker run --env-file .env.merged.local \
    -d \
    --ipc=host \
    -p 3000:3000 \
    --name squire-booking-instance squire-booking \