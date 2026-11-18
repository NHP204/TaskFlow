import ApiError from '../utils/ApiError.js';
import { toDateString } from '../utils/date.js';

const COUNT_FIELDS = ['total', 'todo', 'inProgress', 'done', 'overdue', 'unassigned'];

function toStats(counts) {
  return {
    total: counts.total,
    byStatus: { TODO: counts.todo, IN_PROGRESS: counts.inProgress, DONE: counts.done },
    progress: counts.total === 0 ? 0 : Math.round((counts.done / counts.total) * 100),
    overdue: counts.overdue,
    unassigned: counts.unassigned,
  };
}

export default function createStatsService({
  statsRepository,
  projectRepository,
  workspaceAccess,
  now = () => new Date(),
}) {
  const today = () => toDateString(now());

  return {
    async forProject(userId, projectId) {
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw ApiError.notFound('Project not found');
      }
      await workspaceAccess.requireRole(project.workspaceId, userId);

      const counts = await statsRepository.countByProject(projectId, today());
      return { projectId, ...toStats(counts) };
    },

    async forWorkspace(userId, workspaceId) {
      await workspaceAccess.requireRole(workspaceId, userId);

      const projects = await statsRepository.countByWorkspaceProjects(workspaceId, today());
      const totals = Object.fromEntries(
        COUNT_FIELDS.map((field) => [field, projects.reduce((sum, p) => sum + p[field], 0)]),
      );

      return {
        workspaceId,
        projectCount: projects.length,
        ...toStats(totals),
        projects: projects.map(({ id, name, ...counts }) => ({ id, name, ...toStats(counts) })),
      };
    },
  };
}
