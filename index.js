const express = require('express');
const { MongoClient } = require('mongodb');

const app  = express();
app.use(express.json());

const CONNECTION_STRING = "mongodb+srv://nobuck_user:w8kg28FFy74k1e0j@nobuck.x8myacw.mongodb.net/?appName=nobuck";

const client = new MongoClient(CONNECTION_STRING, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
});

let isConnected = false;

async function getDB() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log("MongoDB conectado");
    }
    return client.db('nobuck');
}

// ── Health check ──────────────────────────────────────
app.get('/health', async (req, res) => {
    try {
        await getDB();
        res.json({ status: 'ok', mongo: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', mongo: err.message });
    }
});

// ── Crear orden ───────────────────────────────────────
app.post('/orders', async (req, res) => {
    console.log("POST /orders recibido");
    console.log("Body:", JSON.stringify(req.body));

    try {
        const db  = await getDB();
        const col = db.collection('orders');

        const date     = new Date();
        const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
        const rnd      = Math.floor(Math.random() * 9000) + 1000;
        const orderNumber = `NO-${datePart}-${rnd}`;

        const order = {
            orderNumber,
            ...req.body,
            status:    'PENDIENTE',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await col.insertOne(order);
        console.log(`Orden creada: ${orderNumber} | _id: ${result.insertedId}`);

        res.json({
            success:     true,
            orderNumber: orderNumber,
            insertedId:  result.insertedId.toString()
        });

    } catch (err) {
        console.error("Error en /orders:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Iniciar servidor ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
    getDB().catch(err => console.error("Error inicial MongoDB:", err.message));
});