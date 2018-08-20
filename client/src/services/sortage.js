import sort from 'js-flock/es5/sort';

const PREFIX = "__sortage";
const SORTS_PREFIX = PREFIX + "__sorts";
const PAGESIZE_PREFIX = PREFIX + "__pagesize";
const TABS_PREFIX = PREFIX + "__tabs";
const SELECTED_NAME_PREFIX = PREFIX + "__selname";


export const hasChanged = (sorted, key) => {
	const lastJson = window.localStorage.getItem(SORTS_PREFIX + key);
	const thisJson = JSON.stringify(sorted);
	return lastJson !== thisJson;
};

export const getSorts = (key) => {
	if (!key) {
		return null;
	}

	const str = window.localStorage.getItem(SORTS_PREFIX + key);
	return str ? JSON.parse(str) : [];
};

const setSorts = (key, sorts) => {
	if (!key) {
		return;
	}

	if (sorts) {
		window.localStorage.setItem(SORTS_PREFIX + key, JSON.stringify(sorts));
	}
};

export let sortRows = (sortColumns, rows, key) => {
	if (sortColumns && sortColumns.length > 0) {
		let sortColumn = sortColumns[0].id;
		if (sortColumns[0].desc) {
			sort(rows).desc(r => getSortValue(r, sortColumn));
		} else {
			sort(rows).asc(r => getSortValue(r, sortColumn));
		}
	}
	setSorts(key, sortColumns);
};

const getSortValue = (rec, colName) => {
	const val = rec[colName];
	// Being expedient here.  If the colName contains version_number...it is a version number.
	return colName.indexOf("version_number") !== -1 ? getSortableVersion(val) : val;
};

export let getSortableVersion = (dotVersion) => {
	if (!dotVersion)
		return 0;
	let realVersionNumber = dotVersion.split(".");
	return realVersionNumber.map(v => {
		let value = v;
		let missingZeroes = 4 - value.length;
		for (let z = 0; z < missingZeroes; z++) {
			value = '0' + value;
		}
		return value;
	}).join("");
};

export let getSortOrder = (contextKey, defaultField, defaultDirection) => {
	let orderJson = window.localStorage.getItem(PREFIX + contextKey);
	return orderJson ? JSON.parse(orderJson) : {field: defaultField, direction: defaultDirection};
};

export let changeSortOrder = (contextKey, field, desc) => {
	let sortOrder = getSortOrder(contextKey);
	if (desc !== undefined) {
		sortOrder = {field: field, direction: desc};
	} else if (sortOrder.field === field) {
		sortOrder.direction = sortOrder.direction !== 'desc' ? 'desc' : 'asc';
	} else {
		sortOrder = {field: field, direction: 'desc'};
	}

	window.localStorage.setItem(PREFIX + contextKey, JSON.stringify(sortOrder));
	return sortOrder;
};

export let getPageSize = (contextKey, def = 25) => {
	if (!contextKey)
		return def;

	let str = window.localStorage.getItem(PAGESIZE_PREFIX + contextKey);
	try {
		return str ? parseInt(str, 10) : def;
	} catch (e) {
		return def;
	}
};

export let setPageSize = (contextKey, num) => {
	if (contextKey) {
		window.localStorage.setItem(PAGESIZE_PREFIX + contextKey, num);
	}
};

export let getTabIndex = (contextKey, defIndex = 0) => {
	if (!contextKey)
		return defIndex;

	let str = window.localStorage.getItem(TABS_PREFIX + contextKey);
	try {
		return str ? parseInt(str, 10) : defIndex;
	} catch (e) {
		return defIndex;
	}
};

export let setTabIndex = (contextKey, index) => {
	if (contextKey) {
		window.localStorage.setItem(TABS_PREFIX + contextKey, index);
	}
};

export let getSelectedName = (contextKey, defName) => {
	if (!contextKey)
		return defName;

	let str = window.localStorage.getItem(SELECTED_NAME_PREFIX + contextKey);
	try {
		return str ? str : defName;
	} catch (e) {
		return defName;
	}
};

export let setSelectedName = (contextKey, name) => {
	if (contextKey) {
		window.localStorage.setItem(SELECTED_NAME_PREFIX + contextKey, name);
	}
};