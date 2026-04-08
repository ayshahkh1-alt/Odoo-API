const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors"); // مهم جداً للسماح لصفحة Odoo بالاتصال

const app = express();
app.use(express.json());
app.use(cors()); // تفعيل الـ CORS

const ODOO_URL = "https://edu-mersal-florist.odoo.com";
const DB = "edu-mersal-florist";
const USER = "s12218704@stu.najah.edu";
const PASS = "حمش@31571"; // تأكد من صحة الباسورد

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

// التعديل هنا: استقبال الباراميترات الجديدة
app.post("/bouquets", async (req, res) => {
  try {
    // البيانات القادمة من الـ Frontend
    const { flowerColor, wrapping, occasion, category, budget, extras } = req.body;

    const session = await login();

    // بناء Domain للبحث في Odoo بناءً على الاختيارات
    // ملاحظة: يجب التأكد من أن الحقول (x_color, x_wrapping) موجودة في Odoo
    let domain = [];
    
    // مثال: إضافة فلتر اللون إذا تم اختياره
    // نستخدم 'ilike' للبحث الجزئي أو '=' إذا كان الاسم مطابقاً تماماً
    if (flowerColor) {
        domain.push(["x_color", "ilike", flowerColor]); 
    }
    
    // مثال: إضافة فلتر التغليف
    if (wrapping) {
        domain.push(["x_wrapping", "ilike", wrapping]);
    }

    // البحث في قالب المنتج (product.template)
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
            domain: domain, // تمرير الـ domain الذي بنيناه
            fields: ["name", "list_price", "image_1920", "x_color", "x_wrapping"]
          }
        }
      })
    });

    const data = await response.json();
    
    // معالجة النتيجة
    let resultBouquet = null;
    if (data.result && data.result.length > 0) {
        // لو في نتائج، نختار أول واحد
        const p = data.result[0];
        resultBouquet = {
            name: p.name,
            price: p.list_price,
            image: p.image_1920,
            flowers: flowerColor || "متنوع",
            wrap: wrapping || "افتراضي",
            extras: extras ? extras.join(", ") : "لا يوجد"
        };
    } else {
        // لو ما في نتائج، نرجع اقتراح افتراضي
        resultBouquet = {
            name: "بوكيه مخصص حسب الطلب",
            price: "حسب المتطلبات",
            image: null, // يمكن وضع صورة افتراضية هنا
            flowers: flowerColor || "متنوع",
            wrap: wrapping || "افتراضي",
            extras: extras ? extras.join(", ") : "لا يوجد"
        };
    }

    res.json(resultBouquet);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Bouquet API is working 🚀");
});

app.listen(3000, () => console.log("Server running on port 3000"));
