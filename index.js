const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const mysql = require("mysql");
const app = express();
const PORT = process.env.PORT || 4000;

// Create MySQL connection
const connection = mysql.createConnection({
  connectionLimit: 10,
  host: "localhost",
  user: "root",
  password: "",
  database: "toursport",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database: " + err.stack);
    return;
  }
  console.log("Connected to MySQL database as id " + connection.threadId);
});

// Middlewares
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

// Routes
app.post("/jwt", (req, res) => {
  const email = req.body.email;
  console.log({ email });
  const token = jwt.sign({ email }, process.env.SECRET, {
    expiresIn: "10h",
  });
  res
    .cookie("AccessToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .send({ message: "Success" });
});
// console.log(req.cookie);

app.post("/logOut", (req, res) => {
  try {
    res
      .clearCookie("AccessToken", {
        maxAge: 0,
        secure: true,
        sameSite: "None",
      })
      .send({ success: true });
  } catch (error) {
    res.status(500).send("Server Internal error", error);
  }
});

const verify = (req, res, next) => {
  console.log(req.cookies);
  const token = req.cookies.AccessToken;
  console.log({ token });
  if (!token) {
    return res.status(401).send({ message: "Forbidden Access", code: 401 });
  }
  jwt.verify(token, process.env.SECRET, (err, decode) => {
    if (err) {
      return res.status(403).send({ message: "Unauthorized", code: 403 });
    }
    req.user = decode;
    next();
  });
};

// Service APIs

app.post("/api/v1/service", async (req, res) => {
  try {
    const service = req.body;
    const result = await new Promise((resolve, reject) => {
      connection.query("INSERT INTO service SET ?", service, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send("Server Internal error: " + error.message);
  }
});

app.get("/api/v1/services", async (req, res) => {
  try {
    const search = req.query.search || "";
    const searchParam = "%" + search + "%";
    const query = "SELECT * FROM service WHERE serviceName LIKE ?";
    connection.query(query, [searchParam], (error, results, fields) => {
      if (error) {
        res.status(500).send("Server Internal error: " + error.message);
        return;
      }
      res.status(200).send(results);
    });
  } catch (error) {
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Implement other service APIs (get single service, update service, delete service)

// get single service

app.get("/api/v1/service/:id", (req, res) => {
  const _id = req.params.id;

  // Query to retrieve service from MySQL database
  const query = `SELECT * FROM service WHERE _id = ?`;

  connection.query(query, [_id], (error, results, fields) => {
    if (error) {
      console.error("Error retrieving service: " + error.message);
      res.status(500).send("Server Internal error: " + error.message);
      return;
    }

    if (results.length > 0) {
      res.status(200).send(results[0]);
    } else {
      res.status(404).send("Service not found");
    }
  });
});

// Define route to get services filtered by email
app.get("/api/v1/my-services", verify, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const requestedEmail = req.query.email;
    const yourEmail = req.query.yourEmail;

    console.log({ userEmail, requestedEmail, yourEmail });

    if (userEmail !== requestedEmail && userEmail !== yourEmail) {
      console.log({ userEmail, requestedEmail, yourEmail });
      return res.status(401).send({ message: "Unauthorized", code: 401 });
    }

    // Query to retrieve services associated with the requested email
    const query = "SELECT * FROM service WHERE serviceProviderEmail = ?";

    // Execute the query
    connection.query(query, [requestedEmail], (error, results) => {
      if (error) {
        console.error("Error retrieving services:", error.message);
        return res.status(500).send("Server Internal error: " + error.message);
      }
      // Send the results back as a response
      res.status(200).send(results);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Define route to delete service by ID
app.delete("/api/v1/service/:id", async (req, res) => {
  try {
    const _id = req.params.id;

    // Query to delete service from MySQL database
    const query = `DELETE FROM service WHERE _id = ?`;

    // Execute the query
    connection.query(query, [_id], (error, results, fields) => {
      if (error) {
        console.error("Error deleting service: " + error.message);
        res.status(500).send("Server Internal error: " + error.message);
        return;
      }

      if (results.affectedRows > 0) {
        res.status(200).send({ message: "Service deleted successfully" });
      } else {
        res.status(404).send("Service not found");
      }
    });
  } catch (error) {
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Define route to update service by ID
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

    const _id = req.params.id;

    // Query to update service in MySQL database
    const query = `
      UPDATE service
      SET serviceProviderName = ?, 
          serviceProviderEmail = ?, 
          serviceProviderLocation = ?, 
          serviceName = ?, 
          servicePrice = ?, 
          serviceImage = ?, 
          serviceArea = ?, 
          serviceDsc = ?, 
          serviceProviderImage = ? 
      WHERE _id = ?
    `;

    // Execute the query
    connection.query(
      query,
      [
        serviceProviderName,
        serviceProviderEmail,
        serviceProviderLocation,
        serviceName,
        servicePrice,
        serviceImage,
        serviceArea,
        serviceDsc,
        serviceProviderImage,
        _id,
      ],
      (error, results, fields) => {
        if (error) {
          console.error("Error updating service: " + error.message);
          res.status(500).send("Server Internal error: " + error.message);
          return;
        }

        if (results.affectedRows > 0) {
          res.status(200).send({ message: "Service updated successfully" });
        } else {
          res.status(404).send("Service not found");
        }
      }
    );
  } catch (error) {
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Booking APIs

app.post("/api/v1/booking", (req, res) => {
  try {
    // Destructure the item from req.body
    const {
      serviceProviderEmail,
      buyerEmail,
      serviceName,
      serviceImage,
      servicePrice,
      serviceTakingDate,
      message,
      status,
    } = req.body;

    // Insert data into the 'booking' table
    const query = `INSERT INTO booking 
                   (serviceProviderEmail, buyerEmail, serviceName, serviceImage, servicePrice, serviceTakingDate, message, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      serviceProviderEmail,
      buyerEmail,
      serviceName,
      serviceImage,
      servicePrice,
      serviceTakingDate,
      message,
      status,
    ];

    connection.query(query, values, (error, result) => {
      if (error) {
        console.error("Error inserting data: " + error.message);
        return res
          .status(500)
          .json({ error: "Server Internal error: " + error.message });
      }
      res.status(201).json({ message: "Booking created successfully", result });
    });
  } catch (error) {
    res.status(500).json({ error: "Server Internal error: " + error.message });
  }
});

app.get("/api/v1/buyer/bookings", async (req, res) => {
  try {
    const email = req.query.email;

    const query = "SELECT * FROM booking WHERE buyerEmail = ?";
    // Execute the query
    connection.query(query, [email], (err, results) => {
      if (err) {
        console.error("Error retrieving bookings:", err);
        return res.status(500).send("Server Internal error: " + err.message);
      }
      // Send the results back as a response
      res.status(200).send(results);
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Implement other booking APIs (get provider bookings, delete booking, update booking status)
// Define route to get provider bookings
app.get("/api/v1/provider/bookings", async (req, res) => {
  try {
    const email = req.query.email;
    // console.log({ email, req: req.user?.email });
    // if (email !== req.user?.email) {
    //   return res.status(401).send({ message: "Unauthorized" });
    // }

    // Query to retrieve bookings for the specified email
    const query = `SELECT * FROM booking WHERE serviceProviderEmail = ?`;

    // Execute the query
    connection.query(query, [email], (error, results, fields) => {
      if (error) {
        console.error("Error retrieving provider bookings: " + error.message);
        res.status(500).send("Server Internal error: " + error.message);
        return;
      }

      res.status(200).send(results);
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Define route to delete booking by ID
app.delete("/api/v1/booking/:id", async (req, res) => {
  try {
    const _id = req.params.id;

    // Query to delete booking from MySQL database
    const query = `DELETE FROM booking WHERE _id = ?`;

    // Execute the query
    connection.query(query, [_id], (error, results, fields) => {
      if (error) {
        console.error("Error deleting booking: " + error.message);
        res.status(500).send("Server Internal error: " + error.message);
        return;
      }

      if (results.affectedRows > 0) {
        res.status(200).send({ message: "Booking deleted successfully" });
      } else {
        res.status(404).send("Booking not found");
      }
    });
  } catch (error) {
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Define route to update status by ID
app.patch("/api/v1/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const _id = req.params.id;

    // Query to update status in MySQL database
    const query = `UPDATE booking SET status = ? WHERE _id = ?`;

    // Execute the query
    connection.query(query, [status, _id], (error, results, fields) => {
      if (error) {
        console.error("Error updating status: " + error.message);
        res.status(500).send("Server Internal error: " + error.message);
        return;
      }

      if (results.affectedRows > 0) {
        res.status(200).send({ message: "Status updated successfully" });
      } else {
        res.status(404).send("Booking not found");
      }
    });
  } catch (error) {
    res.status(500).send("Server Internal error: " + error.message);
  }
});

// Default route
app.get("/", (req, res) => {
  try {
    res.status(200).send("<h1>CareerNest Server is Running ...</h1>");
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error", error });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
