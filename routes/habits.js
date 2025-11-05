// backend/routes/habits.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Habit = require("../models/Habit");
const Completion = require("../models/Completion");
const Activity = require("../models/Activity");

const { toYMD, lastNDays, weekdayShort } = require("../utils/dates");
const { computeStreak } = require("../utils/streak");

// All routes require auth
router.use(auth);

/**
 * POST /api/habits
 * body: { title, goal? }
 * Create a habit + log activity
 */
router.post("/", async (req, res) => {
  try {
    const { title, goal } = req.body || {};
    if (!title) return res.status(400).json({ msg: "title required" });

    const habit = await Habit.create({
      user: req.user.id,
      title,
      goal: goal || "",
    });

    await Activity.create({
      user: req.user.id,
      habit: habit._id,
      type: "habit_created",
      date: toYMD(),
      meta: { title, goal: goal || "" },
    });

    res.json(habit);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * GET /api/habits/today
 * Return active habits with today's completion flag
 */
router.get("/today", async (req, res) => {
  try {
    const today = toYMD();

    const habits = await Habit.find({
      user: req.user.id,
      archived: false,
    }).sort({ createdAt: -1 });

    const comps = await Completion.find({
      user: req.user.id,
      date: today,
      done: true,
    });

    const doneSet = new Set(comps.map((c) => String(c.habit)));

    const list = habits.map((h) => ({
      id: String(h._id),
      name: h.title,
      goal: h.goal,
      tag: "",
      done: doneSet.has(String(h._id)),
    }));

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * POST /api/habits/:id/complete
 * body: { date?: "YYYY-MM-DD" }  // defaults to today
 * Toggle completion + log activity
 */
router.post("/:id/complete", async (req, res) => {
  try {
    const habitId = req.params.id;
    const date = req.body?.date || toYMD();

    const existing = await Completion.findOne({
      user: req.user.id,
      habit: habitId,
      date,
    });

    if (existing) {
      await Completion.deleteOne({ _id: existing._id });
      await Activity.create({
        user: req.user.id,
        habit: habitId,
        type: "completion_removed",
        date,
      });
      return res.json({ toggled: false });
    } else {
      await Completion.create({
        user: req.user.id,
        habit: habitId,
        date,
        done: true,
      });
      await Activity.create({
        user: req.user.id,
        habit: habitId,
        type: "completion_added",
        date,
      });
      return res.json({ toggled: true });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * GET /api/habits/weekly
 * Return last 7 days bar data: [{ day: 'Mon', pct: 60 }, ...]
 * pct = completed / planned * 100 (planned = count of active habits)
 */
router.get("/weekly", async (req, res) => {
  try {
    const days = lastNDays(7);
    const activeHabits = await Habit.countDocuments({
      user: req.user.id,
      archived: false,
    });

    if (activeHabits === 0) {
      return res.json(days.map((d) => ({ day: weekdayShort(d), pct: 0 })));
    }

    const comps = await Completion.find({
      user: req.user.id,
      date: { $in: days },
      done: true,
    });

    const map = new Map(days.map((d) => [d, 0]));
    for (const c of comps) {
      map.set(c.date, (map.get(c.date) || 0) + 1);
    }

    const result = days.map((d) => {
      const completed = map.get(d) || 0;
      const pct = Math.round((completed / activeHabits) * 100);
      return { day: weekdayShort(d), pct };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * GET /api/habits/summary
 * Returns { streak, todayPlanned, todayDone, completionRate }
 */
router.get("/summary", async (req, res) => {
  try {
    const today = toYMD();
    const days = lastNDays(7);
    const activeHabits = await Habit.countDocuments({
      user: req.user.id,
      archived: false,
    });

    const todayPlanned = activeHabits;

    const todayDone = await Completion.countDocuments({
      user: req.user.id,
      date: today,
      done: true,
    });

    let weekPct = 0;
    if (activeHabits > 0) {
      const allComps = await Completion.find({
        user: req.user.id,
        date: { $in: days },
        done: true,
      });

      const byDate = new Map(days.map((d) => [d, 0]));
      for (const c of allComps) {
        byDate.set(c.date, (byDate.get(c.date) || 0) + 1);
      }

      const sumPct = days.reduce(
        (acc, d) => acc + Math.round(((byDate.get(d) || 0) / activeHabits) * 100),
        0
      );
      weekPct = Math.round(sumPct / days.length);
    }

    const activityDates = await Completion.distinct("date", {
      user: req.user.id,
      done: true,
    });
    const datesSet = new Set(activityDates);
    const streak = computeStreak(datesSet, today);

    res.json({ streak, todayPlanned, todayDone, completionRate: weekPct });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * DELETE /api/habits/:id
 * Soft delete (archive) + log activity
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const habit = await Habit.findOne({ _id: id, user: req.user.id });
    if (!habit) return res.status(404).json({ msg: "Habit not found" });

    habit.archived = true;
    await habit.save();

    await Activity.create({
      user: req.user.id,
      habit: id,
      type: "habit_archived",
      date: toYMD(),
      meta: { title: habit.title },
    });

    res.json({ msg: "Habit archived" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * PUT /api/habits/:id/restore
 * Restore archived habit + log activity
 */
router.put("/:id/restore", async (req, res) => {
  try {
    const id = req.params.id;
    const habit = await Habit.findOne({ _id: id, user: req.user.id });
    if (!habit) return res.status(404).json({ msg: "Habit not found" });

    habit.archived = false;
    await habit.save();

    await Activity.create({
      user: req.user.id,
      habit: id,
      type: "habit_restored",
      date: toYMD(),
      meta: { title: habit.title },
    });

    res.json({ msg: "Habit restored" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * GET /api/habits/history?limit=20
 * Return recent actions (created/deleted/completed/uncompleted/restored)
 */
router.get("/history", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rows = await Activity.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
