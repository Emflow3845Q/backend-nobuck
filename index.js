const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

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

// ── Obtener todas las órdenes ─────────────────────────
app.get('/orders', async (req, res) => {
    console.log("GET /orders recibido");

    try {
        const db  = await getDB();
        const col = db.collection('orders');

        const userId = req.query.userId || 'default_user';
        const orders = await col
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({ success: true, orders });

    } catch (err) {
        console.error("Error en GET /orders:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DIRECCIONES ───────────────────────────────────────

// GET /addresses?userId=xxx — obtener todas las direcciones del usuario
app.get('/addresses', async (req, res) => {
    console.log("GET /addresses recibido");
    try {
        const db      = await getDB();
        const col     = db.collection('addresses');
        const userId  = req.query.userId || 'default_user';
        const addresses = await col
            .find({ userId })
            .sort({ isDefault: -1, createdAt: -1 })
            .toArray();

        res.json({ success: true, addresses });
    } catch (err) {
        console.error("Error en GET /addresses:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /addresses — crear nueva dirección
app.post('/addresses', async (req, res) => {
    console.log("POST /addresses recibido");
    try {
        const db  = await getDB();
        const col = db.collection('addresses');

        const { userId = 'default_user', label, address, city, province, postalCode, country, isDefault = false } = req.body;

        // Si la nueva es predeterminada, quitar la anterior
        if (isDefault) {
            await col.updateMany({ userId }, { $set: { isDefault: false } });
        }

        const newAddress = {
            userId,
            label,
            address,
            city,
            province,
            postalCode,
            country,
            isDefault,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await col.insertOne(newAddress);
        console.log(`Dirección creada: ${result.insertedId}`);

        res.json({ success: true, insertedId: result.insertedId.toString() });
    } catch (err) {
        console.error("Error en POST /addresses:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /addresses/:id — editar dirección
app.put('/addresses/:id', async (req, res) => {
    console.log(`PUT /addresses/${req.params.id} recibido`);
    try {
        const db  = await getDB();
        const col = db.collection('addresses');

        const { userId = 'default_user', label, address, city, province, postalCode, country, isDefault = false } = req.body;

        // Si se marca como predeterminada, quitar la anterior
        if (isDefault) {
            await col.updateMany({ userId }, { $set: { isDefault: false } });
        }

        const result = await col.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { label, address, city, province, postalCode, country, isDefault, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'Dirección no encontrada' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Error en PUT /addresses:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /addresses/:id — eliminar dirección
app.delete('/addresses/:id', async (req, res) => {
    console.log(`DELETE /addresses/${req.params.id} recibido`);
    try {
        const db  = await getDB();
        const col = db.collection('addresses');

        const result = await col.deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Dirección no encontrada' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Error en DELETE /addresses:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /addresses/:id/default — marcar como predeterminada
app.patch('/addresses/:id/default', async (req, res) => {
    console.log(`PATCH /addresses/${req.params.id}/default recibido`);
    try {
        const db     = await getDB();
        const col    = db.collection('addresses');
        const userId = req.body.userId || 'default_user';

        await col.updateMany({ userId }, { $set: { isDefault: false } });
        await col.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { isDefault: true, updatedAt: new Date() } }
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Error en PATCH /addresses/default:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Iniciar servidor ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
    getDB().catch(err => console.error("Error inicial MongoDB:", err.message));
});