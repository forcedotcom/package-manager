const englishNums = [
	"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]; 

exports.pluralizeIt = (arr, str, pluralSuffix = "s") => {
	const len = arr.size ? arr.size : arr.length || arr;
	const num = len < englishNums.length ? englishNums[len] : this.generalizeIt(len);
	const suffix = len === 0 || len > 1 ? pluralSuffix : "";
	return {num, str: (str + suffix)}
};

exports.generalizeIt = (len) => {
	let str = String(len).charAt(0);
	for (let n = len; n > 10; n = n/10) {
		str += "0";
	}
	return str + "+";
};

exports.sanitizeIt = (path) => {
	if (!path || typeof path !== 'string')
		return null;

	const segments = path.split("/", 10);
	// Extremely cautious.  If any path segments contain any non-alphanum characters, forget it
	for (let i = 1; i < segments.length; i++) {
		if (segments[i].match(/[\W]+/g)) {
			return null;
		}
	}
	return segments.join('/');
}
