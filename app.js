require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);

app.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
