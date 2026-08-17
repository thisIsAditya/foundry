import { z } from 'zod';

export const WorkspaceStatuses = ['active', 'suspended', 'closed'] as const;
export const WorkspaceStatusSchema = z.enum(WorkspaceStatuses);
export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>;

export const WorkspacePlans = ['free', 'pro', 'enterprise'] as const;
export const WorkspacePlanSchema = z.enum(WorkspacePlans);
export type WorkspacePlan = z.infer<typeof WorkspacePlanSchema>;

export const PlatformRoles = ['founder', 'admin', 'test'] as const;
export const PlatformRoleSchema = z.enum(PlatformRoles);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export const WorkspaceRoles = ['owner', 'admin', 'member', 'viewer', 'reviewer'] as const;
export const WorkspaceRoleSchema = z.enum(WorkspaceRoles);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
