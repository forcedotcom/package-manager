/*
 * Navigation utilities
 */
export function toPath(recordType, recordId) {
	const path = recordId ? `/${recordType}/${recordId}` : `/${recordType}`;
	if (!window.location.pathname.endsWith(path)) {
		window.location = path;
	}
}

export const transid = () => Date.now();