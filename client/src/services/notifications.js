import io from 'socket.io-client';

import {NotificationManager} from 'react-notifications';

import * as authService from "./AuthService";

// const apiUrl = process.env.NODE_ENV === 'production' ? process.env.API_URL : process.env.REACT_APP_DEV_API_URL;
const apiUrl = process.env.API_URL || 'http://localhost:5000';
const socket = io(apiUrl);

// Global admin events
socket.on("fail", e => error(e.message, e.subject));
socket.on("alert", e => info(e.message, e.subject));
socket.on("alert-invalid-org", e => error(e.message, e.subject, 10000, 
	() => authService.oauthOrgURL(e.org.instance_url).then(url => window.location.href = url)));

export let info = (message, subject, timeout, onClick) => {NotificationManager.info(message, subject, timeout, onClick)};
export let error = (message, subject, timeout, onClick) => {NotificationManager.error(message, subject, timeout, onClick)};
export let success = (message, subject, timeout, onClick) => {NotificationManager.success(message, subject, timeout, onClick)};

export let on = (eventName, cb) => {socket.on(eventName, cb)};
export let remove = (eventName, cb) => {socket.on(eventName, cb)};
export let emit = (eventName, data) => {socket.emit(eventName, data)};
