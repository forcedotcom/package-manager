'use strict';

const rewire = require('rewire');
const auth = rewire('./auth');

const sanitizeReturnTo = auth.__get__('sanitizeReturnTo');
test('Sanitizer', () => {
	expect(sanitizeReturnTo(123)).toBe(null);
	expect(sanitizeReturnTo('/safe/url')).toBe('/safe/url');
});