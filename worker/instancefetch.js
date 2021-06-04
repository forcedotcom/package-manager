const db = require('../util/pghelper');
const request = require('request');
const { logger } = require('../util/logger');

let adminJob;

const updateInstances = async (job) => {
	adminJob = job;

	try {
		const instancesFromApi = await getInstancesFromApi();
		const mapInstancesFromDb = await getInstancesFromDB();
		
		// Compute the differences
		const instances_to_upsert = instancesFromApi.filter(instance => {
			if(mapInstancesFromDb[instance.key]) {
				instance_from_db = mapInstancesFromDb[instance.key];
				if (instance_from_db.location != instance.location || instance_from_db.environment != instance.environment
					|| instance_from_db.release != instance.release|| instance_from_db.status != instance.status) {
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
	let response = await promisifiedRequest('https://api.status.salesforce.com/v1/instances');
	const instancesFromApi = JSON.parse(response.body);

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
	let query = ` SELECT key, location, environment, release, status FROM instance `;
	const instancesFromDb = await db.query(query)
	
	return instancesFromDb.reduce((map, obj) => {
		map[obj.key] = obj;
		return map;
	}, {});
}

const promisifiedRequest = (options) => {
	return new Promise((resolve,reject) => {
		request(options, (error, response, body) => {
		if (response) {
			return resolve(response);
		}
		if (error) {
			return reject(error);
		}
		});
	});
};

const upsert = async (recs, batchSize) => {
	let count = recs.length;
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
	let values = [];
	let sql = `INSERT INTO instance (key, location, environment, release, status) VALUES `;
	for (let i = 0, n = 1; i < recs.length; i++) {
		let rec = recs[i];
		if (i > 0) {
			sql += ','
		}
		sql += `($${n++},$${n++},$${n++},$${n++},$${n++})`;
		values.push(rec.key, rec.location, rec.environment, rec.release, rec.status);
	}
	sql += ` on conflict (key) do update set location = excluded.location, environment = excluded.environment, 
			 release = excluded.release, status = excluded.status, modified_date = NOW()`;
	
	try {
		logger.warn('before update');
		await db.insert(sql, values);
		logger.warn('after update');
	} catch (e) {
		logger.warn('error update');
		logger.error(e);
	}
}

exports.updateInstances = updateInstances;
