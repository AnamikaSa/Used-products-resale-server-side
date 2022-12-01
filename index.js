const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
        const ProductsCollection = client.db('resale_products').collection('addedProducts');
        const paymentsCollection = client.db('resale_products').collection('payments');

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
            const bookings=req.body;
            const r = await bookingCollection.insertOne(bookings);
            res.send(r);
        })

        app.get('/bookings/:id', async (req,res)=>
        {
            const id =req.params.id;
            const query={_id: ObjectId(id)};
            const b= await bookingCollection.findOne(query);
            res.send(b);
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

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        
        app.put('/payments', async (req, res) =>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc)
            res.send(result);
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

        app.get('/users/:role', async (req, res) => {
            const user =req.params.role;
            const query = {role:user};
            const uRole = await usersCollection.find(query).toArray();
            res.send(uRole);
        })

        app.delete('/users/:id', async(req,res)=>
        {
            const id= req.params.id;
            const q={_id: ObjectId(id)};
            const r= await ProductsCollection.deleteOne(q);
            res.send(r);
            console.log("Delete tring",id);
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
            res.send({ isBuyer: user?.role === 'buyer' });
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