
const PREFIX = "__storage";

export const getPreviewRows = (key) => {
	if (!key) {
		return null;
	}

	const str = window.localStorage.getItem(PREFIX + key);
	return str ? JSON.parse(str) : null;
};

export const setPreviewRows = (key, previewRows) => {
	if (!key) {
		return;
	}
	if (!previewRows) {
		window.localStorage.removeItem(PREFIX + key);
	} else {
		window.localStorage.setItem(PREFIX + key, JSON.stringify(previewRows));
	}
};