#az login

acr_name=syntagregistryfastapi

az acr login --name ${acr_name}

image_name=fast-api
tag_name=0.0.0-$(date -u +%Y%m%dT%H%M%S)



docker build --platform=linux/amd64 -t $image_name .

docker tag $image_name ${acr_name}.azurecr.io/${image_name}:${tag_name}

docker push ${acr_name}.azurecr.io/${image_name}:${tag_name}


export $(grep -v '^#' .env.azure.local | xargs)

dev_containerapp_name=api-develop-syntag
dev_resource_group=syntag-resources

az containerapp update \
    -n $dev_containerapp_name \
    -g $dev_resource_group \
    --image ${acr_name}.azurecr.io/${image_name}:${tag_name} \


prod_webapp_name=api-syntag
prod_resource_group=syntag-resources
az containerapp update \
    -n $prod_webapp_name \
    -g $prod_resource_group \
    --image ${acr_name}.azurecr.io/${image_name}:${tag_name} \

echo "Pushed and deployed image: ${tag_name}"
