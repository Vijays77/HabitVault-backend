// backend/models/Activity.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    habit: { type: Schema.Types.ObjectId, ref: "Habit", index: true },
    type: { type: String, enum: ["habit_created","habit_archived","habit_restored","completion_added","completion_removed"], required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (for easy filters)
    at: { type: Date, default: Date.now },
    meta: { type: Object, default: {} } // e.g., { title: "Read", goal: "10 pages" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
