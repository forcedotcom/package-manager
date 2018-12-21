import {NotificationManager} from 'react-notifications';
import socketIOClient from "socket.io-client";

import * as authService from "./AuthService";

const socket = socketIOClient();
	
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
