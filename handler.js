const AWS = require('aws-sdk');
const ec2 = new AWS.EC2();

const APP_NAME = 'aws-ebs-backup-lambda';
const MAX_SNAPSHOTS = 10;

async function getVolumes() {
  let {Volumes: volumes} = await ec2.describeVolumes({}).promise();

  volumes = volumes.filter(volume => {
    if (volume.State !== 'in-use') {
      return false;
    }

    if (!volume.Tags.some(tag => tag.Key === 'Name' && tag.Value)) {
      return false;
    }

    if (!volume.Tags.some(tag => tag.Key === `${APP_NAME}.enable` && tag.Value === 'true')) {
      return false;
    }

    return true;
  });

  volumes = volumes.map(volume => {
    const tag = volume.Tags.find(tag => tag.Key === 'Name');
    return {id: volume.VolumeId, name: tag.Value};
  });

  return volumes;
}

async function createSnapshot(volume) {
  const snapshot = await ec2
    .createSnapshot({VolumeId: volume.id, Description: `'${volume.name}' automatic backup`})
    .promise();
  await createTags(snapshot.SnapshotId, {
    Name: `${volume.name}-automatic-backup`,
    'created-by': APP_NAME
  });
  console.log(`Snapshot '${snapshot.SnapshotId}' created`);
}

async function createTags(resourceId, tags) {
  await ec2
    .createTags({
      Resources: [resourceId],
      Tags: Object.entries(tags).map(([key, value]) => ({Key: key, Value: value}))
    })
    .promise();
}

async function purgeSnapshots(volume) {
  let snapshots = await getSnapshots(volume);

  snapshots = snapshots.slice(MAX_SNAPSHOTS);

  for (const snapshot of snapshots) {
    await deleteSnapshot(snapshot);
  }
}

async function getSnapshots(volume) {
  let {Snapshots: snapshots} = await ec2
    .describeSnapshots({
      OwnerIds: ['self'],
      Filters: [
        {Name: 'volume-id', Values: [volume.id]},
        {Name: 'status', Values: ['completed']},
        {Name: 'tag:created-by', Values: [APP_NAME]}
      ]
    })
    .promise();

  snapshots = snapshots.map(snapshot => ({id: snapshot.SnapshotId, date: snapshot.StartTime}));

  snapshots.sort((a, b) => {
    if (a.date < b.date) {
      return -1;
    }
    if (a.date > b.date) {
      return 1;
    }
    return 0;
  });

  snapshots.reverse();

  return snapshots;
}

async function deleteSnapshot(snapshot) {
  await ec2.deleteSnapshot({SnapshotId: snapshot.id}).promise();
  console.log(`Snapshot '${snapshot.id}' deleted`);
}

exports.handler = async event => {
  const volumes = await getVolumes();

  for (const volume of volumes) {
    await createSnapshot(volume);
    await purgeSnapshots(volume);
  }
};
