const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const ODOO_URL = "https://edu-mersal-florist.odoo.com";
const DB = "your_db";
const USER = "s12218704@stu.najah.edu";
const PASS = "حمش@31571";

// تسجيل الدخول
async function login() {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      params: {
        db: DB,
        login: USER,
        password: PASS
      }
    })
  });

  const data = await res.json();
  return data.result.session_id;
}

// API endpoint
app.post("/bouquets", async (req, res) => {
  try {
    const { color, size } = req.body;

    const session = await login();

    const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
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
              ["x_color", "=", color],
              ["x_size", "=", size]
            ],
            fields: ["name", "list_price", "image_1920"]
          }
        }
      })
    });

    const data = await response.json();
    res.json(data.result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/", (req, res) => {
  res.send("API is working 🚀");
});

app.listen(3000, () => console.log("Server running"));
