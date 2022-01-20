if [ "$2" = "" ]; then
  echo "Usage: passwd.sh <user> <new password>"
  exit 1 
fi

. userinf.sh $1
echo '{ "NewPassword" : "$2" }' > .sfdx_user_passwd

echo Changing password for user $SFDX_USER_NAME to $2
read -p "Press enter to continue"

curl https://org62.my.salesforce.com/services/data/v54.0/sobjects/User/$SFDX_USER_ID/password -H "Authorization: Bearer $SFDX_USER_TOKEN" -H "Content-Type: application/json" -d @.sfdx_user_passwd -X POST

echo Password changed
