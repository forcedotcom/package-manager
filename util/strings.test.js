'use strict';

const {sanitizeIt} = require("../util/strings");

test('Sanitizer', () => {
	expect(sanitizeIt(123)).toBe(null);
	expect(sanitizeIt('/safe/url')).toBe('/safe/url');
});
