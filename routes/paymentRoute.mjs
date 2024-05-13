// payment_route.mjs
import express from 'express';
const payment_route = express();

import bodyParser from 'body-parser';
payment_route.use(bodyParser.json());
payment_route.use(bodyParser.urlencoded({ extended:false }));

import path from 'path';

payment_route.set('view engine','ejs');
payment_route.set('views',path.join(new URL(import.meta.url).pathname, '../views'));

import paymentController from '../controllers/paymentController';


payment_route.post('/payment', paymentController.payment);
payment_route.get('/success', paymentController.success);
payment_route.get('/failure', paymentController.failure);

export default payment_route;
