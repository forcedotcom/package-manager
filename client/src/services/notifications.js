import {NotificationManager} from 'react-notifications';
import socketIOClient from "socket.io-client";

const socket = socketIOClient();
	
socket.on("alert", e => info(e.message, e.subject));
socket.on("fail", e => error(e.message, e.subject));

export let info = (message, subject) => {NotificationManager.info(message, subject)};
export let error = (message, subject) => {NotificationManager.error(message, subject)};
export let success = (message, subject) => {NotificationManager.success(message, subject)};

export let on = (eventName, cb) => {socket.on(eventName, cb)};
export let remove = (eventName, cb) => {socket.on(eventName, cb)};
export let emit = (eventName, data) => {socket.emit(eventName, data)};
