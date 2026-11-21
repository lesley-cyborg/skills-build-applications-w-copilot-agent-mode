import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

function badRequest(message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Invalid activity');
  const { userId, teamId, type, minutes } = input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };
  if (
    typeof userId !== 'string' ||
    typeof teamId !== 'string' ||
    !mongoose.isValidObjectId(userId) ||
    !mongoose.isValidObjectId(teamId) ||
    typeof type !== 'string' ||
    type.trim().length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes < 1
  ) {
    throw badRequest('A valid userId, teamId, type, and minutes are required');
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user || !team) throw notFound('User or team not found');

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Invalid team');
  const { name, mascot, members = [] } = input as {
    name?: unknown;
    mascot?: unknown;
    members?: unknown;
  };
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof mascot !== 'string' ||
    mascot.trim().length === 0 ||
    !Array.isArray(members)
  ) {
    throw badRequest('A valid name and mascot are required');
  }

  const memberIds = members as unknown[];
  if (memberIds.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
    throw badRequest('Members must contain valid user IDs');
  }

  const users = await User.find({ _id: { $in: memberIds } }).lean();
  if (users.length !== memberIds.length) throw notFound('One or more team members not found');

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: users.map((user) => user._id),
  });

  for (const user of users) {
    if (user.team) {
      await Team.updateOne({ _id: user.team }, { $pull: { members: user._id } });
    }
  }
  await Promise.all([
    Team.updateOne({ _id: team._id }, { $set: { members: users.map((user) => user._id) } }),
    User.updateMany({ _id: { $in: users.map((user) => user._id) } }, { $set: { team: team._id } }),
  ]);

  return team.toObject();
}

export async function getLeaderboard() {
  const entries = await Activity.aggregate([
    {
      $group: {
        _id: '$team',
        totalPoints: { $sum: '$points' },
      },
    },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    {
      $project: {
        _id: 0,
        teamName: '$team.name',
        totalPoints: 1,
      },
    },
  ]);

  return entries
    .sort((left, right) =>
      right.totalPoints - left.totalPoints ||
      String(left.teamName).localeCompare(String(right.teamName)),
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw notFound('User not found');

  const recentActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1 })
    .lean();

  let focus = user.fitnessGoal;
  let reason = `Matches your ${user.fitnessGoal} fitness goal`;
  if (recentActivity) {
    const activityType = recentActivity.type.toLowerCase();
    if (activityType === 'run' || activityType === 'cycle') {
      focus = 'endurance';
      reason = `Matches your recent ${activityType} activity and endurance goal`;
    } else if (activityType === 'strength') {
      focus = 'strength';
      reason = 'Matches your recent strength activity';
    }
  }

  let workouts = await Workout.find({ focus }).lean();
  if (workouts.length === 0) {
    workouts = await Workout.find().lean();
  }

  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
