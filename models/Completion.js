const mongoose = require("mongoose");
const { Schema } = mongoose;

const completionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habit: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    done: { type: Boolean, default: true },
  },
  { timestamps: true }
);

completionSchema.index({ user: 1, habit: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Completion", completionSchema);
