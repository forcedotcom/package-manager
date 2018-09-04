const englishNums = [
	"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]; 

export let pluralizeIt = (arr, str, pluralSuffix = "s") => {
	const len = arr.size ? arr.size : arr.length;
	const num = len < englishNums.length ? englishNums[len] : generalizeIt(len);
	const suffix = len === 0 || len > 1 ? pluralSuffix : "";
	return {num, str: (str + suffix)}
};

export let generalizeIt = (len) => {
	let str = String(len).charAt(0);
	for (let n = len; n > 10; n = n/10) {
		str += "0";
	}
	return str + "+";
};