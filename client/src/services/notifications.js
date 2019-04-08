import io from 'socket.io-client';

import {NotificationManager} from 'react-notifications';

import * as authService from "./AuthService";

// Note: REACT_APP_xyz is only set in dev builds.  If it is undefined we just default
// to the browser url (which is good for production).
const apiUrl = process.env.REACT_APP_API_URL;
const socket = io(apiUrl);

// Global admin events
socket.on("fail", e => error(e.message, e.subject));
socket.on("alert", e => info(e.message, e.subject));
socket.on("alert-invalid-org", e => error(e.message, e.subject, 15000,
	() => authService.oauthOrgURL(e.org.instance_url, e.org.type).then(url => window.location.href = url)));

export let warning = (message, subject, timeout, onClick) => {NotificationManager.warning(message, subject, timeout, onClick)};
export let info = (message, subject, timeout, onClick) => {NotificationManager.info(message, subject, timeout, onClick)};
export let error = (message, subject, timeout, onClick) => {NotificationManager.error(message, subject, timeout, onClick)};
export let success = (message, subject, timeout, onClick) => {NotificationManager.success(message, subject, timeout, onClick)};

export let on = (eventName, cb) => {socket.on(eventName, cb)};
export let remove = (eventName, cb) => {socket.on(eventName, cb)};
export let emit = (eventName, data) => {socket.emit(eventName, data)};
