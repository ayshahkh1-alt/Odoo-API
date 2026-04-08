const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors"); // <--- استدعاء المكتبة

const app = express();
app.use(express.json());
app.use(cors()); 

const ODOO_URL = "https://edu-mersal-florist.odoo.com";
const DB = "edu-mersal-florist";
const USER = "s12218704@stu.najah.edu";
const PASS = "حمش@31571";

// تسجيل الدخول وإرجاع session_id
async function login() {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      params: { db: DB, login: USER, password: PASS }
    })
  });

  const data = await res.json();
  if (!data.result || !data.result.session_id) {
    throw new Error("Login failed");
  }
  return data.result.session_id;
}

// API endpoint لاقتراح بوكيه
app.post("/bouquets", async (req, res) => {
  try {
    const { color, size } = req.body; // البيانات اللي جايه من الfrontend

    const session = await login();

    const response = await fetch(`${ODOO_URL}/web/dataset/call_kw/product.template/search_read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `session_id=${session}`
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "product.template",
          method: "search_read",
          args: [],
          kwargs: {
            domain: [
              color ? ["x_color", "=", color] : [],
              size ? ["x_size", "=", size] : []
            ].filter(Boolean), // نتأكد ما في array فاضية
            fields: ["name", "list_price", "image_1920"]
          }
        }
      })
    });

    const data = await response.json();
    if (!data.result) return res.status(404).json({ error: "No bouquets found" });

    // نرسل فقط المعلومات المهمة
    const bouquets = data.result.map(b => ({
      name: b.name,
      price: b.list_price,
      image: b.image_1920
    }));

    res.json({ bouquets });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Bouquet API is working 🚀");
});

app.listen(3000, () => console.log("Server running on port 3000"));
