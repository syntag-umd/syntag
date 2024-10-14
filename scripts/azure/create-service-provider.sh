az ad sp create-for-rbac --name "sp-proxy-fast-api" --role contributor --scopes /subscriptions/42644a54-e4c5-47dd-a881-bddbac986c48 --sdk-auth > ./service-principal.json.local
