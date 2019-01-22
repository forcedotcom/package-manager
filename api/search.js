const orgs = require('../api/orgs');

async function requestByTerm(req, res, next) {
	try {
		const term = req.query.term;
		let orgResults = await orgs.findByTerm(term, 20);
		let results = orgResults.map(o => {
			return {id: o.org_id, type: "org", title: o.name, detail: `${o.account_name} • ${o.org_id}`}
		});
		return res.send(JSON.stringify(results));
	} catch (err) {
		next(err);
	}
}

exports.requestByTerm = requestByTerm;