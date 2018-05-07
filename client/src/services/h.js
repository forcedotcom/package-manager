const AUTH_ROUTE = "/login";

function toQueryString(obj) {
    let parts = [], i;
    for (i in obj) {
        if (obj.hasOwnProperty(i) && obj[i]) {
            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
    }
    return parts.join("&");
}

function request(obj) {
    return new Promise((resolve, reject) => {
        if (obj.params) {
            obj.url += '?' + toQueryString(obj.params);
        }

        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 401) {
                    window.location = AUTH_ROUTE;
                } else if (xhr.status > 199 && xhr.status < 300) {
                    resolve(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
                } else {
                    reject(xhr.responseText);
                }
            }
        };

        xhr.open(obj.method, obj.url, true);
        xhr.setRequestHeader("Accept", "application/json");
        if (obj.contentType) {
            xhr.setRequestHeader("Content-Type", obj.contentType);
        }
        xhr.send(obj.data ? JSON.stringify(obj.data) : undefined);
    });

}

export let get = (url, params, noauth) => request({method: "GET", url, params, noauth});

export let post = (url, data) => request({method: "POST", contentType: "application/json", url, data});

export let put = (url, data) => request({method: "PUT", contentType: "application/json", url, data});

export let patch = (url, data) => request({method: "PATCH", contentType: "application/json", url, data});

export let del = (url) => request({method: "DELETE", url});