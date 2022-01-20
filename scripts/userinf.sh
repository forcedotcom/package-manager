export SFDX_USER=$1
if [ "$SFDX_USER" = "" ]; then
  echo "Usage: . $0 <org user or alias>"
  exit 1
fi

sfdx force:user:display --json -v $SFDX_USER -u $SFDX_USER > .sfdx_user_json
export SFDX_USER_ID=`jq -r '.result.id' .sfdx_user_json`
export SFDX_USER_NAME=`jq -r '.result.username' .sfdx_user_json`
export SFDX_USER_TOKEN=`jq -r '.result.accessToken' .sfdx_user_json`
