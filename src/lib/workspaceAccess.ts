type WorkspaceUser = {
 portal: string;
 grants?: string[];
 setup_grants?: string[];
};

// Choose only a workspace already permitted by the API's effective grants.
// Explicitly empty permissions remain empty; routing never grants access.
export function workspaceRedirect(user: WorkspaceUser, portal: string, workspace: 'companies' | 'operations'): string | null {
 const home = '/' + user.portal;
 if (!portal || portal !== user.portal || user.portal === 'developer') return home;
 const hasCompanyWorkspace = ['admin', 'md', 'finance'].includes(user.portal);
 if (workspace === 'operations' && !user.grants?.includes('view_orders') && hasCompanyWorkspace && user.setup_grants?.includes('view')) return home;
 if (workspace === 'companies' && !user.setup_grants?.includes('view') && user.grants?.includes('view_orders')) return home + '/operations';
 return null;
}
