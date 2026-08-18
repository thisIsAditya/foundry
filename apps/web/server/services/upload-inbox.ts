export const UPLOAD_INBOX_PROJECT_NAME = '__foundry_upload_inbox__';

export function isUploadInboxProject(project: { name: string }): boolean {
  return project.name === UPLOAD_INBOX_PROJECT_NAME;
}
