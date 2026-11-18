// Resets the database and inserts demo data through the services.
// Usage: npm run seed   (refuses to run with NODE_ENV=production)
import env from '../src/config/env.js';
import db from '../src/config/database.js';
import createContainer from '../src/container.js';
import { toDateString } from '../src/utils/date.js';

if (env.isProduction) {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

const PASSWORD = 'password123';
const { authService, workspaceService, projectService, taskService, commentService } =
  createContainer({ db, env }).services;

const inDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
};

async function register(email, fullName) {
  const { user } = await authService.register({ email, password: PASSWORD, fullName });
  return user;
}

async function seed() {
  await db.query(`
    TRUNCATE activity_logs, task_comments, tasks, projects,
             workspace_members, workspaces, users
    RESTART IDENTITY CASCADE
  `);

  const owner = await register('owner@taskflow.dev', 'An Nguyen');
  const admin = await register('admin@taskflow.dev', 'Binh Tran');
  const dev = await register('dev@taskflow.dev', 'Chi Le');
  const designer = await register('designer@taskflow.dev', 'Dung Pham');
  await register('guest@taskflow.dev', 'Giang Vo');

  const team = await workspaceService.create(owner.id, {
    name: 'Product Team',
    description: 'Demo workspace for TaskFlow',
  });
  await workspaceService.addMember(owner.id, team.id, { email: admin.email, role: 'ADMIN' });
  await workspaceService.addMember(owner.id, team.id, { email: dev.email, role: 'MEMBER' });
  await workspaceService.addMember(admin.id, team.id, { email: designer.email, role: 'MEMBER' });

  const personal = await workspaceService.create(dev.id, { name: 'Side Projects' });

  const website = await projectService.create(owner.id, {
    workspaceId: team.id,
    name: 'Website Redesign',
    description: 'New marketing site and customer dashboard',
  });
  const mobile = await projectService.create(admin.id, {
    workspaceId: team.id,
    name: 'Mobile App',
    description: 'iOS and Android app MVP',
  });
  await projectService.create(dev.id, { workspaceId: personal.id, name: 'Blog' });

  const tasks = [
    [website, admin, { title: 'Define sitemap', status: 'DONE', assigneeId: designer.id }],
    [website, admin, { title: 'Design homepage mockups', status: 'DONE', assigneeId: designer.id }],
    [website, owner, { title: 'Set up CI pipeline', status: 'DONE', assigneeId: dev.id }],
    [
      website,
      owner,
      {
        title: 'Build authentication API',
        description: 'Register, login and JWT middleware',
        status: 'IN_PROGRESS',
        assigneeId: dev.id,
        dueDate: inDays(3),
      },
    ],
    [
      website,
      admin,
      {
        title: 'Implement dashboard charts',
        status: 'IN_PROGRESS',
        assigneeId: dev.id,
        dueDate: inDays(7),
      },
    ],
    [website, dev, { title: 'Write API integration tests', dueDate: inDays(10) }],
    [
      website,
      admin,
      { title: 'Accessibility audit', assigneeId: designer.id, dueDate: inDays(14) },
    ],
    [website, owner, { title: 'Prepare launch checklist', dueDate: inDays(21) }],
    [mobile, admin, { title: 'Choose navigation library', status: 'DONE', assigneeId: dev.id }],
    [
      mobile,
      admin,
      { title: 'Onboarding screens', status: 'IN_PROGRESS', assigneeId: designer.id },
    ],
    [mobile, admin, { title: 'Push notifications', assigneeId: dev.id, dueDate: inDays(5) }],
    [mobile, dev, { title: 'Offline mode research' }],
  ];

  const created = [];
  for (const [project, creator, data] of tasks) {
    const { status, ...rest } = data;
    const task = await taskService.create(creator.id, { projectId: project.id, ...rest });
    created.push(task);
    // Walk through statuses so the activity log shows a realistic history.
    if (status === 'IN_PROGRESS' || status === 'DONE') {
      await taskService.update(creator.id, task.id, { status: 'IN_PROGRESS' });
    }
    if (status === 'DONE') {
      await taskService.update(creator.id, task.id, { status: 'DONE' });
    }
  }

  // The API refuses past due dates, so one overdue task is set directly.
  const overdue = created.find((t) => t.title === 'Push notifications');
  await db.query('UPDATE tasks SET due_date = CURRENT_DATE - 2 WHERE id = $1', [overdue.id]);

  const auth = created.find((t) => t.title === 'Build authentication API');
  await commentService.create(owner.id, auth.id, {
    content: 'Please use bcrypt with at least 10 salt rounds.',
  });
  await commentService.create(dev.id, auth.id, {
    content: 'Done, login endpoint is ready for review.',
  });
  await commentService.create(admin.id, auth.id, { content: 'Reviewed, looks good to me.' });

  console.log('Seed complete.');
  console.log(`Log in with any of these accounts (password: ${PASSWORD}):`);
  for (const email of [owner, admin, dev, designer].map((u) => u.email)) {
    console.log(`  ${email}`);
  }
  console.log('  guest@taskflow.dev (not a member of any workspace)');
}

try {
  await seed();
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
