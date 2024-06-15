const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 4000;
// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://tour-sport.web.app",
    ],
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// dabase connect here

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.dbURL;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const serviceCollection = client.db("tourSport").collection("service");
    const bookingCollection = client.db("tourSport").collection("booking");

    // create middlewares

    app.post("/jwt", (req, res) => {
      const email = req.body.email;
      console.log(email);
      const token = jwt.sign({ email }, process.env.secret, {
        expiresIn: "10h",
      });
      res
        .cookie("AccessToken", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .send({ message: "Success" });
    });

    app.post("/logOut", (req, res) => {
      try {
        const user = req?.user;
        res
          .clearCookie("AccessToken", {
            maxAge: 0,
            secure: true,
            sameSite: "none",
          })
          .send({ success: true });
      } catch (error) {
        res.status(500).send("Server Internal error", error);
      }
    });

    const verify = (req, res, next) => {
      const token = req.cookies.AccessToken;
      if (!token) {
        return res.status(401).send({ message: "Forbidden Access", code: 401 });
      }
      jwt.verify(token, process.env.secret, (err, decode) => {
        if (err) {
          return res.status(403).send({ message: "Unauthorized", code: 403 });
        }
        req.user = decode;
        next();
      });
    };

    // create service

    app.post("/api/v1/service", async (req, res) => {
      try {
        const service = req.body;
        const result = await serviceCollection.insertOne(service);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error", error);
      }
    });

    // get service

    app.get("/api/v1/services", async (req, res) => {
      try {
        const search = req.query.search || "";
        const searchRegExp = new RegExp(".*" + search + ".*", "i");
        const filter = {
          $or: [
            {
              serviceName: { $regex: searchRegExp },
            },
          ],
        };
        const result = await serviceCollection.find(filter).toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error", error);
      }
    });

    // get single service

    app.get("/api/v1/service/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await serviceCollection.findOne(filter);

        if (result) {
          res.status(200).send(result);
        } else {
          res.status(404).send("Service not found");
        }
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // get service filtering by email
    app.get("/api/v1/my-services", verify, async (req, res) => {
      try {
        const userEmail = req.user.email;
        const requestedEmail = req.query.email;
        const yourEmail = req.query.yourEmail;

        console.log({ userEmail, requestedEmail, yourEmail });

        if (userEmail !== requestedEmail && userEmail !== yourEmail) {
          return res.status(401).send({ message: "Unauthorized", code: 401 });
        }

        // Query to retrieve services associated with the requested email
        const query = "SELECT * FROM services WHERE serviceProviderEmail = ?";

        // Execute the query
        connection.query(query, [requestedEmail], (error, results) => {
          if (error) {
            console.error("Error retrieving services:", error);
            return res
              .status(500)
              .send("Server Internal error: " + error.message);
          }
          // Send the results back as a response
          res.status(200).send(results);
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Server Internal error: " + error.message);
      }
    });

    // delete service

    app.delete("/api/v1/service/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await serviceCollection.deleteOne(filter);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // update service

    app.put("/api/v1/service/:id", async (req, res) => {
      try {
        const {
          serviceProviderName,
          serviceProviderEmail,
          serviceProviderLocation,
          serviceName,
          servicePrice,
          serviceImage,
          serviceArea,
          serviceDsc,
          serviceProviderImage,
        } = req.body;

        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateService = {
          $set: {
            serviceProviderName,
            serviceProviderEmail,
            serviceProviderLocation,
            serviceName,
            servicePrice,
            serviceImage,
            serviceArea,
            serviceDsc,
            serviceProviderImage,
          },
        };

        const result = await serviceCollection.updateOne(filter, updateService);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // create booking

    app.post("/api/v1/booking", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // get All booking

    // app.get("/api/v1/bookings", async (req, res) => {
    //   try {
    //     const result = await bookingCollection.find().toArray();
    //     res.status(200).send(result);
    //   } catch (error) {
    //     res.status(500).send("Server Internal error: " + error);
    //   }
    // });

    // get booking filter by buyer email

    app.get("/api/v1/buyer/bookings", verify, async (req, res) => {
      try {
        const email = req.query.email;
        if (email !== req.user?.email) {
          return res.status(401).send({ message: "Unauthrize" });
        }

        const filter = { buyerEmail: email };
        const result = await bookingCollection.find(filter).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Internal error: " + error);
      }
    });

    app.get("/api/v1/provider/bookings", verify, async (req, res) => {
      try {
        const email = req.query.email;
        if (email !== req.user?.email) {
          return res.status(401).send({ message: "Unauthrize" });
        }
        const filter = { serviceProviderEmail: email };
        const result = await bookingCollection.find(filter).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // booking delete

    app.delete("/api/v1/booking/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(filter);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // patch booking status update

    app.patch("/api/v1/status/:id", async (req, res) => {
      try {
        const { status } = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateStatus = {
          $set: {
            status,
          },
        };
        const result = await bookingCollection.updateOne(filter, updateStatus);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send("Server Internal error: " + error);
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  try {
    res.status(200).send("<h1>CareerNest Server is Running ...</h1>");
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is runnig at http://localhost:${PORT}`);
});
