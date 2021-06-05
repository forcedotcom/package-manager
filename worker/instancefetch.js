const db = require('../util/pghelper');
const bent = require('bent');
const { logger } = require('../util/logger');

const getJSON = bent('json');

let adminJob;

const updateInstances = async (job) => {
	adminJob = job;

	try {
		const instancesFromApi = await getInstancesFromApi();
		const mapInstancesFromDb = await getInstancesFromDB();
		
		// Compute the differences
		const instances_to_upsert = instancesFromApi.filter(instance => {
			if(mapInstancesFromDb[instance.key]) {
				const instance_from_db = mapInstancesFromDb[instance.key];
				if (instance_from_db.location !== instance.location || instance_from_db.environment !== instance.environment
					|| instance_from_db.release !== instance.release|| instance_from_db.status !== instance.status) {
					return instance
				   }
			} else {
				return instance
			}
		});

		upsert(instances_to_upsert, 1000);
		
	} catch (e) {
		logger.error(e);
	}
}

const getInstancesFromApi = async () => {
	const instancesFromApi = await getJSON('https://api.status.salesforce.com/v1/instances');

	// Add internal instances
	instancesFromApi.push(
		{key: 'GS0', location: 'Internal', environment: 'Production'},
		{key: 'CS46', location: 'Internal', environment: 'Sandbox'},
		{key: 'CS49', location: 'Internal', environment: 'Sandbox'},
	)

	return instancesFromApi.map(instance => ({ 
		key: instance.key, 
		location: instance.location,
		environment: instance.environment.charAt(0).toUpperCase() + instance.environment.slice(1),
		release: instance.releaseNumber,
		status: instance.status
	}));
}

const getInstancesFromDB = async () => {
	const query = ` SELECT key, location, environment, release, status FROM instance `;
	const instancesFromDb = await db.query(query)

	return instancesFromDb.reduce((map, obj) => {
		map[obj.key] = obj;
		return map;
	}, {});
}

const upsert = async (recs, batchSize) => {
	const count = recs.length;
	if (count === 0) {
		return; // nothing to see here
	}

	adminJob.postDetail(`Storing ${count} instance records from status.salesforce.com`);
	for (let start = 0; start < count && !adminJob.canceled;) {
		logger.info(`Batch upserting instance records`, {batch: Math.min(start + batchSize, count), count: count});
		await upsertBatch(recs.slice(start, start += batchSize));
	}
}

const upsertBatch = async (recs) => {
	const params = [];
	const values = [];
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		params.push(`$${n++},$${n++},$${n++},$${n++},$${n++}`);
		values.push(rec.key, rec.location, rec.environment, rec.release, rec.status);
	}
	const sql = `INSERT INTO instance (key, location, environment, release, status) VALUES (${params.join('),(')})
	  			on conflict (key) do update set location = excluded.location, environment = excluded.environment, 
			 	release = excluded.release, status = excluded.status, modified_date = NOW()`;
	
	try {
		await db.insert(sql, values);
	} catch (e) {
		logger.error(e);
	}
}

exports.updateInstances = updateInstances;
