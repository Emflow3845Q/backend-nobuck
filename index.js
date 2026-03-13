const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
app.use(express.json());

const client = new MongoClient("mongodb+srv://emflowgamin_db_user:MzETagBHoQA5NuNv@nobuck.x8myacw.mongodb.net/?appName=nobuck");

app.post('/orders', async (req, res) => {
  await client.connect();
  const col = client.db('nobuck').collection('orders');
  const ts = Date.now(), rnd = Math.floor(Math.random()*9000)+1000;
  const order = { orderNumber: `NO-${ts}-${rnd}`, ...req.body, status:'PENDIENTE', createdAt: new Date() };
  await col.insertOne(order);
  res.json({ success: true, orderNumber: order.orderNumber });
});

app.listen(process.env.PORT || 3000);