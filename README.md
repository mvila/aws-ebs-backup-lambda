# aws-ebs-backup-lambda

JavaScript AWS Lambda function to automatically backup EBS volumes.

Volumes to be backed up must be in the same region as the Lambda function and be tagged with `aws-ebs-backup-lambda.enable = true`.

To adjust the snapshot retention (10 by default), change `MAX_SNAPSHOTS` in `handler.js`.

## Lambda function

Create a Node.js >=8.10 Lambda function with `handler.js` code and 3 minutes timeout.

## IAM Policy

Create an IAM role with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeVolumes",
        "ec2:CreateSnapshot",
        "ec2:DeleteSnapshot",
        "ec2:DescribeSnapshots",
        "ec2:CreateTags"
      ],
      "Resource": "*"
    }
  ]
}
```

## CloudWatch Events

To automatically trigger the execution everyday at 05:20 UTC, add the following CloudWatch Events schedule expression:

```
cron(20 5 * * ? *)
```

## License

MIT
