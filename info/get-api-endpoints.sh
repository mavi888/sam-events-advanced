if [[ -z "$1" ]] ; then
    echo 'Format: get-api-endpoints.sh <stack-name>'
    exit 1
fi

aws cloudformation describe-stacks --stack-name $1 --query 'Stacks[0].Outputs' --output table | grep URL
