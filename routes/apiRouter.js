const Cookies = require("cookies");
const e = require("express");
const express = require("express");
const uuid4 = require("uuid4");
const ApiRouter = express.Router();
//const cookieparser = reuire('cookie-parser');

//ApiRouter.use(cookieparser());

ApiRouter.get("/", (req, res) => {
  res.json({ message: "Hello from API" });
});

ApiRouter.get("/venue_bookings", async (req, res) => {
  let db = req.app.locals.db;
  let date = req.query.date;
  if (!date) return res.status(400).json({ message: "Date is required" });
  try {
    let [data] = await db.query(
      // "SELECT * FROM venue_bookings WHERE booking_date = ?",
      "SELECT * FROM confirmed_orders WHERE orderDate = ?",
      [date]
    );
    // console.log(data[0].booking_date);
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

ApiRouter.post("/add_venue_booking", async (req, res) => {
  let db = req.app.locals.db;
  let { booking_date, time_from, time_to, venue_id } = req.body;
  if (!booking_date || !time_from || !time_to || !venue_id)
    return res.status(400).json({ message: "All fields are required" });
  try {
    var token = req.cookies.token;
    if(!token) {
      return res.status(400).json({message:"Username Required"});
    }
    let [orders] = await db.query( "SELECT * FROM orders");

    let [user] = await db.query( "SELECT * FROM Session WHERE token = ?" ,[token] );
    var orderID = null;
    var mx = 0 ;
    for(let i = 0 ; i < orders.length;i++){
      if(orders[i].orderID >mx){
        mx=orders[i].orderID;
      }
    }
    orderID = mx + 100 ;
    let [data] = await db.query(
     // "INSERT INTO venue_bookings (venue_id, booking_date, time_from, time_to) VALUES (?, ?, ?, ?)",
     "INSERT INTO orders (orderID, userName, productID, orderDate, orderSlot) VALUES (?, ?, ?, ?,?)",
     // [venue_id, booking_date, time_from, time_to]
     [orderID ,user[0].userName, venue_id , booking_date,time_from ]
    );
    return res.status(200).json({ message: "Booking added successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



ApiRouter.post("/customer-order", async (req, res) => {
  let db = req.app.locals.db;
  let { order_id, address, date } = req.body;
  //console.log(order_id);
  // if (!order_id || !address || !date)
  //   return res.status(400).json({ message: "All fields are required" });
  console.log(address);
  try {
    var token = req.cookies.token;
    if(!token) {
      return res.status(400).json({message:"Username Required"});
    }
    let [orders] = await db.query( "SELECT * FROM orders");
    let [user] = await db.query( "SELECT * FROM Session WHERE token = ?" ,[token] );  
    var orderID = null;
    var mx = 0 ;
    for(let i = 0 ; i < orders.length;i++){
      if(orders[i].orderID >mx){
        mx=orders[i].orderID;
      }
    }
    orderID = mx + 1 ;
    console.log(mx);
    await db.query(
     "INSERT INTO orders (orderID, userName, productID, orderDate , location) VALUES (?, ?, ?, ?,?)",
     [orderID ,user[0].userName, order_id , date,address ]
    );
    return res.status(200).json({ message: "Booking added successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

ApiRouter.post("/user", async (req, res) => {
  let db = req.app.locals.db;
  let { username , pass } = req.body;
  if (!username || !pass)
    return res.status(400).json({ message: "All fields are required" });
  try {
    let [data] = await db.query(
      "SELECT * FROM userlist WHERE name = ?",
      [username]
    );
    if(req.cookies.token){
      return res.json({ message: "Already Logged In" });
    }else{
    if (data.length === 0 || data[0].password !== pass) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = uuid4();
    res.cookie("token", token, { maxAge: 86400 * 1000, httpOnly: true });
    //res.cookie(data[0].ID, token);

    await db.query("INSERT INTO Session (userID, token , userName) VALUES (?, ? , ?)", [data[0].ID, token, data[0].name]);

    return res.json({ message: "Login successful" });
    }
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


ApiRouter.get("/logout", async (req, res) => {
  let db = req.app.locals.db;
  let token = req.cookies.token;
  if (!token) return res.status(400).json({ message: "Token not found" });
  try {
    await db.query("DELETE FROM session WHERE token = ?", [token]);
    res.clearCookie("token");
    return res.redirect("/");
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



ApiRouter.post("/signup", async (req, res) => {
  let db = req.app.locals.db;
  let { firstname,username,pass,mail,phone, address } = req.body;
  //console.log(order_id);
  // if (!order_id || !address || !date)
  //   return res.status(400).json({ message: "All fields are required" });
  
  try {
    let [users] = await db.query( "SELECT * FROM userlist");
    userID = 100010+users.length;
    await db.query(
     "INSERT INTO userlist (ID,name,firstname ,password, email, phone,address) VALUES (?, ?, ?, ?,?,?,?)",
     [userID ,username,firstname, pass,mail,phone,address ]
    );


    const token = uuid4();
    res.cookie("token", token, { maxAge: 86400 * 1000, httpOnly: true });
    //res.cookie(data[0].ID, token);

    await db.query("INSERT INTO Session (userID, token , userName) VALUES (?, ? , ?)", [userID, token, username]);

    return res.json({ message: "Login successful!" });
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }




});




ApiRouter .get("/confirmorder", async (req,res) =>{
    let db = req.app.locals.db;
    let orderID = req.query.id;
    console.log("Enter");
    if (!orderID) {
      return res.status(400).json({ message: "Bad Request: Missing orderID" });
    }
    try{
      console.log(orderID);
      let [data] = await db.query(
        "SELECT * FROM orders WHERE orderID = ?",
        [orderID]
      );
      let product = data[0].productID;

      if(product<=100){
        await db.query(
          "INSERT INTO confirmed_orders (orderID, username, productID, orderDate , orderSlot) VALUES (?, ?, ?, ?,?)",
          [data[0].orderID ,data[0].username, data[0].productID, data[0].orderDate,data[0].orderSlot ]
         );
         await db.query(
          "INSERT INTO confirmedorders (orderID, username, productID, orderDate , orderSlot) VALUES (?, ?, ?, ?,?)",
          [data[0].orderID ,data[0].username, data[0].productID, data[0].orderDate,data[0].orderSlot ]
         );
      }else if(product<=400){
        await db.query(
          "INSERT INTO confirmed_orders (orderID, username, productID, orderDate , location) VALUES (?, ?, ?, ?,?)",
          [data[0].orderID ,data[0].username, data[0].productID, data[0].orderDate,data[0].location ]
         );
         await db.query(
          "INSERT INTO confirmedorders (orderID, username, productID, orderDate , location) VALUES (?, ?, ?, ?,?)",
          [data[0].orderID ,data[0].username, data[0].productID, data[0].orderDate,data[0].location ]
         );
      }
      await db.query("DELETE FROM orders WHERE orderID = ?", [orderID]);
      //return res.json({message: "Order Confirmed "});
      return res.redirect("/");
    }catch{
      //console.error("Error confirming order:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
});


ApiRouter.post("/delete", async (req, res) => {
  let db = req.app.locals.db;
  let {order} = req.body;
  console.log(order);
  let token = req.cookies.token;
  if (!token) return res.status(400).json({ message: "Token not found" });
  let [data] = await db.query(
    "SELECT * FROM session WHERE token = ?", [token]
  );
  try {
    await db.query("DELETE   FROM confirmed_orders WHERE  orderID = ? ", [order]);
    // res.clearCookie("token");
     return res.redirect("/");
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



module.exports = ApiRouter;
