const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.bu444bw.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const categoriesCollection = client.db('resale_products').collection('categories');
        const bookingCollection = client.db('resale_products').collection('bookings');
        const usersCollection = client.db('resale_products').collection('users');
        const ProductsCollection = client.db('resale_products').collection('added products');

        app.get('/categories', async (req, res) => {
            const query = {};
            const o = await categoriesCollection.find(query).toArray();
            // const alreadybooked= await bookingCollection.find(query).toArray();
            // o.forEach(op=>{
            //     const opbooked =alreadybooked.filter(b=> b.productName === op.name);
            //     const bp=opbooked.map(b=>b.piece);
            //     const remaining= op.piece.filter(pi=> !bp.includes(pi));
            //     op.piece=remaining;
            // })
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
            const bookings=req.body;
            const r = await bookingCollection.insertOne(bookings);
            res.send(r);
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })
        

        app.post('/users' ,async(req,res)=>{
            const user= req.body;
            const r= await usersCollection.insertOne(user);
            res.send(r);
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.put('/users/seller/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'seller'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.put('/users/buyer/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'buyer'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        })

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'buyer' });
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN)
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.post('/addproduct', async(req,res)=>{
            const Products= req.body;
            const r= await ProductsCollection.insertOne(Products);
            res.send(r);

        })

        app.get('/addproduct', async (req, res) => {
            const query = {};
            const r= await ProductsCollection.find(query).toArray();
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