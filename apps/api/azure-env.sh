cat .env.development .env.local > .env.merged.local

set -a
source .env.merged.local
set +a

# Replace with your app/function details
APP_NAME="syntag-api-develop"
RESOURCE_GROUP="syntag-resources"

# Loop through each variable and set it in Azure
while IFS='=' read -r key value || [ -n "$key" ]; do
  # Ensure the line is not empty and does not start with a comment
  if [[ ! -z "$key" && ! "$key" =~ ^\# ]]; then
    # Trim any surrounding whitespace from key and value
    key=$(echo $key | xargs)
    value=$(echo $value | xargs)

    # Set the app setting in Azure
    az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings "$key=$value" > /dev/null 2>&1
  fi

done < .env.merged.local
