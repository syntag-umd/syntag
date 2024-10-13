
# export $(grep -v '^#' .env.azure.local | xargs)

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