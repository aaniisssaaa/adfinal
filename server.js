const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Чтобы открывались твои .html файлы

// 1. ПОДКЛЮЧЕНИЕ К ТВОЕЙ БАЗЕ
mongoose.connect('mongodb://localhost:27017/rental_service')
    .then(() => console.log('✅ Успешно подключено к MongoDB: rental_service'))
    .catch(err => console.error('❌ Ошибка подключения:', err));

// 2. СХЕМА И ИНДЕКС (Indexing Strategy)
const vehicleSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: String,
    pricePerDay: Number,
    status: { type: String, default: 'available' },
    reviews: [{ user: String, comment: String }]
});

// Создаем составной индекс для защиты
vehicleSchema.index({ brand: 1, pricePerDay: -1 });

// 3. ЭНДПОИНТ: ЛОГИН
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Неверные данные' });
    }
});

// 4. ЭНДПОИНТ: ПОИСК (Advanced Query)
app.get('/api/search', async (req, res) => {
    const { brand, maxPrice } = req.query;
    let query = {};
    if (brand) query.brand = new RegExp(brand, 'i');
    if (maxPrice) query.pricePerDay = { $lte: Number(maxPrice) };

    const results = await Vehicle.find(query);
    res.json(results);
});

// 5. ЭНДПОИНТ: АГРЕГАЦИЯ (Aggregation Pipeline для Dashboard)
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await Vehicle.aggregate([
            {
                $group: {
                    _id: "$brand",
                    totalCars: { $sum: 1 },
                    avgPrice: { $avg: "$pricePerDay" }
                }
            },
            { $sort: { totalCars: -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 6. CRUD ОПЕРАЦИИ
app.get('/api/vehicles', async (req, res) => {
    const list = await Vehicle.find();
    res.json(list);
});

app.post('/api/vehicles', async (req, res) => {
    const newCar = new Vehicle(req.body);
    await newCar.save();
    res.json(newCar);
});

app.delete('/api/vehicles/:id', async (req, res) => {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// ЗАПУСК
app.listen(3000, () => {
    console.log('🚀 Сервер летит на http://localhost:3000');
});

// Эндпоинт для добавления отзыва (использует оператор $push)
app.post('/api/vehicles/:id/reviews', async (req, res) => {
    try {
        const { user, comment } = req.body;
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { $push: { reviews: { user, comment } } }, // Добавляет объект в массив
            { new: true }
        );
        res.json(updatedVehicle);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

