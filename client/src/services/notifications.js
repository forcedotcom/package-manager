import {NotificationManager} from 'react-notifications';
import socketIOClient from "socket.io-client";

const socket = socketIOClient();
	
socket.on("alert", e => info(e.message, e.subject));
socket.on("fail", e => error(e.message, e.subject));

export let info = (message, subject, timeout, onClick) => {NotificationManager.info(message, subject, timeout, onClick)};
export let error = (message, subject, timeout, onClick) => {NotificationManager.error(message, subject, timeout, onClick)};
export let success = (message, subject, timeout, onClick) => {NotificationManager.success(message, subject, timeout, onClick)};

export let on = (eventName, cb) => {socket.on(eventName, cb)};
export let remove = (eventName, cb) => {socket.on(eventName, cb)};
export let emit = (eventName, data) => {socket.emit(eventName, data)};
