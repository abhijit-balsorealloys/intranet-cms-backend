const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { mysqlConnection, poolPromise,mssql } = require('../db');


// Get all users
router.get("/", (req, res) => {
  mysqlConnection.query("SELECT * FROM SAP_EMPLOYEE_details", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
// Get employee details
router.post("/adminlogin", async (req, res) => {
  const { userid, password } = req.body;
  const inputHash = hashPassword(password);
  if (!userid || !password) {
    return res.status(400).json({ error: "userid and password are required!" });
  }

  try {
    const isValidPassword = await checkPassword(userid, password);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials!" });
    }
    // If password is correct, fetch additional user details
    mysqlConnection.query(
      "CALL SP_INTRANET_ADMIN_USER_GET(?, ?)",
      [userid, inputHash],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(results); // Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to login" });
  }
});

//get user password
const getUserPassword = (userid) => {
  return new Promise((resolve, reject) => {
    mysqlConnection.query(
      "SELECT ADMIN_PWD FROM INTRANET_ADMIN_MASTER WHERE ADMIN_EMPID = ?",
      [userid],
      (err, results) => {
        if (err) {
          return reject(err); // Handle errors
        }
        if (results.length > 0) {
          resolve(results[0].ADMIN_PWD); // Return password if found
        } else {
          resolve(null); // Return null if no match
        }
      }
    );
  });
};

//API to get emlpoyee birthday
router.get("/getemployeebirthday", async (req, res) => {
  try {
    mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_UP_BIRTHDAY_GET()",
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(results[0]); // Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to fetch employee birthday" });
  }
});
//API to get new joinee info 
router.get("/getnewjoineeinfo", async (req, res) => {
  try {
    mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_NEWJOINING_GET()",
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(results[0]); // Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to get new joinee info" });
  }
});
//API to change password 
router.post("/changepassword", async (req, res) => {
  const { userid ,newpassword,confirmpassword} = req.body;
   const storedPassword = await getUserPassword(userid);
   const passwordhash = hashPassword(newpassword);
   switch (true) {
    case !userid:
      return res.status(400).json({ error: "userid is required" });

    case passwordhash !== storedPassword:
      return res.status(400).json({ error: "New password must not be equal to old password" });

    case newpassword !== confirmpassword:
      return res.status(400).json({ error: "New password must be equal to confirm password" });

    default:
      break;
  }
 const confirmpasswordhash = hashPassword(confirmpassword);
  try {
   mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_CHANGE_PASSWORD(?,?)",
      [userid,passwordhash],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
         res.status(200).json({
          status: "success",
          message: "Password updated successfully",
          data: results[0]
        });// Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to change password" });
  }
});
// Function to encrypt user password
const hashPassword = (password) => {
  return crypto.createHash("sha1").update(password).digest("hex");
};

// Function to check if password matches stored hash
async function checkPassword(userid, inputPassword) {
  const inputHash = hashPassword(inputPassword); // Hash input password
  const storedPassword = await getUserPassword(userid); // Fetch stored password
  if (!storedPassword) return false; // Handle case where user does not exist
  return storedPassword.toLowerCase() === inputHash; // Directly return comparison result
}
//API to fetch employee attendance
router.get("/getemployeeattendance/:P_EmpId", async (req, res) => {
  const { P_EmpId } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool
          .request()
          .input('P_EmpId', mssql.VarChar(10), P_EmpId )
          .execute('spEmpAttendance');
        return res.json(result.recordset);
      } catch (err) {
        console.error('Error in retriving store procedure data', err);
      }
});
//API to fetch training details
router.get("/gettrainingcalender", async (req, res) => {
  try {
    mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_TRAINING_CALENDAR_GET();",
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(results[0]); // Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to fetch training data" });
  }
});

//API to fetch User Page Count details
router.get("/getuserpagecount/:empid", async (req, res) => {
  const { empid } = req.params;
  try {
    mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_USER_LOGIN_HIT_SHOW(?);",
       [empid],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(results[0]); // Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to fetch training data" });
  }
});
//API to Polling  Vote Insert
router.post("/pollvote", async (req, res) => {
const { userid ,poll_rating } = req.body;
  
  if (!userid || !poll_rating) {
    return res.status(400).json({ error: "userid and Poll Rating are required!" });
  }

  try {
   mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_POLL_RESULT_INSERT(?,?)",
      [userid,poll_rating],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
         res.status(200).json({
          status: "success",
          message: "Thank You For Your Vote !!",
          data: results[0]
        });// Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to Insert" });
  }
});
//API to fetch User Poll Result Details
router.get("/getpollresult", async (req, res) => {
  const { empid } = req.params;
  try {
    mysqlConnection.query(
      "CALL balcorpdb.SP_INTRANET_POLL_RESULT_SHOW();",
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(results[0]); // Return user data
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Unable to fetch Poll Result data" });
  }
});
module.exports = router;
