const mongoose = require("mongoose");
const { Schema } = mongoose;

const habitSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    goal: { type: String, default: "" },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);
