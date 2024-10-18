#az login

acr_name=syntagregistryfastapi

az acr login --name ${acr_name}

image_name=fast-api
tag_name=0.0.0-$(date -u +%Y%m%dT%H%M%S)



docker build --platform=linux/amd64 -t $image_name .

docker tag $image_name ${acr_name}.azurecr.io/${image_name}:${tag_name}

docker push ${acr_name}.azurecr.io/${image_name}:${tag_name}

echo "Pushed image: ${tag_name}"
