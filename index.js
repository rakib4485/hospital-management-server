const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const jwt = require('jsonwebtoken');
// const nodemailer = require("nodemailer");
require('dotenv').config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET);


const app = express();

//middleware
app.use(cors());
app.use(express.json());
const uri = "mongodb+srv://havenCare:jHPfeYH79KdnwBR5@cluster0.efsdsdy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const usersCollection = client.db('havenCare').collection('users');
    const appointmentOptionCollection = client.db('havenCare').collection('appointmentOptions');
    const bookingsCollection = client.db('havenCare').collection('bookings');

    app.get('/users', async(req, res) => {
        await client.connect();
        const query = {};
        const result = await usersCollection.find(query).toArray();
        res.send(result);
    });

    app.post('/users', async(req, res) => {
        await client.connect();
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    })

    app.get('/appointmentOptions', async (req, res) => {
      await client.connect();
      const date = req.query.date;
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();
      //get the booking of provided date
      const bookingQuery = { appointmentDate: date }
      const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

      options.forEach(option => {
        const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
        const bookedSlots = optionBooked.map(book => book.slot);
         const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
        option.slots = remainingSlots;
      })
      res.send(options);
    });

    app.post('/appointmentOptions', async (req, res) => {
      await client.connect();
      const appointmentOption = req.body;
      
      const result = await appointmentOptionCollection.insertOne(appointmentOption);
      res.send(result);
    })

    app.get('/appointmentSpecialty', async (req, res) => {
      await client.connect();
      const query = {}
      const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray();
      res.send(result);
    });

    app.get('/bookings', async (req, res) => {
      await client.connect();
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.get('/doctorbookings', async (req, res) => {
      await client.connect();
      const email = req.query.email;
      const query = { doctorEmail: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.post('/bookings', async (req, res) => {
      await client.connect();
      const booking = req.body;
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment
      }
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already have an booking on ${booking.appointmentDate}`
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get('/users/doctor/:email', async (req, res) => {
      await client.connect();
      const email = req.params.email;
      const query = { email }
      const user = await usersCollection.findOne(query);
      res.send({ isDoctor: user?.type === 'doctor' });
    });

    app.get('/users/isUser/:email', async (req, res) => {
      await client.connect();
      const email = req.params.email;
      const query = { email }
      const user = await usersCollection.findOne(query);
      res.send({ isUser: user?.type === 'user'});
    });

  } finally {
    await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})