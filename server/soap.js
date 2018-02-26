'use strict';

/**
 * Invoke SOAP call using method and arguments
 */
function invoke(conn, method, args, options, xmlns) {
    let message = {};
    message[method] = args;
    let request = {
        method: "POST",
        url: conn.instanceUrl + "/services/Soap/u/" + conn.version,
        body: createEnvelope(conn, message, xmlns || 'urn:partner.soap.sforce.com'),
        headers: {'Content-Type': 'text/xml', 'SOAPAction': '""'}
    };
    return conn.request(request, options);
}

function isSessionExpired(response) {
    return response.statusCode === 500 &&
        /<faultcode>[a-zA-Z]+:INVALID_SESSION_ID<\/faultcode>/.test(response.body);
}

function parseError(body) {
    let error = lookupValue(body, [ /:Envelope$/, /:Body$/, /:Fault$/ ]);
    return {
        errorCode: error[0].faultcode[0],
        message: error[0].faultstring[0]
    };
}

function getResponseBody(body) {
    return lookupValue(body, [ /:Envelope$/, /:Body$/, /.+/ ]);
}

/**
 * @private
 */
function lookupValue(obj, propRegExps) {
    let regexp = propRegExps.shift();
    if (!regexp) {
        return obj;
    }
    else if (Array.isArray(obj)) {
        let objs = obj;
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            for (let prop in obj) {
                if (regexp.test(prop)) {
                    return lookupValue(obj[prop], propRegExps);
                }
            }
        }
        return null;
    }
    else {
        for (let prop in obj) {
            if (regexp.test(prop)) {
                return lookupValue(obj[prop], propRegExps);
            }
        }
        return null;
    }
}

/**
 * @private
 */
function toXML(name, value) {
    if (typeof name === 'object') {
        value = name;
        name = null;
    }
    if (Array.isArray(value)) {
        return value.map(function(v) { return toXML(name, v); }).join('');
    } else {
        let attrs = [];
        let elems = [];
        if (value !== null && typeof value === 'object') {
            for (let k in value) {
                let v = value[k];
                if (k[0] === '@') {
                    k = k.substring(1);
                    attrs.push(k + '="' + v + '"');
                } else {
                    elems.push(toXML(k, v));
                }
            }
            value = elems.join('');
        } else {
            value = String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }
        let startTag = name ? '<' + name + (attrs.length > 0 ? ' ' + attrs.join(' ') : '') + '>' : '';
        let endTag = name ? '</' + name + '>' : '';
        return  startTag + value + endTag;
    }
}

/**
 * @private
 */
function createEnvelope(conn, message, xmlns) {
    let header = {};
    if (conn.accessToken) {
        header.SessionHeader = { sessionId: conn.accessToken };
    }
    if (conn.callOptions) {
        header.CallOptions = conn.callOptions;
    }
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"',
        ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
        ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
        '<soapenv:Header xmlns="' + xmlns + '">',
        toXML(header),
        '</soapenv:Header>',
        '<soapenv:Body xmlns="' + xmlns + '">',
        toXML(message),
        '</soapenv:Body>',
        '</soapenv:Envelope>'
    ].join('');
}

exports.invoke = invoke;
exports.isSessionExpired = isSessionExpired;
exports.parseError = parseError;
exports.getResponseBody = getResponseBody;
