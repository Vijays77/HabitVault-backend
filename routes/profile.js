// backend/routes/profile.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.use(auth);

// GET /api/profile
router.get("/", async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json({ name: user.name || "", email: user.email, phone: user.phone || "", avatar: user.avatar || "" });
});

// PUT /api/profile
// { name, phone, avatar }  (avatar is optional base64 data url)
router.put("/", async (req, res) => {
  const { name, phone, avatar } = req.body || {};
  await User.updateOne({ _id: req.user.id }, { $set: { name: name ?? "", phone: phone ?? "", avatar: avatar ?? "" } });
  res.json({ msg: "Profile updated" });
});

module.exports = router;
