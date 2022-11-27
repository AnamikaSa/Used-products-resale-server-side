const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.bu444bw.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('resale_products').collection('categories');
        const bookingCollection = client.db('resale_products').collection('bookings');

        app.get('/categories', async (req, res) => {
            const query = {};
            const o = await categoriesCollection.find(query).toArray();
            res.send(o);
        })

        app.get('/categories/:id',async (req,res)=>{
            const id= req.params.id;
            const query= {_id : ObjectId(id) };
            const category = await categoriesCollection.findOne(query);
            res.send(category);
        })

        app.post('/bookings', async(req,res)=>
        {
            const booking=req.body;
            const r = await bookingCollection.insertOne(booking);
            res.send(r);
        })

    }
    finally { }
}
run().catch(console.log);



app.get('/', async (req, res) => {
    res.send("Server Running")
})

app.listen(port, () => console.log(`Running on: ${port}`))