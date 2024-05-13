import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import env from  "dotenv";
import MenuItem from './models/menuItem.js';
import session from "express-session";
import passport from "passport";
import Stripe from 'stripe';
import { Strategy } from "passport-local";

import  {payment, failure, success } from './controllers/paymentController.mjs';




const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(session({
  secret : "SESSIONSECRET",
  resave : false,
  saveUninitialized : true,
})
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password:process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/user-h", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("user-h.ejs", { user: req.user });
  } else {
    res.redirect("/Fail");
  }
});


app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("profile.ejs", { user: req.user });
  } else {
    res.redirect("/Fail");
  }
});

app.get("/checkout", (req, res) => {
  res.render("checkout.ejs",
  {
    key:process.env.STRIPE_PUBLISHABLE_KEY
    
 });
});

app.get("/Services", (req, res) => {
  res.render("services.ejs");
});

app.get("/Contact", (req, res) => {
  res.render("contact.ejs");
});


//Normal Menu
app.get("/Menu", async (req, res) => {
  try {
    // Query all menu items from the database including the 'type' column
    const menuItems = await MenuItem.findAll({ attributes: ['name', 'price', 'type', 'image_source'] });
    menuItems.forEach(item => {
      item.price = parseFloat(item.price); // Convert price to a float
    });

    

    // Render the menu page and pass the menu items data to the template
    res.render("menu-h.ejs", { menuItems });
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).send('Error fetching menu items');
  }
});

app.get("/Login", (req, res) => {
  res.render("login.ejs");
});

app.get("/Sign-up", (req, res) => {
  res.render("sign-up.ejs");
});

app.get("/User", (req, res) => {
  res.render("usr_lg.ejs");
});


app.get("/Employee_prof", (req,res) => {
  res.render("emp.ejs");
});

app.get("/Fail", (req,res) => {
  res.render("failure1.ejs");
});


app.get("/user-dashboard", (req,res) => {

  if (req.isAuthenticated()){
    res.render("user-h.ejs", { user: req.user });
   } else {
    res.redirect("/Fail")
   }

});

app.get("/Services-U", (req, res) => {
  if (req.isAuthenticated()){
    res.render("services-h.ejs", { user: req.user });
   } else {
    res.redirect("/Fail")
   }
});



app.get("/employee" , (req,res) => {

 if (req.isAuthenticated()){
  res.render("emp.ejs", { user: req.user });
 } else {
  res.redirect("/Fail")
 }
});



// Menu for users 
app.get("/Menu-B", async (req, res) => {
  try {
    // Query all menu items from the database including the 'type' column
    const menuItems = await MenuItem.findAll({ attributes: ['name', 'price', 'type', 'image_source'] });
    menuItems.forEach(item => {
      item.price = parseFloat(item.price); // Convert price to a float
    });

    // Check if user is authenticated and pass user details to the template
    const user = req.isAuthenticated() ? req.user : null;

    // Render the menu page and pass the menu items data and user details to the template
    res.render("menu-demo.ejs", { menuItems, user });
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).send('Error fetching menu items');
  }
});







// Displaying Reservation 

app.get("/Res", async (req, res) => { 
  try {
    const currentDate = new Date().toISOString().slice(0, 10);
    console.log("Current date :" + currentDate);
    const result = await db.query("SELECT * FROM reservations WHERE date = $1 ORDER BY date DESC",[currentDate]);
     const resv = result.rows;
     

     console.log(resv);

    res.render("emp_reservation.ejs", {
      listItems: resv,
    });
  } catch (err) {
    console.log(err);
  }
});






// Displaying orders --

app.get("/Order-D", async (req, res) => { 
  try {
    const currentDate = new Date().toISOString().slice(0, 10);
    console.log("Current date :" + currentDate);
    const result = await db.query("SELECT * FROM orders WHERE datet = $1 ORDER BY created_at DESC",[currentDate]);
     const resv = result.rows;
     

     console.log(resv + " this needed ");

    res.render("order-display.ejs", {
      listItems: resv,
    });
  } catch (err) {
    console.log(err);
  }
});

 





// * Displaying Contact form

app.get("/Contact-E", async (req, res) => { 
  try {
    const currentDate = new Date().toISOString().slice(0, 10);
    console.log("Current date :" + currentDate);
    const result = await db.query("SELECT * FROM contact WHERE date = $1 ORDER BY date DESC",[currentDate]);
     const contact = result.rows;
     

     console.log(contact);

    res.render("emp_contact.ejs", {
      listItems: contact,
    });
  } catch (err) {
    console.log(err);
  }
});















// * Reservation


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
    port: 465,  
    secure: true,
  auth: {
      user:process.env.NODEMAILER_USERNAME,
      pass:process.env.NODEMAILER_PASSWORD,
  },
});

app.use((req, res, next) => {
  res.locals.currentDate = new Date().toLocaleDateString();
  next();
});



app.post('/reserve', async (req, res) => {
  const { name, email, phone, date, time, count } = req.body;

  // Check available seats for the specified date and time
  const seatsQuery = `
  SELECT SUM(count) AS total_seats
FROM reservations
WHERE date = $1 AND time = $2
GROUP BY date;
  `;
  var availableSeatsValues = [date,time];
  
  try {
      const availableSeatsResult = await db.query(seatsQuery, availableSeatsValues);
      const seatsString = availableSeatsResult.rows[0]?.total_seats || '0';
      const seats = parseInt(seatsString, 10);
      console.log(seats);

      const exceed_limit = seats + count;
      console.log(exceed_limit);

      if (exceed_limit > 50) {
        res.status(400).send('Not enough available seats for your reservation.');
    } else {
        // Perform the reservation and update available seats
        const insertQuery = `
            INSERT INTO reservations (name, email, phone, date, time, count, reservation_timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const insertValues = [name, email, phone, date, time, count, new Date()];
    
        await db.query(insertQuery, insertValues);
    
        const mailOptions = {
            from: 'your_email_address',
            to: email,
            subject: 'Reservation Confirmation',
            text: `Dear ${name},\n\nYour reservation for ${count} people on ${date} at ${time} has been confirmed.\n\nThank you for choosing us!\n\nBest regards,\nBuena Comida Team`,
        };
    
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                res.send("Email Error");
            } else {
                console.log('Email sent:', info.response);
            }
        });
    
        res.send('Reservation submitted successfully.');
    }
    
  } catch (err) {
      console.error('Error executing queries', err);
      res.status(500).send('Error submitting reservation.');
  }
});



//* Contact Us Form
app.post('/Contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  const currentDate = new Date().toISOString().slice(0, 10);
  console.log("cont current date:" + currentDate);

 
  const insertQuery = `
      INSERT INTO contact (name, email, subject, message, date)
      VALUES ($1, $2, $3, $4, $5)
  `;
  const insertValues = [name, email, subject, message, currentDate];

  try {
      await db.query(insertQuery, insertValues);
      res.send('Form submitted successfully!');
  } catch (error) {
      console.error('Error inserting data:', error);
      res.status(500).send('An error occurred while processing your request.');
  }
});








//* employee registering
app.post("/submit_signup", async (req, res) => {
  const employee_id = req.body.employee_id;
  const password = req.body.password;
  const first_name = req.body.first_name;
  const last_name = req.body.last_name;
  const profession = req.body.profession;
  const email = req.body.email;
  const m_number = req.body.m_number;
  const address = req.body.address;

  try {
    const checkResult = await db.query("SELECT * FROM employees WHERE employee_id = $1", [employee_id]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      // hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          await db.query(
            "INSERT INTO employees (employee_id, password,first_name,last_name,profession,email,m_number,address) VALUES ($1, $2,$3,$4,$5,$6,$7,$8)",
            [employee_id, hash, first_name, last_name, profession, email, m_number, address]
          );
          res.send("confirmed Registration");
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});







//* employee login
app.post("/LOGIN_emp", passport.authenticate("local",{
  successRedirect:"/employee",
  failureRedirect: "/Fail" ,
}));


//user register
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      // Hash the password and save the user in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          res.send("Error hashing password.");
        } else {
          console.log("Hashed Password:", hash);
          await db.query(
            "INSERT INTO users (password, email, username) VALUES ($1, $2, $3)",
            [hash, email, username]
          );
          res.send ("Registration confirmed");
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.send("Error registering user.");
  }
});




//user login

  app.post("/login", passport.authenticate('user-local', {
    successRedirect: '/user-dashboard',
    failureRedirect: '/Fail',
  }));
  



// session and passport --


passport.use(new Strategy(async function verify(username, password, done) {
  try {
    
    
    const result = await db.query("SELECT * FROM employees WHERE employee_id = $1", [username]);
    
    
    if (result.rows.length === 0) {
      console.log('Employee not found');
      return done(null, false, { message: 'Employee not found' });
    }

    const employee = result.rows[0];
    console.log(employee);
    const storedHashedPassword = employee.password;
    console.log(storedHashedPassword);

    bcrypt.compare(password, storedHashedPassword, (err, isMatch) => {
      if (err) {
        console.error("Error comparing passwords:", err);
        return done(err);
      }
      if (!isMatch) {
        console.log('Incorrect Password');
        return done(null, false, { message: 'Incorrect Password' });
      }
      
      console.log('Authentication successful');
      return done(null, employee);
    });
  } catch (err) {
    console.error('Authentication error:', err);
    return done(err);
  }
}));


passport.serializeUser((employee , cb) =>{
  cb(null, employee);

});

passport.deserializeUser((employee , cb) =>{
  cb(null, employee);

});



// user passport and session -

passport.use('user-local', new Strategy({
  usernameField: 'email', // Assuming email is used for login
  passwordField: 'password',
}, async (email, password, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return done(null, false, { message: 'User not found' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Incorrect password' });
    }
  } catch (error) {
    return done(error);
  }
}));


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return done(null, false);
    }
    const user = result.rows[0];
    done(null, user);
  } catch (error) {
    done(error);
  }
})




///// session register employee 


// Define a registration strategy














// payment ---

        //creating order -

app.post("/orders", async (req, res) => {

  try{
  console.log(req.body);
  
  const totalprice = parseInt(req.body.totalPrice, 10); // Convert to integer
  console.log(totalprice + " total price data type ");
  if (isNaN(totalprice) || totalprice <= 0) {
      throw new Error('Invalid total price'); // Handle invalid input
  }
  const items = req.body.items;
  const user_id = parseInt( req.body.userId, 10);
  console.log('Received data:', totalprice, items, user_id);

  const insertQuery = `
  INSERT INTO orders (user_id, total_amount, order_status)
  VALUES ($1, $2, $3)
`;
const insertValues = [user_id, totalprice, "pending" ];

await db.query(insertQuery, insertValues);

  }catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).send('An error occurred while processing your request.');
}


         
        
 });    
 
 



 //--- chackout payment 


 app.post('/payment', payment);
 app.get('/success', success);
 app.get('/failure', failure);




app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
